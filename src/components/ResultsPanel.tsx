import { useState, useMemo } from 'react';
import { useBillStore } from '../store/billStore';
import { calculateResults } from '../engine/calculate';
import { formatCents } from '../utils/formatCents';
import { PersonResultCard } from './PersonResultCard';
import type { PersonResult } from '../types/models';

interface ResultsPanelProps {
  results?: PersonResult[];
  grandTotal?: number;
  onPersonTipDraftChange?: (personId: string, draft: string) => void;
  onPersonTipDraftClear?: (personId: string) => void;
}

export function ResultsPanel({ results, grandTotal, onPersonTipDraftChange, onPersonTipDraftClear }: ResultsPanelProps = {}) {
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

  // Use props if provided, otherwise compute from store (backward compat for tests)
  const fallbackResults = useMemo(
    () => calculateResults({ people, items, settings, tipOverrides }),
    [people, items, settings, tipOverrides]
  );
  const displayResults = results ?? fallbackResults;
  const displayTotal = grandTotal ?? displayResults.reduce((sum, r) => sum + r.totalInCents, 0);

  return (
    <section className="space-y-4">
      <h2 className="text-[20px] font-bold leading-[1.2]">Results</h2>
      <div className="space-y-4">
        {displayResults.map((r) => (
          <PersonResultCard
            key={r.personId}
            result={r}
            isExpanded={expandedIds.has(r.personId)}
            onToggle={() => toggle(r.personId)}
            tipOverride={tipOverrides[r.personId]}
            defaultTip={settings.defaultTipPercent}
            onTipOverride={(pct) => setPersonTipOverride(r.personId, pct)}
            onClearTipOverride={() => clearPersonTipOverride(r.personId)}
            onTipDraftChange={onPersonTipDraftChange}
            onTipDraftClear={onPersonTipDraftClear}
          />
        ))}
      </div>
      <div className="mt-4 pt-4 border-t-2 border-gray-300 dark:border-gray-600 flex justify-between">
        <span className="text-[20px] font-bold leading-[1.2]">Grand Total</span>
        <span className="text-[20px] font-bold leading-[1.2]">
          {formatCents(displayTotal)}
        </span>
      </div>
    </section>
  );
}
