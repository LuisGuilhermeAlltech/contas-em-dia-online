import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Comprovante {
  id: string;
  pagamento_id: string;
  arquivo_url: string;
  arquivo_nome: string;
  arquivo_tipo: string;
  data_upload: string;
  data_expiracao: string;
}

export function useComprovantes() {
  const [uploading, setUploading] = useState(false);

  const uploadComprovante = async (
    pagamentoId: string,
    file: File
  ): Promise<{ success: boolean; error?: string }> => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${pagamentoId}_${Date.now()}.${fileExt}`;
      const filePath = `comprovantes/${fileName}`;

      // Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('comprovantes-boletos')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('comprovantes-boletos')
        .getPublicUrl(filePath);

      // Registrar na tabela (usando rpc ou insert direto)
      const { error: insertError } = await (supabase as any)
        .from('comprovantes_pagamento')
        .insert({
          pagamento_id: pagamentoId,
          arquivo_url: urlData.publicUrl,
          arquivo_nome: file.name,
          arquivo_tipo: file.type,
        });

      if (insertError) {
        // Tentar remover arquivo se falhar o insert
        await supabase.storage.from('comprovantes-boletos').remove([filePath]);
        throw new Error(insertError.message);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      return { success: false, error: error.message };
    } finally {
      setUploading(false);
    }
  };

  const getComprovanteByPagamento = async (
    pagamentoId: string
  ): Promise<Comprovante | null> => {
    const { data, error } = await (supabase as any)
      .from('comprovantes_pagamento')
      .select('*')
      .eq('pagamento_id', pagamentoId)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar comprovante:', error);
      return null;
    }

    return data as Comprovante | null;
  };

  const getComprovantesByConta = async (
    contaId: string
  ): Promise<Comprovante[]> => {
    // Primeiro buscar os pagamentos da conta
    const { data: pagamentos, error: pagError } = await supabase
      .from('pagamentos')
      .select('id')
      .eq('conta_id', contaId);

    if (pagError || !pagamentos?.length) {
      return [];
    }

    const pagamentoIds = pagamentos.map((p) => p.id);

    // Buscar comprovantes desses pagamentos
    const { data, error } = await (supabase as any)
      .from('comprovantes_pagamento')
      .select('*')
      .in('pagamento_id', pagamentoIds);

    if (error) {
      console.error('Erro ao buscar comprovantes:', error);
      return [];
    }

    return (data as Comprovante[]) || [];
  };

  const deleteComprovante = async (
    comprovante: Comprovante
  ): Promise<boolean> => {
    try {
      // Extrair o path do arquivo da URL
      const urlParts = comprovante.arquivo_url.split('/');
      const filePath = `comprovantes/${urlParts[urlParts.length - 1]}`;

      // Deletar arquivo do storage
      await supabase.storage.from('comprovantes-boletos').remove([filePath]);

      // Deletar registro
      const { error } = await (supabase as any)
        .from('comprovantes_pagamento')
        .delete()
        .eq('id', comprovante.id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erro ao deletar comprovante:', error);
      return false;
    }
  };

  return {
    uploading,
    uploadComprovante,
    getComprovanteByPagamento,
    getComprovantesByConta,
    deleteComprovante,
  };
}
