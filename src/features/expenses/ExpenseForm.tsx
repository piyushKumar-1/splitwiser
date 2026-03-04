import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectActiveGroup } from '@/features/groups/groupsSelectors';
import { setActiveGroup } from '@/features/groups/groupsSlice';
import { fetchGroups } from '@/features/groups/groupsThunks';
import { fetchActivities } from '@/features/activity/activityThunks';
import { addExpense, editExpense, fetchExpenses } from './expensesThunks';
import { toast } from 'sonner';
import { selectExpenses } from './expensesSelectors';
import ExpenseEditHistory from './ExpenseEditHistory';
import SplitInput from './SplitInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EXPENSE_CATEGORIES, SPLIT_TYPES, DEFAULT_CURRENCY } from '@/shared/constants';
import MemberAvatar from '@/shared/MemberAvatar';
import type { SplitType, SplitEntry, ExpenseCategory } from '@/shared/types';

const CATEGORY_ICONS: Record<string, string> = {
  food: '🍕', travel: '✈️', rent: '🏠', utilities: '💡',
  entertainment: '🎬', shopping: '🛍️', health: '💊', other: '📦',
};

export default function ExpenseForm() {
  const { groupId, expenseId } = useParams<{ groupId: string; expenseId?: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const group = useAppSelector(selectActiveGroup);
  const expenses = useAppSelector(selectExpenses);
  const existingExpense = expenseId ? expenses.find((e) => e.id === expenseId) : undefined;
  const isEditing = !!existingExpense;

  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [paidById, setPaidById] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splits, setSplits] = useState<SplitEntry[]>([]);

  useEffect(() => {
    if (!groupId) return;
    dispatch(setActiveGroup(groupId));
    dispatch(fetchGroups());
    dispatch(fetchExpenses(groupId));
    dispatch(fetchActivities(groupId));
  }, [dispatch, groupId]);

  useEffect(() => {
    if (existingExpense) {
      setDescription(existingExpense.description);
      setAmountStr((existingExpense.amount / 100).toString());
      setDate(existingExpense.date);
      setCategory(existingExpense.category);
      setPaidById(existingExpense.paidById);
      setSplitType(existingExpense.splitType);
      setSplits(existingExpense.splits);
    }
  }, [existingExpense]);

  useEffect(() => {
    if (!paidById && group?.members.length) {
      setPaidById(group.members[0].id);
    }
  }, [group, paidById]);

  useEffect(() => {
    if (splitType === 'equal' && group?.members.length && !isEditing) {
      setSplits(group.members.map((m) => ({ memberId: m.id, value: 0 })));
    }
  }, [splitType, group, isEditing]);

  const amountCents = Math.round(parseFloat(amountStr || '0') * 100);

  const isValid = () => {
    if (!description.trim() || amountCents <= 0 || !paidById) return false;
    if (splits.length === 0) return false;
    switch (splitType) {
      case 'equal': return splits.length >= 1;
      case 'exact': return splits.reduce((sum, s) => sum + s.value, 0) === amountCents;
      case 'percentage': return splits.reduce((sum, s) => sum + s.value, 0) === 100;
      case 'shares': return splits.reduce((sum, s) => sum + s.value, 0) > 0;
      default: return false;
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !isValid() || submitting) return;

    const expenseData = {
      groupId,
      description: description.trim(),
      amount: amountCents,
      currency: DEFAULT_CURRENCY,
      category,
      paidById,
      splitType,
      splits: splits.filter((s) => splitType === 'equal' || s.value > 0),
      date,
    };

    setSubmitting(true);
    try {
      if (isEditing && existingExpense) {
        await dispatch(editExpense({ ...existingExpense, ...expenseData })).unwrap();
      } else {
        await dispatch(addExpense(expenseData)).unwrap();
      }
      navigate(`/groups/${groupId}`);
    } catch (err) {
      toast.error(`Failed to ${isEditing ? 'update' : 'add'} expense: ${(err as Error).message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!group) return <div className="h-40 rounded-2xl bg-muted animate-pulse" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold tracking-tight">
          {isEditing ? 'Edit Expense' : 'New Expense'}
        </h2>
      </div>

      {/* Amount — large prominent input */}
      <div className="rounded-2xl bg-card border p-5 text-center space-y-2">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Amount</Label>
        <div className="flex items-center justify-center gap-1">
          <span className="text-2xl font-bold text-muted-foreground">&#8377;</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            className="text-4xl font-bold text-center bg-transparent border-none outline-none w-40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</Label>
        <Input
          placeholder="What was this for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-12 rounded-xl text-base"
          autoFocus
        />
      </div>

      {/* Date + Category row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <span className="flex items-center gap-2">
                    <span>{CATEGORY_ICONS[c.value]}</span>
                    <span>{c.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Paid by */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid by</Label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {group.members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setPaidById(m.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                paidById === m.id
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'border-border bg-card hover:bg-accent'
              }`}
            >
              <MemberAvatar name={m.name} size="sm" className="h-6 w-6 text-[9px]" />
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Split type */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Split type</Label>
        <div className="grid grid-cols-4 gap-2">
          {SPLIT_TYPES.map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => {
                setSplitType(st.value);
                setSplits(group.members.map((m) => ({ memberId: m.id, value: 0 })));
              }}
              className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
                splitType === st.value
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                  : 'border-border bg-card hover:bg-accent'
              }`}
            >
              <span className="text-base">
                {st.value === 'equal' ? '=' : st.value === 'exact' ? '#' : st.value === 'percentage' ? '%' : '÷'}
              </span>
              <span>{st.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Split details */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Split among</Label>
        <div className="rounded-xl border bg-card p-3.5">
          <SplitInput
            splitType={splitType}
            members={group.members}
            splits={splits}
            totalAmount={amountCents}
            onChange={setSplits}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-2.5 pt-3 pb-6">
        <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1 h-12 rounded-2xl shadow-md shadow-primary/20 font-semibold" disabled={!isValid() || submitting}>
          {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Expense'}
        </Button>
      </div>

      {/* Edit History */}
      {isEditing && expenseId && (
        <ExpenseEditHistory expenseId={expenseId} />
      )}
    </form>
  );
}
