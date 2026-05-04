'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Clock } from 'lucide-react';
import * as api from '@/lib/api';
import type { ApiActivity } from '@/lib/api';
import { useTeamContext } from '@/contexts/team-context';
import { useLabelContext } from '@/contexts/label-context';
import { timeAgo, describeActivity, activityIcon } from '@/lib/activity-utils';

interface DrawerTask {
  id: string;
  title: string;
  description?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  assigneeIds: string[];
  labelIds: string[];
}

interface TaskDetailDrawerProps {
  task: DrawerTask | null;
  token: string;
  onClose: () => void;
}

export default function TaskDetailDrawer({ task, token, onClose }: TaskDetailDrawerProps) {
  const [activity, setActivity] = useState<ApiActivity[]>([]);
  const [loading, setLoading]   = useState(false);
  const { members } = useTeamContext();
  const { labels }  = useLabelContext();

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m.name]));
  const labelMap  = Object.fromEntries(labels.map((l)  => [l.id, l.name]));

  useEffect(() => {
    if (!task || !token) return;
    setLoading(true);
    api.getTaskActivity(token, task.id)
      .then(setActivity)
      .catch(() => setActivity([]))
      .finally(() => setLoading(false));
  }, [task, token]);

  const assignedMembers = members.filter((m) => task?.assigneeIds.includes(m.id));
  const assignedLabels  = labels.filter((l)  => task?.labelIds.includes(l.id));

  function initials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${task ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white dark:bg-neutral-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${task ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {task && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-5 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 leading-snug flex-1">
                {task.title}
              </h2>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors shrink-0 mt-0.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* Meta */}
              <div className="space-y-3">
                {task.description && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {task.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {task.priority && task.priority !== 'normal' && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                      task.priority === 'high'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}>
                      {task.priority} priority
                    </span>
                  )}
                  {task.dueDate && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>

                {assignedMembers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Assignees</p>
                    <div className="flex flex-wrap gap-2">
                      {assignedMembers.map((m) => (
                        <div key={m.id} className="flex items-center gap-1.5">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                            style={{ backgroundColor: m.color }}
                          >
                            {initials(m.name)}
                          </div>
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {assignedLabels.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Labels</p>
                    <div className="flex flex-wrap gap-1.5">
                      {assignedLabels.map((l) => (
                        <span
                          key={l.id}
                          className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                          style={{ backgroundColor: l.color + '20', color: l.color }}
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Activity timeline */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-neutral-400" />
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Activity</p>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                  </div>
                ) : activity.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-6 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                    No activity yet
                  </p>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-3.5 top-2 bottom-2 w-px bg-neutral-200 dark:bg-neutral-700" />
                    <div className="space-y-4">
                      {activity.map((item) => (
                        <div key={item.id} className="flex gap-3 relative">
                          <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 border-2 border-white dark:border-neutral-900 flex items-center justify-center text-xs shrink-0 z-10">
                            {activityIcon(item.type)}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">
                              {describeActivity(item, memberMap, labelMap)}
                            </p>
                            <p className="text-xs text-neutral-400 mt-0.5">
                              {timeAgo(item.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
