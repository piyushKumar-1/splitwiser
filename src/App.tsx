import { Provider } from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import { store } from '@/app/store';
import { router } from '@/app/router';
import { Toaster } from '@/components/ui/sonner';
import AuthGate from '@/features/auth/AuthGate';

function App() {
  return (
    <Provider store={store}>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
      <Toaster />
    </Provider>
  );
}

export default App;
