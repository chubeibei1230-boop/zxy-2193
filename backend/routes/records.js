const express = require('express');
const Database = require('../utils/database');
const { adminMiddleware } = require('../utils/auth');

const router = express.Router();
const db = new Database();

// 获取记录列表
router.get('/', async (req, res) => {
  try {
    const { session_id, status, assistant_id, has_shortage, has_delay, has_feedback_issue, date_from, date_to } = req.query;
    let sql = `
      SELECT sr.*, s.title as session_title, s.session_no, s.date as session_date,
             u.name as assistant_name, rv.name as reviewer_name
      FROM session_records sr
      LEFT JOIN sessions s ON sr.session_id = s.id
      LEFT JOIN users u ON sr.assistant_id = u.id
      LEFT JOIN users rv ON sr.reviewed_by = rv.id
      WHERE 1=1
    `;
    const params = [];

    if (session_id) {
      sql += ' AND sr.session_id = ?';
      params.push(session_id);
    }

    if (status) {
      sql += ' AND sr.status = ?';
      params.push(status);
    }

    if (assistant_id) {
      sql += ' AND sr.assistant_id = ?';
      params.push(assistant_id);
    }

    if (has_shortage === '1') {
      sql += ' AND sr.has_shortage = 1';
    }

    if (has_delay === '1') {
      sql += ' AND sr.has_delay = 1';
    }

    if (has_feedback_issue === '1') {
      sql += ' AND sr.has_feedback_issue = 1';
    }

    if (date_from) {
      sql += ' AND sr.created_at >= ?';
      params.push(date_from + ' 00:00:00');
    }

    if (date_to) {
      sql += ' AND sr.created_at <= ?';
      params.push(date_to + ' 23:59:59');
    }

    sql += ' ORDER BY sr.created_at DESC';

    const records = await db.all(sql, params);
    res.json({ records });
  } catch (err) {
    console.error('获取记录列表错误:', err);
    res.status(500).json({ error: '获取记录列表失败' });
  }
});

// 获取记录详情
router.get('/:id', async (req, res) => {
  try {
    const record = await db.get(`
      SELECT sr.*, s.title as session_title, s.session_no, s.date as session_date,
             s.material_package_id, mp.name as material_package_name,
             u.name as assistant_name, rv.name as reviewer_name
      FROM session_records sr
      LEFT JOIN sessions s ON sr.session_id = s.id
      LEFT JOIN material_packages mp ON s.material_package_id = mp.id
      LEFT JOIN users u ON sr.assistant_id = u.id
      LEFT JOIN users rv ON sr.reviewed_by = rv.id
      WHERE sr.id = ?
    `, [req.params.id]);

    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    res.json({ record });
  } catch (err) {
    console.error('获取记录详情错误:', err);
    res.status(500).json({ error: '获取记录详情失败' });
  }
});

// 提交记录
router.post('/', async (req, res) => {
  try {
    const { 
      session_id, materials_distributed, rubbings_completed, 
      shortage_notes, cleanup_delay, participation_feedback, feedback_rating 
    } = req.body;

    const assistant_id = req.user.id;

    if (!session_id) {
      return res.status(400).json({ error: '场次ID不能为空' });
    }

    const session = await db.get('SELECT * FROM sessions WHERE id = ?', [session_id]);
    if (!session) {
      return res.status(404).json({ error: '场次不存在' });
    }

    const has_shortage = shortage_notes && shortage_notes.trim().length > 0 ? 1 : 0;
    const has_delay = (cleanup_delay && cleanup_delay > 30) ? 1 : 0;
    const has_feedback_issue = (feedback_rating && feedback_rating <= 2) ? 1 : 0;

    const result = await db.run(`
      INSERT INTO session_records 
      (session_id, assistant_id, materials_distributed, rubbings_completed, 
       shortage_notes, cleanup_delay, participation_feedback, feedback_rating, 
       status, has_shortage, has_delay, has_feedback_issue)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?)
    `, [session_id, assistant_id, materials_distributed || 0, rubbings_completed || 0, 
        shortage_notes || '', cleanup_delay || 0, participation_feedback || '', feedback_rating || null,
        has_shortage, has_delay, has_feedback_issue]);

    await detectAndCreateAnomalies(session_id, result.id, session.material_package_id, assistant_id, {
      has_shortage, has_delay, has_feedback_issue, shortage_notes, cleanup_delay, feedback_rating
    });

    res.json({ id: result.id, message: '记录提交成功' });
  } catch (err) {
    console.error('提交记录错误:', err);
    res.status(500).json({ error: '提交记录失败' });
  }
});

// 复核记录
router.post('/:id/review', adminMiddleware, async (req, res) => {
  try {
    const { review_notes, status } = req.body;
    const reviewed_by = req.user.id;

    const record = await db.get('SELECT * FROM session_records WHERE id = ?', [req.params.id]);
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    const newStatus = status || 'reviewed';

    await db.run(`
      UPDATE session_records 
      SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newStatus, review_notes || '', reviewed_by, req.params.id]);

    const anomalies = await db.all('SELECT * FROM anomalies WHERE record_id = ? AND status = ?', [req.params.id, 'open']);
    for (const anomaly of anomalies) {
      await db.run(`
        UPDATE anomalies 
        SET status = 'resolved', resolved_by = ?, resolved_at = CURRENT_TIMESTAMP, resolution_notes = ?
        WHERE id = ?
      `, [reviewed_by, review_notes || '已复核', anomaly.id]);
    }

    res.json({ message: '复核成功' });
  } catch (err) {
    console.error('复核记录错误:', err);
    res.status(500).json({ error: '复核记录失败' });
  }
});

async function detectAndCreateAnomalies(sessionId, recordId, materialPackageId, assistantId, data) {
  const anomalies = [];

  if (data.has_shortage) {
    const shortageCount = await db.get(
      'SELECT COUNT(*) as count FROM session_records WHERE session_id = ? AND has_shortage = 1',
      [sessionId]
    );
    
    if (shortageCount.count >= 2) {
      anomalies.push({
        type: 'shortage_concentration',
        description: `场次缺料集中，已有 ${shortageCount.count} 条缺料记录`,
        severity: 'high'
      });
    } else {
      anomalies.push({
        type: 'material_shortage',
        description: `缺料说明: ${data.shortage_notes}`,
        severity: 'medium'
      });
    }
  }

  if (data.has_delay) {
    anomalies.push({
      type: 'cleanup_delay',
      description: `清理延迟 ${data.cleanup_delay} 分钟，超过30分钟阈值`,
      severity: 'medium'
    });
  }

  if (data.has_feedback_issue) {
    anomalies.push({
      type: 'feedback_issue',
      description: `参与反馈评分较低: ${data.feedback_rating}分`,
      severity: 'medium'
    });

    if (materialPackageId) {
      const lowFeedbackCount = await db.get(`
        SELECT COUNT(*) as count 
        FROM session_records sr
        JOIN sessions s ON sr.session_id = s.id
        WHERE s.material_package_id = ? AND sr.feedback_rating <= 2 AND sr.feedback_rating IS NOT NULL
      `, [materialPackageId]);

      if (lowFeedbackCount.count >= 3) {
        const existing = await db.get(
          'SELECT id FROM anomalies WHERE type = ? AND material_package_id = ? AND status = ?',
          ['package_feedback_issue', materialPackageId, 'open']
        );
        
        if (!existing) {
          await db.run(`
            INSERT INTO anomalies (type, material_package_id, description, severity, status)
            VALUES (?, ?, ?, ?, 'open')
          `, ['package_feedback_issue', materialPackageId, 
              `材料包反馈异常，已有 ${lowFeedbackCount.count} 条低分反馈`, 'high']);
        }
      }
    }
  }

  for (const anomaly of anomalies) {
    await db.run(`
      INSERT INTO anomalies (type, session_id, record_id, material_package_id, assistant_id, description, severity, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'open')
    `, [anomaly.type, sessionId, recordId, materialPackageId, assistantId, anomaly.description, anomaly.severity]);
  }
}

module.exports = router;
