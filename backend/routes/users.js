const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('../utils/database');
const { adminMiddleware } = require('../utils/auth');

const router = express.Router();
const db = new Database();

router.get('/', adminMiddleware, async (req, res) => {
  try {
    const { role, keyword } = req.query;
    let sql = 'SELECT id, username, name, role, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (keyword) {
      sql += ' AND (username LIKE ? OR name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const users = await db.all(sql, params);
    res.json({ users });
  } catch (err) {
    console.error('获取用户列表错误:', err);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { username, password, name, role } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({ error: '请填写必要信息' });
    }

    const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const userRole = role || 'assistant';

    const result = await db.run(`
      INSERT INTO users (username, password, name, role)
      VALUES (?, ?, ?, ?)
    `, [username, hashedPassword, name, userRole]);

    res.json({ id: result.id, message: '用户创建成功' });
  } catch (err) {
    console.error('创建用户错误:', err);
    res.status(500).json({ error: '创建用户失败' });
  }
});

router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { name, password, role } = req.body;

    const existing = await db.get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (password) {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await db.run(`
        UPDATE users SET name = ?, password = ?, role = ? WHERE id = ?
      `, [name, hashedPassword, role || 'assistant', req.params.id]);
    } else {
      await db.run(`
        UPDATE users SET name = ?, role = ? WHERE id = ?
      `, [name, role || 'assistant', req.params.id]);
    }

    res.json({ message: '用户更新成功' });
  } catch (err) {
    console.error('更新用户错误:', err);
    res.status(500).json({ error: '更新用户失败' });
  }
});

router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const user = await db.get('SELECT username FROM users WHERE id = ?', [req.params.id]);
    
    if (user && user.username === 'admin') {
      return res.status(400).json({ error: '不能删除管理员账号' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: '用户删除成功' });
  } catch (err) {
    console.error('删除用户错误:', err);
    res.status(500).json({ error: '删除用户失败' });
  }
});

module.exports = router;
