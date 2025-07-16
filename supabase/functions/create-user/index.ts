import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, nom, prenom, role, telephone } = await req.json();
    
    console.log("Creating user with email:", email);

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create user using admin API (this won't sign in the user)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        nom,
        prenom,
        role
      }
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      throw new Error(`Erreur création auth: ${authError.message}`);
    }

    console.log("User created in auth:", authData.user?.id);

    // Create profile manually since the trigger might not fire with admin creation
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: authData.user.id,
        email,
        nom,
        prenom,
        role,
        telephone: telephone || null,
        actif: true
      });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // If profile creation fails, cleanup the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Erreur création profil: ${profileError.message}`);
    }

    console.log("Profile created successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Utilisateur créé avec succès",
        user: authData.user 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});