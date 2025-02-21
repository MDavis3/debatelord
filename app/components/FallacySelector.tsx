'use client';

import { DebateFallacy } from '../types/debate';

interface FallacySelectorProps {
  onClose: () => void;
  onSelect: (fallacy: string) => void;
}

export default function FallacySelector({ onClose, onSelect }: FallacySelectorProps) {
  const fallacies = Object.values(DebateFallacy);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="text-box w-full max-w-2xl mx-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {fallacies.map((fallacy) => (
            <button
              key={fallacy}
              onClick={() => {
                onSelect(fallacy);
                onClose();
              }}
              className="battle-menu-button text-sm"
            >
              {fallacy}
            </button>
          ))}
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="battle-menu-button"
          >
            BACK
          </button>
        </div>
      </div>
    </div>
  );
}

function getFallacyDescription(fallacy: string): string {
  const descriptions: Record<string, string> = {
    [DebateFallacy.AD_HOMINEM]: 'Attacking the person instead of their argument',
    [DebateFallacy.STRAW_MAN]: 'Misrepresenting an argument to make it easier to attack',
    [DebateFallacy.FALSE_DICHOTOMY]: 'Presenting only two options when others exist',
    [DebateFallacy.SLIPPERY_SLOPE]: 'Arguing that a relatively small first step will lead to a chain of negative events',
    [DebateFallacy.APPEAL_TO_AUTHORITY]: 'Using an authority figure to support an argument without proper evidence',
    [DebateFallacy.RED_HERRING]: 'Introducing an irrelevant topic to divert attention',
    [DebateFallacy.CIRCULAR_REASONING]: 'Using the conclusion to support the premises',
    [DebateFallacy.HASTY_GENERALIZATION]: 'Drawing a conclusion about a large group from a small sample'
  };

  return descriptions[fallacy] || 'No description available';
} 