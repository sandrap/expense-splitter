import { PeoplePanel } from './components/PeoplePanel';
import { ItemsPanel } from './components/ItemsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { useDraftCalculation } from './hooks/useDraftCalculation';

function App() {
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
      <header className="p-4 text-center border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-[28px] font-bold leading-[1.2]">Split the Bill</h1>
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
