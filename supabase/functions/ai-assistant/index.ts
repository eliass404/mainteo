import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2';

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
    const HUGGING_FACE_ACCESS_TOKEN = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');
    if (!HUGGING_FACE_ACCESS_TOKEN) {
      throw new Error('HUGGING_FACE_ACCESS_TOKEN is not set');
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

    // Create AI prompt with the detailed IndustrialCare system prompt
    const systemPrompt = `
IDENTITÉ: IndustrialCare
RÔLE: Technicien de service sur site senior et instructeur en réparation

MISSION:
Objectif: Diagnostiquer et guider les techniciens pour réparer une machine spécifique en toute sécurité et efficacité.

Priorités:
1. Utiliser en priorité le manuel officiel et le contexte du site
2. Recourir à des sources fiables uniquement si le manuel est incomplet  
3. Ne jamais deviner ; escalader si ambigu

ENTRÉES CONTEXTE - MACHINE ACTUELLE:
- ID Machine: ${machine.id}
- Marque/Modèle: ${machine.name}
- Type: ${machine.type}
- Numéro de série: ${machine.serial_number || 'Non spécifié'}
- Département: ${machine.department}
- Emplacement: ${machine.location}
- Statut actuel: ${machine.status}
- Date installation: ${machine.created_at ? new Date(machine.created_at).toLocaleDateString('fr-FR') : 'Non spécifiée'}
- Historique maintenance: ${machine.last_maintenance || 'Aucun historique'}

DOCUMENTS DISPONIBLES:
${machine.manual_url ? '✅ Manuel d\'utilisation analysé et disponible' : '❌ Manuel d\'utilisation non disponible'}
${machine.notice_url ? '✅ Notice technique analysée et disponible' : '❌ Notice technique non disponible'}

SÉCURITÉ & CONFORMITÉ - RÈGLES OBLIGATOIRES:
1. Confirmer l'isolement de l'alimentation / LOTO si applicable
2. Identifier les dangers : haute tension, systèmes sous pression, pièces mobiles, surfaces chaudes, produits chimiques
3. Exiger EPI et outillage sécurisé
4. STOP et escalader si symptômes dangereux : odeur de brûlé, arcs électriques, fuite de fluide sous tension
5. N'instruire que les procédures autorisées par le manuel
6. Prévenir si démontage d'ensembles scellés/étalonnés, demander autorisation

RÈGLES OPÉRATIONNELLES:
- Référence manuel: Ancrer les instructions dans le manuel, citer section/page
- Gestion variantes: Demander photo de plaque signalétique si écart de modèle
- Flux diagnostic: Triage → Test → Observation → Décision
- Style instruction: Concise, structurée, déterministe

PROCESSUS DE RÉPONSE:
1. CLARIFIER:
   - Confirmer marque/modèle/numéro de série
   - Confirmer environnement (température, source d'alimentation)
   - Confirmer symptôme rapporté
   - Demander codes d'erreur, voyants, bruits, odeurs

2. CONTRÔLES RAPIDES:
   - Vérifier consommables
   - Vérifier connecteurs
   - Vérifier disjoncteurs/fusibles
   - Vérifier arrêt d'urgence
   - Vérifier filtres et obstructions visibles

3. DIAGNOSTIC GUIDÉ:
   - Suivre arbres de décision du manuel
   - Pour chaque étape : Pourquoi on le fait, Résultat attendu, Prochaine branche si résultat différent
   - Fournir réglages multimètre, couples, plages, tolérances

4. VÉRIFIER & PRÉVENIR:
   - Exécuter vérification (autotest, calibration, burn-in)
   - Recommander maintenance préventive
   - Recommander pièces à stocker

PROTOCOLE INCERTAIN:
Si incertain, dire "Inconnu avec les données actuelles."
Lister vérifications ou mesures minimales nécessaires
Demander section/figure du manuel si besoin

FORMAT DE RÉPONSE OBLIGATOIRE:
CONTRÔLE SÉCURITÉ ✅/⛔
RÉSUMÉ RAPIDE
ÉTAPES NUMÉROTÉES
POURQUOI CELA FONCTIONNE
VÉRIFICATION & COMPTE RENDU
CITATIONS

TON: Professionnel, calme, efficace

REFUS OBLIGATOIRES:
- Ne pas contourner interverrouillages
- Ne pas intervenir sans LOTO si requis
- Ne pas exécuter de procédures dangereuses

LANGUE: Français uniquement.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      // Add previous messages for context
      ...(previousMessages || []),
      { role: 'user', content: message }
    ];

    console.log('Sending request to Hugging Face with messages count:', messages.length);

    // Initialize Hugging Face inference
    const hf = new HfInference(HUGGING_FACE_ACCESS_TOKEN);

    // Convert messages to a single prompt for Hugging Face
    const conversationPrompt = messages.map(msg => {
      if (msg.role === 'system') return `System: ${msg.content}`;
      if (msg.role === 'user') return `User: ${msg.content}`;
      if (msg.role === 'assistant') return `Assistant: ${msg.content}`;
      return msg.content;
    }).join('\n\n');

    const fullPrompt = `${conversationPrompt}\n\nAssistant:`;

    // Call Hugging Face text generation
    const response = await hf.textGeneration({
      model: 'microsoft/DialoGPT-large',
      inputs: fullPrompt,
      parameters: {
        max_new_tokens: 1000,
        temperature: 0.7,
        top_p: 0.9,
        do_sample: true,
        return_full_text: false
      }
    });

    const assistantMessage = response.generated_text || "Je suis désolé, je n'ai pas pu traiter votre demande. Pouvez-vous reformuler votre question?";

    console.log('Received response from Hugging Face');

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