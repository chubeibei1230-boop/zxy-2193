const express = require('express');
const Database = require('../utils/database');

const router = express.Router();
const db = new Database();

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

// 概览总览数据
router.get('/overview', async (req, res) => {
  try {
    await detectReviewMissed();
    const { date_from, date_to, material_package_id, assistant_id, status, anomaly_type } = req.query;

    let sessionCondition = '';
    let recordCondition = '';
    let anomalyCondition = '';
    const sessionParams = [];
    const recordParams = [];
    const anomalyParams = [];

    if (date_from) {
      sessionCondition += ' AND s.date >= ?';
      sessionParams.push(date_from);
      recordCondition += ' AND s.date >= ?';
      recordParams.push(date_from);
    }
    if (date_to) {
      sessionCondition += ' AND s.date <= ?';
      sessionParams.push(date_to);
      recordCondition += ' AND s.date <= ?';
      recordParams.push(date_to);
    }
    if (material_package_id) {
      sessionCondition += ' AND s.material_package_id = ?';
      sessionParams.push(material_package_id);
      recordCondition += ' AND s.material_package_id = ?';
      recordParams.push(material_package_id);
      anomalyCondition += ' AND a.material_package_id = ?';
      anomalyParams.push(material_package_id);
    }
    if (assistant_id) {
      sessionCondition += ' AND s.assistant_id = ?';
      sessionParams.push(assistant_id);
      recordCondition += ' AND sr.assistant_id = ?';
      recordParams.push(assistant_id);
      anomalyCondition += ' AND a.assistant_id = ?';
      anomalyParams.push(assistant_id);
    }
    if (status) {
      sessionCondition += ' AND s.status = ?';
      sessionParams.push(status);
    }
    if (anomaly_type) {
      anomalyCondition += ' AND a.type = ?';
      anomalyParams.push(anomaly_type);
    }

    const totalSessions = await db.get(
      `SELECT COUNT(*) as count FROM sessions s WHERE 1=1 ${sessionCondition}`,
      sessionParams
    );

    const completedSessions = await db.get(
      `SELECT COUNT(*) as count FROM sessions s WHERE status = 'completed' ${sessionCondition}`,
      sessionParams
    );

    const totalRecords = await db.get(
      `SELECT COUNT(*) as count FROM session_records sr
       JOIN sessions s ON sr.session_id = s.id
       WHERE 1=1 ${recordCondition}`,
      recordParams
    );

    const pendingReview = await db.get(
      `SELECT COUNT(*) as count FROM session_records sr
       JOIN sessions s ON sr.session_id = s.id
       WHERE sr.status = 'pending_review' ${recordCondition}`,
      recordParams
    );

    const openAnomalies = await db.get(
      `SELECT COUNT(*) as count FROM anomalies a
       LEFT JOIN sessions s ON a.session_id = s.id
       WHERE a.status = 'open' ${anomalyCondition}`,
      anomalyParams
    );

    const totalRubbings = await db.get(
      `SELECT COALESCE(SUM(sr.rubbings_completed), 0) as total
       FROM session_records sr
       JOIN sessions s ON sr.session_id = s.id
       WHERE 1=1 ${recordCondition}`,
      recordParams
    );

    const totalMaterials = await db.get(
      `SELECT COALESCE(SUM(sr.materials_distributed), 0) as total
       FROM session_records sr
       JOIN sessions s ON sr.session_id = s.id
       WHERE 1=1 ${recordCondition}`,
      recordParams
    );

    const completionRate = totalSessions.count > 0 
      ? Math.round((completedSessions.count / totalSessions.count) * 100) 
      : 0;

    const successRate = totalMaterials.total > 0
      ? Math.round((totalRubbings.total / totalMaterials.total) * 100)
      : 0;

    res.json({
      total_sessions: totalSessions.count,
      completed_sessions: completedSessions.count,
      completion_rate: completionRate,
      total_records: totalRecords.count,
      pending_review: pendingReview.count,
      open_anomalies: openAnomalies.count,
      total_rubbings: totalRubbings.total,
      total_materials_distributed: totalMaterials.total,
      success_rate: successRate
    });
  } catch (err) {
    console.error('获取概览数据错误:', err);
    res.status(500).json({ error: '获取概览数据失败' });
  }
});

// 完成率趋势（按日期）
router.get('/completion-trend', async (req, res) => {
  try {
    const { date_from, date_to, days = 30 } = req.query;

    let sql;
    let params = [];

    if (date_from && date_to) {
      sql = `
        SELECT date, 
               COUNT(*) as total_sessions,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions
        FROM sessions
        WHERE date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC
      `;
      params = [date_from, date_to];
    } else {
      sql = `
        SELECT date, 
               COUNT(*) as total_sessions,
               SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions
        FROM sessions
        WHERE date >= date('now', 'start of day', ?)
        GROUP BY date
        ORDER BY date ASC
      `;
      params = [`-${days} days`];
    }

    const data = await db.all(sql, params);

    const trend = data.map(item => ({
      date: item.date,
      total: item.total_sessions,
      completed: item.completed_sessions,
      rate: item.total_sessions > 0 
        ? Math.round((item.completed_sessions / item.total_sessions) * 100) 
        : 0
    }));

    res.json({ trend });
  } catch (err) {
    console.error('获取完成率趋势错误:', err);
    res.status(500).json({ error: '获取完成率趋势失败' });
  }
});

// 缺料趋势
router.get('/shortage-trend', async (req, res) => {
  try {
    const { date_from, date_to, days = 30 } = req.query;

    let sql;
    let params = [];

    if (date_from && date_to) {
      sql = `
        SELECT date(sr.created_at) as date,
               COUNT(*) as total_records,
               SUM(CASE WHEN sr.has_shortage = 1 THEN 1 ELSE 0 END) as shortage_count
        FROM session_records sr
        JOIN sessions s ON sr.session_id = s.id
        WHERE date(sr.created_at) >= ? AND date(sr.created_at) <= ?
        GROUP BY date(sr.created_at)
        ORDER BY date ASC
      `;
      params = [date_from, date_to];
    } else {
      sql = `
        SELECT date(sr.created_at) as date,
               COUNT(*) as total_records,
               SUM(CASE WHEN sr.has_shortage = 1 THEN 1 ELSE 0 END) as shortage_count
        FROM session_records sr
        WHERE sr.created_at >= datetime('now', ?)
        GROUP BY date(sr.created_at)
        ORDER BY date ASC
      `;
      params = [`-${days} days`];
    }

    const data = await db.all(sql, params);

    const trend = data.map(item => ({
      date: item.date,
      total_records: item.total_records,
      shortage_count: item.shortage_count,
      rate: item.total_records > 0 
        ? Math.round((item.shortage_count / item.total_records) * 100) 
        : 0
    }));

    res.json({ trend });
  } catch (err) {
    console.error('获取缺料趋势错误:', err);
    res.status(500).json({ error: '获取缺料趋势失败' });
  }
});

// 助理负载统计
router.get('/assistant-workload', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    let dateCondition = '';
    const params = [];

    if (date_from) {
      dateCondition += ' AND s.date >= ?';
      params.push(date_from);
    }
    if (date_to) {
      dateCondition += ' AND s.date <= ?';
      params.push(date_to);
    }

    const workload = await db.all(`
      SELECT u.id, u.name, u.username,
             COUNT(DISTINCT s.id) as session_count,
             COUNT(sr.id) as record_count,
             COALESCE(SUM(sr.rubbings_completed), 0) as total_rubbings,
             SUM(CASE WHEN sr.has_shortage = 1 THEN 1 ELSE 0 END) as shortage_count,
             SUM(CASE WHEN sr.status = 'pending_review' THEN 1 ELSE 0 END) as pending_count
      FROM users u
      LEFT JOIN sessions s ON u.id = s.assistant_id ${dateCondition}
      LEFT JOIN session_records sr ON u.id = sr.assistant_id
      WHERE u.role = 'assistant'
      GROUP BY u.id, u.name, u.username
      ORDER BY session_count DESC
    `, params);

    res.json({ workload });
  } catch (err) {
    console.error('获取助理负载错误:', err);
    res.status(500).json({ error: '获取助理负载失败' });
  }
});

// 待复核事项列表
router.get('/pending-items', async (req, res) => {
  try {
    await detectReviewMissed();
    const { limit = 10 } = req.query;

    const pendingRecords = await db.all(`
      SELECT sr.id, sr.session_id, sr.status, sr.created_at,
             s.title as session_title, s.session_no, s.date as session_date,
             u.name as assistant_name,
             sr.has_shortage, sr.has_delay, sr.has_feedback_issue
      FROM session_records sr
      JOIN sessions s ON sr.session_id = s.id
      LEFT JOIN users u ON sr.assistant_id = u.id
      WHERE sr.status = 'pending_review'
      ORDER BY sr.created_at ASC
      LIMIT ?
    `, [limit]);

    const openAnomalies = await db.all(`
      SELECT a.id, a.type, a.severity, a.description, a.created_at,
             s.title as session_title, s.session_no,
             mp.name as material_package_name,
             u.name as assistant_name
      FROM anomalies a
      LEFT JOIN sessions s ON a.session_id = s.id
      LEFT JOIN material_packages mp ON a.material_package_id = mp.id
      LEFT JOIN users u ON a.assistant_id = u.id
      WHERE a.status = 'open'
      ORDER BY 
        CASE a.severity 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          ELSE 3 
        END,
        a.created_at ASC
      LIMIT ?
    `, [limit]);

    res.json({
      pending_records: pendingRecords,
      open_anomalies: openAnomalies
    });
  } catch (err) {
    console.error('获取待复核事项错误:', err);
    res.status(500).json({ error: '获取待复核事项失败' });
  }
});

// 材料包使用统计
router.get('/material-usage', async (req, res) => {
  try {
    const usage = await db.all(`
      SELECT mp.id, mp.name, mp.quantity,
             COUNT(DISTINCT s.id) as session_count,
             COALESCE(SUM(sr.materials_distributed), 0) as total_distributed,
             COALESCE(SUM(sr.rubbings_completed), 0) as total_rubbings,
             SUM(CASE WHEN sr.has_shortage = 1 THEN 1 ELSE 0 END) as shortage_count,
             AVG(CASE WHEN sr.feedback_rating IS NOT NULL THEN sr.feedback_rating END) as avg_rating
      FROM material_packages mp
      LEFT JOIN sessions s ON mp.id = s.material_package_id
      LEFT JOIN session_records sr ON s.id = sr.session_id
      WHERE mp.status = 'active'
      GROUP BY mp.id, mp.name
      ORDER BY session_count DESC
    `);

    res.json({ usage });
  } catch (err) {
    console.error('获取材料包使用统计错误:', err);
    res.status(500).json({ error: '获取材料包使用统计失败' });
  }
});

module.exports = router;
