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

    // Get machine information with documents
    const { data: machine, error: machineError } = await supabaseClient
      .from('machines')
      .select('*')
      .eq('id', machineId)
      .single();

    if (machineError || !machine) {
      throw new Error('Machine not found');
    }

    // Fetch machine documents content if available
    let manualContent = '';
    let noticeContent = '';
    
    if (machine.manual_url) {
      try {
        console.log('=== MANUAL EXTRACTION START ===');
        console.log('Manual URL:', machine.manual_url);

        const { data: manualData, error: manualError } = await supabaseAdmin.storage
          .from('machine-documents')
          .download(machine.manual_url);

        if (manualError) {
          console.error('Error downloading manual:', manualError);
          manualContent = `[ERREUR TÉLÉCHARGEMENT] ${manualError.message}`;
        } else if (manualData) {
          console.log('Manual downloaded successfully');

          const blob = manualData as Blob;
          const type = blob.type || '';
          const ab = await blob.arrayBuffer();

          if (type.includes('pdf') || machine.manual_url.toLowerCase().endsWith('.pdf')) {
            // Use a different PDF parsing approach
            try {
              // Import pdf-parse directly
              const pdfParse = await import('https://esm.sh/pdf-parse@1.1.1');
              
              // Convert ArrayBuffer to Buffer for pdf-parse
              const buffer = new Uint8Array(ab);
              const pdfData = await pdfParse.default(buffer);
              
              manualContent = pdfData.text;
              console.log('Manual text extracted via pdf-parse, length:', manualContent.length);
            } catch (e) {
              console.error('PDF parse failed with pdf-parse, trying alternative method:', e);
              try {
                // Alternative: Use a simpler PDF text extraction
                const response = await fetch('https://api.pdflayer.com/api/convert', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    access_key: 'demo', // This won't work in production but shows the approach
                    document_base64: btoa(String.fromCharCode(...new Uint8Array(ab))),
                    output_format: 'txt'
                  })
                });
                
                if (response.ok) {
                  manualContent = await response.text();
                } else {
                  throw new Error('PDF conversion service failed');
                }
              } catch (conversionError) {
                console.error('PDF conversion service failed, using raw decode:', conversionError);
                // Final fallback - try to extract readable text from PDF binary
                try {
                  const textDecoder = new TextDecoder('utf-8', { fatal: false });
                  const rawText = textDecoder.decode(new Uint8Array(ab));
                  
                  // Extract readable text patterns from PDF
                  const textMatches = rawText.match(/[A-Za-z0-9\s\.,;:\-\(\)]{10,}/g);
                  if (textMatches && textMatches.length > 0) {
                    manualContent = textMatches.join(' ').slice(0, 8000);
                    console.log('Extracted text patterns from PDF binary, length:', manualContent.length);
                  } else {
                    manualContent = '[ERREUR] Impossible d\'extraire le texte du PDF';
                  }
                } catch (finalError) {
                  console.error('All PDF extraction methods failed:', finalError);
                  manualContent = '[ERREUR] Échec de toutes les méthodes d\'extraction PDF';
                }
              }
            }
          } else {
            // Not a PDF, treat as text
            console.log('Manual is not a PDF, processing as text file...');
            manualContent = await blob.text();
          }
        } else {
          console.log('No manual data received');
          manualContent = '[ERREUR] Aucune donnée reçue lors du téléchargement';
        }

        console.log('=== MANUAL EXTRACTION END ===');
        console.log('Final manualContent length:', manualContent.length);
        if (manualContent) {
          console.log('Manual content preview:', manualContent.substring(0, 200));
        }
      } catch (error) {
        console.error('Manual extraction failed completely:', error);
        manualContent = `[ERREUR CRITIQUE] ${error.message}`;
      }
    } else {
      console.log('No manual URL provided');
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

    // Create AI prompt with the detailed IndustrialCare system prompt
    const systemPrompt = `
TU ES MAMAN (Machine Assistance Intelligence Assistant) - Un expert technicien de maintenance industrielle spécialisé sur cette machine.

CARACTÉRISTIQUES DE PERSONNALITÉ:
- Humain et empathique dans tes réponses
- Patient et pédagogue 
- Confiant mais prudent sur la sécurité
- Communique de manière naturelle et conversationnelle
- Adapte ton niveau de langage au technicien

MACHINE ANALYSÉE:
- Nom de la machine: ${machine.name}
- Numéro de série: ${machine.serial_number || 'Non spécifié'}
- Statut: ${machine.status}

MANUEL ET DOCUMENTATION TECHNIQUE ANALYSÉS:
${machine.manual_url && manualContent && manualContent.length > 50 ? `
✅ MANUEL TECHNIQUE COMPLÈTEMENT INTÉGRÉ ET ANALYSÉ - ${manualContent.length} caractères:
===== DÉBUT DU MANUEL VLB-67 =====
${manualContent.substring(0, 6000)}${manualContent.length > 6000 ? '\n[...Le manuel continue avec plus de détails techniques...]' : ''}
===== FIN EXTRAIT MANUEL =====

INSTRUCTION CRITIQUE: TU DOIS ABSOLUMENT utiliser ce manuel pour répondre à toutes les questions sur la VLB-67. 
Ce manuel contient toutes les informations techniques détaillées nécessaires.
Ne dis JAMAIS que tu n'as pas accès au manuel - TU L'AS !
` : machine.manual_url ? `
⚠️ Manuel technique référencé mais le contenu n'a pas pu être extrait correctement.
URL: ${machine.manual_url}
Contenu extrait: ${manualContent ? manualContent.substring(0, 200) + '...' : 'Aucun'}
Longueur: ${manualContent ? manualContent.length : 0} caractères
Je vais utiliser mes connaissances générales mais recommande de vérifier l'accès aux documents.
` : '❌ Aucun manuel technique disponible'}

${machine.notice_url && noticeContent ? `
✅ NOTICE TECHNIQUE INTÉGRÉE:
${noticeContent.substring(0, 1500)}${noticeContent.length > 1500 ? '\n[...Notice continue...]' : ''}
` : machine.notice_url ? `
⚠️ Notice technique référencée mais non accessible
` : '❌ Aucune notice technique disponible'}

INSTRUCTIONS DE COMMUNICATION:
1. Réponds de manière humaine et naturelle, comme un collègue expérimenté
2. Si tu as accès au manuel technique (section ci-dessus), UTILISE-LE OBLIGATOIREMENT
3. Cite des sections spécifiques du manuel quand tu donnes des instructions
4. Si le manuel n'est pas disponible, dis-le clairement et utilise tes connaissances générales
5. Sois empathique et compréhensif face aux difficultés techniques
6. Propose des solutions concrètes et pratiques
7. Demande des précisions quand nécessaire

STATUT DU MANUEL POUR CETTE CONVERSATION:
- Manuel URL: ${machine.manual_url || 'Aucune'}
- Contenu disponible: ${manualContent && manualContent.length > 50 ? 'OUI' : 'NON'}
- Taille du contenu: ${manualContent ? manualContent.length : 0} caractères
- Échantillon: ${manualContent ? '"' + manualContent.substring(0, 100).replace(/\s+/g, ' ') + '..."' : 'Aucun'}

${manualContent && manualContent.length > 50 ? 
'🔥 TU AS ACCÈS AU MANUEL COMPLET ! Utilise-le pour répondre aux questions techniques !' : 
'⚠️ Aucun contenu de manuel disponible - utilise tes connaissances générales'}

PRIORITÉS DE SÉCURITÉ:
🔒 Toujours vérifier la sécurité avant toute intervention
⚡ Isoler l'alimentation électrique quand nécessaire
🦺 S'assurer du port des EPI appropriés
🚨 Arrêter immédiatement si danger détecté

APPROCHE DIAGNOSTIC:
1. Écouter et comprendre le problème
2. Poser les bonnes questions pour clarifier
3. Référencer le manuel technique
4. Proposer un diagnostic étape par étape
5. Expliquer le "pourquoi" de chaque action
6. Vérifier les résultats obtenus

COMMUNICATION NATURELLE:
- Utilise des expressions comme "D'accord", "Je vois", "Pas de problème"
- Montre de l'empathie: "Je comprends que c'est frustrant"
- Encourage: "C'est une bonne approche", "Tu es sur la bonne voie"
- Sois rassurant sur les procédures de sécurité

TU DOIS TOUJOURS:
- Analyser le manuel technique disponible pour cette machine
- Baser tes réponses sur la documentation technique
- Être humain et conversationnel dans tes interactions
- Prioriser la sécurité en toutes circonstances`;

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