import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password, nom, prenom, role, telephone } = await req.json()

    // Initialize Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Creating user with email:', email)

    // Create user using admin API (doesn't auto-login)
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        nom,
        prenom,
        role
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw new Error(`Erreur création auth: ${authError.message}`)
    }

    if (!userData.user) {
      throw new Error('Aucun utilisateur créé')
    }

    console.log('User created successfully:', userData.user.id)

    // Wait for trigger to create profile
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Update profile with phone number if provided
    if (telephone) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ telephone })
        .eq('user_id', userData.user.id)

      if (profileError) {
        console.warn('Profile update error:', profileError)
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: userData.user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in create-user function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})