import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import mime from "mime-types";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  let finalUrl = supabaseUrl.trim();
  let finalKey = supabaseKey.trim();

  // 1. Detect if URL and Key were swapped
  const isUrlLike = (s: string) => s.startsWith('http') || s.includes('.supabase.co');
  const isKeyLike = (s: string) => s.length > 50 || s.includes('eyJ'); // JWTs are long and start with eyJ

  if (isKeyLike(finalUrl) && isUrlLike(finalKey)) {
    console.warn("⚠️ Potential Configuration Error: It looks like SUPABASE_URL and SUPABASE_ANON_KEY might be swapped in your Secrets.");
    [finalUrl, finalKey] = [finalKey, finalUrl]; // Try swapping them back
  }

  // 2. Try to fix common URL mistakes
  if (!finalUrl.startsWith('http')) {
    if (finalUrl.includes('.supabase.co')) {
      finalUrl = `https://${finalUrl}`;
    } else if (/^[a-z0-9]{15,30}$/i.test(finalUrl)) {
      // Looks like a project ref (usually ~20 chars alphanumeric)
      const ref = finalUrl;
      finalUrl = `https://${ref}.supabase.co`;
      console.info(`ℹ️ Interpreting SUPABASE_URL "${ref}" as project reference: ${finalUrl}`);
    } else {
      finalUrl = `https://${finalUrl}`;
    }
  }

  try {
    const url = new URL(finalUrl);
    if (url.protocol.startsWith('http')) {
      if (!url.hostname.endsWith('.supabase.co') && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
        console.warn("⚠️ Warning: SUPABASE_URL host does not end in .supabase.co:", url.hostname);
      }
      supabase = createClient(finalUrl, finalKey);
    } else {
      console.error("❌ Supabase initialization failed: URL protocol must be http or https");
    }
  } catch (e) {
    console.error("❌ Supabase initialization failed: The provided SUPABASE_URL is not a valid web address.");
    console.error("👉 Please check Settings > Secrets. It should be a full URL like https://xyz.supabase.co");
  }
} else if (process.env.NODE_ENV === 'production') {
  console.warn("⚠️ Warning: Supabase credentials are not configured. Using mock data fallback.");
}

const app = express();
const PORT = 3000;

app.use(express.json());

// Media API Endpoint
app.get("/api/media/:filename", (req, res) => {
  const { filename } = req.params;
  // Look in public/media
  const filePath = path.join(process.cwd(), "public", "media", filename);

  if (fs.existsSync(filePath)) {
    const contentType = mime.lookup(filePath) || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    // Cache for 1 year
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    fs.createReadStream(filePath).pipe(res);
  } else {
    console.error(`Media not found: ${filePath}`);
    res.status(404).json({ error: "Media file not found" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", supabase: !!supabase });
});

// API Routes
const MOCK_PERFUMES = [
  { id: 1, name: "Creed Aventus (Mock)", price: "₦18,000", priceValue: 18000, image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop", inStock: 1 },
  { id: 2, name: "Sauvage Elixir (Mock)", price: "₦22,000", priceValue: 22000, image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=400&fit=crop", inStock: 1 }
];

const MOCK_PORTFOLIO = [
  { id: 1, title: "Wedding Highlight (Mock)", image: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=400&fit=crop", description: "Mock description for preview.", works: [] }
];

app.get("/api/perfumes", async (req, res) => {
  if (!supabase) {
    return res.json(MOCK_PERFUMES);
  }
  try {
    const { data, error } = await supabase.from("perfumes").select("*");
    if (error) {
      // Only log if it's not a common fetch failure to reduce noise
      if (!error.message?.includes('fetch failed')) {
        console.error("Supabase Error (perfumes):", error);
      }
      return res.json(MOCK_PERFUMES);
    }
    res.json(data || MOCK_PERFUMES);
  } catch (err: any) {
    if (!err.message?.includes('fetch failed')) {
      console.error("Unexpected Error (perfumes):", err);
    }
    res.json(MOCK_PERFUMES);
  }
});

app.get("/api/portfolio", async (req, res) => {
  if (!supabase) {
    return res.json(MOCK_PORTFOLIO);
  }
  try {
    const { data: portfolio, error: portError } = await supabase.from("portfolio").select("*");
    if (portError) {
      if (!portError.message?.includes('fetch failed')) {
        console.error("Supabase Error (portfolio):", portError);
      }
      return res.json(MOCK_PORTFOLIO);
    }

    if (!portfolio || portfolio.length === 0) {
      return res.json(MOCK_PORTFOLIO);
    }

    const portfolioWithWorks = await Promise.all(portfolio.map(async (p: any) => {
      try {
        const { data: works, error: worksError } = await supabase.from("portfolio_works").select("*").eq("portfolio_id", p.id);
        return { ...p, works: works || [] };
      } catch (e) {
        return { ...p, works: [] };
      }
    }));

    res.json(portfolioWithWorks);
  } catch (err: any) {
    console.error("Unexpected Error (portfolio):", err);
    res.json(MOCK_PORTFOLIO);
  }
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
  try {
    const { data: messages, error: msgError } = await supabase.from("messages").select("*").order("createdAt", { ascending: false });
    const { data: orders, error: ordError } = await supabase.from("orders").select("*").order("createdAt", { ascending: false });
    
    if (msgError || ordError) {
      const err = msgError || ordError;
      // Only log if it's not a common fetch failure
      if (!err?.message?.includes('fetch failed')) {
        console.error("Supabase Admin Data Error:", err);
      }
      // If fetch failed or table missing, return empty lists instead of 500
      if (err?.message?.includes('fetch failed') || err?.message?.includes('does not exist')) {
        return res.json({ messages: [], orders: [] });
      }
      return res.status(500).json({ error: err?.message });
    }
    res.json({ messages: messages || [], orders: orders || [] });
  } catch (err: any) {
    if (!err.message?.includes('fetch failed')) {
      console.error("Unexpected Admin Data Error:", err);
    }
    res.json({ messages: [], orders: [] });
  }
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
