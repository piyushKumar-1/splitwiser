import { useState } from 'react';
import { ArrowRight, Trash2, Plus, HandCoins } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { addSettlement, removeSettlement } from './settlementsThunks';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import MemberAvatar from '@/shared/MemberAvatar';
import type { Member } from '@/shared/types';

interface SettlementListProps {
  groupId: string;
  members: Member[];
}

export default function SettlementList({ groupId, members }: SettlementListProps) {
  const dispatch = useAppDispatch();
  const settlements = useAppSelector((state) => state.settlements.items);
  const getName = (id: string) => members.find((m) => m.id === id)?.name ?? 'Unknown';

  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amountStr, setAmountStr] = useState('');

  const handleAdd = () => {
    const amount = Math.round(parseFloat(amountStr || '0') * 100);
    if (!fromId || !toId || fromId === toId || amount <= 0) return;
    dispatch(addSettlement({
      groupId,
      fromMemberId: fromId,
      toMemberId: toId,
      amount,
      date: new Date().toISOString().slice(0, 10),
      fromName: getName(fromId),
      toName: getName(toId),
    }));
    setOpen(false);
    setFromId('');
    setToId('');
    setAmountStr('');
  };

  return (
    <div className="pt-4">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Settlements
        </h3>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" /> Record
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>Record Settlement</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Who paid</Label>
                <Select value={fromId} onValueChange={setFromId}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                          <MemberAvatar name={m.name} size="sm" className="h-5 w-5 text-[8px]" />
                          {m.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid to</Label>
                <Select value={toId} onValueChange={setToId}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select member" /></SelectTrigger>
                  <SelectContent>
                    {members.filter((m) => m.id !== fromId).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex items-center gap-2">
                          <MemberAvatar name={m.name} size="sm" className="h-5 w-5 text-[8px]" />
                          {m.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <SheetClose asChild>
                  <Button variant="outline" className="flex-1 h-11 rounded-xl">Cancel</Button>
                </SheetClose>
                <Button
                  onClick={handleAdd}
                  disabled={!fromId || !toId || fromId === toId || parseFloat(amountStr || '0') <= 0}
                  className="flex-1 h-11 rounded-xl"
                >
                  Record
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {settlements.length === 0 ? (
        <div className="text-center py-10">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <HandCoins className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">No settlements yet</p>
          <p className="text-xs text-muted-foreground">Record a payment when someone settles up.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {settlements.map((s) => (
            <Card key={s.id} className="border shadow-sm">
              <CardContent className="flex items-center gap-3 p-3.5">
                <MemberAvatar name={getName(s.fromMemberId)} size="sm" />
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{getName(s.fromMemberId)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">{getName(s.toMemberId)}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold">&#8377;{(s.amount / 100).toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">{s.date}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                    onClick={() => dispatch(removeSettlement({ id: s.id, groupId }))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
