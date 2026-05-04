'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle, Calendar, Check, GripVertical, Loader2,
  Maximize2, MessageCircle, Paperclip, Plus, Tag, Trash2, UserPlus, X,
} from 'lucide-react';
import * as api from '@/lib/api';
import type { ApiTask } from '@/lib/api';
import { useTeamContext } from '@/contexts/team-context';
import { useLabelContext } from '@/contexts/label-context';
import TaskDetailDrawer from '@/components/task-detail-drawer';

type ColumnType = 'todo' | 'in_progress' | 'in_review' | 'done';

interface TeamMember { id: string; name: string; color: string; }
interface LabelItem   { id: string; name: string; color: string; }

interface Task {
  id: string;
  title: string;
  description?: string | null;
  priority?: 'low' | 'normal' | 'high' | null;
  assigneeIds: string[];
  labelIds: string[];
  dueDate?: string | null;
  attachments?: number;
  comments?: number;
}

interface Column {
  id: ColumnType;
  title: string;
  tasks: Task[];
  color: string;
}

const COLUMNS: Omit<Column, 'tasks'>[] = [
  { id: 'todo',        title: 'To Do',      color: '#8B7355' },
  { id: 'in_progress', title: 'In Progress', color: '#6B8E23' },
  { id: 'in_review',   title: 'Review',      color: '#CD853F' },
  { id: 'done',        title: 'Done',        color: '#556B2F' },
];

function mapApiTask(t: ApiTask): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    dueDate: t.due_date,
    assigneeIds: Array.isArray(t.assignee_ids) ? t.assignee_ids : [],
    labelIds:    Array.isArray(t.label_ids)    ? t.label_ids    : [],
  };
}

function buildColumns(tasks: ApiTask[]): Column[] {
  return COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => t.status === col.id).map(mapApiTask),
  }));
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function KanbanBoard({ token }: { token: string }) {
  const [columns,       setColumns]       = useState<Column[]>(COLUMNS.map((c) => ({ ...c, tasks: [] })));
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [activeLabels,  setActiveLabels]  = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ task: Task; columnId: ColumnType } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    task: Task; columnId: ColumnType; timeoutId: ReturnType<typeof setTimeout>;
  } | null>(null);
  const [drawerTask, setDrawerTask] = useState<Task | null>(null);

  const { members } = useTeamContext();
  const { labels }  = useLabelContext();

  // Always-fresh token ref for use inside setTimeout closures
  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // Cleanup on unmount
  const pendingDeleteRef = useRef(pendingDelete);
  useEffect(() => { pendingDeleteRef.current = pendingDelete; }, [pendingDelete]);
  useEffect(() => () => {
    if (pendingDeleteRef.current) clearTimeout(pendingDeleteRef.current.timeoutId);
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!token) return;
    try {
      const tasks = await api.getTasks(token);
      setColumns(buildColumns(tasks));
      setError(null);
    } catch {
      setError('Could not load tasks. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, task: Task, columnId: ColumnType) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ task, sourceColumnId: columnId }));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleDrop = async (e: React.DragEvent, targetColumnId: ColumnType) => {
    e.preventDefault();
    const { task, sourceColumnId } = JSON.parse(e.dataTransfer.getData('text/plain')) as {
      task: Task; sourceColumnId: ColumnType;
    };
    if (sourceColumnId === targetColumnId) return;

    setColumns((prev) => prev.map((col) => {
      if (col.id === sourceColumnId) return { ...col, tasks: col.tasks.filter((t) => t.id !== task.id) };
      if (col.id === targetColumnId) return { ...col, tasks: [...col.tasks, task] };
      return col;
    }));

    try {
      await api.updateTask(token, task.id, { status: targetColumnId });
    } catch {
      setError('Failed to save task position');
      fetchTasks();
    }
  };

  // ── Add task ────────────────────────────────────────────────────────────────

  const handleAddTask = async (columnId: ColumnType, title: string) => {
    const tempId   = `temp-${Date.now()}`;
    const tempTask: Task = { id: tempId, title, assigneeIds: [], labelIds: [] };

    setColumns((prev) => prev.map((col) =>
      col.id === columnId ? { ...col, tasks: [...col.tasks, tempTask] } : col,
    ));

    try {
      const created = await api.createTask(token, { title, status: columnId });
      setColumns((prev) => prev.map((col) =>
        col.id === columnId
          ? { ...col, tasks: col.tasks.map((t) => t.id === tempId ? mapApiTask(created) : t) }
          : col,
      ));
    } catch {
      setColumns((prev) => prev.map((col) =>
        col.id === columnId ? { ...col, tasks: col.tasks.filter((t) => t.id !== tempId) } : col,
      ));
      setError('Failed to create task');
    }
  };

  // ── Delete task (with confirm + undo) ────────────────────────────────────────

  const handleDeleteClick = (task: Task, columnId: ColumnType) => {
    setConfirmDelete({ task, columnId });
  };

  const handleDeleteConfirm = () => {
    if (!confirmDelete) return;
    const { task, columnId } = confirmDelete;
    setConfirmDelete(null);

    // If another delete is pending, finalise it immediately
    if (pendingDelete) {
      clearTimeout(pendingDelete.timeoutId);
      api.deleteTask(tokenRef.current, pendingDelete.task.id).catch(() => {});
      setPendingDelete(null);
    }

    // Optimistic remove
    setColumns((prev) => prev.map((col) =>
      col.id === columnId ? { ...col, tasks: col.tasks.filter((t) => t.id !== task.id) } : col,
    ));

    // 5-second grace period before hitting the API
    const timeoutId = setTimeout(async () => {
      try {
        await api.deleteTask(tokenRef.current, task.id);
      } catch {
        setError('Failed to delete task');
        fetchTasks();
      }
      setPendingDelete(null);
    }, 5000);

    setPendingDelete({ task, columnId, timeoutId });
  };

  const handleDeleteUndo = () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timeoutId);
    setColumns((prev) => prev.map((col) =>
      col.id === pendingDelete.columnId
        ? { ...col, tasks: [...col.tasks, pendingDelete.task] }
        : col,
    ));
    setPendingDelete(null);
  };

  // ── Assign / label ───────────────────────────────────────────────────────────

  const handleAssignTask = async (taskId: string, assigneeIds: string[]) => {
    setColumns((prev) => prev.map((col) => ({
      ...col,
      tasks: col.tasks.map((t) => t.id === taskId ? { ...t, assigneeIds } : t),
    })));
    try {
      await api.updateTask(token, taskId, { assignee_ids: assigneeIds });
    } catch {
      setError('Failed to update assignees');
      fetchTasks();
    }
  };

  const handleLabelTask = async (taskId: string, labelIds: string[]) => {
    setColumns((prev) => prev.map((col) => ({
      ...col,
      tasks: col.tasks.map((t) => t.id === taskId ? { ...t, labelIds } : t),
    })));
    try {
      await api.updateTask(token, taskId, { label_ids: labelIds });
    } catch {
      setError('Failed to update labels');
      fetchTasks();
    }
  };

  // ── Label filter ─────────────────────────────────────────────────────────────

  const toggleLabelFilter = (id: string) => {
    setActiveLabels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredColumns = useMemo(() => {
    if (activeLabels.size === 0) return columns;
    return columns.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t) => t.labelIds.some((id) => activeLabels.has(id))),
    }));
  }, [columns, activeLabels]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Board header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 mb-1">
            Kanban Board
          </h1>
          <p className="text-neutral-700 dark:text-neutral-300 font-medium">
            Drag and drop task management
          </p>
        </div>

        {/* Team strip */}
        {members.length > 0 && (
          <div className="flex items-center gap-2 bg-white/30 dark:bg-neutral-800/30 rounded-2xl px-4 py-2.5 border border-neutral-200/50 dark:border-neutral-700/50 shrink-0">
            <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Team</span>
            <div className="flex -space-x-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  title={m.name}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold ring-2 ring-white dark:ring-neutral-900"
                  style={{ backgroundColor: m.color }}
                >
                  {initials(m.name)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Label filter chips */}
      {labels.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Labels:</span>
          {labels.map((label) => {
            const active = activeLabels.has(label.id);
            return (
              <button
                key={label.id}
                onClick={() => toggleLabelFilter(label.id)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border"
                style={{
                  backgroundColor: label.color + (active ? '25' : '12'),
                  color: label.color,
                  borderColor: active ? label.color : 'transparent',
                  opacity: active ? 1 : 0.55,
                }}
              >
                {label.name}
                {active && <X className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })}
          {activeLabels.size > 0 && (
            <button
              onClick={() => setActiveLabels(new Set())}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button className="ml-auto" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 min-w-0">
          {filteredColumns.map((column) => (
            <div
              key={column.id}
              className="bg-white/20 dark:bg-neutral-900/20 backdrop-blur-xl rounded-3xl p-5 border border-border dark:border-neutral-700/50"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: column.color }} />
                  <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {column.title}
                  </h3>
                  <Badge className="bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 border-neutral-200/50 dark:border-neutral-600/50">
                    {column.tasks.length}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                {column.tasks.length === 0 && (
                  <p className="text-xs text-neutral-400 text-center py-6 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
                    {activeLabels.size > 0 ? 'No matching tasks' : 'No tasks yet'}
                  </p>
                )}
                {column.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    columnId={column.id}
                    members={members}
                    labels={labels}
                    onDragStart={handleDragStart}
                    onDeleteClick={() => handleDeleteClick(task, column.id)}
                    onAssign={(ids) => handleAssignTask(task.id, ids)}
                    onLabelChange={(ids) => handleLabelTask(task.id, ids)}
                    onOpenDetail={() => setDrawerTask(task)}
                  />
                ))}
                <AddCardButton onAdd={(title) => handleAddTask(column.id, title)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <DeleteConfirmDialog
          taskTitle={confirmDelete.task.title}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Undo toast */}
      {pendingDelete && (
        <UndoToast taskTitle={pendingDelete.task.title} onUndo={handleDeleteUndo} />
      )}

      {/* Task detail drawer */}
      <TaskDetailDrawer
        task={drawerTask}
        token={token}
        onClose={() => setDrawerTask(null)}
      />
    </div>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({
  task, columnId, members, labels,
  onDragStart, onDeleteClick, onAssign, onLabelChange, onOpenDetail,
}: {
  task: Task;
  columnId: ColumnType;
  members: TeamMember[];
  labels: LabelItem[];
  onDragStart: (e: React.DragEvent, task: Task, columnId: ColumnType) => void;
  onDeleteClick: () => void;
  onAssign: (ids: string[]) => void;
  onLabelChange: (ids: string[]) => void;
  onOpenDetail: () => void;
}) {
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [showLabelPicker,    setShowLabelPicker]    = useState(false);

  const priorityColor: Record<string, string> = {
    high:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    low:    'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  };

  const assignedMembers = members.filter((m) => task.assigneeIds.includes(m.id));
  const assignedLabels  = labels.filter((l) => task.labelIds.includes(l.id));

  const toggleAssignee = (memberId: string) => {
    const newIds = task.assigneeIds.includes(memberId)
      ? task.assigneeIds.filter((id) => id !== memberId)
      : [...task.assigneeIds, memberId];
    onAssign(newIds);
    setShowAssigneePicker(false); // close after each pick
  };

  const toggleLabel = (labelId: string) => {
    const newIds = task.labelIds.includes(labelId)
      ? task.labelIds.filter((id) => id !== labelId)
      : [...task.labelIds, labelId];
    onLabelChange(newIds);
    // keep open for multi-select
  };

  return (
    <Card
      className="group cursor-move transition-all duration-300 border bg-white/60 dark:bg-neutral-800/60 backdrop-blur-sm hover:bg-white/70 dark:hover:bg-neutral-700/70"
      draggable
      onDragStart={(e) => onDragStart(e, task, columnId)}
    >
      <CardContent className="p-5">
        <div className="space-y-3">

          {/* Title + actions */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">
              {task.title}
            </h4>
            <div className="flex items-center gap-0.5 shrink-0">
              <GripVertical className="w-4 h-4 text-neutral-300 dark:text-neutral-600 cursor-move" />
              <button
                draggable={false}
                onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                draggable={false}
                onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Label badges + picker */}
          {labels.length > 0 && (
            <div className="relative flex items-center gap-1.5 flex-wrap">
              {assignedLabels.map((label) => (
                <span
                  key={label.id}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: label.color + '20', color: label.color }}
                >
                  {label.name}
                </span>
              ))}

              <button
                draggable={false}
                onClick={(e) => { e.stopPropagation(); setShowLabelPicker((v) => !v); }}
                className="w-5 h-5 rounded-full border border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center text-neutral-400 hover:border-neutral-500 hover:text-neutral-600 dark:hover:border-neutral-400 dark:hover:text-neutral-300 transition-colors"
              >
                <Tag className="w-2.5 h-2.5" />
              </button>

              {showLabelPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowLabelPicker(false)} />
                  <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl p-1.5 min-w-40">
                    <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide px-2 pt-1 pb-1.5">
                      Labels
                    </p>
                    {labels.map((label) => (
                      <button
                        key={label.id}
                        draggable={false}
                        onClick={(e) => { e.stopPropagation(); toggleLabel(label.id); }}
                        className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-left"
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: label.color }}
                        />
                        <span className="text-sm text-neutral-900 dark:text-neutral-100 flex-1 truncate">
                          {label.name}
                        </span>
                        {task.labelIds.includes(label.id) && (
                          <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Bottom row */}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-200/30 dark:border-neutral-700/30">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 flex-wrap">
              {task.priority && task.priority !== 'normal' && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${priorityColor[task.priority]}`}>
                  {task.priority}
                </span>
              )}
              {task.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">
                    {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
              {task.comments != null && (
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{task.comments}</span>
                </div>
              )}
              {task.attachments != null && (
                <div className="flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">{task.attachments}</span>
                </div>
              )}
            </div>

            {/* Assignee avatars + picker */}
            {members.length > 0 && (
              <div className="relative flex items-center gap-1 shrink-0">
                <div className="flex -space-x-1.5">
                  {assignedMembers.map((m) => (
                    <div
                      key={m.id}
                      title={m.name}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold ring-2 ring-white/70 dark:ring-neutral-800/70"
                      style={{ backgroundColor: m.color }}
                    >
                      {initials(m.name)}
                    </div>
                  ))}
                </div>
                <button
                  draggable={false}
                  onClick={(e) => { e.stopPropagation(); setShowAssigneePicker((v) => !v); }}
                  className="w-6 h-6 rounded-full border-2 border-dashed border-neutral-300 dark:border-neutral-600 flex items-center justify-center text-neutral-400 hover:border-neutral-500 hover:text-neutral-600 dark:hover:border-neutral-400 dark:hover:text-neutral-300 transition-colors"
                >
                  <UserPlus className="w-3 h-3" />
                </button>

                {showAssigneePicker && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowAssigneePicker(false)} />
                    <div className="absolute bottom-full right-0 mb-2 z-20 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl p-1.5 min-w-44">
                      <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wide px-2 pt-1 pb-1.5">
                        Assign to
                      </p>
                      {members.map((m) => (
                        <button
                          key={m.id}
                          draggable={false}
                          onClick={(e) => { e.stopPropagation(); toggleAssignee(m.id); }}
                          className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 text-left"
                        >
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                            style={{ backgroundColor: m.color }}
                          >
                            {initials(m.name)}
                          </div>
                          <span className="text-sm text-neutral-900 dark:text-neutral-100 flex-1 truncate">
                            {m.name}
                          </span>
                          {task.assigneeIds.includes(m.id) && (
                            <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}

// ── DeleteConfirmDialog ───────────────────────────────────────────────────────

function DeleteConfirmDialog({
  taskTitle, onConfirm, onCancel,
}: {
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-sm z-10">
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
          Delete task?
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-5">
          Are you sure you want to delete{' '}
          <strong className="text-neutral-900 dark:text-neutral-100">"{taskTitle}"</strong>?
          {' '}You'll have 5 seconds to undo.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── UndoToast ─────────────────────────────────────────────────────────────────

function UndoToast({ taskTitle, onUndo }: { taskTitle: string; onUndo: () => void }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 min-w-80 max-w-md bg-neutral-900 dark:bg-white rounded-xl shadow-2xl overflow-hidden pointer-events-auto">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-sm text-white dark:text-neutral-900 flex-1 truncate">
          Deleted <strong>"{taskTitle}"</strong>
        </span>
        <button
          onClick={onUndo}
          className="text-sm font-semibold text-neutral-300 dark:text-neutral-600 hover:text-white dark:hover:text-neutral-900 hover:underline shrink-0 transition-colors"
        >
          Undo
        </button>
      </div>
      {/* 5-second countdown progress bar */}
      <div className="h-0.5 bg-neutral-700 dark:bg-neutral-200">
        <div
          className="h-full bg-white dark:bg-neutral-900"
          style={{ animation: 'countdown 5s linear forwards' }}
        />
      </div>
    </div>
  );
}

// ── AddCardButton ─────────────────────────────────────────────────────────────

function AddCardButton({ onAdd }: { onAdd: (title: string) => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [text,   setText]   = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    await onAdd(text.trim());
    setSaving(false);
    setText('');
    setAdding(false);
  };

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full mt-1">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') { setAdding(false); setText(''); } }}
        placeholder="Task title…"
        rows={2}
        className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600 resize-none"
      />
      <div className="flex gap-2 mt-1.5">
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-3 py-1.5 text-xs font-medium text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add
        </button>
        <button
          type="button"
          onClick={() => { setAdding(false); setText(''); }}
          className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
