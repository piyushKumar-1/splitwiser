import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus, Receipt, Users, Wallet } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { fetchGroups } from '@/features/groups/groupsThunks';
import { selectGroups } from '@/features/groups/groupsSelectors';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import MemberAvatar from '@/shared/MemberAvatar';

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const groups = useAppSelector(selectGroups);

  useEffect(() => {
    dispatch(fetchGroups());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground md:hidden">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Splitwiser</h1>
            <p className="text-sm text-muted-foreground">Split expenses with friends</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-primary text-primary-foreground border-0 shadow-lg shadow-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 opacity-80">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Groups</span>
            </div>
            <p className="text-2xl font-bold">{groups.length}</p>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Receipt className="h-4 w-4" />
              <span className="text-xs font-medium">Members</span>
            </div>
            <p className="text-2xl font-bold">
              {groups.reduce((sum, g) => sum + g.members.length, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick action */}
      <Link to="/groups">
        <Button className="w-full h-12 text-base rounded-2xl shadow-md shadow-primary/20 gap-2">
          <Plus className="h-5 w-5" />
          Create New Group
        </Button>
      </Link>

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-muted flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">No groups yet</h3>
          <p className="text-sm text-muted-foreground max-w-[240px] mx-auto">
            Create your first group to start splitting expenses with friends.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Your Groups
            </h2>
            <Link to="/groups" className="text-xs text-primary font-medium">
              See all
            </Link>
          </div>
          <div className="space-y-2">
            {groups.slice(0, 5).map((group) => (
              <Link key={group.id} to={`/groups/${group.id}`}>
                <Card className="border shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]">
                  <CardContent className="flex items-center gap-3.5 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{group.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex -space-x-1.5">
                          {group.members.slice(0, 3).map((m) => (
                            <MemberAvatar key={m.id} name={m.name} size="sm" className="ring-2 ring-card h-5 w-5 text-[8px]" />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
