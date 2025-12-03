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

      // Registrar na tabela - salvar apenas o PATH, não a signed URL
      const { error: insertError } = await (supabase as any)
        .from('comprovantes_pagamento')
        .insert({
          pagamento_id: pagamentoId,
          arquivo_url: filePath, // Salva o path fixo, ex: "comprovantes/uuid_123456.pdf"
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

    if (!data) {
      return null;
    }

    // Gerar signed URL na hora usando o path salvo
    const { data: urlData } = await supabase.storage
      .from('comprovantes-boletos')
      .createSignedUrl(data.arquivo_url, 3600); // 1 hora de validade

    return {
      ...data,
      arquivo_url: urlData?.signedUrl || data.arquivo_url,
    } as Comprovante;
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

    if (!data?.length) {
      return [];
    }

    // Gerar signed URL para cada comprovante
    const comprovantesComUrl = await Promise.all(
      data.map(async (comp: any) => {
        const { data: urlData } = await supabase.storage
          .from('comprovantes-boletos')
          .createSignedUrl(comp.arquivo_url, 3600);

        return {
          ...comp,
          arquivo_url: urlData?.signedUrl || comp.arquivo_url,
        };
      })
    );

    return comprovantesComUrl as Comprovante[];
  };

  const deleteComprovante = async (
    comprovante: Comprovante
  ): Promise<boolean> => {
    try {
      // Buscar o path original do banco (comprovante.arquivo_url pode ser signed URL)
      const { data: compData } = await (supabase as any)
        .from('comprovantes_pagamento')
        .select('arquivo_url')
        .eq('id', comprovante.id)
        .single();

      const filePath = compData?.arquivo_url;

      if (filePath) {
        // Deletar arquivo do storage usando o path direto
        await supabase.storage.from('comprovantes-boletos').remove([filePath]);
      }

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
