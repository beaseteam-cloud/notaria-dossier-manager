import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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
    // Require authentication - only service role or admin can call this endpoint
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    // Allow service role key for cron jobs
    if (token === serviceRoleKey) {
      console.log('Authenticated via service role key');
    } else {
      // Verify if it's an admin user token
      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      
      const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
      
      if (authError || !user) {
        console.error('Invalid token:', authError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized - invalid token' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Check if user is admin
      const { data: profile, error: profileError } = await supabaseAuth
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (profileError || !profile || profile.role !== 'admin') {
        console.error('User is not admin:', { userId: user.id, role: profile?.role });
        return new Response(
          JSON.stringify({ error: 'Forbidden - admin access required' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      console.log('Authenticated via admin user:', user.id);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Checking for delayed tasks...')

    // Récupérer toutes les étapes en retard (non terminées et dépassant la date prévue)
    const { data: delayedSteps, error: stepsError } = await supabaseClient
      .from('etapes_dossiers')
      .select(`
        id,
        nom,
        date_fin_prevue,
        assignee_id,
        dossier_id,
        etape_modele_id,
        dossiers (
          nom,
          client_nom
        ),
        etapes_modeles (
          nature
        )
      `)
      .not('status', 'eq', 'terminee')
      .lt('date_fin_prevue', new Date().toISOString())
      .not('date_fin_prevue', 'is', null)

    if (stepsError) {
      console.error('Error fetching delayed steps:', stepsError)
      throw stepsError
    }

    console.log(`Found ${delayedSteps?.length || 0} delayed steps`)

    if (!delayedSteps || delayedSteps.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No delayed steps found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Pour chaque étape en retard, vérifier s'il existe déjà une notification
    for (const step of delayedSteps) {
      if (!step.assignee_id) continue

      // Vérifier si une notification existe déjà pour cette étape
      const { data: existingNotification } = await supabaseClient
        .from('notifications')
        .select('id')
        .eq('user_id', step.assignee_id)
        .eq('dossier_id', step.dossier_id)
        .eq('type', 'retard')
        .like('message', `%${step.nom}%`)
        .single()

      if (existingNotification) {
        console.log(`Notification already exists for step ${step.id}`)
        continue
      }

      // Créer la notification
      const nature = step.etapes_modeles?.nature || 'interne'
      const dossierNom = step.dossiers?.nom || 'Dossier inconnu'
      
      const { error: notificationError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: step.assignee_id,
          dossier_id: step.dossier_id,
          type: 'retard',
          titre: 'Retard',
          message: `${dossierNom} - ${step.nom} (${nature === 'interne' ? 'Interne' : 'Externe'})`
        })

      if (notificationError) {
        console.error('Error creating notification:', notificationError)
      } else {
        console.log(`Created notification for step ${step.id}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Delay check completed',
        processedSteps: delayedSteps.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in check-delays function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})