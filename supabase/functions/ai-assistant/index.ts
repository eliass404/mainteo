import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { message, machineId } = await req.json();
    console.log('Received message:', message, 'for machine:', machineId);

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Get machine information
    const { data: machine, error: machineError } = await supabaseClient
      .from('machines')
      .select('*')
      .eq('id', machineId)
      .single();

    if (machineError || !machine) {
      throw new Error('Machine not found');
    }

    // Get previous chat messages for context (last 10 messages)
    const { data: previousMessages, error: messagesError } = await supabaseClient
      .from('chat_messages')
      .select('role, content')
      .eq('machine_id', machineId)
      .eq('technician_id', user.id)
      .order('created_at', { ascending: true })
      .limit(10);

    if (messagesError) {
      console.error('Error fetching previous messages:', messagesError);
    }

    // Save user message
    await supabaseClient
      .from('chat_messages')
      .insert({
        machine_id: machineId,
        technician_id: user.id,
        role: 'user',
        content: message
      });

    // Create AI prompt with machine context and identity
    const systemPrompt = `Tu es MAIA (Machine Assistant Intelligence Artificielle), l'assistante IA spécialisée dans la maintenance industrielle. 

🤖 TON IDENTITÉ :
- Assistante IA experte en maintenance de machines industrielles
- Spécialisée dans l'analyse de documents techniques (manuels, notices, schémas)
- Capable de diagnostiquer les problèmes et proposer des solutions
- Communicative, précise et orientée sécurité

📋 INFORMATIONS SUR LA MACHINE ACTUELLE :
- ID: ${machine.id}
- Nom: ${machine.name}
- Type: ${machine.type}
- Emplacement: ${machine.location}
- Département: ${machine.department}
- Statut: ${machine.status}
- Description: ${machine.description || 'Non spécifiée'}
- Dernier maintenance: ${machine.last_maintenance || 'Non spécifiée'}
- Prochaine maintenance: ${machine.next_maintenance || 'Non spécifiée'}

📚 DOCUMENTS ANALYSÉS :
${machine.manual_url ? '✅ Manuel d\'utilisation disponible et analysé' : '❌ Manuel d\'utilisation non disponible'}
${machine.notice_url ? '✅ Notice technique disponible et analysée' : '❌ Notice technique non disponible'}

🎯 TON RÔLE :
1. **Diagnostic** : Analyser les symptômes décrits par le technicien
2. **Solutions** : Proposer des procédures de réparation basées sur les documents techniques
3. **Sécurité** : Toujours rappeler les consignes de sécurité avant toute intervention
4. **Documentation** : Référencer les sections pertinentes des manuels quand disponibles
5. **Pièces détachées** : Identifier les composants à vérifier ou remplacer

💡 COMMENT RÉPONDRE :
- Commence toujours par analyser le problème
- Propose des étapes de diagnostic précises
- Indique les outils nécessaires
- Mentionne les consignes de sécurité obligatoires
- Référence les documents techniques quand pertinent
- Demande des précisions si nécessaire

🔧 EXEMPLE DE RÉPONSE :
"D'après l'analyse des documents techniques de cette ${machine.type}, voici mon diagnostic : [analyse]. 

🔍 **Diagnostic** : [étapes à suivre]
🛠️ **Solution recommandée** : [procédure détaillée]
⚠️ **Sécurité** : [consignes obligatoires]
📖 **Référence** : ${machine.manual_url ? 'Section X.X du manuel d\'utilisation' : 'Procédures standards pour ce type d\'équipement'}"

Réponds TOUJOURS en français et garde un ton professionnel mais accessible.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      // Add previous messages for context
      ...(previousMessages || []),
      { role: 'user', content: message }
    ];

    console.log('Sending request to OpenAI with messages count:', messages.length);

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message.content;

    console.log('Received response from OpenAI');

    // Save assistant message
    await supabaseClient
      .from('chat_messages')
      .insert({
        machine_id: machineId,
        technician_id: user.id,
        role: 'assistant',
        content: assistantMessage
      });

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      machineInfo: {
        name: machine.name,
        type: machine.type,
        hasDocuments: !!(machine.manual_url || machine.notice_url)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallbackMessage: "Je rencontre actuellement des difficultés techniques. Veuillez réessayer dans quelques instants ou contacter votre administrateur système."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});