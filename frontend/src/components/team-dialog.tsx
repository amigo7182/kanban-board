'use client';

import { useState } from 'react';
import { useTeamContext } from '@/contexts/team-context';
import { Plus, Trash2, X } from 'lucide-react';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

interface Props {
  open: boolean;
  onClose: () => void;
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function TeamDialog({ open, onClose }: Props) {
  const { members, addMember, removeMember } = useTeamContext();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[4]);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  if (!open) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setAddError(null);
    try {
      await addMember(name.trim(), color);
      setName('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add member. Is the backend running?');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 w-full max-w-sm z-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-neutral-900 dark:text-neutral-100">Team Members</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member list */}
        <div className="space-y-1 mb-5 max-h-52 overflow-y-auto">
          {members.length === 0 && (
            <p className="text-sm text-neutral-400 text-center py-6 border border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl">
              No team members yet
            </p>
          )}
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 group"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                style={{ backgroundColor: m.color }}
              >
                {initials(m.name)}
              </div>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 flex-1 truncate">
                {m.name}
              </span>
              <button
                onClick={() => removeMember(m.id)}
                className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="border-t border-neutral-200 dark:border-neutral-700 pt-4 space-y-3">
          <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            Add member
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300 dark:focus:ring-neutral-600"
          />
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">Color</span>
            <div className="flex gap-1.5 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>
          {addError && (
            <p className="text-xs text-red-500 dark:text-red-400">{addError}</p>
          )}
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-3 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Adding…' : 'Add member'}
          </button>
        </form>
      </div>
    </div>
  );
}
