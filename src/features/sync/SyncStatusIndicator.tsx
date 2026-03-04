import { CloudOff, RefreshCw, Cloud } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
import { selectIsSignedIn, selectOperationStatus, selectConnectionStatus } from './syncSelectors';

export default function SyncStatusIndicator() {
  const isSignedIn = useAppSelector(selectIsSignedIn);
  const operationStatus = useAppSelector(selectOperationStatus);
  const connectionStatus = useAppSelector(selectConnectionStatus);

  if (!isSignedIn) return null;

  if (operationStatus === 'pushing' || operationStatus === 'pulling') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10">
        <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />
        <span className="text-[10px] font-medium text-blue-600">
          {operationStatus === 'pushing' ? 'Syncing...' : 'Updating...'}
        </span>
      </div>
    );
  }

  if (operationStatus === 'error' || connectionStatus === 'error') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10">
        <CloudOff className="h-3.5 w-3.5 text-red-500" />
        <span className="text-[10px] font-medium text-red-600">Sync error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10">
      <Cloud className="h-3.5 w-3.5 text-emerald-500" />
      <span className="text-[10px] font-medium text-emerald-600">Synced</span>
    </div>
  );
}
