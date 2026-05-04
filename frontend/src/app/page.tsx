'use client';

import { useAuthContext } from '@/components/auth-provider';
import KanbanBoard from '@/components/ui/kanban-board';
import { AlertCircle } from 'lucide-react';

export default function Page() {
  const { session, loading, authError } = useAuthContext();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-neutral-400 border-t-neutral-800 rounded-full animate-spin" />
          <p className="text-sm text-neutral-500">Setting up your workspace…</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950 p-8">
        <div className="max-w-md w-full rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 p-6 space-y-3">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <h2 className="font-semibold">Authentication failed</h2>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">{authError}</p>
          <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
            <p className="font-medium">To fix this, enable Anonymous sign-in in Supabase:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Go to your Supabase Dashboard</li>
              <li>Navigate to <strong>Authentication → Providers</strong></li>
              <li>Enable <strong>Anonymous</strong> sign-in</li>
              <li>Reload this page</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950 p-8 min-h-screen">
      <KanbanBoard token={session?.access_token ?? ''} />
    </div>
  );
}
