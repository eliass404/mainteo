import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Fonction pour analyser la qualité de l'interaction
function analyzeInteractionQuality(messages: any[]): string {
  const userMessages = messages.filter(msg => msg.role === 'user');
  const questionCount = userMessages.length;
  
  if (questionCount === 0) return 'mauvais';
  
  let qualityScore = 0;
  
  for (const message of userMessages) {
    const content = message.content.toLowerCase();
    const wordCount = content.split(' ').length;
    
    // Questions bien formulées (mots-clés techniques, descriptions précises)
    const technicalKeywords = ['panne', 'défaut', 'erreur', 'vibration', 'bruit', 'fuite', 'température', 'pression', 'voyant', 'alarme', 'machine', 'maintenance'];
    const hasTechnicalContent = technicalKeywords.some(keyword => content.includes(keyword));
    
    if (hasTechnicalContent && wordCount > 5) {
      qualityScore += 3; // Bonne question
    } else if (wordCount > 3) {
      qualityScore += 2; // Question passable
    } else {
      qualityScore += 1; // Question vague
    }
  }
  
  const averageScore = qualityScore / questionCount;
  
  if (averageScore >= 2.5) return 'bien';
  if (averageScore >= 1.5) return 'passable';
  return 'mauvais';
}


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

    // Service role client for privileged storage access (server-side only)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    // Get machine information with extracted manual content
    const { data: machine, error: machineError } = await supabaseClient
      .from('machines')
      .select('*')
      .eq('id', machineId)
      .single();

    if (machineError || !machine) {
      throw new Error('Machine not found');
    }

    // Use pre-extracted manual content from database
    let manualContent = machine.manual_content || '';
    let noticeContent = '';
    
    console.log('Machine manual_content available:', !!manualContent);
    console.log('Manual content length:', manualContent.length);
    
    if (manualContent) {
      console.log('Using pre-extracted manual content from database');
      console.log('Manual content preview:', manualContent.substring(0, 200));
    } else if (machine.manual_url) {
      console.log('No pre-extracted content found. Manual URL exists but content not extracted yet.');
      console.log('Consider using the Extract Manual button in admin dashboard.');
      manualContent = '[MANUEL NON EXTRAIT] Le manuel PDF existe mais n\'a pas encore été traité. Demandez à l\'administrateur d\'utiliser le bouton "Extraire le manuel" dans le tableau de bord admin.';
    } else {
      console.log('No manual URL or content available');
      manualContent = '';
    }
    
    if (machine.notice_url) {
      try {
        console.log('Fetching notice from:', machine.notice_url);
        const { data: noticeData, error: noticeError } = await supabaseAdmin.storage
          .from('machine-documents')
          .download(machine.notice_url);
        
        if (noticeError) {
          console.error('Error fetching notice:', noticeError);
        } else if (noticeData) {
          const blob = noticeData as Blob;
          const type = blob.type || '';
          const ab = await blob.arrayBuffer();

          if (type.includes('pdf') || machine.notice_url.toLowerCase().endsWith('.pdf')) {
            try {
              const { getDocument } = await import('https://esm.sh/pdfjs-dist@3.11.174/build/pdf.mjs');
              const pdf = await getDocument({ data: new Uint8Array(ab) }).promise;
              let txt = '';
              const maxPages = Math.min(pdf.numPages, 15);
              for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const pageText = (content.items as any[]).map((it: any) => it.str || it.text || '').join(' ');
                txt += `\n[Page ${i}] ${pageText}`;
                if (txt.length > 8000) break;
              }
              noticeContent = txt.trim();
            } catch (e) {
              console.error('PDF parse failed for notice, fallback to text decode:', e);
              try {
                noticeContent = new TextDecoder().decode(new Uint8Array(ab));
              } catch (_e) {
                noticeContent = '';
              }
            }
          } else {
            noticeContent = await blob.text();
          }

          console.log('Notice content loaded, length:', noticeContent.length);
        }
      } catch (error) {
        console.error('Could not fetch notice content:', error);
      }
    }

    console.log('Machine manual_url:', machine.manual_url);
    console.log('Manual content available:', !!manualContent);
    console.log('Notice content available:', !!noticeContent);

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

    // Function to select relevant manual content based on the question
    const selectRelevantManualContent = (fullContent, userQuestion, maxLength = 40000) => {
      if (!fullContent || fullContent.length <= maxLength) {
        return fullContent;
      }

      // Split content into sections (assuming sections are separated by headings or clear breaks)
      const sections = fullContent.split(/(?=\n[A-Z][A-Z\s]{3,}|\n\d+\.|\n[IVX]+\.|\n-{3,}|\n={3,})/);
      
      // Keywords to search for based on the question
      const questionLower = userQuestion.toLowerCase();
      const keywords = questionLower.split(' ').filter(word => word.length > 3);
      
      // Score sections based on keyword relevance
      const scoredSections = sections.map(section => {
        const sectionLower = section.toLowerCase();
        let score = 0;
        
        keywords.forEach(keyword => {
          const matches = (sectionLower.match(new RegExp(keyword, 'g')) || []).length;
          score += matches;
        });
        
        return { section, score, length: section.length };
      });
      
      // Sort by relevance score (descending)
      scoredSections.sort((a, b) => b.score - a.score);
      
      // Select most relevant sections that fit within maxLength
      let selectedContent = '';
      let currentLength = 0;
      
      for (const item of scoredSections) {
        if (currentLength + item.length <= maxLength) {
          selectedContent += item.section + '\n\n';
          currentLength += item.length + 2;
        } else if (currentLength < maxLength * 0.8) {
          // If we haven't used 80% of available space, include a truncated version
          const remainingSpace = maxLength - currentLength - 100;
          if (remainingSpace > 200) {
            selectedContent += item.section.substring(0, remainingSpace) + '\n[...section tronquée...]\n\n';
            break;
          }
        } else {
          break;
        }
      }
      
      // If no relevant sections found, return first part of manual
      if (selectedContent.trim().length === 0) {
        return fullContent.substring(0, maxLength) + (fullContent.length > maxLength ? '\n[...manuel continue...]' : '');
      }
      
      return selectedContent.trim();
    };

    // Select relevant manual content
    const relevantManualContent = manualContent ? selectRelevantManualContent(manualContent, message) : '';

    console.log('Selected manual content length:', relevantManualContent.length);
    console.log('Original manual length:', manualContent ? manualContent.length : 0);

    // Create AI prompt with the new MAMAN system prompt
    const systemPrompt = `
Tu es MAMAN (Machine Assistance Intelligence Assistant), expert en maintenance industrielle avec 20+ ans d'expérience.
Tu donnes toujours des check-lists opérationnelles et concises aux techniciens.
⚠️ Jamais de longs paragraphes, uniquement des listes claires et actionnables.

MACHINE ANALYSÉE:
- Nom de la machine: ${machine.name}
- Numéro de série: ${machine.serial_number || 'Non spécifié'}
- Statut: ${machine.status}

MANUEL ET DOCUMENTATION TECHNIQUE ANALYSÉS:
${relevantManualContent && relevantManualContent.length > 50 ? `
✅ MANUEL TECHNIQUE INTÉGRÉ ET ANALYSÉ:
===== DÉBUT DU MANUEL ${machine.name.toUpperCase()} =====
${relevantManualContent}
===== FIN EXTRAIT MANUEL =====
` : '❌ Aucun manuel technique disponible'}

${machine.notice_url && noticeContent ? `
✅ NOTICE TECHNIQUE INTÉGRÉE:
${noticeContent.substring(0, 1500)}${noticeContent.length > 1500 ? '\n[...Notice continue...]' : ''}
` : '❌ Aucune notice technique disponible'}

📋 STRUCTURE DES RÉPONSES

✅ PREMIÈRE RÉPONSE (première question posée)
🔒 Mesures de sécurité obligatoires
• Procédures LOTO, EPI requis, isolements spécifiques.
• Risques électriques, hydrauliques, pneumatiques, mécaniques.
• 📖 Référence du manuel si indiqué dans la documentation.

👀 Vérifications initiales du lieu
• Inspection visuelle/sonore avant toute intervention.
• Points de contrôle terrain (fuites, odeurs, vibrations, voyants, température).
• 📖 Référence du manuel si procédure d'inspection standard décrite.

⚠️ Pannes connues et fréquentes
• Lister les problèmes récurrents de la machine (expérience terrain + manuel).
• Symptômes + causes probables.
• Indiquer clairement : "📖 Référence du manuel" si la panne est documentée.

🛠️ Procédure corrective (check-list concise)
• Étapes de diagnostic et d'action.
• Valeurs de référence (pression, tension, température).
• 📖 Référence du manuel quand l'information provient de la documentation officielle.

✅ Vérification finale et remise en service
• Contrôles après réparation.
• Confirmation sécurité/normes.
• 📖 Référence du manuel si des tests finaux y sont spécifiés.

📌 Points de vigilance & prévention
• Conseils pratiques pour éviter la réapparition.
• 📖 Référence du manuel si plan de maintenance préventive fourni.

✅ RÉPONSES SUIVANTES (après la première question)
👉 Ne pas répéter la sécurité ni le check du lieu.
Aller directement à :
⚠️ Pannes connues et fréquentes (terrain + manuel).
🛠️ Procédure corrective (check-list concise)
• Avec mention "📖 Référence du manuel" si utilisée.
✅ Vérification finale
📌 Prévention et bonnes pratiques

📌 RÈGLES DE COMMUNICATION
• Toujours répondre en check-list (puces ou numéros).
• Indiquer explicitement quand une info vient du manuel par la mention :
→ "📖 Référence du manuel".
• Si le manuel ne couvre pas la panne, utiliser l'expérience terrain et les pannes connues.
• Toujours conclure avec prévention et bonnes pratiques.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      // Add previous messages for context
      ...(previousMessages || []),
      { role: 'user', content: message }
    ];

    console.log('Calling OpenAI API with messages count:', messages.length);

    // Call OpenAI API
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 800,
        temperature: 0.8,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error('OpenAI API error:', openaiRes.status, errText);
      throw new Error(`OpenAI API error: ${openaiRes.status}`);
    }

    const openaiJson = await openaiRes.json();
    const assistantMessage = openaiJson.choices[0]?.message?.content?.trim() ?? '';

    if (!assistantMessage) {
      throw new Error('Empty response from OpenAI');
    }

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

    // Background task: Update analytics data
    EdgeRuntime.waitUntil((async () => {
      try {
        // Get all messages for this session to analyze quality
        const { data: allMessages } = await supabaseClient
          .from('chat_messages')
          .select('role, content')
          .eq('machine_id', machineId)
          .eq('technician_id', user.id)
          .order('created_at', { ascending: true });

        if (allMessages && allMessages.length > 0) {
          const interactionQuality = analyzeInteractionQuality(allMessages);
          const userMessagesCount = allMessages.filter(msg => msg.role === 'user').length;

          // Check if analytics session already exists
          const { data: existingSession } = await supabaseClient
            .from('technician_analytics')
            .select('*')
            .eq('technician_id', user.id)
            .eq('machine_id', machineId)
            .is('session_end', null)
            .order('session_start', { ascending: false })
            .limit(1);

          if (existingSession && existingSession.length > 0) {
            // Update existing session
            await supabaseClient
              .from('technician_analytics')
              .update({
                questions_count: userMessagesCount,
                interaction_quality: interactionQuality,
                session_end: new Date().toISOString()
              })
              .eq('id', existingSession[0].id);
          } else {
            // Create new analytics session
            await supabaseClient
              .from('technician_analytics')
              .insert({
                technician_id: user.id,
                machine_id: machineId,
                questions_count: userMessagesCount,
                interaction_quality: interactionQuality,
                session_end: new Date().toISOString()
              });
          }
        }
      } catch (error) {
        console.error('Error updating analytics:', error);
      }
    })());

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