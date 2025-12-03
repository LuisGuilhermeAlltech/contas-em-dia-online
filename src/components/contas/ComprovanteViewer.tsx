import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink, FileText, Calendar, Clock, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/formatters';
import { useComprovantes } from '@/hooks/useComprovantes';

interface ComprovanteViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamentoId: string | null;
  contaDescricao?: string;
}

export function ComprovanteViewer({
  open,
  onOpenChange,
  pagamentoId,
  contaDescricao,
}: ComprovanteViewerProps) {
  const [comprovante, setComprovante] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { getComprovanteByPagamento } = useComprovantes();

  useEffect(() => {
    if (open && pagamentoId) {
      setLoading(true);
      getComprovanteByPagamento(pagamentoId)
        .then(setComprovante)
        .finally(() => setLoading(false));
    } else {
      setComprovante(null);
    }
  }, [open, pagamentoId]);

  const isPdf = comprovante?.arquivo_tipo === 'application/pdf';
  const isImage = comprovante?.arquivo_tipo?.startsWith('image/');

  const handleDownload = () => {
    if (comprovante?.arquivo_url) {
      window.open(comprovante.arquivo_url, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Comprovante de Pagamento</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !comprovante ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhum comprovante anexado a este pagamento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {contaDescricao && (
              <p className="text-sm text-muted-foreground">
                Conta: <strong>{contaDescricao}</strong>
              </p>
            )}

            {/* Metadados */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>Upload: {formatDate(comprovante.data_upload)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Expira em: {formatDate(comprovante.data_expiracao)}</span>
              </div>
            </div>

            {/* Preview */}
            <div className="border rounded-lg overflow-hidden bg-muted/30">
              {isImage ? (
                <img
                  src={comprovante.arquivo_url}
                  alt="Comprovante"
                  className="max-w-full max-h-[500px] mx-auto object-contain"
                />
              ) : isPdf ? (
                <iframe
                  src={comprovante.arquivo_url}
                  className="w-full h-[500px]"
                  title="Comprovante PDF"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-4">
                    {comprovante.arquivo_nome}
                  </p>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
              <Button variant="outline" onClick={handleDownload}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir em nova aba
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Os comprovantes são mantidos por 1 ano após o upload.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
