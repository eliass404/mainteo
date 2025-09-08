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
    
    // Extraction de texte simple basée sur les patterns PDF
    let extractedText = '';
    
    try {
      // Méthode d'extraction basique pour les PDFs simples
      const pdfString = new TextDecoder('latin1').decode(uint8Array);
      
      // Extraction des objets de texte PDF
      const textObjects = pdfString.match(/\(([^)]+)\)/g) || [];
      const streamObjects = pdfString.match(/stream\s*(.*?)\s*endstream/gs) || [];
      
      // Extraire le texte des objets entre parenthèses
      for (const textObj of textObjects) {
        const cleanText = textObj.slice(1, -1) // Enlever les parenthèses
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
          .trim();
        
        if (cleanText.length > 2 && !/^[\d\s\.]+$/.test(cleanText)) {
          extractedText += cleanText + ' ';
        }
      }
      
      // Essayer d'extraire du contenu décompressé simple
      for (const stream of streamObjects) {
        const streamContent = stream.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
        // Rechercher des patterns de texte lisible
        const readableText = streamContent.match(/[A-Za-zÀ-ÿ\s]{3,}/g) || [];
        for (const text of readableText) {
          const cleanText = text.trim();
          if (cleanText.length > 5) {
            extractedText += cleanText + ' ';
          }
        }
      }
      
      // Nettoyer le texte final
      extractedText = extractedText
        .replace(/\s+/g, ' ')
        .replace(/[^\w\sÀ-ÿ.,;:!?()-]/g, ' ')
        .trim();
      
      console.log(`Extracted text length: ${extractedText.length}`);
      console.log(`Text preview: ${extractedText.substring(0, 200)}...`);
      
    } catch (extractionError) {
      console.error('Text extraction error:', extractionError);
      // Fallback: utiliser quelques métadonnées du PDF
      extractedText = `Document PDF pour la machine ${machineId}. Contenu non extractible automatiquement.`;
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