import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { machineId, filePath } = await req.json();
    
    if (!machineId || !filePath) {
      throw new Error('machineId and filePath are required');
    }

    console.log(`Starting PDF extraction for machine: ${machineId}, file: ${filePath}`);

    // Télécharger le PDF depuis Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('machine-documents')
      .download(filePath);

    if (downloadError) {
      console.error('Storage download error:', downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    console.log('PDF downloaded successfully, size:', fileData.size);

    // Convertir en ArrayBuffer pour le traitement (limiter la taille analysée)
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    // Traiter au plus 256KB pour rester sous les limites CPU
    const MAX_BYTES = 256 * 1024;
    const view = uint8.subarray(0, Math.min(uint8.length, MAX_BYTES));
    console.log('Starting fast PDF text extraction (bytes):', view.length);

    // Extraction ultra-rapide, sans regex coûteuses
    let extractedText = '';
    try {
      const s = new TextDecoder('latin1', { fatal: false }).decode(view);

      // Parcours caractère par caractère pour récupérer le texte entre parenthèses
      let inParen = false;
      let escape = false;
      let buf = '';
      let added = 0;
      const MAX_CHARS = 12000;

      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (!inParen) {
          if (ch === '(') {
            inParen = true;
            buf = '';
            escape = false;
          }
          continue;
        }

        if (escape) {
          // Gestion des séquences \n, \r, \t, \\, \(, \)
          switch (ch) {
            case 'n': buf += ' '; break;
            case 'r': buf += ' '; break;
            case 't': buf += ' '; break;
            case '(': buf += '('; break;
            case ')': buf += ')'; break;
            case '\\': buf += '\\'; break;
            default: buf += ch; break;
          }
          escape = false;
          continue;
        }

        if (ch === '\\') { // caractère d'échappement
          escape = true;
          continue;
        }

        if (ch === ')') { // fin du bloc de texte
          const clean = buf.trim();
          if (clean && /[A-Za-zÀ-ÿ]/.test(clean)) {
            extractedText += clean + ' ';
            added += clean.length + 1;
            if (added >= MAX_CHARS) break;
          }
          inParen = false;
          buf = '';
          continue;
        }

        // Caractère normal
        buf += ch;
      }

      extractedText = extractedText.replace(/\s+/g, ' ').trim().slice(0, MAX_CHARS);

      // Fallback minimal si quasi vide
      if (extractedText.length < 100) {
        const fallback = s.match(/[A-Za-zÀ-ÿ]{3,}(?:\s+[A-Za-zÀ-ÿ]{3,}){3,}/);
        if (fallback) extractedText = fallback[0].slice(0, MAX_CHARS);
      }

      console.log('Fast extraction produced chars:', extractedText.length);
    } catch (extractionError) {
      console.error('Fast extraction error:', extractionError);
      extractedText = `Document PDF pour la machine ${machineId}. Extraction automatique échouée - vérifiez le format du PDF.`;
    }

    // Sauvegarder le contenu extrait dans la base de données
    const { error: updateError } = await supabaseClient
      .from('machines')
      .update({ manual_content: extractedText })
      .eq('id', machineId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update machine: ${updateError.message}`);
    }

    console.log(`Successfully extracted and saved manual content for machine: ${machineId}`);

    return new Response(JSON.stringify({
      success: true,
      machineId,
      extractedLength: extractedText.length,
      preview: extractedText.substring(0, 300)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Extract manual error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});