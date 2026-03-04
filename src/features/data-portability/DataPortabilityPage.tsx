import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Upload, HardDrive, ShieldCheck, AlertTriangle, Cloud, ArrowRight, Trash2, Loader2 } from 'lucide-react';
import { useAppDispatch } from '@/app/hooks';
import { fetchGroups } from '@/features/groups/groupsThunks';
import { dataRepository } from '@/data';
import { stopPolling } from '@/features/sync/sync-engine';
import { setSyncedGroupIds } from '@/features/sync/syncSlice';
import { clearExpenses } from '@/features/expenses/expensesSlice';
import { clearSettlements } from '@/features/settlements/settlementsSlice';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function DataPortabilityPage() {
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleExport = async () => {
    try {
      const data = await dataRepository.exportAll();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `splitwiser-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch {
      toast.error('Failed to export data');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.data) {
        toast.error('Invalid backup file');
        return;
      }

      const confirmed = window.confirm(
        'This will replace ALL existing data. Make sure you have exported your current data first. Continue?',
      );
      if (!confirmed) return;

      await dataRepository.importAll(data);
      dispatch(fetchGroups());
      toast.success('Data imported successfully');
    } catch {
      toast.error('Failed to import data — invalid file format');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      stopPolling();
      await dataRepository.clearAll();
      dispatch(fetchGroups());
      dispatch(clearExpenses());
      dispatch(clearSettlements());
      dispatch(setSyncedGroupIds([]));
      toast.success('All local data cleared');
    } catch {
      toast.error('Failed to clear data');
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
  };

  return (
    <div className="pb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <HardDrive className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Your Data</h2>
          <p className="text-xs text-muted-foreground">Backup and restore your Splitwiser data</p>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* Export */}
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Download className="h-4.5 w-4.5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Export Data</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Download all your groups, expenses, and settlements as a JSON file.
              </p>
            </div>
          </div>
          <Button
            onClick={handleExport}
            className="w-full h-11 rounded-xl gap-2 font-semibold"
          >
            <Download className="h-4 w-4" /> Export JSON
          </Button>
        </div>

        {/* Import */}
        <div className="rounded-2xl border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Upload className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Import Data</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Restore from a previously exported backup file.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-3 py-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-700 font-medium">This will replace all existing data.</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-11 rounded-xl gap-2 font-semibold"
          >
            <Upload className="h-4 w-4" /> Import JSON
          </Button>
        </div>

        {/* Sync */}
        <Link to="/settings/sync">
          <div className="rounded-2xl border bg-card p-5 flex items-center gap-3 hover:bg-accent/50 transition-colors active:scale-[0.98]">
            <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
              <Cloud className="h-4.5 w-4.5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Cloud Sync</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Sync groups with Google Sheets across devices.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </Link>

        {/* Clear All Data */}
        <div className="rounded-2xl border border-destructive/20 bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Trash2 className="h-4.5 w-4.5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Clear All Data</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Delete all groups, expenses, settlements, and sync data from this device.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowClearConfirm(true)}
            className="w-full h-11 rounded-xl gap-2 font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" /> Clear All Local Data
          </Button>
        </div>

        {/* Info */}
        <div className="flex items-start gap-3 rounded-2xl bg-muted/50 p-4">
          <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your data is stored locally on this device using IndexedDB. Regular backups are recommended to prevent data loss.
          </p>
        </div>
      </div>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all local data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all groups, expenses, settlements, activity history, and sync data from this device. Google Sheets will not be affected. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing} className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={clearing}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Clear Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
