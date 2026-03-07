import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import {
  ArrowLeft,
  Camera,
  Loader2,
  Trash2,
  Plus,
  Receipt,
  UserPlus,
  Check,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectActiveGroup } from '@/features/groups/groupsSelectors';
import { setActiveGroup } from '@/features/groups/groupsSlice';
import { fetchGroups } from '@/features/groups/groupsThunks';
import { addExpense } from '@/features/expenses/expensesThunks';
import { selectAuthUserEmail, selectAuthUserDisplayName } from '@/features/auth/authSelectors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { recognizeText, terminateOCR } from './ocr-worker';
import { parseBillText } from './bill-parser';
import MemberSearchSelect from './MemberSearchSelect';
import type { BillItem, AssignedMember, ParsedBill } from './types';
import type { Member } from '@/shared/types';
import { DEFAULT_CURRENCY } from '@/shared/constants';
import { addGroup } from '@/features/groups/groupsThunks';

type Step = 'capture' | 'processing' | 'assign';

export default function BillScanPage() {
  const { groupId } = useParams<{ groupId?: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const group = useAppSelector(selectActiveGroup);
  const userEmail = useAppSelector(selectAuthUserEmail);
  const userName = useAppSelector(selectAuthUserDisplayName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('capture');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [, setParsedBill] = useState<ParsedBill | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [paidByEmail, setPaidByEmail] = useState(userEmail || '');
  const [submitting, setSubmitting] = useState(false);

  // New manual item state
  const [addingItem, setAddingItem] = useState(false);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');

  useEffect(() => {
    if (groupId) {
      dispatch(setActiveGroup(groupId));
      dispatch(fetchGroups());
    }
  }, [dispatch, groupId]);

  useEffect(() => {
    return () => {
      terminateOCR();
    };
  }, []);

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setStep('processing');

    try {
      const text = await recognizeText(file);
      const bill = parseBillText(text);
      setParsedBill(bill);
      setItems(bill.items);
      setStep('assign');

      if (bill.items.length === 0) {
        toast('No items detected. You can add them manually.');
      } else {
        toast.success(`Found ${bill.items.length} items`);
      }
    } catch (err) {
      toast.error(`OCR failed: ${(err as Error).message}`);
      setStep('capture');
    }
  };

  const updateItem = (id: string, update: Partial<BillItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...update } : item)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const addManualItem = () => {
    const amount = Math.round(parseFloat(newItemAmount || '0') * 100);
    if (!newItemDesc.trim() || amount <= 0) return;
    setItems((prev) => [
      ...prev,
      {
        id: nanoid(),
        description: newItemDesc.trim(),
        amount,
        quantity: 1,
        assignedTo: [],
      },
    ]);
    setNewItemDesc('');
    setNewItemAmount('');
    setAddingItem(false);
  };

  const handleSubmit = async () => {
    if (submitting) return;

    // Validate: at least one item with at least one assignee
    const assignedItems = items.filter((item) => item.assignedTo.length > 0);
    if (assignedItems.length === 0) {
      toast.error('Assign at least one member to at least one item');
      return;
    }

    setSubmitting(true);

    try {
      let targetGroupId = groupId;

      // If no group context, find or create a personal group
      if (!targetGroupId) {
        // Collect all unique members across items + the payer
        const allMembers = new Map<string, AssignedMember>();
        for (const item of assignedItems) {
          for (const m of item.assignedTo) {
            allMembers.set(m.email.toLowerCase(), m);
          }
        }
        // Add payer if not already in
        if (userEmail && !allMembers.has(userEmail.toLowerCase())) {
          allMembers.set(userEmail.toLowerCase(), {
            id: nanoid(),
            name: userName || userEmail,
            email: userEmail,
          });
        }

        const membersList = Array.from(allMembers.values()).map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
        }));

        // Create a personal group named "Personal Expenses"
        const result = await dispatch(
          addGroup({
            name: `Bill Split — ${new Date().toLocaleDateString()}`,
            members: membersList,
          }),
        );
        if (addGroup.fulfilled.match(result)) {
          targetGroupId = result.payload.id;
        } else {
          throw new Error('Failed to create group for bill split');
        }
      }

      // Get group members to resolve member IDs
      const groupMembers = group?.members || [];
      const getMemberId = (email: string): string => {
        const found = groupMembers.find(
          (m) => m.email.toLowerCase() === email.toLowerCase(),
        );
        return found?.id || email;
      };

      // Find payer's member ID
      const payerId = getMemberId(paidByEmail || userEmail || '');

      // Create one expense per item
      for (const item of assignedItems) {
        const splitPerPerson = Math.floor(item.amount / item.assignedTo.length);
        const remainder = item.amount - splitPerPerson * item.assignedTo.length;

        const splits = item.assignedTo.map((m, i) => ({
          memberId: getMemberId(m.email),
          value: splitPerPerson + (i === 0 ? remainder : 0),
        }));

        await dispatch(
          addExpense({
            groupId: targetGroupId!,
            description: item.description,
            amount: item.amount,
            currency: DEFAULT_CURRENCY,
            category: 'food',
            paidById: payerId,
            splitType: 'exact',
            splits,
            date: new Date().toISOString().slice(0, 10),
          }),
        ).unwrap();
      }

      toast.success(`Added ${assignedItems.length} expenses from bill`);
      navigate(targetGroupId ? `/groups/${targetGroupId}` : '/groups');
    } catch (err) {
      toast.error(`Failed: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const groupMembers: Member[] = group?.members || [];
  const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl shrink-0"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">Scan Bill</h2>
          <p className="text-xs text-muted-foreground">
            {group ? `For ${group.name}` : 'Split with anyone'}
          </p>
        </div>
      </div>

      {/* Step: Capture */}
      {step === 'capture' && (
        <div className="space-y-4">
          {imagePreview && (
            <div className="rounded-2xl overflow-hidden border">
              <img src={imagePreview} alt="Bill" className="w-full max-h-60 object-contain bg-muted" />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCapture}
            className="hidden"
          />

          <Button
            className="w-full h-14 rounded-2xl shadow-md gap-3 text-base"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-5 w-5" />
            Take Photo of Bill
          </Button>

          <Button
            variant="outline"
            className="w-full h-11 rounded-2xl gap-2"
            onClick={() => {
              // Skip scanning, go directly to manual entry
              setStep('assign');
              setItems([]);
            }}
          >
            <Plus className="h-4 w-4" />
            Enter Items Manually
          </Button>
        </div>
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="text-center py-12 space-y-4">
          {imagePreview && (
            <div className="rounded-2xl overflow-hidden border mx-auto max-w-xs">
              <img src={imagePreview} alt="Bill" className="w-full max-h-40 object-contain bg-muted" />
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Reading your bill...</p>
            <p className="text-xs text-muted-foreground">This may take a few seconds</p>
          </div>
        </div>
      )}

      {/* Step: Assign */}
      {step === 'assign' && (
        <div className="space-y-4">
          {/* Bill preview thumbnail */}
          {imagePreview && (
            <div className="rounded-xl overflow-hidden border h-20 relative">
              <img
                src={imagePreview}
                alt="Bill"
                className="w-full h-full object-cover opacity-30"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-7 text-xs gap-1"
                  onClick={() => {
                    setStep('capture');
                    setImagePreview(null);
                  }}
                >
                  <Camera className="h-3 w-3" />
                  Rescan
                </Button>
              </div>
            </div>
          )}

          {/* Paid by */}
          <div className="rounded-xl border bg-card p-3 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Paid by
            </p>
            <div className="flex gap-2">
              {groupMembers.length > 0 ? (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {groupMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaidByEmail(m.email)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                        paidByEmail.toLowerCase() === m.email.toLowerCase()
                          ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                          : 'border-border bg-card hover:bg-accent'
                      }`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              ) : (
                <Input
                  type="email"
                  placeholder="Your email"
                  value={paidByEmail}
                  onChange={(e) => setPaidByEmail(e.target.value)}
                  className="h-9 rounded-lg text-sm"
                />
              )}
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Items ({items.length})
              </p>
              <p className="text-xs font-semibold">
                Total: ₹{(itemsTotal / 100).toFixed(2)}
              </p>
            </div>

            {items.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed p-6 text-center">
                <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No items yet. Add items manually below.</p>
              </div>
            )}

            {items.map((item) => (
              <div key={item.id} className="rounded-xl border bg-card p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      className="h-8 rounded-lg text-sm font-medium border-0 px-0 focus-visible:ring-0"
                      placeholder="Item name"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={(item.amount / 100).toFixed(2)}
                      onChange={(e) =>
                        updateItem(item.id, {
                          amount: Math.round(parseFloat(e.target.value || '0') * 100),
                        })
                      }
                      className="h-8 w-20 rounded-lg text-sm font-bold text-right"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Member assignment */}
                <div className="pl-0.5">
                  <MemberSearchSelect
                    groupMembers={groupMembers}
                    selected={item.assignedTo}
                    onChange={(members) => updateItem(item.id, { assignedTo: members })}
                    placeholder="Who had this?"
                  />
                </div>

                {/* Per-person cost preview */}
                {item.assignedTo.length > 0 && (
                  <p className="text-[10px] text-muted-foreground pl-0.5">
                    ₹{(item.amount / 100 / item.assignedTo.length).toFixed(2)} per person
                  </p>
                )}
              </div>
            ))}

            {/* Add item */}
            {addingItem ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                <Input
                  placeholder="Item name"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      document.getElementById('new-item-amount')?.focus();
                    }
                  }}
                  className="h-9 rounded-lg text-sm"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Input
                    id="new-item-amount"
                    type="number"
                    step="0.01"
                    placeholder="Amount"
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addManualItem();
                      }
                    }}
                    className="h-9 rounded-lg text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={addManualItem}
                    disabled={!newItemDesc.trim() || parseFloat(newItemAmount || '0') <= 0}
                    className="h-9 px-3 rounded-lg"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddingItem(false)}
                    className="h-9 px-3 rounded-lg"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-10 rounded-xl gap-2 text-sm"
                onClick={() => setAddingItem(true)}
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            )}
          </div>

          {/* Assign all shortcut */}
          {groupMembers.length > 0 && items.some((i) => i.assignedTo.length === 0) && (
            <Button
              variant="outline"
              className="w-full h-10 rounded-xl gap-2 text-sm"
              onClick={() => {
                const allAsAssigned: AssignedMember[] = groupMembers.map((m) => ({
                  id: m.id,
                  name: m.name,
                  email: m.email,
                }));
                setItems((prev) =>
                  prev.map((item) =>
                    item.assignedTo.length === 0
                      ? { ...item, assignedTo: allAsAssigned }
                      : item,
                  ),
                );
              }}
            >
              <UserPlus className="h-4 w-4" />
              Assign All Unassigned to Everyone
            </Button>
          )}

          {/* Submit */}
          <Button
            className="w-full h-12 rounded-2xl shadow-md shadow-primary/20 font-semibold gap-2"
            onClick={handleSubmit}
            disabled={submitting || items.every((i) => i.assignedTo.length === 0)}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting
              ? 'Adding Expenses...'
              : `Add ${items.filter((i) => i.assignedTo.length > 0).length} Expenses`}
          </Button>
        </div>
      )}
    </div>
  );
}
