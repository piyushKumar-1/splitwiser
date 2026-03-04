import type { ExpenseCategory, SplitType } from './types';

export const SPLIT_TYPES: { value: SplitType; label: string; description: string }[] = [
  { value: 'equal', label: 'Equal', description: 'Split evenly among everyone' },
  { value: 'exact', label: 'Exact', description: 'Enter exact amounts per person' },
  { value: 'percentage', label: 'Percentage', description: 'Split by percentage' },
  { value: 'shares', label: 'Shares', description: 'Split by ratio (e.g., 2:1:1)' },
];

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'food', label: 'Food & Drink' },
  { value: 'travel', label: 'Travel' },
  { value: 'rent', label: 'Rent' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'health', label: 'Health' },
  { value: 'other', label: 'Other' },
];

export const DEFAULT_CURRENCY = 'INR';
