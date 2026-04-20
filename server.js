const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Database Setup
const isVercel = process.env.VERCEL;
const dbPath = isVercel ? '/tmp/laundry.db' : path.join(__dirname, 'laundry.db');
const db = new Database(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customerName TEXT,
    phone TEXT,
    garments TEXT,
    totalAmount REAL,
    status TEXT,
    estimatedDelivery TEXT,
    createdAt TEXT
  );
`);

// Insert default admin if not exists
const adminExists = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('password', 10);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hashedPassword);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'washflow-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set to true if using HTTPS
}));

/* --- MIDLLEWARES --- */

const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

/* --- AUTH API --- */

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt for username: ${username}`);
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (user && bcrypt.compareSync(password, user.password)) {
    console.log(`Login successful for user: ${username}`);
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ message: 'Logged in successfully', user: { username: user.username } });
  } else {
    console.log(`Login failed for user: ${username}`);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/me', (req, res) => {
  if (req.session.userId) {
    res.json({ username: req.session.username });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

/* --- ORDERS API --- */

// Helper function to generate Unique Order ID
const generateOrderId = () => {
  return 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase();
};

// 1. Create Order
app.post('/api/orders', isAuthenticated, (req, res) => {
  const { customerName, phone, garments } = req.body;

  if (!customerName || !phone || !garments || !Array.isArray(garments) || garments.length === 0) {
    return res.status(400).json({ error: 'Missing required fields or invalid garments array' });
  }

  let totalAmount = 0;
  const processedGarments = garments.map(g => {
    const qty = Number(g.quantity) || 0;
    const price = Number(g.price) || 0;
    totalAmount += (qty * price);
    return { type: g.type, quantity: qty, price: price };
  });

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 3);

  const newOrder = {
    id: generateOrderId(),
    customerName,
    phone,
    garments: JSON.stringify(processedGarments),
    totalAmount,
    status: 'RECEIVED',
    estimatedDelivery: deliveryDate.toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };

  const insert = db.prepare(`
    INSERT INTO orders (id, customerName, phone, garments, totalAmount, status, estimatedDelivery, createdAt)
    VALUES (@id, @customerName, @phone, @garments, @totalAmount, @status, @estimatedDelivery, @createdAt)
  `);
  
  insert.run(newOrder);
  
  // Return with parsed garments
  res.status(201).json({ ...newOrder, garments: processedGarments });
});

// 2. View Orders (with optional filtering and search)
app.get('/api/orders', isAuthenticated, (req, res) => {
  const { status, search } = req.query;
  
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];

  if (status && status !== 'ALL') {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    const searchParam = `%${search}%`;
    query += ' AND (customerName LIKE ? OR phone LIKE ? OR id LIKE ? OR garments LIKE ?)';
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  query += ' ORDER BY createdAt DESC';

  const orders = db.prepare(query).all(...params).map(o => ({
    ...o,
    garments: JSON.parse(o.garments)
  }));

  res.json(orders);
});

// 3. Update Order Status
app.put('/api/orders/:id/status', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['RECEIVED', 'PROCESSING', 'READY', 'DELIVERED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const update = db.prepare('UPDATE orders SET status = ? WHERE id = ?');
  const result = update.run(status, id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  res.json({ ...updatedOrder, garments: JSON.parse(updatedOrder.garments) });
});

// 4. Basic Dashboard Data
app.get('/api/dashboard', isAuthenticated, (req, res) => {
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as totalOrders,
      SUM(totalAmount) as totalRevenue,
      SUM(CASE WHEN status = 'PROCESSING' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'READY' THEN 1 ELSE 0 END) as ready
    FROM orders
  `).get();

  const ordersPerStatus = {
    RECEIVED: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'RECEIVED'").get().count,
    PROCESSING: stats.processing || 0,
    READY: stats.ready || 0,
    DELIVERED: db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'DELIVERED'").get().count
  };

  res.json({
    totalOrders: stats.totalOrders || 0,
    totalRevenue: stats.totalRevenue || 0,
    ordersPerStatus
  });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
