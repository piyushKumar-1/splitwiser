import { useState } from 'react';
import { Wallet, LogIn, Loader2 } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { loginWithGoogle } from './authThunks';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await dispatch(loginWithGoogle()).unwrap();
    } catch (err) {
      toast.error(`Sign-in failed: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-10 text-center">
        <div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground mb-4">
            <Wallet className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Splitwiser</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Split expenses with friends, effortlessly.
          </p>
        </div>

        <Button
          className="w-full h-12 rounded-2xl gap-2.5 font-semibold text-base"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogIn className="h-5 w-5" />
          )}
          Sign in with Google
        </Button>

        <p className="text-[11px] text-muted-foreground/60">
          Free &middot; Open Source &middot; Your data stays yours
        </p>
      </div>
    </div>
  );
}
