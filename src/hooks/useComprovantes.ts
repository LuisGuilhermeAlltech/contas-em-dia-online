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
    
    console.log('[DEBUG] uploadComprovante iniciado:', {
      pagamentoId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    // Validar pagamentoId
    if (!pagamentoId) {
      console.error('[DEBUG] pagamentoId é null ou undefined!');
      setUploading(false);
      return { success: false, error: 'pagamentoId é obrigatório' };
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${pagamentoId}_${Date.now()}.${fileExt}`;
      const filePath = `comprovantes/${fileName}`;

      console.log('[DEBUG] Tentando upload para bucket comprovantes-boletos:', filePath);

      // Upload do arquivo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('comprovantes-boletos')
        .upload(filePath, file);

      console.log('[DEBUG] Resultado do upload:', { uploadData, uploadError });

      if (uploadError) {
        console.error('[DEBUG] Erro no upload:', uploadError);
        throw new Error(uploadError.message || 'Erro no upload do arquivo');
      }

      console.log('[DEBUG] Upload OK. Tentando INSERT em comprovantes_pagamento...');

      // Registrar na tabela - salvar apenas o PATH, não a signed URL
      const insertPayload = {
        pagamento_id: pagamentoId,
        arquivo_url: filePath,
        arquivo_nome: file.name,
        arquivo_tipo: file.type,
      };
      
      console.log('[DEBUG] Payload do INSERT:', insertPayload);

      const { data: insertData, error: insertError } = await supabase
        .from('comprovantes_pagamento')
        .insert(insertPayload)
        .select();

      console.log('[DEBUG] Resultado do INSERT:', { insertData, insertError });

      if (insertError) {
        console.error('[DEBUG] Erro no INSERT:', insertError);
        // Tentar remover arquivo se falhar o insert
        await supabase.storage.from('comprovantes-boletos').remove([filePath]);
        throw new Error(insertError.message || 'Erro ao registrar comprovante');
      }

      console.log('[DEBUG] Comprovante salvo com sucesso!');
      return { success: true };
    } catch (error: any) {
      console.error('[DEBUG] Erro geral no uploadComprovante:', error);
      return { success: false, error: error.message || 'Erro desconhecido' };
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
