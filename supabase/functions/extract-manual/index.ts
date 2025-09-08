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

    // Convertir en ArrayBuffer pour le traitement
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('Starting PDF text extraction...');
    
    // Extraction de texte optimisée pour éviter le timeout
    let extractedText = '';
    
    try {
      // Méthode simple et rapide pour extraire le texte
      const textDecoder = new TextDecoder('latin1', { fatal: false });
      const pdfString = textDecoder.decode(uint8Array);
      
      // Extraire les objets de texte PDF de manière optimisée
      const textMatches = [];
      
      // Rechercher les patterns de texte dans les objets PDF
      const streamPattern = /BT\s*(.*?)\s*ET/gs;
      const textObjPattern = /\((.*?)\)/g;
      
      // Extraire les streams de texte
      let streamMatch;
      let matchCount = 0;
      while ((streamMatch = streamPattern.exec(pdfString)) !== null && matchCount < 100) {
        const streamContent = streamMatch[1];
        let textMatch;
        while ((textMatch = textObjPattern.exec(streamContent)) !== null) {
          const text = textMatch[1]
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\')
            .trim();
          
          if (text.length > 2 && !/^[\d\s\.]+$/.test(text)) {
            textMatches.push(text);
          }
        }
        matchCount++;
        
        // Éviter les boucles infinies
        if (extractedText.length > 10000) break;
      }
      
      // Fallback : extraction simple par patterns
      if (textMatches.length === 0) {
        console.log('Using fallback text extraction method...');
        const simpleTextPattern = /\(([^)]{3,})\)/g;
        let match;
        while ((match = simpleTextPattern.exec(pdfString)) !== null && textMatches.length < 500) {
          const text = match[1].trim();
          if (text.length > 3 && text.includes(' ')) {
            textMatches.push(text);
          }
        }
      }
      
      // Assembler le texte final
      extractedText = textMatches
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 15000); // Limiter la taille
      
      console.log(`Extracted ${extractedText.length} characters of text`);
      
    } catch (extractionError) {
      console.error('Text extraction error:', extractionError);
      extractedText = `Document PDF pour la machine ${machineId}. Extraction automatique échouée - veuillez vérifier le format du PDF.`;
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