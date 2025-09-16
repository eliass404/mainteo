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

    const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const body = await req.json().catch(() => ({}));
    const { user_id } = body;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth check
    const { data: caller, error: callerErr } = await authedClient.auth.getUser();
    if (callerErr || !caller?.user) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure caller is admin
    const { data: callerProfile, error: profileErr } = await authedClient
      .from('profiles')
      .select('user_id, role')
      .eq('user_id', caller.user.id)
      .maybeSingle();

    if (profileErr || !callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Accès refusé: admin requis' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get target profile
    const { data: target, error: targetErr } = await serviceClient
      .from('profiles')
      .select('user_id, role, created_by_admin_id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (targetErr || !target) {
      return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Allow admin to delete technicians they created OR technicians with no creator (self-registered)
    if (target.role !== 'technicien' || (target.created_by_admin_id !== null && target.created_by_admin_id !== caller.user.id)) {
      return new Response(JSON.stringify({ error: "Suppression non autorisée" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete resources in order
    const steps: Array<Promise<any>> = [
      serviceClient.from('chat_messages').delete().eq('technician_id', user_id),
      serviceClient.from('intervention_reports').delete().eq('technician_id', user_id),
      serviceClient.from('technician_activity').delete().eq('user_id', user_id),
      serviceClient.from('profiles').delete().eq('user_id', user_id),
    ];

    for (const p of steps) {
      const { error } = await p;
      if (error) throw error;
    }

    // Delete auth user (best-effort, but should succeed with service role)
    const { error: authDeleteErr } = await serviceClient.auth.admin.deleteUser(user_id);
    if (authDeleteErr) {
      console.warn('Auth delete warning:', authDeleteErr);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('admin-delete-user error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Erreur inconnue' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});