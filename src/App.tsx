import { useEffect } from 'react';
import { PeoplePanel } from './components/PeoplePanel';
import { ItemsPanel } from './components/ItemsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { BillName } from './components/BillName';
import { ShareButton } from './components/ShareButton';
import { decodeState } from './utils/urlState';
import { useBillStore } from './store/billStore';
import { useDraftCalculation } from './hooks/useDraftCalculation';

function App() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const decoded = decodeState(hash);
    if (!decoded) return;
    useBillStore.setState(decoded);
  }, []);

  const {
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
  } = useDraftCalculation();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="relative p-4 text-center border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-[28px] font-bold leading-[1.2]">Split the Bill</h1>
        <BillName />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <ShareButton
            label=""
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg active:scale-95 transition-transform"
          />
        </div>
      </header>
      <main className="max-w-lg mx-auto p-4 space-y-8 scroll-pb-[40vh]">
        <PeoplePanel />
        <ItemsPanel
          onDraftPriceChange={setItemPriceDraft}
          onDraftPriceClear={clearItemPriceDraft}
        />
        <SettingsPanel
          onTipDraftChange={setTipPercentDraft}
          onTipDraftClear={clearTipPercentDraft}
          onTaxDraftChange={setTaxPercentDraft}
          onTaxDraftClear={clearTaxPercentDraft}
        />
        <ResultsPanel
          results={results}
          grandTotal={grandTotal}
          onPersonTipDraftChange={setPersonTipDraft}
          onPersonTipDraftClear={clearPersonTipDraft}
        />
      </main>
    </div>
  );
}

export default App;
