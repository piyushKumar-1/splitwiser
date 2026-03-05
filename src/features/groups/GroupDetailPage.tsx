import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Plus, ArrowLeft, Settings2, RefreshCw, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchGroups, editGroup } from './groupsThunks';
import { setActiveGroup } from './groupsSlice';
import { selectActiveGroup } from './groupsSelectors';
import { fetchExpenses } from '@/features/expenses/expensesThunks';
import { fetchSettlements } from '@/features/settlements/settlementsThunks';
import { fetchActivities } from '@/features/activity/activityThunks';
import { selectExpenses } from '@/features/expenses/expensesSelectors';
import MemberManager from './MemberManager';
import ExpenseList from '@/features/expenses/ExpenseListPage';
import BalanceSummary from '@/features/balances/BalanceSummary';
import SimplifiedDebts from '@/features/balances/SimplifiedDebts';
import SettlementList from '@/features/settlements/SettlementList';
import ActivityFeed from '@/features/activity/ActivityFeed';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import MemberAvatar from '@/shared/MemberAvatar';
import EnableSyncButton from '@/features/sync/EnableSyncButton';
import { selectAuthUserEmail } from '@/features/auth/authSelectors';
import { pullEvents } from '@/features/sync/sync-engine';
import { toast } from 'sonner';
import type { Member } from '@/shared/types';

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const group = useAppSelector(selectActiveGroup);
  const expenses = useAppSelector(selectExpenses);
  const currentUserEmail = useAppSelector(selectAuthUserEmail);
  const [syncing, setSyncing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) return;
    dispatch(setActiveGroup(groupId));
    dispatch(fetchGroups());
    dispatch(fetchExpenses(groupId));
    dispatch(fetchSettlements(groupId));
    dispatch(fetchActivities(groupId));
  }, [dispatch, groupId]);

  const refreshData = useCallback(async () => {
    if (!groupId || syncing) return;
    setSyncing(true);
    try {
      const hadChanges = await pullEvents(groupId);
      dispatch(fetchGroups());
      dispatch(fetchExpenses(groupId));
      dispatch(fetchSettlements(groupId));
      dispatch(fetchActivities(groupId));
      if (hadChanges) {
        toast.success('Updated from cloud');
      } else {
        toast('Already up to date');
      }
    } catch {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [groupId, syncing, dispatch]);

  // Pull-to-refresh touch handlers
  const PULL_THRESHOLD = 80;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (syncing || window.scrollY > 0) {
      setPullDistance(0);
      return;
    }
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) {
      setPullDistance(Math.min(dy * 0.4, PULL_THRESHOLD + 20));
    }
  }, [syncing]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= PULL_THRESHOLD) {
      refreshData();
    }
    setPullDistance(0);
  }, [pullDistance, refreshData]);

  const [waitedForLoad, setWaitedForLoad] = useState(false);

  useEffect(() => {
    if (!group) {
      const timer = setTimeout(() => setWaitedForLoad(true), 1500);
      return () => clearTimeout(timer);
    }
    setWaitedForLoad(false);
  }, [group]);

  if (!group) {
    if (!waitedForLoad) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Group not found.</p>
        <Button variant="link" onClick={() => navigate('/groups')} className="mt-2">
          Back to Groups
        </Button>
      </div>
    );
  }

  const handleMembersChange = (members: Member[]) => {
    dispatch(editGroup({ ...group, members }));
  };

  return (
    <div
      ref={containerRef}
      className="space-y-5"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || syncing) && (
        <div
          className="flex items-center justify-center transition-all overflow-hidden"
          style={{ height: syncing ? 40 : pullDistance > 0 ? pullDistance : 0 }}
        >
          <RefreshCw
            className={`h-5 w-5 text-muted-foreground transition-transform ${
              syncing ? 'animate-spin' : ''
            }`}
            style={{
              transform: syncing ? undefined : `rotate(${pullDistance * 3}deg)`,
              opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
            }}
          />
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl shrink-0"
          onClick={() => navigate('/groups')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold tracking-tight truncate">{group.name}</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="flex -space-x-1.5">
              {group.members.slice(0, 3).map((m) => (
                <MemberAvatar key={m.id} name={m.name} size="sm" className="ring-2 ring-background h-5 w-5 text-[8px]" />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {group.members.length} member{group.members.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl"
            onClick={refreshData}
            disabled={syncing}
            title="Sync from cloud"
          >
            {syncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <EnableSyncButton groupId={group.id} groupName={group.name} />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                <Settings2 className="h-4 w-4" />
              </Button>
            </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh]">
            <SheetHeader>
              <SheetTitle>Manage Members</SheetTitle>
            </SheetHeader>
            <div className="py-4 overflow-y-auto">
              <MemberManager members={group.members} onChange={handleMembersChange} currentUserEmail={currentUserEmail} />
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* No members state */}
      {group.members.length < 2 && (
        <div className="rounded-2xl border-2 border-dashed p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Add at least 2 members to start adding expenses.
          </p>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="rounded-xl gap-1.5">
                <Plus className="h-4 w-4" /> Add Members
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh]">
              <SheetHeader>
                <SheetTitle>Manage Members</SheetTitle>
              </SheetHeader>
              <div className="py-4 overflow-y-auto">
                <MemberManager members={group.members} onChange={handleMembersChange} currentUserEmail={currentUserEmail} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Main content */}
      {group.members.length >= 2 && (
        <>
          {/* FAB for adding expense */}
          <Link to={`/groups/${group.id}/expenses/new`}>
            <Button className="w-full h-12 rounded-2xl shadow-md shadow-primary/20 gap-2 text-sm font-semibold">
              <Plus className="h-5 w-5" /> Add Expense
            </Button>
          </Link>

          <Tabs defaultValue="expenses">
            <TabsList variant="line" className="w-full border-b rounded-none pb-0 justify-start gap-0">
              <TabsTrigger value="expenses" className="rounded-none px-3">
                Expenses
                {expenses.length > 0 && (
                  <span className="ml-1.5 text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-semibold">
                    {expenses.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="balances" className="rounded-none px-3">Balances</TabsTrigger>
              <TabsTrigger value="settlements" className="rounded-none px-3">Settle</TabsTrigger>
              <TabsTrigger value="activity" className="rounded-none px-3">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="expenses">
              <ExpenseList groupId={group.id} members={group.members} />
            </TabsContent>
            <TabsContent value="balances">
              <SimplifiedDebts members={group.members} groupId={group.id} />
              <BalanceSummary members={group.members} />
            </TabsContent>
            <TabsContent value="settlements">
              <SettlementList groupId={group.id} members={group.members} />
            </TabsContent>
            <TabsContent value="activity">
              <ActivityFeed />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
