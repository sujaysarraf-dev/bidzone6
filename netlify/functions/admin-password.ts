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
    const { userId, newPassword } = JSON.parse(event.body || "{}");
    if (!userId || !newPassword) return { statusCode: 400, body: JSON.stringify({ error: "User ID and new password are required" }) };

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    
    if (error) {
      if (error.message.includes('User not found')) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();
          
        if (profile) {
          return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              success: true, 
              message: 'Password reset simulated for demo user (not in Auth table).' 
            })
          };
        }
      }
      throw error;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ success: true, message: "Password reset successfully" })
    };
  } catch (error: any) {
    console.error("Error resetting password:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
