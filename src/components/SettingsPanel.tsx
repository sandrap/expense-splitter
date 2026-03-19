import { useState } from 'react';
import { useBillStore } from '../store/billStore';

const PRESETS = [15, 18, 20, 25] as const;

interface SettingsPanelProps {
  onTipDraftChange?: (draft: string) => void;
  onTipDraftClear?: () => void;
  onTaxDraftChange?: (draft: string) => void;
  onTaxDraftClear?: () => void;
}

export function SettingsPanel({ onTipDraftChange, onTipDraftClear, onTaxDraftChange, onTaxDraftClear }: SettingsPanelProps = {}) {
  const settings = useBillStore((s) => s.settings);
  const updateSettings = useBillStore((s) => s.updateSettings);

  const [isCustom, setIsCustom] = useState(
    () => !(PRESETS as readonly number[]).includes(settings.defaultTipPercent)
  );
  const [customDraft, setCustomDraft] = useState(
    () => (PRESETS as readonly number[]).includes(settings.defaultTipPercent) ? '' : String(settings.defaultTipPercent)
  );
  const [taxDraft, setTaxDraft] = useState(
    String(settings.defaultTaxPercent || '')
  );

  const handlePresetClick = (pct: number) => {
    setIsCustom(false);
    updateSettings({ defaultTipPercent: pct });
    onTipDraftClear?.();
  };

  const handleCustomClick = () => {
    setIsCustom(true);
    onTipDraftChange?.(customDraft);
  };

  const handleCustomCommit = () => {
    const val = parseFloat(customDraft);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      updateSettings({ defaultTipPercent: val });
      onTipDraftClear?.();
    } else {
      setCustomDraft(String(settings.defaultTipPercent));
      onTipDraftClear?.();
    }
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomCommit();
    } else if (e.key === 'Escape') {
      setCustomDraft(String(settings.defaultTipPercent));
    }
  };

  const handleTaxCommit = () => {
    const val = parseFloat(taxDraft);
    if (!isNaN(val) && val >= 0 && val <= 100) {
      updateSettings({ defaultTaxPercent: val });
      onTaxDraftClear?.();
    } else {
      setTaxDraft(String(settings.defaultTaxPercent || ''));
      onTaxDraftClear?.();
    }
  };

  const handleTaxKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTaxCommit();
    } else if (e.key === 'Escape') {
      setTaxDraft(String(settings.defaultTaxPercent || ''));
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-[20px] font-bold leading-[1.2]">Tip & Tax</h2>
      <div>
        <label className="text-base">Tip</label>
        <div
          role="radiogroup"
          aria-label="Tip percentage"
          className="flex flex-wrap gap-2 mt-2"
        >
          {PRESETS.map((pct) => (
            <button
              key={pct}
              role="radio"
              aria-checked={!isCustom && settings.defaultTipPercent === pct}
              onClick={() => handlePresetClick(pct)}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium ${
                !isCustom && settings.defaultTipPercent === pct
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {pct}%
            </button>
          ))}
          <button
            role="radio"
            aria-checked={isCustom}
            onClick={handleCustomClick}
            className={`min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium ${
              isCustom
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Custom %
          </button>
        </div>
        {isCustom && (
          <input
            autoFocus
            inputMode="decimal"
            className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-white dark:bg-gray-800 mt-2"
            placeholder="%"
            value={customDraft}
            onChange={(e) => {
              setCustomDraft(e.target.value);
              onTipDraftChange?.(e.target.value);
            }}
            onBlur={handleCustomCommit}
            onKeyDown={handleCustomKeyDown}
          />
        )}
      </div>
      <div>
        <label className="text-base">Tax</label>
        <div className="flex items-center gap-2 mt-2">
          <input
            inputMode="decimal"
            className="w-20 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-white dark:bg-gray-800"
            placeholder="0"
            value={taxDraft}
            onChange={(e) => {
              setTaxDraft(e.target.value);
              onTaxDraftChange?.(e.target.value);
            }}
            onBlur={handleTaxCommit}
            onKeyDown={handleTaxKeyDown}
          />
          <span className="text-base">%</span>
        </div>
      </div>
    </section>
  );
}
