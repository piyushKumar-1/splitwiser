import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import type { Expense } from '@/shared/types';
import { simplifyDebts } from './debtSimplifier';

/**
 * Resolve the owed amount per member for a given expense,
 * handling all 4 split types and rounding remainders.
 */
function resolveOwedAmounts(expense: Expense): Array<{ memberId: string; amount: number }> {
  const { amount, splitType, splits } = expense;
  const participants = splits.filter((s) => splitType === 'equal' || s.value > 0);

  if (participants.length === 0) return [];

  switch (splitType) {
    case 'equal': {
      const share = Math.floor(amount / participants.length);
      let remainder = amount - share * participants.length;
      return participants.map((s, i) => ({
        memberId: s.memberId,
        amount: share + (i < remainder ? 1 : 0),
      }));
    }
    case 'exact':
      return participants.map((s) => ({ memberId: s.memberId, amount: s.value }));

    case 'percentage': {
      const results = participants.map((s) => ({
        memberId: s.memberId,
        amount: Math.round(amount * s.value / 100),
      }));
      // Adjust remainder to first participant
      const total = results.reduce((sum, r) => sum + r.amount, 0);
      if (results.length > 0) results[0].amount += amount - total;
      return results;
    }
    case 'shares': {
      const totalShares = participants.reduce((sum, s) => sum + s.value, 0);
      if (totalShares === 0) return [];
      const results = participants.map((s) => ({
        memberId: s.memberId,
        amount: Math.round(amount * s.value / totalShares),
      }));
      const total = results.reduce((sum, r) => sum + r.amount, 0);
      if (results.length > 0) results[0].amount += amount - total;
      return results;
    }
    default:
      return [];
  }
}

export const selectNetBalances = createSelector(
  [
    (state: RootState) => state.expenses.items,
    (state: RootState) => state.settlements.items,
  ],
  (expenses, settlements) => {
    const netMap = new Map<string, number>();

    for (const expense of expenses) {
      const owedAmounts = resolveOwedAmounts(expense);
      // Payer's net goes up by total amount
      netMap.set(expense.paidById, (netMap.get(expense.paidById) ?? 0) + expense.amount);
      // Each participant's net goes down by their share
      for (const { memberId, amount } of owedAmounts) {
        netMap.set(memberId, (netMap.get(memberId) ?? 0) - amount);
      }
    }

    for (const settlement of settlements) {
      // fromMember paid toMember
      netMap.set(settlement.fromMemberId, (netMap.get(settlement.fromMemberId) ?? 0) + settlement.amount);
      netMap.set(settlement.toMemberId, (netMap.get(settlement.toMemberId) ?? 0) - settlement.amount);
    }

    return netMap;
  },
);

export const selectSimplifiedDebts = createSelector(
  [selectNetBalances],
  (netBalances) => simplifyDebts(netBalances),
);
