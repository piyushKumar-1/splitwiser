import { useState } from 'react';
import {
  Cloud,
  LogOut,
  Loader2,
  RefreshCw,
  Download,
  Users,
  Mail,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectGroups } from '@/features/groups/groupsSelectors';
import { selectAuthUserEmail, selectAuthUserDisplayName } from '@/features/auth/authSelectors';
import {
  selectSyncedGroupIds,
  selectDiscoveredGroups,
  selectLastSyncAt,
} from './syncSelectors';
import {
  discoverSharedGroups,
  joinSharedGroup,
} from './syncThunks';
import { logout } from '@/features/auth/authThunks';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SyncSettingsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const userEmail = useAppSelector(selectAuthUserEmail);
  const displayName = useAppSelector(selectAuthUserDisplayName);
  const syncedGroupIds = useAppSelector(selectSyncedGroupIds);
  const discoveredGroups = useAppSelector(selectDiscoveredGroups);
  const lastSyncAt = useAppSelector(selectLastSyncAt);
  const groups = useAppSelector(selectGroups);

  const [discovering, setDiscovering] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const handleSignOut = async () => {
    await dispatch(logout()).unwrap();
    toast.success('Signed out');
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const result = await dispatch(discoverSharedGroups()).unwrap();
      if (result.length === 0) {
        toast('No new shared groups found');
      } else {
        toast.success(`Found ${result.length} shared group${result.length > 1 ? 's' : ''}`);
      }
    } catch (err) {
      toast.error(`Discovery failed: ${(err as Error).message}`);
    } finally {
      setDiscovering(false);
    }
  };

  const handleJoin = async (spreadsheetId: string) => {
    setJoiningId(spreadsheetId);
    try {
      const groupId = await dispatch(joinSharedGroup(spreadsheetId)).unwrap();
      toast.success('Joined group successfully');
      navigate(`/groups/${groupId}`);
    } catch (err) {
      toast.error(`Failed to join: ${(err as Error).message}`);
    } finally {
      setJoiningId(null);
    }
  };

  const syncedGroups = groups.filter((g) => syncedGroupIds.includes(g.id));

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
          <Cloud className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Sync</h2>
          <p className="text-xs text-muted-foreground">
            Sync groups with Google Sheets
          </p>
        </div>
      </div>

      {/* Account Section */}
      <div className="rounded-2xl border bg-card p-5 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Google Account
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {userEmail}
              </p>
            </div>
          </div>

          {lastSyncAt && (
            <p className="text-[11px] text-muted-foreground">
              Last synced:{' '}
              {new Date(lastSyncAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}

          <Button
            variant="outline"
            className="w-full h-11 rounded-xl gap-2 font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Synced Groups */}
      <div className="rounded-2xl border bg-card p-5 space-y-4 mt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Synced Groups
        </p>

        {syncedGroups.length === 0 ? (
          <div className="text-center py-6">
            <div className="mx-auto h-10 w-10 rounded-2xl bg-muted flex items-center justify-center mb-2">
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              No groups synced yet. Enable sync from a group's detail page.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {syncedGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Cloud className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{group.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {group.members.length} members
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discover Shared Groups */}
      <div className="rounded-2xl border bg-card p-5 space-y-4 mt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Shared with You
        </p>

        <Button
          variant="outline"
          className="w-full h-11 rounded-xl gap-2 font-medium"
          onClick={handleDiscover}
          disabled={discovering}
        >
          {discovering ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Discover Shared Groups
        </Button>

        {discoveredGroups.length > 0 && (
          <div className="space-y-2">
            {discoveredGroups.map((dg) => (
              <div
                key={dg.spreadsheetId}
                className="flex items-center gap-3 p-3.5 rounded-xl border bg-blue-500/5"
              >
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Download className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{dg.groupName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    from {dg.ownerEmail}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="rounded-xl h-8 px-4 text-xs font-semibold shrink-0"
                  onClick={() => handleJoin(dg.spreadsheetId)}
                  disabled={joiningId === dg.spreadsheetId}
                >
                  {joiningId === dg.spreadsheetId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Join'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {discoveredGroups.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Groups shared with your Google account will appear here.
          </p>
        )}
      </div>
    </div>
  );
}
