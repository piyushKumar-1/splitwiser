import { ArrowRight, Zap } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { selectSimplifiedDebts } from './balancesSelectors';
import { addSettlement } from '@/features/settlements/settlementsThunks';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import MemberAvatar from '@/shared/MemberAvatar';
import type { Member } from '@/shared/types';

interface SimplifiedDebtsProps {
  members: Member[];
  groupId: string;
}

export default function SimplifiedDebts({ members, groupId }: SimplifiedDebtsProps) {
  const dispatch = useAppDispatch();
  const debts = useAppSelector(selectSimplifiedDebts);
  const getName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown';

  if (debts.length === 0) return null;

  const handleSettle = (fromId: string, toId: string, amount: number) => {
    dispatch(addSettlement({
      groupId,
      fromMemberId: fromId,
      toMemberId: toId,
      amount,
      date: new Date().toISOString().slice(0, 10),
      fromName: getName(fromId),
      toName: getName(toId),
    }));
  };

  return (
    <div className="space-y-2.5 pt-5">
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-primary" />
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Simplified — {debts.length} payment{debts.length !== 1 ? 's' : ''}
        </h3>
      </div>
      {debts.map((debt, i) => (
        <Card key={i} className="border shadow-sm">
          <CardContent className="flex items-center gap-3 p-3.5">
            <MemberAvatar name={getName(debt.from)} size="sm" />
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-sm font-medium truncate">{getName(debt.from)}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">{getName(debt.to)}</span>
            </div>
            <span className="text-sm font-bold shrink-0">&#8377;{(debt.amount / 100).toFixed(2)}</span>
            <Button
              size="sm"
              className="rounded-xl h-8 px-3 text-xs shrink-0"
              onClick={() => handleSettle(debt.from, debt.to, debt.amount)}
            >
              Settle
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
