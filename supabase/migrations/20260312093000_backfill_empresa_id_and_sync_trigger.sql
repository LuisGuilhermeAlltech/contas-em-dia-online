-- Backfill de empresa_id a partir de empresa (slug/nome)
UPDATE public.contas c
SET empresa_id = e.id
FROM public.empresas e
WHERE c.empresa_id IS NULL
  AND (c.empresa = e.slug OR c.empresa = e.nome);

-- Mantém empresa_id sincronizado quando inserções/edições vierem apenas com campo empresa
CREATE OR REPLACE FUNCTION public.sync_conta_empresa_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.empresa_id IS NULL AND NEW.empresa IS NOT NULL AND NEW.empresa <> '' THEN
    SELECT e.id
      INTO NEW.empresa_id
    FROM public.empresas e
    WHERE e.slug = NEW.empresa OR e.nome = NEW.empresa
    ORDER BY CASE WHEN e.slug = NEW.empresa THEN 0 ELSE 1 END
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contas_sync_empresa_id ON public.contas;
CREATE TRIGGER trg_contas_sync_empresa_id
  BEFORE INSERT OR UPDATE OF empresa, empresa_id ON public.contas
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_conta_empresa_id();
