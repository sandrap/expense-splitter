import { useState, useRef } from 'react';
import { useBillStore } from '../store/billStore';
import { parseDollarsToCents } from '../utils/parseDollars';
import { ItemRow } from './ItemRow';

interface ItemsPanelProps {
  onDraftPriceChange?: (itemId: string, draft: string) => void;
  onDraftPriceClear?: (itemId: string) => void;
}

export function ItemsPanel({ onDraftPriceChange, onDraftPriceClear }: ItemsPanelProps = {}) {
  const items = useBillStore((s) => s.items);
  const addItem = useBillStore((s) => s.addItem);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceError, setPriceError] = useState('');
  const descRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const trimmedDesc = description.trim();
    if (!trimmedDesc) return;

    const parsedCents = parseDollarsToCents(price);
    if (parsedCents === null) {
      setPriceError('Enter a valid price (e.g. 12.50)');
      return;
    }

    addItem(trimmedDesc, parsedCents);
    setDescription('');
    setPrice('');
    setPriceError('');
    descRef.current?.focus();
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <section>
      <h2 className="text-[20px] font-bold leading-[1.2]">Items</h2>
      <div className="flex gap-2 mt-3">
        <input
          ref={descRef}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Item name"
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-white dark:bg-gray-800 dark:text-gray-100"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={handlePriceKeyDown}
          placeholder="$0.00"
          inputMode="decimal"
          className="w-24 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base bg-white dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-500 text-white rounded-lg px-4 py-2 min-h-[44px]"
        >
          Add Item
        </button>
      </div>
      {priceError && (
        <p className="text-sm text-red-500 mt-1">{priceError}</p>
      )}
      {items.length === 0 ? (
        <p className="text-sm text-gray-500 mt-3">
          No items yet. Add receipt items above.
        </p>
      ) : (
        <div className="space-y-4 mt-3">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onDraftPriceChange={onDraftPriceChange}
              onDraftPriceClear={onDraftPriceClear}
            />
          ))}
        </div>
      )}
    </section>
  );
}
