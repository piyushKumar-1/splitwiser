import { useState } from 'react';
import { Cloud, Share2, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectIsGroupSynced } from './syncSelectors';
import { enableSyncForGroup } from './syncThunks';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ShareGroupSheet from './ShareGroupSheet';

interface EnableSyncButtonProps {
  groupId: string;
  groupName: string;
}

export default function EnableSyncButton({ groupId, groupName }: EnableSyncButtonProps) {
  const dispatch = useAppDispatch();
  const isSynced = useAppSelector(selectIsGroupSynced(groupId));
  const [loading, setLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const handleEnableSync = async () => {
    setLoading(true);
    try {
      await dispatch(enableSyncForGroup({ groupId, groupName })).unwrap();
      toast.success('Sync enabled for this group');
    } catch (err) {
      toast.error(`Failed to enable sync: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isSynced) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl gap-1.5 h-8 text-xs font-medium"
        onClick={handleEnableSync}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        Enable Sync
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="rounded-xl gap-1.5 h-8 text-xs font-medium bg-emerald-500/5 border-emerald-200 text-emerald-700 hover:bg-emerald-500/10"
        onClick={() => setShowShare(true)}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </Button>
      <ShareGroupSheet
        groupId={groupId}
        open={showShare}
        onOpenChange={setShowShare}
      />
    </>
  );
}
