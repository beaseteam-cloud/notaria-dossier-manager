import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
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

    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create a regular client with the JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Verify the user is an admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      throw new Error('Admin access required')
    }

    const { action, userId, userData } = await req.json()

    switch (action) {
      case 'delete':
        // Delete user from auth
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (deleteError) throw deleteError

        // Delete profile (should cascade)
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('user_id', userId)

        return new Response(
          JSON.stringify({ success: true, message: 'User deleted successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'create':
        // Create user in auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          user_metadata: {
            nom: userData.nom,
            prenom: userData.prenom,
            role: userData.role
          }
        })

        if (createError) throw createError

        // Create profile
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            user_id: newUser.user.id,
            email: userData.email,
            nom: userData.nom,
            prenom: userData.prenom,
            telephone: userData.telephone,
            role: userData.role
          })

        if (profileError) throw profileError

        return new Response(
          JSON.stringify({ success: true, message: 'User created successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'update':
        // Update user in auth if password is provided
        if (userData.password) {
          const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: userData.password }
          )
          if (updateAuthError) throw updateAuthError
        }

        // Update profile
        const { error: updateProfileError } = await supabaseAdmin
          .from('profiles')
          .update({
            email: userData.email,
            nom: userData.nom,
            prenom: userData.prenom,
            telephone: userData.telephone,
            role: userData.role,
            actif: userData.actif
          })
          .eq('user_id', userId)

        if (updateProfileError) throw updateProfileError

        return new Response(
          JSON.stringify({ success: true, message: 'User updated successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})