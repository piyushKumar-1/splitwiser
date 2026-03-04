import { useAppSelector } from '@/app/hooks';
import type { FieldChange } from './expense-diff';

interface ExpenseEditHistoryProps {
  expenseId: string;
}

export default function ExpenseEditHistory({ expenseId }: ExpenseEditHistoryProps) {
  const activities = useAppSelector((state) =>
    state.activity.items.filter(
      (entry) =>
        entry.metadata?.expenseId === expenseId &&
        (entry.action === 'expense_updated' || entry.action === 'expense_added'),
    ),
  );

  if (activities.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Edit History
      </h3>
      <div className="relative pl-5">
        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
        <div className="space-y-4">
          {activities.map((entry, i) => {
            const changes = (entry.metadata?.changes as FieldChange[] | undefined) ?? [];
            const editor =
              (entry.metadata?.editedBy as string) ??
              (entry.metadata?.addedBy as string) ??
              '';

            return (
              <div key={entry.id} className="relative flex gap-3">
                <div
                  className={`absolute -left-5 top-1.5 h-3 w-3 rounded-full border-2 border-background ${
                    i === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs font-medium truncate">{editor}</p>
                    <p className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(entry.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      {new Date(entry.timestamp).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {entry.action === 'expense_added' && (
                    <p className="text-[11px] text-muted-foreground">Created this expense</p>
                  )}
                  {changes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {changes.map((c, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center text-[11px] rounded-md bg-muted/70 px-2 py-0.5"
                        >
                          <span className="font-medium">{c.label}:</span>
                          &nbsp;
                          <span className="text-muted-foreground line-through">{c.before}</span>
                          &nbsp;&rarr;&nbsp;
                          <span className="font-medium">{c.after}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
