import { useOffline } from '@/hooks/useOffline';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineStatus() {
  const { isOnline, isOffline } = useOffline();

  if (isOffline) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <WifiOff className="h-3 w-3" />
        Offline
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1">
      <Wifi className="h-3 w-3" />
      Online
    </Badge>
  );
}