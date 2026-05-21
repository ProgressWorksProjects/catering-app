const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database(path.join(__dirname, 'catering.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    unit TEXT NOT NULL,
    current_stock REAL DEFAULT 0,
    low_stock_alert REAL DEFAULT 0,
    cost_per_unit REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS stock_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    cost_per_unit REAL DEFAULT 0,
    supplier TEXT,
    notes TEXT,
    date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
  );

  CREATE TABLE IF NOT EXISTS fuel_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fuel_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    cost REAL DEFAULT 0,
    date TEXT DEFAULT (date('now')),
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    description TEXT,
    selling_price REAL DEFAULT 0,
    serves INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    date TEXT DEFAULT (date('now')),
    total_amount REAL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
  );

  CREATE TABLE IF NOT EXISTS stock_deductions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
  );
`);

// INGREDIENTS
app.get('/api/ingredients', (req, res) => {
  res.json(db.prepare('SELECT * FROM ingredients ORDER BY name').all());
});

app.post('/api/ingredients', (req, res) => {
  const { name, unit, low_stock_alert, cost_per_unit } = req.body;
  try {
    const r = db.prepare('INSERT INTO ingredients (name, unit, low_stock_alert, cost_per_unit) VALUES (?, ?, ?, ?)').run(name, unit, low_stock_alert || 0, cost_per_unit || 0);
    res.json({ id: r.lastInsertRowid, name, unit, low_stock_alert: low_stock_alert || 0, cost_per_unit: cost_per_unit || 0, current_stock: 0 });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/ingredients/:id', (req, res) => {
  const { name, unit, low_stock_alert, cost_per_unit } = req.body;
  try {
    db.prepare('UPDATE ingredients SET name=?, unit=?, low_stock_alert=?, cost_per_unit=? WHERE id=?').run(name, unit, low_stock_alert, cost_per_unit, req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/ingredients/:id', (req, res) => {
  db.prepare('DELETE FROM ingredients WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/ingredients/:id/stock-in', (req, res) => {
  const { quantity, cost_per_unit, supplier, notes, date } = req.body;
  const id = req.params.id;
  const fn = db.transaction(() => {
    db.prepare('INSERT INTO stock_entries (ingredient_id, quantity, cost_per_unit, supplier, notes, date) VALUES (?, ?, ?, ?, ?, ?)').run(id, quantity, cost_per_unit || 0, supplier || '', notes || '', date || new Date().toISOString().split('T')[0]);
    db.prepare('UPDATE ingredients SET current_stock = current_stock + ?, cost_per_unit = CASE WHEN ? > 0 THEN ? ELSE cost_per_unit END WHERE id = ?').run(quantity, cost_per_unit || 0, cost_per_unit || 0, id);
    return db.prepare('SELECT * FROM ingredients WHERE id=?').get(id);
  });
  res.json(fn());
});

app.get('/api/ingredients/:id/history', (req, res) => {
  res.json(db.prepare('SELECT * FROM stock_entries WHERE ingredient_id=? ORDER BY date DESC, created_at DESC LIMIT 100').all(req.params.id));
});

// FUEL
app.get('/api/fuel', (req, res) => {
  res.json(db.prepare('SELECT * FROM fuel_entries ORDER BY date DESC, created_at DESC').all());
});

app.post('/api/fuel', (req, res) => {
  const { fuel_type, quantity, unit, cost, date, notes } = req.body;
  const r = db.prepare('INSERT INTO fuel_entries (fuel_type, quantity, unit, cost, date, notes) VALUES (?, ?, ?, ?, ?, ?)').run(fuel_type, quantity, unit, cost || 0, date || new Date().toISOString().split('T')[0], notes || '');
  res.json({ id: r.lastInsertRowid, fuel_type, quantity, unit, cost, date, notes });
});

app.delete('/api/fuel/:id', (req, res) => {
  db.prepare('DELETE FROM fuel_entries WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// RECIPES
app.get('/api/recipes', (req, res) => {
  const recipes = db.prepare('SELECT * FROM recipes ORDER BY category, name').all();
  const withIng = recipes.map(r => ({
    ...r,
    ingredients: db.prepare('SELECT ri.*, i.name as ingredient_name, i.unit FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id WHERE ri.recipe_id = ?').all(r.id)
  }));
  res.json(withIng);
});

app.post('/api/recipes', (req, res) => {
  const { name, category, description, selling_price, serves, ingredients } = req.body;
  try {
    const fn = db.transaction(() => {
      const r = db.prepare('INSERT INTO recipes (name, category, description, selling_price, serves) VALUES (?, ?, ?, ?, ?)').run(name, category || '', description || '', selling_price || 0, serves || 1);
      const recipeId = r.lastInsertRowid;
      const ins = db.prepare('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)');
      for (const i of (ingredients || [])) ins.run(recipeId, i.ingredient_id, i.quantity);
      return { id: recipeId };
    });
    res.json(fn());
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/recipes/:id', (req, res) => {
  const { name, category, description, selling_price, serves, ingredients } = req.body;
  try {
    const fn = db.transaction(() => {
      db.prepare('UPDATE recipes SET name=?, category=?, description=?, selling_price=?, serves=? WHERE id=?').run(name, category || '', description || '', selling_price || 0, serves || 1, req.params.id);
      db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id=?').run(req.params.id);
      const ins = db.prepare('INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity) VALUES (?, ?, ?)');
      for (const i of (ingredients || [])) ins.run(req.params.id, i.ingredient_id, i.quantity);
    });
    fn();
    res.json({ success: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/recipes/:id', (req, res) => {
  db.prepare('DELETE FROM recipes WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ORDERS
app.get('/api/orders', (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(orders.map(o => ({
    ...o,
    items: db.prepare('SELECT oi.*, r.name as recipe_name FROM order_items oi JOIN recipes r ON r.id = oi.recipe_id WHERE oi.order_id = ?').all(o.id)
  })));
});

app.post('/api/orders', (req, res) => {
  const { customer_name, date, notes, items } = req.body;
  const orderNumber = 'ORD-' + Date.now().toString().slice(-8);
  try {
    const fn = db.transaction(() => {
      const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      const r = db.prepare('INSERT INTO orders (order_number, customer_name, date, total_amount, notes) VALUES (?, ?, ?, ?, ?)').run(orderNumber, customer_name || '', date || new Date().toISOString().split('T')[0], total, notes || '');
      const orderId = r.lastInsertRowid;
      const insItem = db.prepare('INSERT INTO order_items (order_id, recipe_id, quantity, unit_price) VALUES (?, ?, ?, ?)');
      const insDed = db.prepare('INSERT INTO stock_deductions (order_id, ingredient_id, quantity) VALUES (?, ?, ?)');
      const upStock = db.prepare('UPDATE ingredients SET current_stock = MAX(0, current_stock - ?) WHERE id = ?');
      for (const item of items) {
        insItem.run(orderId, item.recipe_id, item.quantity, item.unit_price);
        const ris = db.prepare('SELECT * FROM recipe_ingredients WHERE recipe_id = ?').all(item.recipe_id);
        for (const ri of ris) {
          const qty = ri.quantity * item.quantity;
          upStock.run(qty, ri.ingredient_id);
          insDed.run(orderId, ri.ingredient_id, qty);
        }
      }
      return { id: orderId, order_number: orderNumber, total_amount: total };
    });
    res.json(fn());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/orders/:id', (req, res) => {
  const fn = db.transaction(() => {
    const deds = db.prepare('SELECT * FROM stock_deductions WHERE order_id=?').all(req.params.id);
    for (const d of deds) db.prepare('UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?').run(d.quantity, d.ingredient_id);
    db.prepare('DELETE FROM orders WHERE id=?').run(req.params.id);
  });
  fn();
  res.json({ success: true });
});

// REPORTS
app.get('/api/reports/summary', (req, res) => {
  res.json({
    totalIngredients: db.prepare('SELECT COUNT(*) as c FROM ingredients').get().c,
    lowStock: db.prepare('SELECT COUNT(*) as c FROM ingredients WHERE low_stock_alert > 0 AND current_stock <= low_stock_alert').get().c,
    totalOrders: db.prepare('SELECT COUNT(*) as c FROM orders').get().c,
    totalRevenue: db.prepare('SELECT COALESCE(SUM(total_amount),0) as t FROM orders').get().t,
    recentOrders: db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all(),
    lowStockItems: db.prepare('SELECT * FROM ingredients WHERE low_stock_alert > 0 AND current_stock <= low_stock_alert ORDER BY (current_stock * 1.0 / low_stock_alert) ASC').all(),
    topDishes: db.prepare('SELECT r.name, SUM(oi.quantity) as total_qty, SUM(oi.quantity * oi.unit_price) as revenue FROM order_items oi JOIN recipes r ON r.id = oi.recipe_id GROUP BY r.id ORDER BY total_qty DESC LIMIT 5').all(),
    monthlyRevenue: db.prepare("SELECT strftime('%Y-%m', date) as month, SUM(total_amount) as revenue, COUNT(*) as orders FROM orders GROUP BY month ORDER BY month DESC LIMIT 6").all()
  });
});

app.get('/api/reports/consumption', (req, res) => {
  const { from, to } = req.query;
  let q = 'SELECT i.name, i.unit, COALESCE(SUM(sd.quantity),0) as total_consumed FROM ingredients i LEFT JOIN stock_deductions sd ON sd.ingredient_id = i.id';
  const params = [];
  if (from && to) {
    q += ' LEFT JOIN orders o ON o.id = sd.order_id WHERE o.date BETWEEN ? AND ?';
    params.push(from, to);
  }
  q += ' GROUP BY i.id ORDER BY total_consumed DESC';
  res.json(db.prepare(q).all(...params));
});

// Serve React frontend in production
const frontendBuild = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuild));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuild, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Catering app running on port ${PORT}`));
