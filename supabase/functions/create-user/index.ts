import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, nom, prenom, role, telephone } = await req.json();
    
    console.log('Creating user with admin API:', { email, nom, prenom, role });

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create user with admin API (this won't affect the current session)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        nom,
        prenom,
        role
      },
      email_confirm: true // Auto-confirm email
    });

    if (authError) {
      console.error('Error creating user:', authError);
      throw authError;
    }

    console.log('User created successfully:', authData.user.id);

    // Wait for trigger to create profile, then update with phone
    if (authData.user && telephone) {
      // Small delay to ensure trigger has fired
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ telephone })
        .eq('user_id', authData.user.id);

      if (profileError) {
        console.warn('Warning updating profile phone:', profileError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: authData.user 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});