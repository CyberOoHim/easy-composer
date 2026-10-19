'use client';

import React, { useState, useEffect } from 'react';

export interface HeaderFieldEditModalProps {
  isOpen: boolean;
  fieldName: string | null;
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

export const HeaderFieldEditModal: React.FC<HeaderFieldEditModalProps> = ({
  isOpen,
  fieldName,
  initialValue,
  onSave,
  onClose,
}) => {
  const [prevInitial, setPrevInitial] = useState(initialValue);
  const [draft, setDraft] = useState(initialValue);

  if (initialValue !== prevInitial) {
    setPrevInitial(initialValue);
    setDraft(initialValue || '');
  }

  if (!isOpen || !fieldName) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">
          Edit {fieldName}
        </h3>
        <input
          type="text"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave(draft);
            if (e.key === 'Escape') onClose();
          }}
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base font-medium outline-none focus:ring-2 focus:ring-amber-500 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 mb-4"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500 text-zinc-950 hover:bg-amber-400 cursor-pointer"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
