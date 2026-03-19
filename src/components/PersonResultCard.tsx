import { useState } from 'react';
import type { PersonResult } from '../types/models';
import { formatCents } from '../utils/formatCents';

interface PersonResultCardProps {
  result: PersonResult;
  isExpanded: boolean;
  onToggle: () => void;
  tipOverride: number | undefined;
  defaultTip: number;
  onTipOverride: (tipPercent: number) => void;
  onClearTipOverride: () => void;
  onTipDraftChange?: (personId: string, draft: string) => void;
  onTipDraftClear?: (personId: string) => void;
}

export function PersonResultCard({
  result,
  isExpanded,
  onToggle,
  tipOverride,
  defaultTip,
  onTipOverride,
  onClearTipOverride,
  onTipDraftChange,
  onTipDraftClear,
}: PersonResultCardProps) {
  const [editingTip, setEditingTip] = useState(false);
  const [tipDraft, setTipDraft] = useState('');

  const currentTip = tipOverride ?? defaultTip;

  const handleTipCommit = () => {
    const val = parseFloat(tipDraft);
    if (!isNaN(val) && val >= 0) {
      onTipOverride(val);
    }
    setEditingTip(false);
    onTipDraftClear?.(result.personId);
  };

  const handleTipKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTipCommit();
    } else if (e.key === 'Escape') {
      onClearTipOverride();
      setEditingTip(false);
      onTipDraftClear?.(result.personId);
    }
  };

  const handleTipClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTip(true);
    setTipDraft(String(currentTip));
    onTipDraftChange?.(result.personId, String(currentTip));
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <span id={`person-name-${result.personId}`} className="text-base">{result.name}</span>
        <div className="flex items-center gap-2">
          <span className="text-[28px] font-bold leading-[1.2]">
            {formatCents(result.totalInCents)}
          </span>
          <button
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} breakdown for ${result.name}`}
            onClick={onToggle}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <span
              className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            >
              &#9654;
            </span>
          </button>
        </div>
      </div>
      {isExpanded && (
        <div
          aria-labelledby={`person-name-${result.personId}`}
          className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          {result.itemLines.map((line) => (
            <div key={line.itemId} className="flex justify-between py-1">
              <span className="text-sm">{line.description}</span>
              <span className="text-sm">{formatCents(line.shareInCents)}</span>
            </div>
          ))}
          <div className="flex justify-between py-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 font-medium">
            <span className="text-sm">Subtotal</span>
            <span className="text-sm">
              {formatCents(result.subtotalInCents)}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-sm">
              Tip (
              {editingTip ? (
                <input
                  autoFocus
                  inputMode="decimal"
                  className="w-12 border rounded px-1 text-sm"
                  value={tipDraft}
                  onChange={(e) => {
                    setTipDraft(e.target.value);
                    onTipDraftChange?.(result.personId, e.target.value);
                  }}
                  onBlur={handleTipCommit}
                  onKeyDown={handleTipKeyDown}
                  onFocus={(e) => setTimeout(() => e.target.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 100)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  onClick={handleTipClick}
                  className="cursor-pointer underline min-h-[44px] inline-flex items-center"
                >
                  {currentTip}%
                </span>
              )}
              )
            </span>
            <span className="text-sm">{formatCents(result.tipInCents)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-sm">Tax</span>
            <span className="text-sm">{formatCents(result.taxInCents)}</span>
          </div>
          <div className="flex justify-between py-1 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 font-semibold">
            <span className="text-base">Total</span>
            <span className="text-base">
              {formatCents(result.totalInCents)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
