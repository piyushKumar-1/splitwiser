export interface SimplifiedDebt {
  from: string;
  to: string;
  amount: number; // in cents
}

/**
 * Given a map of memberId -> net balance (positive = is owed, negative = owes),
 * returns the minimal set of transactions to settle all debts.
 *
 * Uses a greedy approach: repeatedly match the largest debtor with the
 * largest creditor, settling whichever is smaller.
 */
export function simplifyDebts(netBalances: Map<string, number>): SimplifiedDebt[] {
  const debtors: Array<{ id: string; amount: number }> = [];
  const creditors: Array<{ id: string; amount: number }> = [];

  for (const [id, balance] of netBalances) {
    if (balance < -1) {
      debtors.push({ id, amount: -balance });
    } else if (balance > 1) {
      creditors.push({ id, amount: balance });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const result: SimplifiedDebt[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settleAmount = Math.min(debtor.amount, creditor.amount);

    result.push({ from: debtor.id, to: creditor.id, amount: settleAmount });

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 1) i++;
    if (creditor.amount < 1) j++;
  }

  return result;
}
