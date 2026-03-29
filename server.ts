import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

// AI Assistant - Gemini Configuration
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
// Using Gemma 3 model which typically has higher free-tier availability in 2026
const aiModel = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });
const fallbackModel = genAI.getGenerativeModel({ model: "gemma-3-12b-it" });
console.log("AI: Configured with Gemma 3 27B (Free Tier Opt)");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Admin client with service role key - made optional for development
let supabaseAdmin: any = null;
if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
} else {
  console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Admin routes (/api/admin/*) will not work.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Bidzone API is running", ai: true });
  });

  // AI Chat endpoint - direct Gemini integration
  app.post("/api/chat", async (req, res) => {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    if (!GEMINI_API_KEY) {
      return res.json({ reply: "I'm sorry, the AI service is not configured (API key missing)." });
    }

    try {
      const systemPrompt = `You are the Bidzone Assistant. You help users navigate an intelligent financial asset auction platform in Nepal. Be professional, helpful, and concise. ${context ? `Context: ${context}` : ""}`;
      
      let text = "";
      try {
        const result = await aiModel.generateContent([
          { text: systemPrompt },
          { text: message }
        ]);
        const response = await result.response;
        text = response.text();
      } catch (innerError: any) {
        console.warn("Primary AI Model Failed, trying fallback...", innerError.message);
        // Fallback to smaller Gemma model if primary fails (rate limited)
        const result = await fallbackModel.generateContent([
          { text: systemPrompt },
          { text: message }
        ]);
        const response = await result.response;
        text = response.text();
      }
      
      if (!text) {
        return res.json({ reply: "I'm sorry, I couldn't generate a response. Please try again in a few moments." });
      }

      res.json({ reply: text });
    } catch (error: any) {
      console.error("AI API Error:", error);
      res.json({ reply: "I'm sorry, the AI service hit a rate limit. Please try again shortly or contact support if the issue persists." });
    }
  });

  app.post("/api/admin/delete-user", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Admin service key not configured on server." });
    }
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID is required" });

    try {
      // 1. Delete from Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (authError && !authError.message.includes('User not found')) {
        throw authError;
      }

      // 2. Delete from profiles (Cascade should handle it if real user, but for demo users we do it manually)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;

      res.json({ success: true, message: "User deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/reset-password", async (req, res) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: "Admin service key not configured on server." });
    }
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ error: "User ID and new password are required" });

    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      });
      
      if (error) {
        if (error.message.includes('User not found')) {
          // If user not found in Auth, check if they exist in profiles
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();
            
          if (profile) {
            // User exists in profiles but not in Auth (likely a demo/mock user)
            return res.json({ 
              success: true, 
              message: 'Password reset simulated for demo user (not in Auth table).' 
            });
          }
        }
        throw error;
      }

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
