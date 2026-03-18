import type { Person } from '../types/models';

interface Props {
  people: Person[];
  assignedTo: string[];
  onToggle: (personId: string) => void;
}

export function AssignmentChips({ people, assignedTo, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {people.map((person) => {
        const isAssigned = assignedTo.includes(person.id);
        return (
          <button
            key={person.id}
            onClick={() => onToggle(person.id)}
            aria-pressed={isAssigned}
            className={`min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isAssigned
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {person.name}
          </button>
        );
      })}
    </div>
  );
}
