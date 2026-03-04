import type { Expense, Member } from '@/shared/types';

export interface FieldChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

export function diffExpenses(
  oldExp: Expense,
  newExp: Expense,
  members: Member[],
): FieldChange[] {
  const changes: FieldChange[] = [];
  const getName = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  if (oldExp.description !== newExp.description) {
    changes.push({
      field: 'description',
      label: 'Description',
      before: oldExp.description,
      after: newExp.description,
    });
  }

  if (oldExp.amount !== newExp.amount) {
    changes.push({
      field: 'amount',
      label: 'Amount',
      before: `₹${(oldExp.amount / 100).toFixed(2)}`,
      after: `₹${(newExp.amount / 100).toFixed(2)}`,
    });
  }

  if (oldExp.category !== newExp.category) {
    changes.push({
      field: 'category',
      label: 'Category',
      before: oldExp.category,
      after: newExp.category,
    });
  }

  if (oldExp.paidById !== newExp.paidById) {
    changes.push({
      field: 'paidById',
      label: 'Paid by',
      before: getName(oldExp.paidById),
      after: getName(newExp.paidById),
    });
  }

  if (oldExp.splitType !== newExp.splitType) {
    changes.push({
      field: 'splitType',
      label: 'Split type',
      before: oldExp.splitType,
      after: newExp.splitType,
    });
  }

  if (oldExp.date !== newExp.date) {
    changes.push({
      field: 'date',
      label: 'Date',
      before: oldExp.date,
      after: newExp.date,
    });
  }

  if (JSON.stringify(oldExp.splits) !== JSON.stringify(newExp.splits)) {
    changes.push({
      field: 'splits',
      label: 'Split details',
      before: `${oldExp.splits.length} entries`,
      after: `${newExp.splits.length} entries`,
    });
  }

  return changes;
}
