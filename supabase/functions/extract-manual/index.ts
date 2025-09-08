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
    console.log('=== EXTRACT MANUAL START ===');
    
    const { machineId, filePath } = await req.json();
    console.log('Received request:', { machineId, filePath });
    
    if (!machineId || !filePath) {
      throw new Error('machineId and filePath are required');
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? '',
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
    );

    console.log('Supabase client created');

    // Étape 1: Télécharger le PDF
    console.log('Downloading PDF from storage...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('machine-documents')
      .download(filePath);

    if (downloadError) {
      console.error('Storage download error:', downloadError);
      throw new Error(`Failed to download PDF: ${downloadError.message}`);
    }

    console.log('PDF downloaded successfully, size:', fileData.size);

    // Étape 2: Lire le contenu en ArrayBuffer (Deno n'a pas Buffer)
    const arrayBuffer = await fileData.arrayBuffer();
    console.log('PDF loaded into ArrayBuffer, byteLength:', arrayBuffer.byteLength);

    // Pour l'instant, on utilise encore du texte de test mais on indique qu'on a le PDF
    const testText = `Manuel de la machine ${machineId} - PDF téléchargé avec succès (${fileData.size} bytes). Extraction réelle à venir...`;
    
    console.log('Updating machine with test text...');

    // Sauvegarder le contenu de test dans la base de données
    const { error: updateError } = await supabase
      .from('machines')
      .update({ manual_content: testText })
      .eq('id', machineId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Failed to update machine: ${updateError.message}`);
    }

    console.log('Success! Test text saved to database');

    return new Response(JSON.stringify({
      success: true,
      machineId,
      extractedLength: testText.length,
      preview: testText
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('=== EXTRACT MANUAL ERROR ===');
    console.error('Error details:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});