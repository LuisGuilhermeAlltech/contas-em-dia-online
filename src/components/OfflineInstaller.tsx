import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Wifi, WifiOff, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useOffline } from '@/hooks/useOffline';
import { useToast } from '@/components/ui/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function OfflineInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isSwRegistered, setIsSwRegistered] = useState(false);
  const { isOnline, isOffline, wasOffline } = useOffline();
  const { toast } = useToast();

  useEffect(() => {
    // Detectar se app já está instalado
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
    };

    checkInstalled();

    // Registrar Service Worker
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          setIsSwRegistered(true);
          console.log('Service Worker registrado:', registration);
          
          toast({
            title: "Modo offline ativado!",
            description: "O aplicativo agora funciona offline.",
          });
        } catch (error) {
          console.error('Erro ao registrar Service Worker:', error);
          toast({
            variant: "destructive",
            title: "Erro no modo offline",
            description: "Não foi possível ativar o modo offline.",
          });
        }
      }
    };

    registerSW();

    // Capturar evento de instalação PWA
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      toast({
        title: "Aplicativo instalado!",
        description: "Agora você pode usar o app offline.",
      });
    }
    
    setDeferredPrompt(null);
  };

  const getStatusIcon = () => {
    if (isOffline) return <WifiOff className="h-4 w-4" />;
    if (isOnline && wasOffline) return <CheckCircle className="h-4 w-4" />;
    return <Wifi className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (isOffline) return "Offline";
    if (isOnline && wasOffline) return "Online - Sincronizado";
    return "Online";
  };

  const getStatusVariant = () => {
    if (isOffline) return "secondary";
    if (isOnline && wasOffline) return "default";
    return "outline";
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Instalador Offline
        </CardTitle>
        <CardDescription>
          Configure o aplicativo para funcionar offline
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status de Conectividade */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={getStatusVariant()} className="flex items-center gap-1">
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </div>

        {/* Status do Service Worker */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Cache Offline:</span>
          <Badge variant={isSwRegistered ? "default" : "secondary"} className="flex items-center gap-1">
            {isSwRegistered ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            {isSwRegistered ? "Ativo" : "Carregando..."}
          </Badge>
        </div>

        {/* Status da Instalação PWA */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">App Instalado:</span>
          <Badge variant={isInstalled ? "default" : "secondary"} className="flex items-center gap-1">
            {isInstalled ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {isInstalled ? "Sim" : "Não"}
          </Badge>
        </div>

        {/* Botão de Instalação */}
        {!isInstalled && deferredPrompt && (
          <Button 
            onClick={handleInstallClick}
            className="w-full"
            size="lg"
          >
            <Download className="h-4 w-4 mr-2" />
            Instalar Aplicativo
          </Button>
        )}

        {/* Informações sobre funcionalidades offline */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>✓ Funciona completamente offline</p>
          <p>✓ Sincronização automática quando online</p>
          <p>✓ Cache inteligente de dados</p>
          <p>✓ Notificações de sincronização</p>
        </div>

        {isOffline && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-amber-800">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm font-medium">Modo Offline Ativo</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Suas alterações serão sincronizadas quando a conexão retornar.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}