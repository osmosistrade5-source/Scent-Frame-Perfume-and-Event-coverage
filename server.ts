import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.VERCEL ? path.join("/tmp", "scentframe.db") : "scentframe.db";
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS perfumes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    priceValue INTEGER NOT NULL,
    image TEXT NOT NULL,
    inStock INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    image TEXT NOT NULL,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS portfolio_works (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    portfolio_id INTEGER,
    title TEXT NOT NULL,
    image TEXT NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY(portfolio_id) REFERENCES portfolio(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    service TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerName TEXT NOT NULL,
    customerEmail TEXT NOT NULL,
    totalAmount INTEGER NOT NULL,
    items TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Seed initial data if empty
const perfumeCount = db.prepare("SELECT count(*) as count FROM perfumes").get() as { count: number };
if (perfumeCount.count === 0) {
  const insertPerfume = db.prepare("INSERT INTO perfumes (name, price, priceValue, image, inStock) VALUES (?, ?, ?, ?, ?)");
  insertPerfume.run("Creed Aventus", "₦18,000", 18000, "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop", 1);
  insertPerfume.run("Sauvage Elixir", "₦22,000", 22000, "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=400&fit=crop", 1);
  insertPerfume.run("Bleu de Chanel", "₦20,000", 20000, "https://images.unsplash.com/photo-1594035910387-fea47794261f?w=400&h=400&fit=crop", 1);
  insertPerfume.run("Tom Ford Oud Wood", "₦25,000", 25000, "https://images.unsplash.com/photo-1583467875263-d50dec37a88c?w=400&h=400&fit=crop", 1);
}

const portfolioCount = db.prepare("SELECT count(*) as count FROM portfolio").get() as { count: number };
if (portfolioCount.count === 0) {
  const insertPortfolio = db.prepare("INSERT INTO portfolio (title, image, description) VALUES (?, ?, ?)");
  const insertWork = db.prepare("INSERT INTO portfolio_works (portfolio_id, title, image, type) VALUES (?, ?, ?, ?)");

  const p1 = insertPortfolio.run("Wedding Highlight – 2025", "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=400&fit=crop", "Capturing the magic of your special day with cinematic precision and emotional depth.").lastInsertRowid;
  insertWork.run(p1, "The Royal Union", "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop", "video");
  insertWork.run(p1, "Garden Vows", "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=600&h=400&fit=crop", "photo");

  const p2 = insertPortfolio.run("Corporate Brand Film", "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&h=400&fit=crop", "Telling your brand's story through high-quality visual narratives that resonate with your audience.").lastInsertRowid;
  insertWork.run(p2, "Tech Startup Launch", "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=600&h=400&fit=crop", "video");

  const p3 = insertPortfolio.run("Music Video Shoot", "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop", "Creative and dynamic music videos that bring your sound to life visually.").lastInsertRowid;
  insertWork.run(p3, "Afrobeats Night", "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&h=400&fit=crop", "video");

  const p4 = insertPortfolio.run("Event Coverage – Benin City", "https://images.unsplash.com/photo-1472653431158-6364773b2a56?w=600&h=400&fit=crop", "Professional coverage for festivals, concerts, and private events in the heart of Benin City.").lastInsertRowid;
  insertWork.run(p4, "Igue Festival 2024", "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop", "video");
}

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
app.get("/api/perfumes", (req, res) => {
  const perfumes = db.prepare("SELECT * FROM perfumes").all();
  res.json(perfumes);
});

app.get("/api/portfolio", (req, res) => {
  const portfolio = db.prepare("SELECT * FROM portfolio").all();
  const portfolioWithWorks = portfolio.map((p: any) => {
    const works = db.prepare("SELECT * FROM portfolio_works WHERE portfolio_id = ?").all(p.id);
    return { ...p, works };
  });
  res.json(portfolioWithWorks);
});

app.post("/api/messages", (req, res) => {
  const { name, email, service, message } = req.body;
  db.prepare("INSERT INTO messages (name, email, service, message) VALUES (?, ?, ?, ?)").run(name, email, service, message);
  res.json({ success: true });
});

app.post("/api/orders", (req, res) => {
  const { customerName, customerEmail, totalAmount, items } = req.body;
  db.prepare("INSERT INTO orders (customerName, customerEmail, totalAmount, items) VALUES (?, ?, ?, ?)").run(customerName, customerEmail, totalAmount, JSON.stringify(items));
  res.json({ success: true });
});

// Admin Routes
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "password123";

  if (username === adminUser && password === adminPass) {
    res.json({ success: true, token: "fake-jwt-token" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

app.get("/api/admin/data", (req, res) => {
  // In a real app, verify token here
  const messages = db.prepare("SELECT * FROM messages ORDER BY createdAt DESC").all();
  const orders = db.prepare("SELECT * FROM orders ORDER BY createdAt DESC").all();
  res.json({ messages, orders });
});

app.put("/api/admin/perfumes/:id", (req, res) => {
  const { id } = req.params;
  const { name, price, priceValue, image, inStock } = req.body;
  db.prepare("UPDATE perfumes SET name = ?, price = ?, priceValue = ?, image = ?, inStock = ? WHERE id = ?")
    .run(name, price, priceValue, image, inStock, id);
  res.json({ success: true });
});

app.post("/api/admin/perfumes", (req, res) => {
  const { name, price, priceValue, image, inStock } = req.body;
  db.prepare("INSERT INTO perfumes (name, price, priceValue, image, inStock) VALUES (?, ?, ?, ?, ?)")
    .run(name, price, priceValue, image, inStock);
  res.json({ success: true });
});

app.delete("/api/admin/perfumes/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM perfumes WHERE id = ?").run(id);
  res.json({ success: true });
});

app.put("/api/admin/portfolio/:id", (req, res) => {
  const { id } = req.params;
  const { title, image, description } = req.body;
  db.prepare("UPDATE portfolio SET title = ?, image = ?, description = ? WHERE id = ?")
    .run(title, image, description, id);
  res.json({ success: true });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Only listen if not on Vercel
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
