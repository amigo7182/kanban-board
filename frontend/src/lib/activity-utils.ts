import type { ApiActivity } from './api';

export const STATUS_LABELS: Record<string, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  in_review:   'Review',
  done:        'Done',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low:    'Low',
  normal: 'Normal',
  high:   'High',
};

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs  = Math.floor(diff / 1000);
  const mins  = Math.floor(secs  / 60);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);

  if (secs  < 60)  return 'just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function describeActivity(
  activity: ApiActivity,
  memberMap: Record<string, string>,
  labelMap: Record<string, string>,
): string {
  const p = activity.payload as Record<string, unknown>;

  switch (activity.type) {
    case 'status_change': {
      const from = STATUS_LABELS[p.from as string] ?? p.from;
      const to   = STATUS_LABELS[p.to   as string] ?? p.to;
      return `Moved from ${from} → ${to}`;
    }
    case 'title_change':
      return `Renamed to "${p.to}"`;
    case 'priority_change': {
      const from = PRIORITY_LABELS[p.from as string] ?? p.from ?? 'none';
      const to   = PRIORITY_LABELS[p.to   as string] ?? p.to   ?? 'none';
      return `Priority changed: ${from} → ${to}`;
    }
    case 'assignment': {
      const added   = (p.added   as string[]).map((id) => memberMap[id] ?? 'Unknown');
      const removed = (p.removed as string[]).map((id) => memberMap[id] ?? 'Unknown');
      const parts: string[] = [];
      if (added.length)   parts.push(`Assigned ${added.join(', ')}`);
      if (removed.length) parts.push(`Unassigned ${removed.join(', ')}`);
      return parts.join('; ') || 'Assignment updated';
    }
    case 'label_change': {
      const added   = (p.added   as string[]).map((id) => labelMap[id] ?? 'Unknown');
      const removed = (p.removed as string[]).map((id) => labelMap[id] ?? 'Unknown');
      const parts: string[] = [];
      if (added.length)   parts.push(`Added label${added.length > 1 ? 's' : ''}: ${added.join(', ')}`);
      if (removed.length) parts.push(`Removed label${removed.length > 1 ? 's' : ''}: ${removed.join(', ')}`);
      return parts.join('; ') || 'Labels updated';
    }
    default:
      return 'Updated task';
  }
}

export function activityIcon(type: ApiActivity['type']): string {
  switch (type) {
    case 'status_change':   return '→';
    case 'title_change':    return '✏';
    case 'priority_change': return '⚑';
    case 'assignment':      return '👤';
    case 'label_change':    return '🏷';
    default:                return '·';
  }
}
