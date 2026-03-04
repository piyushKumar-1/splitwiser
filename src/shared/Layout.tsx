import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, Wallet } from 'lucide-react';
import SyncStatusIndicator from '@/features/sync/SyncStatusIndicator';

const navItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/groups', label: 'Groups', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const location = useLocation();

  // Determine page title from route
  const getTitle = () => {
    if (location.pathname === '/') return null; // Dashboard has its own header
    if (location.pathname === '/groups') return null;
    if (location.pathname === '/settings') return null;
    return null;
  };

  getTitle(); // consume for future use

  return (
    <div className="flex h-dvh flex-col md:flex-row bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-card shadow-sm">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-bold tracking-tight">Splitwiser</h1>
            <p className="text-[11px] text-muted-foreground leading-none">Split expenses easily</p>
          </div>
          <SyncStatusIndicator />
        </div>
        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t">
          <p className="text-[11px] text-muted-foreground text-center">Free & Open Source</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <div className="mx-auto max-w-lg px-5 py-5 md:px-6 md:py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-lg md:hidden safe-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[64px] ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:scale-95'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1 rounded-lg transition-colors duration-200 ${isActive ? 'bg-primary/10' : ''}`}>
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] leading-none ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
