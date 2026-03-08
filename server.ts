import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
app.get("/api/perfumes", async (req, res) => {
  const { data, error } = await supabase.from("perfumes").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get("/api/portfolio", async (req, res) => {
  const { data: portfolio, error: portError } = await supabase.from("portfolio").select("*");
  if (portError) return res.status(500).json({ error: portError.message });

  const portfolioWithWorks = await Promise.all(portfolio.map(async (p: any) => {
    const { data: works, error: worksError } = await supabase.from("portfolio_works").select("*").eq("portfolio_id", p.id);
    return { ...p, works: works || [] };
  }));

  res.json(portfolioWithWorks);
});

app.post("/api/messages", async (req, res) => {
  const { name, email, service, message } = req.body;
  const { error } = await supabase.from("messages").insert([{ name, email, service, message }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post("/api/orders", async (req, res) => {
  const { customerName, customerEmail, totalAmount, items } = req.body;
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
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .eq("password", password) // In a real app, use hashed passwords!
    .single();

  if (data && !error) {
    res.json({ success: true, token: "fake-jwt-token" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

app.get("/api/admin/data", async (req, res) => {
  const { data: messages, error: msgError } = await supabase.from("messages").select("*").order("createdAt", { ascending: false });
  const { data: orders, error: ordError } = await supabase.from("orders").select("*").order("createdAt", { ascending: false });
  
  if (msgError || ordError) return res.status(500).json({ error: msgError?.message || ordError?.message });
  res.json({ messages, orders });
});

app.put("/api/admin/perfumes/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, priceValue, image, inStock } = req.body;
  const { error } = await supabase.from("perfumes").update({ name, price, priceValue, image, inStock }).eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.post("/api/admin/perfumes", async (req, res) => {
  const { name, price, priceValue, image, inStock } = req.body;
  const { error } = await supabase.from("perfumes").insert([{ name, price, priceValue, image, inStock }]);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete("/api/admin/perfumes/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("perfumes").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.put("/api/admin/portfolio/:id", async (req, res) => {
  const { id } = req.params;
  const { title, image, description } = req.body;
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
