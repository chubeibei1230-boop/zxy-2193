const express = require('express');
const Database = require('../utils/database');
const { adminMiddleware } = require('../utils/auth');

const router = express.Router();
const db = new Database();

// 获取异常列表
router.get('/', async (req, res) => {
  try {
    let { status, type, severity, session_id, material_package_id, assistant_id, date_from, date_to } = req.query;
    
    if (req.user.role === 'assistant') {
      assistant_id = req.user.id;
    }
    
    if (req.user?.role === 'admin') {
      await detectReviewMissed();
    }
    
    let sql = `
      SELECT a.*, s.title as session_title, s.session_no, s.date as session_date,
             mp.name as material_package_name,
             u.name as assistant_name, rv.name as resolver_name
      FROM anomalies a
      LEFT JOIN sessions s ON a.session_id = s.id
      LEFT JOIN material_packages mp ON a.material_package_id = mp.id
      LEFT JOIN users u ON a.assistant_id = u.id
      LEFT JOIN users rv ON a.resolved_by = rv.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    if (type) {
      sql += ' AND a.type = ?';
      params.push(type);
    }

    if (severity) {
      sql += ' AND a.severity = ?';
      params.push(severity);
    }

    if (session_id) {
      sql += ' AND a.session_id = ?';
      params.push(session_id);
    }

    if (material_package_id) {
      sql += ' AND a.material_package_id = ?';
      params.push(material_package_id);
    }

    if (assistant_id) {
      sql += ' AND a.assistant_id = ?';
      params.push(assistant_id);
    }

    if (date_from) {
      sql += ' AND date(a.created_at) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      sql += ' AND date(a.created_at) <= ?';
      params.push(date_to);
    }

    sql += ' ORDER BY a.created_at DESC';

    const anomalies = await db.all(sql, params);
    res.json({ anomalies });
  } catch (err) {
    console.error('获取异常列表错误:', err);
    res.status(500).json({ error: '获取异常列表失败' });
  }
});

// 获取异常详情
router.get('/:id', async (req, res) => {
  try {
    const anomaly = await db.get(`
      SELECT a.*, s.title as session_title, s.session_no, s.date as session_date,
             mp.name as material_package_name,
             u.name as assistant_name, rv.name as resolver_name,
             sr.shortage_notes, sr.cleanup_delay, sr.feedback_rating
      FROM anomalies a
      LEFT JOIN sessions s ON a.session_id = s.id
      LEFT JOIN material_packages mp ON a.material_package_id = mp.id
      LEFT JOIN users u ON a.assistant_id = u.id
      LEFT JOIN users rv ON a.resolved_by = rv.id
      LEFT JOIN session_records sr ON a.record_id = sr.id
      WHERE a.id = ?
    `, [req.params.id]);

    if (!anomaly) {
      return res.status(404).json({ error: '异常不存在' });
    }

    res.json({ anomaly });
  } catch (err) {
    console.error('获取异常详情错误:', err);
    res.status(500).json({ error: '获取异常详情失败' });
  }
});

// 处理/关闭异常
router.post('/:id/resolve', adminMiddleware, async (req, res) => {
  try {
    const { resolution_notes } = req.body;
    const resolved_by = req.user.id;

    const anomaly = await db.get('SELECT * FROM anomalies WHERE id = ?', [req.params.id]);
    if (!anomaly) {
      return res.status(404).json({ error: '异常不存在' });
    }

    await db.run(`
      UPDATE anomalies 
      SET status = 'resolved', resolved_by = ?, resolved_at = CURRENT_TIMESTAMP, resolution_notes = ?
      WHERE id = ?
    `, [resolved_by, resolution_notes || '', req.params.id]);

    res.json({ message: '异常已关闭' });
  } catch (err) {
    console.error('关闭异常错误:', err);
    res.status(500).json({ error: '关闭异常失败' });
  }
});

// 异常类型统计
router.get('/stats/types', async (req, res) => {
  try {
    const stats = await db.all(`
      SELECT type, COUNT(*) as count, 
             SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count
      FROM anomalies
      GROUP BY type
      ORDER BY count DESC
    `);
    res.json({ stats });
  } catch (err) {
    console.error('获取异常类型统计错误:', err);
    res.status(500).json({ error: '获取异常类型统计失败' });
  }
});

// 检测复核遗漏
router.get('/detection/missed-review', adminMiddleware, async (req, res) => {
  try {
    const records = await db.all(`
      SELECT sr.*, s.title as session_title, s.session_no, s.date as session_date,
             u.name as assistant_name
      FROM session_records sr
      JOIN sessions s ON sr.session_id = s.id
      LEFT JOIN users u ON sr.assistant_id = u.id
      WHERE sr.status = 'pending_review' 
        AND sr.created_at < datetime('now', '-24 hours')
      ORDER BY sr.created_at ASC
    `);

    res.json({ records, count: records.length });
  } catch (err) {
    console.error('检测复核遗漏错误:', err);
    res.status(500).json({ error: '检测复核遗漏失败' });
  }
});

async function detectReviewMissed() {
  try {
    const missedRecords = await db.all(`
      SELECT sr.id, sr.session_id, sr.assistant_id, sr.created_at,
             s.title as session_title, s.material_package_id
      FROM session_records sr
      JOIN sessions s ON sr.session_id = s.id
      WHERE sr.status = 'pending_review' 
        AND sr.created_at < datetime('now', '-24 hours')
    `);

    for (const record of missedRecords) {
      const existing = await db.get(
        'SELECT id FROM anomalies WHERE type = ? AND record_id = ? AND status = ?',
        ['review_missed', record.id, 'open']
      );
      
      if (!existing) {
        await db.run(`
          INSERT INTO anomalies (type, session_id, record_id, material_package_id, assistant_id, description, severity, status)
          VALUES (?, ?, ?, ?, ?, ?, 'medium', 'open')
        `, [
          'review_missed', 
          record.session_id, 
          record.id, 
          record.material_package_id,
          record.assistant_id,
          `记录提交超过24小时未复核：${record.session_title}`
        ]);
      }
    }
  } catch (err) {
    console.error('自动检测复核遗漏错误:', err);
  }
}

module.exports = router;
