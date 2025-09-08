import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pdf from "npm:pdf-parse";

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
    const { machineId, filePath } = await req.json();
    
    if (!machineId || !filePath) {
      throw new Error('machineId and filePath are required');
    }

    console.log(`Starting PDF extraction for machine: ${machineId}, file: ${filePath}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Télécharger le PDF depuis le bucket machine-documents (où il est actuellement stocké)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('machine-documents')
      .download(filePath);

    if (downloadError) {
      console.error('Storage download error:', downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    console.log('PDF downloaded successfully, size:', fileData.size);

    // Convertir en Buffer pour pdf-parse
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('Starting PDF text extraction with pdf-parse...');

    // Utiliser pdf-parse pour extraire le texte
    const pdfData = await pdf(buffer);
    const extractedText = pdfData.text;

    console.log(`Extracted ${extractedText.length} characters of text`);
    console.log(`Text preview: ${extractedText.substring(0, 200)}...`);

    // Sauvegarder le contenu extrait dans la base de données
    const { error: updateError } = await supabase
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