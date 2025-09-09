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
    const { user_ids, dry_run } = body as { user_ids?: string[]; dry_run?: boolean };

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

    // Resolve target technicians
    let targets: { user_id: string; role: string; created_by_admin_id: string | null }[] = [];

    if (Array.isArray(user_ids) && user_ids.length > 0) {
      const { data, error } = await serviceClient
        .from('profiles')
        .select('user_id, role, created_by_admin_id')
        .in('user_id', user_ids);
      if (error) throw error;
      targets = (data || []).filter((p) => p.role === 'technicien' && p.created_by_admin_id === caller.user.id);
    } else {
      const { data, error } = await serviceClient
        .from('profiles')
        .select('user_id, role, created_by_admin_id')
        .eq('role', 'technicien')
        .eq('created_by_admin_id', caller.user.id);
      if (error) throw error;
      targets = data || [];
    }

    if (!targets.length) {
      return new Response(JSON.stringify({ ok: true, deleted_count: 0, user_ids: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (dry_run) {
      return new Response(JSON.stringify({ ok: true, would_delete: targets.map(t => t.user_id), count: targets.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete resources for each target
    const deletedUserIds: string[] = [];

    for (const t of targets) {
      try {
        // Order of deletion to respect FK / data dependencies
        const deletions = [
          serviceClient.from('chat_messages').delete().eq('technician_id', t.user_id),
          serviceClient.from('intervention_reports').delete().eq('technician_id', t.user_id),
          serviceClient.from('technician_activity').delete().eq('user_id', t.user_id),
          serviceClient.from('profiles').delete().eq('user_id', t.user_id),
        ];

        for (const p of deletions) {
          const { error } = await p;
          if (error) throw error;
        }

        const { error: authDeleteErr } = await serviceClient.auth.admin.deleteUser(t.user_id);
        if (authDeleteErr) {
          console.warn('Auth delete warning for user', t.user_id, authDeleteErr);
        }

        deletedUserIds.push(t.user_id);
      } catch (inner) {
        console.error('Error deleting technician', t.user_id, inner);
        // Continue with next user
      }
    }

    return new Response(JSON.stringify({ ok: true, deleted_count: deletedUserIds.length, user_ids: deletedUserIds }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('admin-bulk-delete-technicians error:', e);
    return new Response(JSON.stringify({ error: e.message || 'Erreur inconnue' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
