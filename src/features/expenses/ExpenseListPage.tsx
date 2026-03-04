import { Link } from 'react-router-dom';
import { Trash2, Receipt, ArrowRight } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectExpenses } from './expensesSelectors';
import { removeExpense } from './expensesThunks';
import { selectSimplifiedDebts } from '@/features/balances/balancesSelectors';
import { Button } from '@/components/ui/button';
import { EXPENSE_CATEGORIES } from '@/shared/constants';
import type { Member } from '@/shared/types';

interface ExpenseListProps {
  groupId: string;
  members: Member[];
}

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍕', travel: '✈️', rent: '🏠', utilities: '💡',
  entertainment: '🎬', shopping: '🛍️', health: '💊', other: '📦',
};

export default function ExpenseList({ groupId, members }: ExpenseListProps) {
  const dispatch = useAppDispatch();
  const expenses = useAppSelector(selectExpenses);
  const debts = useAppSelector(selectSimplifiedDebts);

  const getMemberName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown';
  const getCategoryLabel = (val: string) => EXPENSE_CATEGORIES.find((c) => c.value === val)?.label ?? val;

  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
          <Receipt className="h-7 w-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium mb-1">No expenses yet</p>
        <p className="text-xs text-muted-foreground">Add your first expense to get started.</p>
      </div>
    );
  }

  const topDebts = debts.slice(0, 4);

  return (
    <div className="pt-4">
      {/* Summary card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-4 mb-4">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Spent</p>
        <p className="text-3xl font-extrabold tracking-tight mt-1">&#8377;{(totalSpend / 100).toFixed(2)}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>

        {topDebts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-primary/10 space-y-1.5">
            {topDebts.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[12px] leading-none">
                <span className="font-medium truncate max-w-[30%]">{getMemberName(d.from)}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-medium truncate max-w-[30%]">{getMemberName(d.to)}</span>
                <span className="ml-auto font-semibold shrink-0">&#8377;{(d.amount / 100).toFixed(2)}</span>
              </div>
            ))}
            {debts.length > 4 && (
              <p className="text-[11px] text-muted-foreground/60">
                +{debts.length - 4} more
              </p>
            )}
          </div>
        )}
      </div>

      {/* Expense list */}
      <div className="divide-y">
        {expenses.map((exp) => (
          <Link key={exp.id} to={`/groups/${groupId}/expenses/${exp.id}`}>
            <div className="flex items-center gap-2.5 py-2.5 px-1 active:bg-muted/40 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/70 text-sm shrink-0">
                {CATEGORY_ICONS[exp.category] || '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold truncate leading-tight">{exp.description}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] text-muted-foreground truncate">
                    {getMemberName(exp.paidById)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">·</span>
                  <span className="text-[10px] text-muted-foreground/60">{exp.date}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="text-right">
                  <p className="text-[13px] font-bold leading-tight">&#8377;{(exp.amount / 100).toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground/60">{getCategoryLabel(exp.category)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground/40 hover:text-destructive rounded-md"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dispatch(removeExpense({ id: exp.id, groupId, description: exp.description }));
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
