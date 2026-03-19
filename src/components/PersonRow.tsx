import { useState } from 'react';
import type { Person } from '../types/models';
import { useBillStore } from '../store/billStore';

export function PersonRow({ person }: { person: Person }) {
  const removePerson = useBillStore((s) => s.removePerson);
  const updatePerson = useBillStore((s) => s.updatePerson);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(person.name);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed) {
      updatePerson(person.id, { name: trimmed });
    } else {
      setDraft(person.name);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(person.name);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="flex items-center justify-between py-2 px-4">
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          onFocus={(e) => setTimeout(() => e.target.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 100)}
          className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base bg-white dark:bg-gray-800"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 min-h-[44px] inline-flex items-center"
        >
          {person.name}
        </span>
      )}
      <button
        onClick={() => removePerson(person.id)}
        className="text-red-500 min-h-[44px] min-w-[44px]"
      >
        Remove Person
      </button>
    </div>
  );
}
