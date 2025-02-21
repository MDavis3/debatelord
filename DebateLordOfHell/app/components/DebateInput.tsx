'use client';

import { useState } from 'react';

interface DebateInputProps {
  onClose: () => void;
  onSubmit: (argument: string) => void;
  phase: 'opening_lord' | 'opening_player' | 'back_and_forth' | 'closing_lord' | 'closing_player';
}

export default function DebateInput({ onClose, onSubmit, phase }: DebateInputProps) {
  const [argument, setArgument] = useState('');

  const wordLimit = phase.includes('opening') ? 300 : 
                   phase.includes('closing') ? 300 : 200;

  const wordCount = argument.trim().split(/\s+/).length;
  const isOverLimit = wordCount > wordLimit;

  const handleSubmit = () => {
    if (argument.trim() && !isOverLimit) {
      onSubmit(argument.trim());
    }
  };

  const getPhaseText = () => {
    switch(phase) {
      case 'opening_player':
        return 'Make your opening statement';
      case 'closing_player':
        return 'Make your closing statement';
      case 'back_and_forth':
        return 'Your response';
      default:
        return 'What is your argument?';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 modal-overlay flex items-center justify-center">
      <div className="text-box w-full max-w-2xl mx-4">
        <div className="mb-4">{getPhaseText()}</div>
        <div className="mb-2 text-sm">
          Word count: {wordCount}/{wordLimit}
          {isOverLimit && (
            <span className="text-red-500 ml-2">
              Exceeds word limit!
            </span>
          )}
        </div>
        <textarea
          className="w-full h-32 p-2 text-black text-sm bg-white border-2 border-[#2860b8] rounded resize-none focus:outline-none"
          placeholder="Type your argument..."
          value={argument}
          onChange={(e) => setArgument(e.target.value)}
          autoFocus
        />
        <div className="flex justify-end gap-4 mt-4">
          <button className="battle-menu-button" onClick={onClose}>
            BACK
          </button>
          <button 
            className="battle-menu-button" 
            onClick={handleSubmit}
            disabled={!argument.trim() || isOverLimit}
          >
            SUBMIT
          </button>
        </div>
      </div>
    </div>
  );
} 