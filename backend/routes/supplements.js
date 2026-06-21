const express = require('express');
const Database = require('../utils/database');
const { adminMiddleware } = require('../utils/auth');

const router = express.Router();
const db = new Database();

async function ensureTableExists() {
  try {
    await db.run(`CREATE TABLE IF NOT EXISTS material_supplement_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      record_id INTEGER,
      material_package_id INTEGER,
      assistant_id INTEGER NOT NULL,
      reason_type TEXT NOT NULL,
      reason TEXT NOT NULL,
      urgency TEXT DEFAULT 'medium',
      suggested_quantity INTEGER DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      processed_quantity INTEGER DEFAULT 0,
      processing_notes TEXT,
      processed_by INTEGER,
      processed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      FOREIGN KEY (record_id) REFERENCES session_records(id),
      FOREIGN KEY (material_package_id) REFERENCES material_packages(id),
      FOREIGN KEY (assistant_id) REFERENCES users(id),
      FOREIGN KEY (processed_by) REFERENCES users(id)
    )`);
  } catch (err) {
    console.error('创建补料申请表失败:', err);
  }
}

ensureTableExists();

router.get('/', async (req, res) => {
  try {
    let { session_id, status, urgency, reason_type, assistant_id, date_from, date_to } = req.query;

    if (req.user.role === 'assistant') {
      assistant_id = req.user.id;
    }

    let sql = `
      SELECT msr.*, 
             s.title as session_title, s.session_no, s.date as session_date,
             s.expected_participants,
             mp.name as material_package_name,
             ua.name as assistant_name,
             up.name as processor_name
      FROM material_supplement_requests msr
      LEFT JOIN sessions s ON msr.session_id = s.id
      LEFT JOIN material_packages mp ON msr.material_package_id = mp.id
      LEFT JOIN users ua ON msr.assistant_id = ua.id
      LEFT JOIN users up ON msr.processed_by = up.id
      WHERE 1=1
    `;
    const params = [];

    if (session_id) {
      sql += ' AND msr.session_id = ?';
      params.push(session_id);
    }
    if (status) {
      sql += ' AND msr.status = ?';
      params.push(status);
    }
    if (urgency) {
      sql += ' AND msr.urgency = ?';
      params.push(urgency);
    }
    if (reason_type) {
      sql += ' AND msr.reason_type = ?';
      params.push(reason_type);
    }
    if (assistant_id) {
      sql += ' AND msr.assistant_id = ?';
      params.push(assistant_id);
    }
    if (date_from) {
      sql += ' AND date(msr.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      sql += ' AND date(msr.created_at) <= ?';
      params.push(date_to);
    }

    sql += ' ORDER BY CASE msr.urgency WHEN "urgent" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 ELSE 4 END, msr.created_at DESC';

    const requests = await db.all(sql, params);
    res.json({ requests });
  } catch (err) {
    console.error('获取补料申请列表错误:', err);
    res.status(500).json({ error: '获取补料申请列表失败' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const request = await db.get(`
      SELECT msr.*, 
             s.title as session_title, s.session_no, s.date as session_date,
             s.expected_participants,
             mp.name as material_package_name,
             ua.name as assistant_name,
             up.name as processor_name
      FROM material_supplement_requests msr
      LEFT JOIN sessions s ON msr.session_id = s.id
      LEFT JOIN material_packages mp ON msr.material_package_id = mp.id
      LEFT JOIN users ua ON msr.assistant_id = ua.id
      LEFT JOIN users up ON msr.processed_by = up.id
      WHERE msr.id = ?
    `, [req.params.id]);

    if (!request) {
      return res.status(404).json({ error: '补料申请不存在' });
    }

    res.json({ request });
  } catch (err) {
    console.error('获取补料申请详情错误:', err);
    res.status(500).json({ error: '获取补料申请详情失败' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      session_id, record_id, material_package_id,
      reason_type, reason, urgency, suggested_quantity, notes
    } = req.body;

    const assistant_id = req.user.id;

    if (!session_id) {
      return res.status(400).json({ error: '场次ID不能为空' });
    }
    if (!reason_type) {
      return res.status(400).json({ error: '请选择补料原因类型' });
    }
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: '请填写申请原因' });
    }

    const validReasonTypes = ['material_shortage', 'abnormal_loss', 'participants_exceeded', 'other'];
    if (!validReasonTypes.includes(reason_type)) {
      return res.status(400).json({ error: '无效的原因类型' });
    }

    const validUrgencies = ['low', 'medium', 'high', 'urgent'];
    const finalUrgency = validUrgencies.includes(urgency) ? urgency : 'medium';

    const session = await db.get('SELECT * FROM sessions WHERE id = ?', [session_id]);
    if (!session) {
      return res.status(404).json({ error: '场次不存在' });
    }

    const result = await db.run(`
      INSERT INTO material_supplement_requests 
      (session_id, record_id, material_package_id, assistant_id,
       reason_type, reason, urgency, suggested_quantity, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      session_id,
      record_id || null,
      material_package_id || session.material_package_id || null,
      assistant_id,
      reason_type,
      reason,
      finalUrgency,
      suggested_quantity || 0,
      notes || ''
    ]);

    await db.run('UPDATE sessions SET status = ? WHERE id = ? AND status NOT IN (?, ?)',
      ['need_supplement', session_id, 'completed', 'need_supplement']);

    res.json({ id: result.id, message: '补料申请提交成功' });
  } catch (err) {
    console.error('提交补料申请错误:', err);
    res.status(500).json({ error: '提交补料申请失败' });
  }
});

router.post('/:id/process', adminMiddleware, async (req, res) => {
  try {
    const { action, processed_quantity, processing_notes } = req.body;
    const processed_by = req.user.id;

    const validActions = ['approve', 'reject', 'partial'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: '无效的处理操作' });
    }

    const request = await db.get('SELECT * FROM material_supplement_requests WHERE id = ?', [req.params.id]);
    if (!request) {
      return res.status(404).json({ error: '补料申请不存在' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: '该申请已被处理' });
    }

    let status, finalProcessedQuantity;

    switch (action) {
      case 'approve':
        status = 'approved';
        finalProcessedQuantity = processed_quantity != null ? processed_quantity : request.suggested_quantity;
        break;
      case 'reject':
        status = 'rejected';
        finalProcessedQuantity = 0;
        break;
      case 'partial':
        status = 'partial';
        if (processed_quantity == null || processed_quantity <= 0) {
          return res.status(400).json({ error: '部分通过需填写实际补料数量' });
        }
        finalProcessedQuantity = processed_quantity;
        break;
    }

    await db.run(`
      UPDATE material_supplement_requests 
      SET status = ?, processed_quantity = ?, processing_notes = ?, 
          processed_by = ?, processed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, finalProcessedQuantity, processing_notes || '', processed_by, req.params.id]);

    if (status !== 'rejected') {
      const session = await db.get('SELECT * FROM sessions WHERE id = ?', [request.session_id]);
      if (session && session.material_package_id && finalProcessedQuantity > 0) {
        await db.run('UPDATE material_packages SET quantity = quantity - ? WHERE id = ?',
          [finalProcessedQuantity, session.material_package_id]);
      }
    }

    res.json({ message: '处理成功', status });
  } catch (err) {
    console.error('处理补料申请错误:', err);
    res.status(500).json({ error: '处理补料申请失败' });
  }
});

router.get('/stats/summary', async (req, res) => {
  try {
    let { date_from, date_to, material_package_id, assistant_id } = req.query;

    let condition = '';
    const params = [];

    if (date_from) {
      condition += ' AND date(msr.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      condition += ' AND date(msr.created_at) <= ?';
      params.push(date_to);
    }
    if (material_package_id) {
      condition += ' AND msr.material_package_id = ?';
      params.push(material_package_id);
    }
    if (assistant_id) {
      condition += ' AND msr.assistant_id = ?';
      params.push(assistant_id);
    }

    const total = await db.get(
      `SELECT COUNT(*) as count FROM material_supplement_requests msr WHERE 1=1 ${condition}`,
      params
    );

    const pending = await db.get(
      `SELECT COUNT(*) as count FROM material_supplement_requests msr WHERE status = 'pending' ${condition}`,
      params
    );

    const approved = await db.get(
      `SELECT COUNT(*) as count FROM material_supplement_requests msr WHERE status = 'approved' ${condition}`,
      params
    );

    const rejected = await db.get(
      `SELECT COUNT(*) as count FROM material_supplement_requests msr WHERE status = 'rejected' ${condition}`,
      params
    );

    const partial = await db.get(
      `SELECT COUNT(*) as count FROM material_supplement_requests msr WHERE status = 'partial' ${condition}`,
      params
    );

    const quantityStats = await db.get(`
      SELECT 
        COALESCE(SUM(suggested_quantity), 0) as total_suggested,
        COALESCE(SUM(processed_quantity), 0) as total_processed
      FROM material_supplement_requests msr
      WHERE 1=1 ${condition}
    `, params);

    const urgentCount = await db.get(
      `SELECT COUNT(*) as count FROM material_supplement_requests msr WHERE urgency IN ('high', 'urgent') AND status = 'pending' ${condition}`,
      params
    );

    res.json({
      total_requests: total.count,
      pending_requests: pending.count,
      approved_requests: approved.count,
      rejected_requests: rejected.count,
      partial_requests: partial.count,
      total_suggested_quantity: quantityStats.total_suggested,
      total_processed_quantity: quantityStats.total_processed,
      urgent_pending: urgentCount.count
    });
  } catch (err) {
    console.error('获取补料统计错误:', err);
    res.status(500).json({ error: '获取补料统计失败' });
  }
});

router.get('/stats/by-session', async (req, res) => {
  try {
    let { date_from, date_to, limit = 10 } = req.query;

    let condition = '';
    const params = [];

    if (date_from) {
      condition += ' AND date(msr.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      condition += ' AND date(msr.created_at) <= ?';
      params.push(date_to);
    }

    const data = await db.all(`
      SELECT s.id, s.title, s.session_no, s.date,
             COUNT(msr.id) as request_count,
             COALESCE(SUM(msr.suggested_quantity), 0) as suggested_total,
             COALESCE(SUM(msr.processed_quantity), 0) as processed_total
      FROM sessions s
      LEFT JOIN material_supplement_requests msr ON s.id = msr.session_id
      WHERE msr.id IS NOT NULL ${condition}
      GROUP BY s.id, s.title, s.session_no, s.date
      ORDER BY request_count DESC
      LIMIT ?
    `, [...params, limit]);

    res.json({ data });
  } catch (err) {
    console.error('获取场次补料统计错误:', err);
    res.status(500).json({ error: '获取场次补料统计失败' });
  }
});

router.get('/stats/by-assistant', async (req, res) => {
  try {
    let { date_from, date_to } = req.query;

    let condition = '';
    const params = [];

    if (date_from) {
      condition += ' AND date(msr.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      condition += ' AND date(msr.created_at) <= ?';
      params.push(date_to);
    }

    const data = await db.all(`
      SELECT u.id, u.name, u.username,
             COUNT(msr.id) as request_count,
             SUM(CASE WHEN msr.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
             COALESCE(SUM(msr.suggested_quantity), 0) as suggested_total
      FROM users u
      LEFT JOIN material_supplement_requests msr ON u.id = msr.assistant_id
      WHERE u.role = 'assistant'
      GROUP BY u.id, u.name, u.username
      ORDER BY request_count DESC
    `, params);

    res.json({ data });
  } catch (err) {
    console.error('获取助理补料统计错误:', err);
    res.status(500).json({ error: '获取助理补料统计失败' });
  }
});

router.get('/stats/by-package', async (req, res) => {
  try {
    let { date_from, date_to } = req.query;

    let condition = '';
    const params = [];

    if (date_from) {
      condition += ' AND date(msr.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      condition += ' AND date(msr.created_at) <= ?';
      params.push(date_to);
    }

    const data = await db.all(`
      SELECT mp.id, mp.name, mp.quantity,
             COUNT(msr.id) as request_count,
             SUM(CASE WHEN msr.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
             COALESCE(SUM(msr.suggested_quantity), 0) as suggested_total,
             COALESCE(SUM(msr.processed_quantity), 0) as processed_total
      FROM material_packages mp
      LEFT JOIN material_supplement_requests msr ON mp.id = msr.material_package_id
      WHERE mp.status = 'active'
      GROUP BY mp.id, mp.name, mp.quantity
      ORDER BY request_count DESC
    `, params);

    res.json({ data });
  } catch (err) {
    console.error('获取材料包补料统计错误:', err);
    res.status(500).json({ error: '获取材料包补料统计失败' });
  }
});

router.get('/stats/by-reason', async (req, res) => {
  try {
    let { date_from, date_to } = req.query;

    let condition = '';
    const params = [];

    if (date_from) {
      condition += ' AND date(msr.created_at) >= ?';
      params.push(date_from);
    }
    if (date_to) {
      condition += ' AND date(msr.created_at) <= ?';
      params.push(date_to);
    }

    const data = await db.all(`
      SELECT reason_type,
             COUNT(*) as count,
             COALESCE(SUM(suggested_quantity), 0) as suggested_total
      FROM material_supplement_requests msr
      WHERE 1=1 ${condition}
      GROUP BY reason_type
      ORDER BY count DESC
    `, params);

    res.json({ data });
  } catch (err) {
    console.error('获取补料原因统计错误:', err);
    res.status(500).json({ error: '获取补料原因统计失败' });
  }
});

router.get('/stats/trend', async (req, res) => {
  try {
    const { date_from, date_to, days = 14 } = req.query;

    let sql;
    let params = [];

    if (date_from && date_to) {
      sql = `
        SELECT date(msr.created_at) as date,
               COUNT(*) as request_count,
               SUM(CASE WHEN msr.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
               COALESCE(SUM(msr.suggested_quantity), 0) as suggested_quantity
        FROM material_supplement_requests msr
        WHERE date(msr.created_at) >= ? AND date(msr.created_at) <= ?
        GROUP BY date(msr.created_at)
        ORDER BY date ASC
      `;
      params = [date_from, date_to];
    } else {
      sql = `
        SELECT date(msr.created_at) as date,
               COUNT(*) as request_count,
               SUM(CASE WHEN msr.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
               COALESCE(SUM(msr.suggested_quantity), 0) as suggested_quantity
        FROM material_supplement_requests msr
        WHERE msr.created_at >= datetime('now', ?)
        GROUP BY date(msr.created_at)
        ORDER BY date ASC
      `;
      params = [`-${days} days`];
    }

    const trend = await db.all(sql, params);
    res.json({ trend });
  } catch (err) {
    console.error('获取补料趋势错误:', err);
    res.status(500).json({ error: '获取补料趋势失败' });
  }
});

module.exports = router;
