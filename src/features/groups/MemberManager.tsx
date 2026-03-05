import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Mail, Check, Pencil, Search, Loader2 } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { Member } from '@/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MemberAvatar from '@/shared/MemberAvatar';
import { searchUsers, type RegisteredUser } from '@/features/users/user-registry';

interface MemberManagerProps {
  members: Member[];
  onChange: (members: Member[]) => void;
  currentUserEmail?: string | null;
}

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function MemberManager({ members, onChange, currentUserEmail }: MemberManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<RegisteredUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [namePrompt, setNamePrompt] = useState<string | null>(null); // email needing a name
  const [nameInput, setNameInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const canSaveEdit = editName.trim() && editEmail.trim() && isValidEmail(editEmail.trim());

  const isMemberAlreadyAdded = useCallback(
    (email: string) => members.some((m) => m.email.toLowerCase() === email.toLowerCase()),
    [members],
  );

  // Search Firestore when query changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    searchUsers(debouncedQuery, 8)
      .then((results) => {
        if (!cancelled) {
          // Filter out already-added members
          setSearchResults(results.filter((r) => !isMemberAlreadyAdded(r.email)));
          setSearching(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSearchResults([]);
          setSearching(false);
        }
      });

    return () => { cancelled = true; };
  }, [debouncedQuery, isMemberAlreadyAdded]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const addRegisteredUser = (user: RegisteredUser) => {
    if (isMemberAlreadyAdded(user.email)) return;
    onChange([...members, { id: nanoid(), name: user.name, email: user.email }]);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    const q = searchQuery.trim();
    if (!q) return;

    // If there's exactly one search result, add it
    if (searchResults.length === 1) {
      addRegisteredUser(searchResults[0]);
      return;
    }

    // If typed a full email not in results, prompt for name
    if (isValidEmail(q) && !isMemberAlreadyAdded(q)) {
      // Check if any result matches exactly
      const exactMatch = searchResults.find(
        (r) => r.email.toLowerCase() === q.toLowerCase(),
      );
      if (exactMatch) {
        addRegisteredUser(exactMatch);
      } else {
        setNamePrompt(q.toLowerCase());
        setNameInput('');
        setShowResults(false);
      }
    }
  };

  const confirmNameAndAdd = () => {
    if (!namePrompt || !nameInput.trim()) return;
    onChange([
      ...members,
      { id: nanoid(), name: nameInput.trim(), email: namePrompt },
    ]);
    setNamePrompt(null);
    setNameInput('');
    setSearchQuery('');
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
      {/* Search bar */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
              setNamePrompt(null);
            }}
            onFocus={() => setShowResults(true)}
            onKeyDown={handleSearchKeyDown}
            className="h-11 rounded-xl pl-9 pr-9"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search results dropdown */}
        {showResults && searchQuery.trim() && (
          <div className="absolute z-50 w-full mt-1 rounded-xl border bg-popover shadow-lg overflow-hidden">
            {searchResults.length > 0 ? (
              <div className="max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.email}
                    type="button"
                    onClick={() => addRegisteredUser(user)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
                  >
                    <MemberAvatar name={user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : !searching ? (
              <div className="p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  {isValidEmail(searchQuery.trim())
                    ? 'Not found — press Enter to add with this email'
                    : 'No users found. Type a full email to add manually.'}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Name prompt for unknown email */}
      {namePrompt && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Adding <span className="font-medium text-foreground">{namePrompt}</span> — enter their name:
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); confirmNameAndAdd(); }
                if (e.key === 'Escape') setNamePrompt(null);
              }}
              className="h-9 rounded-lg text-sm"
              autoFocus
            />
            <Button
              type="button"
              size="sm"
              onClick={confirmNameAndAdd}
              disabled={!nameInput.trim()}
              className="h-9 px-3 rounded-lg"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setNamePrompt(null)}
              className="h-9 px-3 rounded-lg"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Member list */}
      {members.length > 0 ? (
        <div className="space-y-1.5">
          {members.map((m) => {
            const isCurrentUser = !!(
              currentUserEmail &&
              m.email.toLowerCase() === currentUserEmail.toLowerCase()
            );
            return editingId === m.id ? (
              <div
                key={m.id}
                className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2"
              >
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    (e.preventDefault(),
                    document.getElementById('edit-email-input')?.focus())
                  }
                  className="h-9 rounded-lg text-sm"
                  autoFocus
                />
                <Input
                  id="edit-email-input"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveEdit();
                    }
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
                  <span className="text-sm font-medium block truncate">
                    {m.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    {m.email}
                  </span>
                </div>
                {isCurrentUser && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
                    You
                  </span>
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
            Search and add members to start splitting expenses.
          </p>
        </div>
      )}
    </div>
  );
}
