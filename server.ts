import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseKey && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (e) {
    console.error("Supabase initialization failed:", e);
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", supabase: !!supabase });
});

// API Routes
app.get("/api/perfumes", async (req, res) => {
  if (!supabase) {
    return res.json([
      { id: 1, name: "Creed Aventus (Mock)", price: "₦18,000", priceValue: 18000, image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop", inStock: 1 },
      { id: 2, name: "Sauvage Elixir (Mock)", price: "₦22,000", priceValue: 22000, image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=400&fit=crop", inStock: 1 }
    ]);
  }
  const { data, error } = await supabase.from("perfumes").select("*");
  if (error) {
    console.error("Supabase Error (perfumes):", error);
    return res.status(500).json({ error: error.message, code: error.code });
  }
  res.json(data);
});

app.get("/api/portfolio", async (req, res) => {
  if (!supabase) {
    return res.json([
      { id: 1, title: "Wedding Highlight (Mock)", image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=400&fit=crop", description: "Mock description for preview.", works: [] }
    ]);
  }
  const { data: portfolio, error: portError } = await supabase.from("portfolio").select("*");
  if (portError) {
    console.error("Supabase Error (portfolio):", portError);
    return res.status(500).json({ error: portError.message, code: portError.code });
  }

  const portfolioWithWorks = await Promise.all(portfolio.map(async (p: any) => {
    const { data: works, error: worksError } = await supabase.from("portfolio_works").select("*").eq("portfolio_id", p.id);
    return { ...p, works: works || [] };
  }));

  res.json(portfolioWithWorks);
});

app.post("/api/messages", async (req, res) => {
  const { name, email, service, message } = req.body;
  if (!supabase) return res.json({ success: true, mock: true });
  const { error } = await supabase.from("messages").insert([{ name, email, service, message }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post("/api/orders", async (req, res) => {
  const { customerName, customerEmail, totalAmount, items } = req.body;
  if (!supabase) return res.json({ success: true, mock: true });
  const { error } = await supabase.from("orders").insert([{ 
    customerName, 
    customerEmail, 
    totalAmount, 
    items: JSON.stringify(items) 
  }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Admin Routes
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  
  // First check env vars as fallback
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "password123";

  if (username === adminUser && password === adminPass) {
    return res.json({ success: true, token: "fake-jwt-token" });
  }

  // Then check Supabase users table
  if (supabase) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password) // In a real app, use hashed passwords!
      .single();

    if (data && !error) {
      return res.json({ success: true, token: "fake-jwt-token" });
    }
  }

  res.status(401).json({ success: false, message: "Invalid credentials" });
});

app.get("/api/admin/data", async (req, res) => {
  if (!supabase) {
    return res.json({ messages: [], orders: [] });
  }
  const { data: messages, error: msgError } = await supabase.from("messages").select("*").order("createdAt", { ascending: false });
  const { data: orders, error: ordError } = await supabase.from("orders").select("*").order("createdAt", { ascending: false });
  
  if (msgError || ordError) return res.status(500).json({ error: msgError?.message || ordError?.message });
  res.json({ messages, orders });
});

app.put("/api/admin/perfumes/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, priceValue, image, inStock } = req.body;
  if (!supabase) return res.json({ success: true });
  const { error } = await supabase.from("perfumes").update({ name, price, priceValue, image, inStock }).eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post("/api/admin/perfumes", async (req, res) => {
  const { name, price, priceValue, image, inStock } = req.body;
  if (!supabase) return res.json({ success: true });
  const { error } = await supabase.from("perfumes").insert([{ name, price, priceValue, image, inStock }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/admin/perfumes/:id", async (req, res) => {
  const { id } = req.params;
  if (!supabase) return res.json({ success: true });
  const { error } = await supabase.from("perfumes").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.put("/api/admin/portfolio/:id", async (req, res) => {
  const { id } = req.params;
  const { title, image, description } = req.body;
  if (!supabase) return res.json({ success: true });
  const { error } = await supabase.from("portfolio").update({ title, image, description }).eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
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
