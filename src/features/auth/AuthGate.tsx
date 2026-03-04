import { useEffect } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectAuthStatus } from './authSelectors';
import { initializeAuth } from './authThunks';
import LoginPage from './LoginPage';

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  if (status === 'unknown' || status === 'checking') {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Wallet className="h-7 w-7" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (status === 'signed_out') {
    return <LoginPage />;
  }

  return <>{children}</>;
}
