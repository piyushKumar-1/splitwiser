import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Trash2, ArrowRight, RefreshCw, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchGroups, addGroup, removeGroup } from './groupsThunks';
import { selectGroups, selectGroupsStatus } from './groupsSelectors';
import { discoverAndAutoJoin } from '@/features/sync/auto-discover';
import { selectAuthUserEmail } from '@/features/auth/authSelectors';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import MemberAvatar from '@/shared/MemberAvatar';
import { toast } from 'sonner';

export default function GroupListPage() {
  const dispatch = useAppDispatch();
  const groups = useAppSelector(selectGroups);
  const status = useAppSelector(selectGroupsStatus);
  const currentUserEmail = useAppSelector(selectAuthUserEmail);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  const handleCreate = () => {
    if (!name.trim()) return;
    dispatch(addGroup({ name: name.trim(), members: [] }));
    setName('');
    setOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, groupName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteTarget({ id, name: groupName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dispatch(removeGroup(deleteTarget.id)).unwrap();
      toast.success(`Deleted "${deleteTarget.name}"`);
    } catch (err) {
      toast.error(`Failed to delete: ${(err as Error).message}`);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await discoverAndAutoJoin();
      dispatch(fetchGroups());
      toast.success('Sync complete');
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Groups</h2>
          <p className="text-sm text-muted-foreground">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-9 w-9"
            onClick={handleSync}
            disabled={syncing}
            title="Sync shared groups"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" /> New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Create Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="group-name">Group Name</Label>
                  <Input
                    id="group-name"
                    placeholder="e.g., Trip to Goa"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    autoFocus
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="flex gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" className="flex-1 rounded-xl">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleCreate} disabled={!name.trim()} className="flex-1 rounded-xl">
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {status === 'loading' && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {status === 'idle' && groups.length === 0 && (
        <div className="text-center py-16">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-5">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
          <p className="text-sm text-muted-foreground max-w-[260px] mx-auto mb-6">
            Create your first group or sync shared groups from other members.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleSync} disabled={syncing} className="rounded-2xl h-11 px-6 gap-2">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Find Shared Groups
            </Button>
            <Button onClick={() => setOpen(true)} className="rounded-2xl h-11 px-6 gap-2">
              <Plus className="h-4 w-4" /> Create Group
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {groups.map((group) => (
          <Link key={group.id} to={`/groups/${group.id}`}>
            <Card className="border shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] overflow-hidden">
              <CardContent className="flex items-center gap-3.5 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{group.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {group.members.length > 0 ? (
                      <>
                        <div className="flex -space-x-2">
                          {group.members.slice(0, 4).map((m) => (
                            <MemberAvatar key={m.id} name={m.name} size="sm" className="ring-2 ring-card" />
                          ))}
                          {group.members.length > 4 && (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-card">
                              +{group.members.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">No members yet</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(!group.createdBy || group.createdBy.toLowerCase() === currentUserEmail?.toLowerCase()) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
                      onClick={(e) => handleDeleteClick(e, group.id, group.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the group, all its expenses, settlements, and activity history.
              If sync is enabled, the linked Google Sheet will also be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
