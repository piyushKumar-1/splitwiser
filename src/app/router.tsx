import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/shared/Layout';
import DashboardPage from '@/features/dashboard/DashboardPage';
import GroupListPage from '@/features/groups/GroupListPage';
import GroupDetailPage from '@/features/groups/GroupDetailPage';
import ExpenseForm from '@/features/expenses/ExpenseForm';
import DataPortabilityPage from '@/features/data-portability/DataPortabilityPage';
import SyncSettingsPage from '@/features/sync/SyncSettingsPage';
import BillScanPage from '@/features/bill-scan/BillScanPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'groups', element: <GroupListPage /> },
      { path: 'groups/:groupId', element: <GroupDetailPage /> },
      { path: 'groups/:groupId/expenses/new', element: <ExpenseForm /> },
      { path: 'groups/:groupId/expenses/:expenseId', element: <ExpenseForm /> },
      { path: 'groups/:groupId/scan-bill', element: <BillScanPage /> },
      { path: 'scan-bill', element: <BillScanPage /> },
      { path: 'settings', element: <DataPortabilityPage /> },
      { path: 'settings/sync', element: <SyncSettingsPage /> },
    ],
  },
]);
