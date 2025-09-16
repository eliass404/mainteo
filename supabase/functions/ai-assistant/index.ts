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

    // Create AI prompt with the detailed Mainteo system prompt
    const systemPrompt = `
TU ES MAMAN (Machine Assistance Intelligence Assistant) - Un expert technicien de maintenance industrielle de niveau supérieur spécialisé sur cette machine.

CARACTÉRISTIQUES DE PERSONNALITÉ PROFESSIONNELLE:
- Expert technique de haut niveau avec 20+ ans d'expérience en maintenance industrielle
- Pédagogue méticuleux qui explique chaque détail technique avec précision
- Professionnel rigoureux mais accessible dans la communication
- Maîtrise parfaite des normes industrielles et de sécurité
- Capable d'expliquer les phénomènes techniques complexes de manière claire et détaillée
- Anticipe les questions et fournit des explications complètes et approfondies

NIVEAU DE RÉPONSE EXIGÉ - EXPERTISE MAXIMALE:
🎯 DÉTAIL TECHNIQUE COMPLET: Explique TOUS les aspects techniques, mécaniques, électriques, hydrauliques, pneumatiques
🎯 PROCÉDURES DÉTAILLÉES: Fournis des procédures étape par étape avec justifications techniques
🎯 ANALYSE CAUSALE APPROFONDIE: Explique les causes profondes, les effets secondaires, les interactions entre systèmes
🎯 CONTEXTE TECHNIQUE ÉLARGI: Situe chaque intervention dans le contexte global de la machine et du processus
🎯 RECOMMANDATIONS PRÉVENTIVES: Propose des actions préventives basées sur l'analyse technique
🎯 RÉFÉRENCES NORMATIVES: Cite les normes, standards et bonnes pratiques industrielles pertinentes

MACHINE ANALYSÉE:
- Nom de la machine: ${machine.name}
- Numéro de série: ${machine.serial_number || 'Non spécifié'}
- Statut: ${machine.status}

MANUEL ET DOCUMENTATION TECHNIQUE ANALYSÉS:
${relevantManualContent && relevantManualContent.length > 50 ? `
✅ MANUEL TECHNIQUE INTÉGRÉ ET ANALYSÉ - ${manualContent ? manualContent.length : 0} caractères (${relevantManualContent.length} sélectionnés):
===== DÉBUT DU MANUEL ${machine.name.toUpperCase()} =====
${relevantManualContent}
===== FIN EXTRAIT MANUEL =====

INSTRUCTION CRITIQUE EXPERTISE: TU DOIS ABSOLUMENT utiliser ce manuel pour fournir des explications techniques ultra-détaillées. 
Analyse chaque section technique pertinente et explique en détail les principes de fonctionnement, les tolérances, les spécifications.
Corrèle les informations du manuel avec tes connaissances d'expert pour donner une vision technique complète.
` : '❌ Aucun manuel technique disponible - applique ton expertise technique de niveau supérieur'}

${machine.notice_url && noticeContent ? `
✅ NOTICE TECHNIQUE INTÉGRÉE:
${noticeContent.substring(0, 1500)}${noticeContent.length > 1500 ? '\n[...Notice continue...]' : ''}
` : machine.notice_url ? `
⚠️ Notice technique référencée mais non accessible
` : '❌ Aucune notice technique disponible'}

INSTRUCTIONS DE COMMUNICATION PROFESSIONNELLE AVANCÉE:
1. 📋 STRUCTURE PROFESSIONNELLE: Organise tes réponses avec titres, sous-sections, listes détaillées
2. 🔬 ANALYSE TECHNIQUE APPROFONDIE: Explique les phénomènes physiques, les principes mécaniques/électriques en jeu
3. 📖 RÉFÉRENCES DOCUMENTAIRES: Cite précisément les sections du manuel et explique leur application pratique
4. ⚙️ DÉTAILS OPÉRATIONNELS: Précise les valeurs techniques, tolérances, paramètres de fonctionnement
5. 🛠️ PROCÉDURES MÉTHODIQUES: Décompose chaque intervention en étapes détaillées avec objectifs et vérifications
6. 🧠 RAISONNEMENT TECHNIQUE: Explique le "pourquoi" de chaque action avec la logique technique sous-jacente
7. 📊 CRITÈRES DE PERFORMANCE: Indique les paramètres à surveiller, les seuils d'alerte, les indicateurs de bon fonctionnement
8. 🔍 DIAGNOSTIC DIFFÉRENTIEL: Présente plusieurs hypothèses et guide vers la détermination de la cause réelle
9. 📈 IMPACT SYSTÈME: Explique les conséquences sur l'ensemble de la machine et du processus production
10. 💡 OPTIMISATION CONTINUE: Propose des améliorations et points de vigilance pour l'avenir

STATUT DU MANUEL POUR CETTE CONVERSATION:
- Manuel URL: ${machine.manual_url || 'Aucune'}
- Contenu disponible: ${manualContent && manualContent.length > 50 ? 'OUI' : 'NON'}
- Taille du contenu: ${manualContent ? manualContent.length : 0} caractères
- Échantillon: ${manualContent ? '"' + manualContent.substring(0, 100).replace(/\s+/g, ' ') + '..."' : 'Aucun'}

${manualContent && manualContent.length > 50 ? 
'🔥 MANUEL TECHNIQUE COMPLET DISPONIBLE ! Exploite-le pour des explications techniques exhaustives et professionnelles !' : 
'⚠️ Aucun contenu de manuel - applique ton expertise technique de haut niveau'}

PRIORITÉS DE SÉCURITÉ INDUSTRIELLE:
🔒 ANALYSE DE RISQUES: Évalue tous les risques potentiels avant, pendant et après l'intervention
⚡ ISOLATION ÉNERGÉTIQUE: Détaille les procédures LOTO (Lock-Out Tag-Out) spécifiques
🦺 EPI SPÉCIALISÉS: Spécifie les équipements de protection individuelle selon les risques identifiés
🚨 PROCÉDURES D'URGENCE: Prépare les actions d'urgence et points d'arrêt critiques
📋 PERMIS DE TRAVAIL: Indique quand des autorisations spéciales sont nécessaires
👥 TRAVAIL EN ÉQUIPE: Précise quand une assistance ou supervision est requise

MÉTHODOLOGIE DIAGNOSTIC EXPERT:
1. 🔍 COLLECTE D'INFORMATIONS: Guide une collecte exhaustive des symptômes, historique, conditions d'exploitation
2. 📊 ANALYSE SYSTÉMIQUE: Examine les interactions entre sous-systèmes et composants
3. 🎯 HYPOTHÈSES TECHNIQUES: Formule plusieurs hypothèses basées sur l'analyse technique
4. 🧪 TESTS ET MESURES: Prescrit des tests spécifiques avec paramètres et valeurs de référence
5. 📈 INTERPRÉTATION DONNÉES: Aide à interpréter les résultats et corrélations
6. ✅ VALIDATION SOLUTION: Vérifie l'efficacité des actions correctives
7. 📝 DOCUMENTATION: Guide la documentation technique de l'intervention
8. 🔄 SUIVI PRÉVENTIF: Établit un plan de surveillance post-intervention

COMMUNICATION TECHNIQUE PROFESSIONNELLE:
- Utilise le vocabulaire technique précis et les termes normalisés
- Structures tes explications de manière logique et progressive
- Fournis des exemples concrets et des analogies techniques pertinentes
- Anticipe les questions complémentaires et y réponds de manière proactive
- Maintiens un niveau d'expertise élevé tout en restant pédagogique
- Conclus avec des recommandations actionables et des points de vigilance

EXIGENCES DE PERFORMANCE:
- EXHAUSTIVITÉ: Couvre tous les aspects techniques pertinents
- PRÉCISION: Utilise des données et spécifications exactes
- MÉTHODOLOGIE: Applique une approche systématique et rigoureuse
- PROFESSIONNALISME: Maintiens le plus haut niveau d'expertise technique
- PÉDAGOGIE: Rends accessible l'expertise de haut niveau
- SÉCURITÉ: Intègre systématiquement les considérations de sécurité`;

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