-- Criar bucket privado para comprovantes de boletos
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-boletos', 'comprovantes-boletos', false)
ON CONFLICT (id) DO NOTHING;

-- Política para INSERT (upload de arquivos)
CREATE POLICY "Permitir upload de comprovantes"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'comprovantes-boletos');

-- Política para SELECT (visualizar/download de arquivos)
CREATE POLICY "Permitir leitura de comprovantes"
ON storage.objects
FOR SELECT
USING (bucket_id = 'comprovantes-boletos');

-- Política para DELETE (remover arquivos)
CREATE POLICY "Permitir deletar comprovantes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'comprovantes-boletos');