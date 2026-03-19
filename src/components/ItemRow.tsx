import { useState } from 'react';
import type { Item } from '../types/models';
import { useBillStore } from '../store/billStore';
import { formatCents } from '../utils/formatCents';
import { parseDollarsToCents } from '../utils/parseDollars';
import { AssignmentChips } from './AssignmentChips';

interface ItemRowProps {
  item: Item;
  onDraftPriceChange?: (itemId: string, draft: string) => void;
  onDraftPriceClear?: (itemId: string) => void;
}

export function ItemRow({ item, onDraftPriceChange, onDraftPriceClear }: ItemRowProps) {
  const people = useBillStore((s) => s.people);
  const updateItem = useBillStore((s) => s.updateItem);
  const removeItem = useBillStore((s) => s.removeItem);

  const [editingDesc, setEditingDesc] = useState(false);
  const [draftDesc, setDraftDesc] = useState(item.description);

  const [editingPrice, setEditingPrice] = useState(false);
  const [draftPrice, setDraftPrice] = useState(
    formatCents(item.priceInCents).replace('$', '')
  );
  const [priceError, setPriceError] = useState('');

  const isUnassigned =
    item.splitMode === 'assigned' && item.assignedTo.length === 0;

  const handleSaveDesc = () => {
    const trimmed = draftDesc.trim();
    if (trimmed) {
      updateItem(item.id, { description: trimmed });
    } else {
      setDraftDesc(item.description);
    }
    setEditingDesc(false);
  };

  const handleCancelDesc = () => {
    setDraftDesc(item.description);
    setEditingDesc(false);
  };

  const handleDescKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveDesc();
    } else if (e.key === 'Escape') {
      handleCancelDesc();
    }
  };

  const handleSavePrice = () => {
    const parsed = parseDollarsToCents(draftPrice);
    if (parsed !== null) {
      updateItem(item.id, { priceInCents: parsed });
      setPriceError('');
      setEditingPrice(false);
      onDraftPriceClear?.(item.id);
    } else {
      setPriceError('Enter a valid price (e.g. 12.50)');
    }
  };

  const handleCancelPrice = () => {
    setDraftPrice(formatCents(item.priceInCents).replace('$', ''));
    setPriceError('');
    setEditingPrice(false);
    onDraftPriceClear?.(item.id);
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSavePrice();
    } else if (e.key === 'Escape') {
      handleCancelPrice();
    }
  };

  const handleToggle = (personId: string) => {
    const newAssignedTo = item.assignedTo.includes(personId)
      ? item.assignedTo.filter((id) => id !== personId)
      : [...item.assignedTo, personId];
    updateItem(item.id, { assignedTo: newAssignedTo });
  };

  return (
    <div
      className={`border rounded-lg p-3 ${
        isUnassigned
          ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* First line: description, price, delete */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          {editingDesc ? (
            <input
              autoFocus
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              onBlur={handleSaveDesc}
              onKeyDown={handleDescKeyDown}
              className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base bg-white dark:bg-gray-800 w-full"
            />
          ) : (
            <span
              onClick={() => setEditingDesc(true)}
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1"
            >
              {item.description}
            </span>
          )}
        </div>
        <div>
          {editingPrice ? (
            <div>
              <input
                autoFocus
                inputMode="decimal"
                value={draftPrice}
                onChange={(e) => {
                  setDraftPrice(e.target.value);
                  onDraftPriceChange?.(item.id, e.target.value);
                }}
                onBlur={handleSavePrice}
                onKeyDown={handlePriceKeyDown}
                className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-base bg-white dark:bg-gray-800 w-24"
              />
              {priceError && (
                <p className="text-sm text-red-500">{priceError}</p>
              )}
            </div>
          ) : (
            <span
              onClick={() => {
                setEditingPrice(true);
                onDraftPriceChange?.(item.id, draftPrice);
              }}
              className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1"
            >
              {formatCents(item.priceInCents)}
            </span>
          )}
        </div>
        <button
          onClick={() => removeItem(item.id)}
          className="text-red-500 min-h-[44px]"
        >
          Remove
        </button>
      </div>

      {/* Split mode toggle */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => updateItem(item.id, { splitMode: 'shared' })}
          className={
            item.splitMode === 'shared'
              ? 'font-medium text-blue-500'
              : 'text-gray-500'
          }
        >
          Shared
        </button>
        <button
          onClick={() => updateItem(item.id, { splitMode: 'assigned' })}
          className={
            item.splitMode === 'assigned'
              ? 'font-medium text-blue-500'
              : 'text-gray-500'
          }
        >
          Assigned
        </button>
      </div>

      {/* Assignment chips or hint */}
      <div className="mt-2">
        {people.length > 0 ? (
          <AssignmentChips
            people={people}
            assignedTo={item.assignedTo}
            onToggle={handleToggle}
          />
        ) : (
          <p className="text-sm text-gray-500">
            Add people first to assign items
          </p>
        )}
      </div>

      {/* Unassigned warning */}
      {isUnassigned && (
        <span className="text-xs text-amber-600 font-medium mt-1 inline-block">
          Not assigned to anyone
        </span>
      )}
    </div>
  );
}
