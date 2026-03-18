import { useState, useRef } from 'react';
import { useBillStore } from '../store/billStore';
import { PersonRow } from './PersonRow';

export function PeoplePanel() {
  const people = useBillStore((s) => s.people);
  const addPerson = useBillStore((s) => s.addPerson);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (name.trim()) {
      addPerson(name.trim());
      setName('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <section>
      <h2 className="text-[20px] font-bold leading-[1.2]">People</h2>
      <div className="flex gap-2 mt-3">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter name"
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-white dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-500 text-white rounded-lg px-4 py-2 min-h-[44px]"
        >
          Add Person
        </button>
      </div>
      {people.length === 0 ? (
        <p className="text-sm text-gray-500 mt-3">
          No people added yet. Enter a name above to get started.
        </p>
      ) : (
        <div className="space-y-2 mt-3">
          {people.map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
        </div>
      )}
    </section>
  );
}
