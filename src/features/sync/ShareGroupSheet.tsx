import { useState } from 'react';
import { Send, Loader2, UserPlus } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { shareGroupWithUser } from './syncThunks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet';
import { toast } from 'sonner';

interface ShareGroupSheetProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareGroupSheet({ groupId, open, onOpenChange }: ShareGroupSheetProps) {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      toast.error('Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await dispatch(shareGroupWithUser({ groupId, email: trimmed })).unwrap();
      toast.success(`Shared with ${trimmed}`);
      setEmail('');
      onOpenChange(false);
    } catch (err) {
      toast.error(`Failed to share: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Share Group
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-5 py-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter the Gmail address of the person you want to share this group with.
            They'll be able to see and edit expenses after signing in.
          </p>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Gmail address
            </Label>
            <Input
              type="email"
              placeholder="friend@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl text-base"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleShare()}
            />
          </div>

          <div className="flex gap-2.5 pt-1">
            <SheetClose asChild>
              <Button
                variant="outline"
                className="flex-1 h-11 rounded-xl font-medium"
              >
                Cancel
              </Button>
            </SheetClose>
            <Button
              onClick={handleShare}
              disabled={loading || !email.trim()}
              className="flex-1 h-11 rounded-xl font-semibold gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Share
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
