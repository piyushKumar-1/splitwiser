import { TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { useAppSelector } from '@/app/hooks';
import { selectNetBalances } from './balancesSelectors';
import { Card, CardContent } from '@/components/ui/card';
import MemberAvatar from '@/shared/MemberAvatar';
import type { Member } from '@/shared/types';

interface BalanceSummaryProps {
  members: Member[];
}

export default function BalanceSummary({ members }: BalanceSummaryProps) {
  const netBalances = useAppSelector(selectNetBalances);
  const getName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown';

  const memberBalances = members
    .map((m) => ({ member: m, balance: netBalances.get(m.id) ?? 0 }))
    .filter((b) => Math.abs(b.balance) >= 1);

  if (memberBalances.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-3">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <p className="text-sm font-medium">All settled up!</p>
        <p className="text-xs text-muted-foreground mt-1">No outstanding balances.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pt-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Net Balances
      </h3>
      {memberBalances.map(({ member, balance }) => {
        const isPositive = balance > 0;
        return (
          <Card key={member.id} className="border shadow-sm">
            <CardContent className="flex items-center gap-3 p-3.5">
              <MemberAvatar name={getName(member.id)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{getName(member.id)}</p>
                <p className="text-xs text-muted-foreground">
                  {isPositive ? 'gets back' : 'owes'}
                </p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${
                isPositive
                  ? 'bg-green-500/10 text-green-700'
                  : 'bg-red-500/10 text-red-600'
              }`}>
                {isPositive
                  ? <TrendingUp className="h-3.5 w-3.5" />
                  : <TrendingDown className="h-3.5 w-3.5" />
                }
                &#8377;{Math.abs(balance / 100).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
