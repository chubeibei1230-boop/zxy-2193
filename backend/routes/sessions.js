const express = require('express');
const Database = require('../utils/database');
const { adminMiddleware } = require('../utils/auth');

const router = express.Router();
const db = new Database();

// 活动场次列表
router.get('/', async (req, res) => {
  try {
    const { status, date_from, date_to, assistant_id, material_package_id, keyword } = req.query;
    let sql = `
      SELECT s.*, mp.name as material_package_name, u.name as assistant_name
      FROM sessions s
      LEFT JOIN material_packages mp ON s.material_package_id = mp.id
      LEFT JOIN users u ON s.assistant_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND s.status = ?';
      params.push(status);
    }

    if (date_from) {
      sql += ' AND s.date >= ?';
      params.push(date_from);
    }

    if (date_to) {
      sql += ' AND s.date <= ?';
      params.push(date_to);
    }

    if (assistant_id) {
      sql += ' AND s.assistant_id = ?';
      params.push(assistant_id);
    }

    if (material_package_id) {
      sql += ' AND s.material_package_id = ?';
      params.push(material_package_id);
    }

    if (keyword) {
      sql += ' AND (s.title LIKE ? OR s.session_no LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY s.date DESC, s.time_start DESC';

    const sessions = await db.all(sql, params);
    res.json({ sessions });
  } catch (err) {
    console.error('获取场次列表错误:', err);
    res.status(500).json({ error: '获取场次列表失败' });
  }
});

// 场次详情
router.get('/:id', async (req, res) => {
  try {
    const session = await db.get(`
      SELECT s.*, mp.name as material_package_name, u.name as assistant_name,
             mp.quantity as package_quantity
      FROM sessions s
      LEFT JOIN material_packages mp ON s.material_package_id = mp.id
      LEFT JOIN users u ON s.assistant_id = u.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (!session) {
      return res.status(404).json({ error: '场次不存在' });
    }

    const records = await db.all(`
      SELECT sr.*, u.name as assistant_name
      FROM session_records sr
      LEFT JOIN users u ON sr.assistant_id = u.id
      WHERE sr.session_id = ?
      ORDER BY sr.created_at DESC
    `, [req.params.id]);

    res.json({ session, records });
  } catch (err) {
    console.error('获取场次详情错误:', err);
    res.status(500).json({ error: '获取场次详情失败' });
  }
});

// 创建场次
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { session_no, title, date, time_start, time_end, location, material_package_id, expected_participants, status, assistant_id, notes } = req.body;

    if (!session_no || !title || !date || !time_start || !time_end) {
      return res.status(400).json({ error: '请填写必要的场次信息' });
    }

    const existing = await db.get('SELECT id FROM sessions WHERE session_no = ?', [session_no]);
    if (existing) {
      return res.status(400).json({ error: '场次编号已存在' });
    }

    const result = await db.run(`
      INSERT INTO sessions (session_no, title, date, time_start, time_end, location, material_package_id, expected_participants, status, assistant_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [session_no, title, date, time_start, time_end, location || '', material_package_id || null, expected_participants || 0, status || 'pending', assistant_id || null, notes || '']);

    res.json({ id: result.id, message: '场次创建成功' });
  } catch (err) {
    console.error('创建场次错误:', err);
    res.status(500).json({ error: '创建场次失败' });
  }
});

// 更新场次
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { title, date, time_start, time_end, location, material_package_id, expected_participants, status, assistant_id, notes } = req.body;

    const existing = await db.get('SELECT id FROM sessions WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: '场次不存在' });
    }

    await db.run(`
      UPDATE sessions 
      SET title = ?, date = ?, time_start = ?, time_end = ?, location = ?, material_package_id = ?, 
          expected_participants = ?, status = ?, assistant_id = ?, notes = ?
      WHERE id = ?
    `, [title, date, time_start, time_end, location || '', material_package_id || null, expected_participants || 0, status, assistant_id || null, notes || '', req.params.id]);

    res.json({ message: '场次更新成功' });
  } catch (err) {
    console.error('更新场次错误:', err);
    res.status(500).json({ error: '更新场次失败' });
  }
});

// 更新场次状态
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'in_progress', 'pending_review', 'need_supplement', 'completed', 'paused'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }

    const existing = await db.get('SELECT id FROM sessions WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: '场次不存在' });
    }

    await db.run('UPDATE sessions SET status = ? WHERE id = ?', [status, req.params.id]);

    res.json({ message: '状态更新成功' });
  } catch (err) {
    console.error('更新场次状态错误:', err);
    res.status(500).json({ error: '更新场次状态失败' });
  }
});

// 删除场次
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    await db.run('DELETE FROM sessions WHERE id = ?', [req.params.id]);
    res.json({ message: '场次删除成功' });
  } catch (err) {
    console.error('删除场次错误:', err);
    res.status(500).json({ error: '删除场次失败' });
  }
});

// 助理账号管理
router.get('/assistants/list', async (req, res) => {
  try {
    const assistants = await db.all(`
      SELECT id, username, name, role, created_at 
      FROM users 
      WHERE role = 'assistant' 
      ORDER BY created_at DESC
    `);
    res.json({ assistants });
  } catch (err) {
    console.error('获取助理列表错误:', err);
    res.status(500).json({ error: '获取助理列表失败' });
  }
});

module.exports = router;
