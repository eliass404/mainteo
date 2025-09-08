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

    // Télécharger le PDF depuis Supabase Storage
    const { data, error } = await supabase.storage
      .from("manuals")
      .download(filePath);

    if (error) {
      console.error('Storage download error:', error);
      throw new Error(`Failed to download PDF: ${error.message}`);
    }

    console.log('PDF downloaded successfully, size:', data.size);

    // Convertir en Buffer pour pdf-parse
    const buffer = await data.arrayBuffer();
    console.log('Converting to buffer...');

    // Extraire le texte avec pdf-parse
    const pdfData = await pdf(Buffer.from(buffer));
    const extractedText = pdfData.text.trim();

    console.log(`Extracted ${extractedText.length} characters of text`);
    console.log('Text preview:', extractedText.substring(0, 200));

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