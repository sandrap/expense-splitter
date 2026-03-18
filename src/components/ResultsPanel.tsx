import { useState } from 'react';
import { useBillStore } from '../store/billStore';
import { calculateResults } from '../engine/calculate';
import { formatCents } from '../utils/formatCents';
import { PersonResultCard } from './PersonResultCard';

export function ResultsPanel() {
  const people = useBillStore((s) => s.people);
  const items = useBillStore((s) => s.items);
  const settings = useBillStore((s) => s.settings);
  const tipOverrides = useBillStore((s) => s.tipOverrides);
  const setPersonTipOverride = useBillStore((s) => s.setPersonTipOverride);
  const clearPersonTipOverride = useBillStore((s) => s.clearPersonTipOverride);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Empty states
  if (people.length === 0 && items.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-[20px] font-bold leading-[1.2]">No results yet</h2>
        <p className="text-base text-gray-500">
          Add people and items above to see what everyone owes.
        </p>
      </section>
    );
  }

  if (people.length > 0 && items.length === 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-[20px] font-bold leading-[1.2]">Results</h2>
        <p className="text-base text-gray-500">
          Add items to the bill to calculate results.
        </p>
      </section>
    );
  }

  if (people.length === 0 && items.length > 0) {
    return (
      <section className="space-y-4">
        <h2 className="text-[20px] font-bold leading-[1.2]">Results</h2>
        <p className="text-base text-gray-500">
          Add people to split the bill with.
        </p>
      </section>
    );
  }

  const results = calculateResults({ people, items, settings, tipOverrides });
  const grandTotal = results.reduce((sum, r) => sum + r.totalInCents, 0);

  return (
    <section className="space-y-4">
      <h2 className="text-[20px] font-bold leading-[1.2]">Results</h2>
      <div className="space-y-4">
        {results.map((r) => (
          <PersonResultCard
            key={r.personId}
            result={r}
            isExpanded={expandedIds.has(r.personId)}
            onToggle={() => toggle(r.personId)}
            tipOverride={tipOverrides[r.personId]}
            defaultTip={settings.defaultTipPercent}
            onTipOverride={(pct) => setPersonTipOverride(r.personId, pct)}
            onClearTipOverride={() => clearPersonTipOverride(r.personId)}
          />
        ))}
      </div>
      <div className="mt-4 pt-4 border-t-2 border-gray-300 dark:border-gray-600 flex justify-between">
        <span className="text-[20px] font-bold leading-[1.2]">Grand Total</span>
        <span className="text-[20px] font-bold leading-[1.2]">
          {formatCents(grandTotal)}
        </span>
      </div>
    </section>
  );
}
