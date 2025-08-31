import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase environment variables');
    }

    // Client with caller's JWT to check permissions
    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // Service role client to perform admin ops
    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json();
    const { email, password, username, role = 'technicien', phone, department } = body ?? {};

    if (!email || !password || !username) {
      return new Response(JSON.stringify({ error: 'email, password et username sont requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is authenticated
    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: profile, error: profileErr } = await authedClient
      .from('profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (profileErr || !profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Accès refusé: admin requis' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enforce unique username (fast pre-check)
    const { data: existingUsername } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUsername) {
      return new Response(JSON.stringify({ error: 'Nom d\'utilisateur déjà utilisé' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create auth user (confirmed)
    const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, role, phone, department }
    });

    if (createErr || !created?.user) {
      throw new Error(createErr?.message || 'Erreur lors de la création de l\'utilisateur');
    }

    // Create profile row
    const { error: profileInsertErr } = await serviceClient
      .from('profiles')
      .insert({ user_id: created.user.id, username, role, email });

    if (profileInsertErr) {
      console.error('Profile insert error:', profileInsertErr);
      // Best-effort cleanup
      await serviceClient.auth.admin.deleteUser(created.user.id);
      throw new Error('Échec de création du profil: ' + profileInsertErr.message);
    }

    return new Response(JSON.stringify({ ok: true, user_id: created.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('admin-create-user error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Erreur inconnue' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});