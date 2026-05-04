'use client';

import { useEffect, useState } from 'react';
import { useAuthContext } from '@/components/auth-provider';
import { useTeamContext } from '@/contexts/team-context';
import { useLabelContext } from '@/contexts/label-context';
import * as api from '@/lib/api';
import type { ApiActivity } from '@/lib/api';
import { timeAgo, describeActivity, activityIcon } from '@/lib/activity-utils';
import { Loader2, Activity } from 'lucide-react';

function groupByDate(items: ApiActivity[]): { date: string; entries: ApiActivity[] }[] {
  const map = new Map<string, ApiActivity[]>();
  for (const item of items) {
    const date = new Date(item.created_at).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(item);
  }
  return Array.from(map.entries()).map(([date, entries]) => ({ date, entries }));
}

export default function ActivityPage() {
  const { session } = useAuthContext();
  const { members } = useTeamContext();
  const { labels }  = useLabelContext();
  const [activity, setActivity] = useState<ApiActivity[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const labelMap  = Object.fromEntries(labels.map((l)  => [l.id, l.name]));

  useEffect(() => {
    if (!session?.access_token) return;
    setLoading(true);
    api.getAllActivity(session.access_token)
      .then(setActivity)
      .catch(() => setError('Could not load activity. Is the backend running?'))
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  const groups = groupByDate(activity);

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950 p-8 min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            Activity Log
          </h1>
          <p className="text-neutral-700 dark:text-neutral-300 font-medium">
            History of all task changes
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-neutral-400">
            <Activity className="w-10 h-10" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs">Make changes to tasks and they'll appear here</p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(({ date, entries }) => (
              <div key={date}>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-4 sticky top-0 bg-neutral-50 dark:bg-neutral-950 py-1">
                  {date}
                </p>
                <div className="relative">
                  <div className="absolute left-3.5 top-2 bottom-2 w-px bg-neutral-200 dark:bg-neutral-700" />
                  <div className="space-y-4">
                    {entries.map((item) => (
                      <div key={item.id} className="flex gap-3 relative">
                        <div className="w-7 h-7 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-xs shrink-0 z-10 shadow-sm">
                          {activityIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 px-4 py-3 shadow-sm">
                          {item.tasks?.title && (
                            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-0.5 truncate">
                              {item.tasks.title}
                            </p>
                          )}
                          <p className="text-sm text-neutral-800 dark:text-neutral-200">
                            {describeActivity(item, memberMap, labelMap)}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {timeAgo(item.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
