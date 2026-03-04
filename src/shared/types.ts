export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export type ExpenseCategory =
  | 'food'
  | 'travel'
  | 'rent'
  | 'utilities'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'other';

export type ActivityAction =
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'settlement_added'
  | 'settlement_deleted'
  | 'member_added'
  | 'member_removed'
  | 'group_created'
  | 'group_updated';

export interface Member {
  id: string;
  name: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  members: Member[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SplitEntry {
  memberId: string;
  value: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number; // in cents (integer)
  currency: string;
  category: ExpenseCategory;
  paidById: string;
  splitType: SplitType;
  splits: SplitEntry[];
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number; // in cents
  date: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  groupId: string;
  action: ActivityAction;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SplitwiserExport {
  version: number;
  exportedAt: string;
  data: {
    groups: Group[];
    expenses: Expense[];
    settlements: Settlement[];
    activityLog: ActivityLogEntry[];
  };
}
