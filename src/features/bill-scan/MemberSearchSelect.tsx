import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import MemberAvatar from '@/shared/MemberAvatar';
import { searchUsers, type RegisteredUser } from '@/features/users/user-registry';
import type { AssignedMember } from './types';
import type { Member } from '@/shared/types';

interface MemberSearchSelectProps {
  /** Pre-populated members from group (if in a group context) */
  groupMembers?: Member[];
  /** Currently assigned members */
  selected: AssignedMember[];
  onChange: (members: AssignedMember[]) => void;
  placeholder?: string;
}

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function MemberSearchSelect({
  groupMembers = [],
  selected,
  onChange,
  placeholder = 'Search members...',
}: MemberSearchSelectProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AssignedMember[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 250);

  const isSelected = useCallback(
    (email: string) => selected.some((s) => s.email.toLowerCase() === email.toLowerCase()),
    [selected],
  );

  // Search: first filter group members, then Firestore
  useEffect(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) {
      // Show group members when no query
      setResults(
        groupMembers
          .filter((m) => !isSelected(m.email))
          .map((m) => ({ id: m.id, name: m.name, email: m.email })),
      );
      setSearching(false);
      return;
    }

    // Filter group members first
    const groupMatches = groupMembers
      .filter(
        (m) =>
          !isSelected(m.email) &&
          (m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)),
      )
      .map((m) => ({ id: m.id, name: m.name, email: m.email }));

    setResults(groupMatches);
    setSearching(true);

    // Also search Firestore
    let cancelled = false;
    searchUsers(q, 6)
      .then((users: RegisteredUser[]) => {
        if (cancelled) return;
        const firestoreMatches = users
          .filter(
            (u) =>
              !isSelected(u.email) &&
              !groupMatches.some((g) => g.email.toLowerCase() === u.email.toLowerCase()),
          )
          .map((u) => ({ id: u.email, name: u.name, email: u.email }));
        setResults([...groupMatches, ...firestoreMatches]);
        setSearching(false);
      })
      .catch(() => {
        if (!cancelled) setSearching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, groupMembers, isSelected]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addMember = (member: AssignedMember) => {
    onChange([...selected, member]);
    setQuery('');
    setShowDropdown(false);
  };

  const removeMember = (email: string) => {
    onChange(selected.filter((s) => s.email.toLowerCase() !== email.toLowerCase()));
  };

  return (
    <div ref={containerRef} className="space-y-1.5">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((m) => (
            <span
              key={m.email}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-medium"
            >
              {m.name}
              <button
                type="button"
                onClick={() => removeMember(m.email)}
                className="hover:bg-primary/20 rounded-full p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="h-8 rounded-lg pl-8 pr-8 text-xs"
        />
        {searching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
        )}

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute z-50 w-full mt-1 rounded-lg border bg-popover shadow-md overflow-hidden max-h-40 overflow-y-auto">
            {results.length > 0 ? (
              results.map((m) => (
                <button
                  key={m.email}
                  type="button"
                  onClick={() => addMember(m)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-accent text-left text-xs"
                >
                  <MemberAvatar name={m.name} size="sm" className="h-5 w-5 text-[8px]" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium block truncate">{m.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate block">{m.email}</span>
                  </div>
                </button>
              ))
            ) : !searching && query.trim() ? (
              <div className="p-2 text-center text-[11px] text-muted-foreground">
                No users found
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
