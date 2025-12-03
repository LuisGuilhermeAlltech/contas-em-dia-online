import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[cleanup-comprovantes] Iniciando limpeza de comprovantes expirados...');

    // Buscar comprovantes expirados
    const { data: expirados, error: selectError } = await supabase
      .from('comprovantes_pagamento')
      .select('id, arquivo_url, arquivo_nome')
      .lt('data_expiracao', new Date().toISOString());

    if (selectError) {
      console.error('[cleanup-comprovantes] Erro ao buscar expirados:', selectError);
      throw selectError;
    }

    if (!expirados || expirados.length === 0) {
      console.log('[cleanup-comprovantes] Nenhum comprovante expirado encontrado.');
      return new Response(
        JSON.stringify({ message: 'Nenhum comprovante expirado', deleted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[cleanup-comprovantes] Encontrados ${expirados.length} comprovantes expirados.`);

    let deletedFiles = 0;
    let deletedRecords = 0;
    const errors: string[] = [];

    for (const comprovante of expirados) {
      try {
        // arquivo_url já contém o path direto (ex: "comprovantes/uuid_123456.pdf")
        const filePath = comprovante.arquivo_url;

        console.log(`[cleanup-comprovantes] Removendo arquivo: ${filePath}`);

        // Tentar remover arquivo do storage
        const { error: storageError } = await supabase.storage
          .from('comprovantes-boletos')
          .remove([filePath]);

        if (storageError) {
          console.warn(`[cleanup-comprovantes] Aviso ao remover arquivo ${filePath}:`, storageError.message);
          // Continua mesmo se o arquivo já não existir
        } else {
          deletedFiles++;
        }

        // Remover registro do banco
        const { error: deleteError } = await supabase
          .from('comprovantes_pagamento')
          .delete()
          .eq('id', comprovante.id);

        if (deleteError) {
          console.error(`[cleanup-comprovantes] Erro ao deletar registro ${comprovante.id}:`, deleteError);
          errors.push(`Registro ${comprovante.id}: ${deleteError.message}`);
        } else {
          deletedRecords++;
          console.log(`[cleanup-comprovantes] Registro ${comprovante.id} removido com sucesso.`);
        }
      } catch (itemError: any) {
        console.error(`[cleanup-comprovantes] Erro no item ${comprovante.id}:`, itemError);
        errors.push(`Item ${comprovante.id}: ${itemError.message}`);
      }
    }

    const result = {
      message: 'Limpeza concluída',
      total_expirados: expirados.length,
      arquivos_removidos: deletedFiles,
      registros_removidos: deletedRecords,
      erros: errors.length > 0 ? errors : undefined,
    };

    console.log('[cleanup-comprovantes] Resultado:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[cleanup-comprovantes] Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
