const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'assistant',
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS fabric_specs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    size TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS paint_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_no TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    production_date TEXT,
    expiry_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS material_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    fabric_spec_id INTEGER,
    paint_batch_id INTEGER,
    plant_types TEXT,
    quantity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fabric_spec_id) REFERENCES fabric_specs(id),
    FOREIGN KEY (paint_batch_id) REFERENCES paint_batches(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_no TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time_start TEXT NOT NULL,
    time_end TEXT NOT NULL,
    location TEXT,
    material_package_id INTEGER,
    expected_participants INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    assistant_id INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_package_id) REFERENCES material_packages(id),
    FOREIGN KEY (assistant_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS session_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    assistant_id INTEGER NOT NULL,
    materials_distributed INTEGER DEFAULT 0,
    rubbings_completed INTEGER DEFAULT 0,
    shortage_notes TEXT,
    cleanup_delay INTEGER DEFAULT 0,
    participation_feedback TEXT,
    feedback_rating INTEGER,
    status TEXT DEFAULT 'pending_review',
    has_shortage INTEGER DEFAULT 0,
    has_delay INTEGER DEFAULT 0,
    has_feedback_issue INTEGER DEFAULT 0,
    review_notes TEXT,
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (assistant_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS anomalies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    session_id INTEGER,
    record_id INTEGER,
    material_package_id INTEGER,
    assistant_id INTEGER,
    description TEXT NOT NULL,
    severity TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    resolved_by INTEGER,
    resolved_at DATETIME,
    resolution_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (record_id) REFERENCES session_records(id),
    FOREIGN KEY (material_package_id) REFERENCES material_packages(id),
    FOREIGN KEY (assistant_id) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS material_supplement_requests (
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

  const adminPassword = bcrypt.hashSync('admin123', 10);
  const assistantPassword = bcrypt.hashSync('assistant123', 10);

  db.run(`INSERT OR IGNORE INTO users (username, password, role, name) VALUES (?, ?, ?, ?)`,
    ['admin', adminPassword, 'admin', '系统管理员']);

  db.run(`INSERT OR IGNORE INTO users (username, password, role, name) VALUES (?, ?, ?, ?)`,
    ['assistant1', assistantPassword, 'assistant', '助理小王']);

  db.run(`INSERT OR IGNORE INTO users (username, password, role, name) VALUES (?, ?, ?, ?)`,
    ['assistant2', assistantPassword, 'assistant', '助理小李']);

  db.run(`INSERT OR IGNORE INTO fabric_specs (name, size, description) VALUES (?, ?, ?)`,
    ['标准方巾', '30x30cm', '标准植物拓印方巾']);

  db.run(`INSERT OR IGNORE INTO fabric_specs (name, size, description) VALUES (?, ?, ?)`,
    ['大手帕', '50x50cm', '大号拓印手帕']);

  db.run(`INSERT OR IGNORE INTO paint_batches (batch_no, color, quantity, production_date) VALUES (?, ?, ?, ?)`,
    ['P2024001', '绿色', 100, '2024-01-15']);

  db.run(`INSERT OR IGNORE INTO paint_batches (batch_no, color, quantity, production_date) VALUES (?, ?, ?, ?)`,
    ['P2024002', '棕色', 80, '2024-02-20']);

  db.run(`INSERT OR IGNORE INTO material_packages (name, description, fabric_spec_id, paint_batch_id, plant_types, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['春季基础包', '包含常见春季植物材料', 1, 1, '枫叶,银杏,梧桐叶', 50, 'active']);

  db.run(`INSERT OR IGNORE INTO material_packages (name, description, fabric_spec_id, paint_batch_id, plant_types, quantity, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['秋季精选包', '秋季特色植物材料包', 2, 2, '红枫,银杏,乌桕叶', 30, 'active']);

  console.log('数据库初始化完成');
  console.log('默认管理员账号: admin / admin123');
  console.log('默认助理账号: assistant1 / assistant123, assistant2 / assistant123');
});

db.close();
