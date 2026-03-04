import { useState } from 'react';
import { Plus, X, Mail, Check, Pencil } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { Member } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MemberAvatar from '@/shared/MemberAvatar';

interface MemberManagerProps {
  members: Member[];
  onChange: (members: Member[]) => void;
  currentUserEmail?: string | null;
}

export default function MemberManager({ members, onChange, currentUserEmail }: MemberManagerProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canAdd = name.trim() && email.trim() && isValidEmail(email.trim());
  const canSaveEdit = editName.trim() && editEmail.trim() && isValidEmail(editEmail.trim());

  const handleAdd = () => {
    if (!canAdd) return;
    onChange([...members, { id: nanoid(), name: name.trim(), email: email.trim().toLowerCase() }]);
    setName('');
    setEmail('');
  };

  const handleRemove = (id: string) => {
    onChange(members.filter((m) => m.id !== id));
  };

  const startEdit = (member: Member) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditEmail(member.email);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditEmail('');
  };

  const saveEdit = () => {
    if (!canSaveEdit || !editingId) return;
    onChange(
      members.map((m) =>
        m.id === editingId
          ? { ...m, name: editName.trim(), email: editEmail.trim().toLowerCase() }
          : m,
      ),
    );
    cancelEdit();
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), document.getElementById('member-email-input')?.focus())}
          className="h-11 rounded-xl"
        />
        <div className="flex gap-2">
          <Input
            id="member-email-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
            className="h-11 rounded-xl"
          />
          <Button
            type="button"
            size="icon"
            onClick={handleAdd}
            disabled={!canAdd}
            className="h-11 w-11 shrink-0 rounded-xl"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {members.length > 0 ? (
        <div className="space-y-1.5">
          {members.map((m) => {
            const isCurrentUser = !!(currentUserEmail && m.email.toLowerCase() === currentUserEmail.toLowerCase());
            return editingId === m.id ? (
              <div key={m.id} className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), document.getElementById('edit-email-input')?.focus())}
                  className="h-9 rounded-lg text-sm"
                  autoFocus
                />
                <Input
                  id="edit-email-input"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="h-9 rounded-lg text-sm"
                  disabled={isCurrentUser}
                />
                <div className="flex gap-1.5 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                    className="h-7 px-2.5 rounded-lg text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveEdit}
                    disabled={!canSaveEdit}
                    className="h-7 px-2.5 rounded-lg text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl bg-card border p-3 group"
              >
                <MemberAvatar name={m.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate">{m.name}</span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    {m.email}
                  </span>
                </div>
                {isCurrentUser && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">You</span>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(m)}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:bg-accent hover:text-foreground transition-all"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                {!isCurrentUser && (
                  <button
                    type="button"
                    onClick={() => handleRemove(m.id)}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Add at least 2 members to start splitting expenses.
          </p>
        </div>
      )}
    </div>
  );
}
