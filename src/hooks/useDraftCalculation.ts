import { useMemo, useState, useCallback } from 'react';
import { useBillStore } from '../store/billStore';
import { calculateResults } from '../engine/calculate';
import { parseDollarsToCents } from '../utils/parseDollars';
import type { PersonResult } from '../types/models';

interface DraftOverrides {
  itemPrices: Record<string, string>;   // itemId -> draft string
  tipPercent: string | null;            // custom tip % draft
  taxPercent: string | null;            // tax % draft
  personTips: Record<string, string>;   // personId -> tip % draft string
}

export function useDraftCalculation() {
  const people = useBillStore((s) => s.people);
  const items = useBillStore((s) => s.items);
  const settings = useBillStore((s) => s.settings);
  const tipOverrides = useBillStore((s) => s.tipOverrides);

  const [drafts, setDrafts] = useState<DraftOverrides>({
    itemPrices: {},
    tipPercent: null,
    taxPercent: null,
    personTips: {},
  });

  const results: PersonResult[] = useMemo(() => {
    // Merge item price drafts
    const mergedItems = items.map((item) => {
      const draft = drafts.itemPrices[item.id];
      if (draft === undefined) return item;
      const parsed = parseDollarsToCents(draft);
      return { ...item, priceInCents: parsed ?? 0 };
    });

    // Merge settings drafts
    const mergedSettings = { ...settings };
    if (drafts.tipPercent !== null) {
      const val = parseFloat(drafts.tipPercent);
      mergedSettings.defaultTipPercent = isNaN(val) ? 0 : val;
    }
    if (drafts.taxPercent !== null) {
      const val = parseFloat(drafts.taxPercent);
      mergedSettings.defaultTaxPercent = isNaN(val) ? 0 : val;
    }

    // Merge per-person tip drafts
    const mergedTipOverrides = { ...tipOverrides };
    for (const [personId, draft] of Object.entries(drafts.personTips)) {
      const val = parseFloat(draft);
      mergedTipOverrides[personId] = isNaN(val) ? 0 : val;
    }

    return calculateResults({
      people,
      items: mergedItems,
      settings: mergedSettings,
      tipOverrides: mergedTipOverrides,
    });
  }, [people, items, settings, tipOverrides, drafts]);

  const grandTotal = useMemo(
    () => results.reduce((sum, r) => sum + r.totalInCents, 0),
    [results]
  );

  const setItemPriceDraft = useCallback((itemId: string, draft: string) => {
    setDrafts((prev) => ({
      ...prev,
      itemPrices: { ...prev.itemPrices, [itemId]: draft },
    }));
  }, []);

  const clearItemPriceDraft = useCallback((itemId: string) => {
    setDrafts((prev) => {
      const { [itemId]: _, ...rest } = prev.itemPrices;
      return { ...prev, itemPrices: rest };
    });
  }, []);

  const setTipPercentDraft = useCallback((draft: string) => {
    setDrafts((prev) => ({ ...prev, tipPercent: draft }));
  }, []);

  const clearTipPercentDraft = useCallback(() => {
    setDrafts((prev) => ({ ...prev, tipPercent: null }));
  }, []);

  const setTaxPercentDraft = useCallback((draft: string) => {
    setDrafts((prev) => ({ ...prev, taxPercent: draft }));
  }, []);

  const clearTaxPercentDraft = useCallback(() => {
    setDrafts((prev) => ({ ...prev, taxPercent: null }));
  }, []);

  const setPersonTipDraft = useCallback((personId: string, draft: string) => {
    setDrafts((prev) => ({
      ...prev,
      personTips: { ...prev.personTips, [personId]: draft },
    }));
  }, []);

  const clearPersonTipDraft = useCallback((personId: string) => {
    setDrafts((prev) => {
      const { [personId]: _, ...rest } = prev.personTips;
      return { ...prev, personTips: rest };
    });
  }, []);

  return {
    results,
    grandTotal,
    setItemPriceDraft,
    clearItemPriceDraft,
    setTipPercentDraft,
    clearTipPercentDraft,
    setTaxPercentDraft,
    clearTaxPercentDraft,
    setPersonTipDraft,
    clearPersonTipDraft,
  };
}
