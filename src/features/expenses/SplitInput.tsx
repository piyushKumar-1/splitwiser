import type { Member, SplitEntry, SplitType } from '@/shared/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import MemberAvatar from '@/shared/MemberAvatar';

interface SplitInputProps {
  splitType: SplitType;
  members: Member[];
  splits: SplitEntry[];
  totalAmount: number;
  onChange: (splits: SplitEntry[]) => void;
}

export default function SplitInput({ splitType, members, splits, totalAmount, onChange }: SplitInputProps) {
  const getSplitValue = (memberId: string) =>
    splits.find((s) => s.memberId === memberId)?.value ?? 0;

  const isIncluded = (memberId: string) =>
    splits.some((s) => s.memberId === memberId);

  const updateSplit = (memberId: string, value: number) => {
    const existing = splits.find((s) => s.memberId === memberId);
    if (existing) {
      onChange(splits.map((s) => (s.memberId === memberId ? { ...s, value } : s)));
    } else {
      onChange([...splits, { memberId, value }]);
    }
  };

  const toggleMember = (memberId: string, included: boolean) => {
    if (included) {
      onChange([...splits, { memberId, value: 0 }]);
    } else {
      onChange(splits.filter((s) => s.memberId !== memberId));
    }
  };

  if (splitType === 'equal') {
    const includedCount = splits.length;
    const perPerson = includedCount > 0 ? (totalAmount / 100 / includedCount).toFixed(2) : '0.00';

    return (
      <div className="space-y-1">
        {includedCount > 0 && (
          <p className="text-xs text-primary font-medium pb-1">&#8377;{perPerson} per person</p>
        )}
        {members.map((m) => (
          <label
            key={m.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
              isIncluded(m.id) ? 'bg-primary/5' : 'hover:bg-muted'
            }`}
          >
            <Checkbox
              id={`eq-${m.id}`}
              checked={isIncluded(m.id)}
              onCheckedChange={(checked) => toggleMember(m.id, !!checked)}
            />
            <MemberAvatar name={m.name} size="sm" />
            <span className="text-sm font-medium flex-1">{m.name}</span>
            {isIncluded(m.id) && (
              <span className="text-xs text-muted-foreground">&#8377;{perPerson}</span>
            )}
          </label>
        ))}
      </div>
    );
  }

  if (splitType === 'exact') {
    const total = splits.reduce((sum, s) => sum + s.value, 0);
    const remaining = totalAmount - total;

    return (
      <div className="space-y-1.5">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-1">
            <MemberAvatar name={m.name} size="sm" />
            <span className="text-sm font-medium w-20 truncate">{m.name}</span>
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">&#8377;</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={getSplitValue(m.id) ? (getSplitValue(m.id) / 100).toString() : ''}
                onChange={(e) => updateSplit(m.id, Math.round(parseFloat(e.target.value || '0') * 100))}
                className="pl-7 h-10 rounded-lg"
              />
            </div>
          </div>
        ))}
        <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
          remaining === 0 ? 'bg-green-500/10 text-green-700' : 'bg-destructive/10 text-destructive'
        }`}>
          <span>{remaining === 0 ? 'Amounts match' : 'Remaining'}</span>
          {remaining !== 0 && <span>&#8377;{(remaining / 100).toFixed(2)}</span>}
        </div>
      </div>
    );
  }

  if (splitType === 'percentage') {
    const total = splits.reduce((sum, s) => sum + s.value, 0);

    return (
      <div className="space-y-1.5">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-1">
            <MemberAvatar name={m.name} size="sm" />
            <span className="text-sm font-medium w-20 truncate">{m.name}</span>
            <div className="flex-1 relative">
              <Input
                type="number"
                step="1"
                min="0"
                max="100"
                placeholder="0"
                value={getSplitValue(m.id) || ''}
                onChange={(e) => updateSplit(m.id, parseFloat(e.target.value || '0'))}
                className="pr-8 h-10 rounded-lg"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </div>
        ))}
        <div className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium ${
          total === 100 ? 'bg-green-500/10 text-green-700' : 'bg-destructive/10 text-destructive'
        }`}>
          <span>{total === 100 ? 'Percentages match' : `Total: ${total}%`}</span>
          {total !== 100 && <span>Need 100%</span>}
        </div>
      </div>
    );
  }

  if (splitType === 'shares') {
    const totalShares = splits.reduce((sum, s) => sum + s.value, 0);

    return (
      <div className="space-y-1.5">
        {members.map((m) => {
          const share = getSplitValue(m.id);
          const amount = totalShares > 0 ? (totalAmount / 100 * share / totalShares) : 0;
          return (
            <div key={m.id} className="flex items-center gap-3 p-1">
              <MemberAvatar name={m.name} size="sm" />
              <span className="text-sm font-medium w-20 truncate">{m.name}</span>
              <div className="flex-1">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={share || ''}
                  onChange={(e) => updateSplit(m.id, parseInt(e.target.value || '0', 10))}
                  className="h-10 rounded-lg"
                />
              </div>
              {share > 0 && totalShares > 0 && (
                <span className="text-xs text-muted-foreground w-16 text-right">&#8377;{amount.toFixed(2)}</span>
              )}
            </div>
          );
        })}
        {totalShares > 0 && (
          <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs text-muted-foreground">
            Ratio: {splits.filter(s => s.value > 0).map(s => s.value).join(' : ')}
          </div>
        )}
      </div>
    );
  }

  return null;
}
