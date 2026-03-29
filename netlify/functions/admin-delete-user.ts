import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  
  if (!supabaseAdmin) {
    return { statusCode: 503, body: JSON.stringify({ error: "Admin service key not configured on server (Netlify)." }) };
  }

  try {
    const { userId } = JSON.parse(event.body || "{}");
    if (!userId) return { statusCode: 400, body: JSON.stringify({ error: "User ID is required" }) };

    // 1. Delete from Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError && !authError.message.includes('User not found')) {
      throw authError;
    }

    // 2. Delete from profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) throw profileError;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, message: "User deleted successfully" })
    };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
