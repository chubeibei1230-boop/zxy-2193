const express = require('express');
const Database = require('../utils/database');
const { adminMiddleware } = require('../utils/auth');

const router = express.Router();
const db = new Database();

// 材料包管理
router.get('/packages', async (req, res) => {
  try {
    const { status, keyword } = req.query;
    let sql = `
      SELECT mp.*, fs.name as fabric_name, fs.size as fabric_size, 
             pb.batch_no as paint_batch_no, pb.color as paint_color
      FROM material_packages mp
      LEFT JOIN fabric_specs fs ON mp.fabric_spec_id = fs.id
      LEFT JOIN paint_batches pb ON mp.paint_batch_id = pb.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND mp.status = ?';
      params.push(status);
    }

    if (keyword) {
      sql += ' AND (mp.name LIKE ? OR mp.description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY mp.created_at DESC';

    const packages = await db.all(sql, params);
    res.json({ packages });
  } catch (err) {
    console.error('获取材料包列表错误:', err);
    res.status(500).json({ error: '获取材料包列表失败' });
  }
});

router.get('/packages/:id', async (req, res) => {
  try {
    const pkg = await db.get(`
      SELECT mp.*, fs.name as fabric_name, fs.size as fabric_size,
             pb.batch_no as paint_batch_no, pb.color as paint_color
      FROM material_packages mp
      LEFT JOIN fabric_specs fs ON mp.fabric_spec_id = fs.id
      LEFT JOIN paint_batches pb ON mp.paint_batch_id = pb.id
      WHERE mp.id = ?
    `, [req.params.id]);

    if (!pkg) {
      return res.status(404).json({ error: '材料包不存在' });
    }

    res.json({ package: pkg });
  } catch (err) {
    console.error('获取材料包详情错误:', err);
    res.status(500).json({ error: '获取材料包详情失败' });
  }
});

router.post('/packages', adminMiddleware, async (req, res) => {
  try {
    const { name, description, fabric_spec_id, paint_batch_id, plant_types, quantity, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: '材料包名称不能为空' });
    }

    const result = await db.run(`
      INSERT INTO material_packages (name, description, fabric_spec_id, paint_batch_id, plant_types, quantity, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, description || '', fabric_spec_id || null, paint_batch_id || null, plant_types || '', quantity || 0, status || 'active']);

    res.json({ id: result.id, message: '材料包创建成功' });
  } catch (err) {
    console.error('创建材料包错误:', err);
    res.status(500).json({ error: '创建材料包失败' });
  }
});

router.put('/packages/:id', adminMiddleware, async (req, res) => {
  try {
    const { name, description, fabric_spec_id, paint_batch_id, plant_types, quantity, status } = req.body;

    const existing = await db.get('SELECT id FROM material_packages WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: '材料包不存在' });
    }

    await db.run(`
      UPDATE material_packages 
      SET name = ?, description = ?, fabric_spec_id = ?, paint_batch_id = ?, plant_types = ?, quantity = ?, status = ?
      WHERE id = ?
    `, [name, description || '', fabric_spec_id || null, paint_batch_id || null, plant_types || '', quantity || 0, status || 'active', req.params.id]);

    res.json({ message: '材料包更新成功' });
  } catch (err) {
    console.error('更新材料包错误:', err);
    res.status(500).json({ error: '更新材料包失败' });
  }
});

router.delete('/packages/:id', adminMiddleware, async (req, res) => {
  try {
    await db.run('DELETE FROM material_packages WHERE id = ?', [req.params.id]);
    res.json({ message: '材料包删除成功' });
  } catch (err) {
    console.error('删除材料包错误:', err);
    res.status(500).json({ error: '删除材料包失败' });
  }
});

// 布片规格管理
router.get('/fabrics', async (req, res) => {
  try {
    const fabrics = await db.all('SELECT * FROM fabric_specs ORDER BY created_at DESC');
    res.json({ fabrics });
  } catch (err) {
    console.error('获取布片规格列表错误:', err);
    res.status(500).json({ error: '获取布片规格列表失败' });
  }
});

router.post('/fabrics', adminMiddleware, async (req, res) => {
  try {
    const { name, size, description } = req.body;

    if (!name || !size) {
      return res.status(400).json({ error: '名称和尺寸不能为空' });
    }

    const result = await db.run(`
      INSERT INTO fabric_specs (name, size, description)
      VALUES (?, ?, ?)
    `, [name, size, description || '']);

    res.json({ id: result.id, message: '布片规格创建成功' });
  } catch (err) {
    console.error('创建布片规格错误:', err);
    res.status(500).json({ error: '创建布片规格失败' });
  }
});

router.put('/fabrics/:id', adminMiddleware, async (req, res) => {
  try {
    const { name, size, description } = req.body;

    const existing = await db.get('SELECT id FROM fabric_specs WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: '布片规格不存在' });
    }

    await db.run(`
      UPDATE fabric_specs SET name = ?, size = ?, description = ? WHERE id = ?
    `, [name, size, description || '', req.params.id]);

    res.json({ message: '布片规格更新成功' });
  } catch (err) {
    console.error('更新布片规格错误:', err);
    res.status(500).json({ error: '更新布片规格失败' });
  }
});

router.delete('/fabrics/:id', adminMiddleware, async (req, res) => {
  try {
    await db.run('DELETE FROM fabric_specs WHERE id = ?', [req.params.id]);
    res.json({ message: '布片规格删除成功' });
  } catch (err) {
    console.error('删除布片规格错误:', err);
    res.status(500).json({ error: '删除布片规格失败' });
  }
});

// 颜料批次管理
router.get('/paints', async (req, res) => {
  try {
    const paints = await db.all('SELECT * FROM paint_batches ORDER BY created_at DESC');
    res.json({ paints });
  } catch (err) {
    console.error('获取颜料批次列表错误:', err);
    res.status(500).json({ error: '获取颜料批次列表失败' });
  }
});

router.post('/paints', adminMiddleware, async (req, res) => {
  try {
    const { batch_no, color, quantity, production_date, expiry_date } = req.body;

    if (!batch_no || !color) {
      return res.status(400).json({ error: '批次号和颜色不能为空' });
    }

    const result = await db.run(`
      INSERT INTO paint_batches (batch_no, color, quantity, production_date, expiry_date)
      VALUES (?, ?, ?, ?, ?)
    `, [batch_no, color, quantity || 0, production_date || null, expiry_date || null]);

    res.json({ id: result.id, message: '颜料批次创建成功' });
  } catch (err) {
    console.error('创建颜料批次错误:', err);
    res.status(500).json({ error: '创建颜料批次失败' });
  }
});

router.put('/paints/:id', adminMiddleware, async (req, res) => {
  try {
    const { batch_no, color, quantity, production_date, expiry_date } = req.body;

    const existing = await db.get('SELECT id FROM paint_batches WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: '颜料批次不存在' });
    }

    await db.run(`
      UPDATE paint_batches SET batch_no = ?, color = ?, quantity = ?, production_date = ?, expiry_date = ?
      WHERE id = ?
    `, [batch_no, color, quantity || 0, production_date || null, expiry_date || null, req.params.id]);

    res.json({ message: '颜料批次更新成功' });
  } catch (err) {
    console.error('更新颜料批次错误:', err);
    res.status(500).json({ error: '更新颜料批次失败' });
  }
});

router.delete('/paints/:id', adminMiddleware, async (req, res) => {
  try {
    await db.run('DELETE FROM paint_batches WHERE id = ?', [req.params.id]);
    res.json({ message: '颜料批次删除成功' });
  } catch (err) {
    console.error('删除颜料批次错误:', err);
    res.status(500).json({ error: '删除颜料批次失败' });
  }
});

module.exports = router;
