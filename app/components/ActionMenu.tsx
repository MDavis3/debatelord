'use client';

interface ActionMenuProps {
  onDebateClick: () => void;
  onFallacyClick: () => void;
  onConcedeClick: () => void;
  disabled?: boolean;
}

export default function ActionMenu({
  onDebateClick,
  onFallacyClick,
  onConcedeClick,
  disabled = false
}: ActionMenuProps) {
  const buttonClass = `
    relative w-full p-4 text-lg font-pokemon rounded-lg
    transition-all duration-200 text-left pl-8
    ${disabled
      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
      : 'bg-white hover:bg-gray-50 text-gray-800 cursor-pointer shadow-sm hover:shadow-md'
    }
    before:content-[''] before:absolute before:left-3 before:top-1/2 before:-translate-y-1/2
    before:w-2 before:h-2 before:bg-black before:rounded-full
    disabled:before:bg-gray-400
  `;

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      <button
        onClick={onDebateClick}
        disabled={disabled}
        className={buttonClass}
      >
        DEBATE
      </button>
      <button
        onClick={onFallacyClick}
        disabled={disabled}
        className={buttonClass}
      >
        FALLACY
      </button>
      <button
        onClick={onConcedeClick}
        disabled={disabled}
        className={`
          ${buttonClass}
          ${!disabled && 'text-red-600 hover:text-red-700'}
        `}
      >
        CONCEDE
      </button>
    </div>
  );
} 