const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { authMiddleware, adminMiddleware } = require('./utils/auth');

const authRoutes = require('./routes/auth');
const materialRoutes = require('./routes/materials');
const sessionRoutes = require('./routes/sessions');
const recordRoutes = require('./routes/records');
const anomalyRoutes = require('./routes/anomalies');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');

const app = express();
const PORT = 8122;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/materials', authMiddleware, materialRoutes);
app.use('/api/sessions', authMiddleware, sessionRoutes);
app.use('/api/records', authMiddleware, recordRoutes);
app.use('/api/anomalies', authMiddleware, anomalyRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/users', authMiddleware, userRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '植物拓印活动管理系统后端运行正常' });
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});
