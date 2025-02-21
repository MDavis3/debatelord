'use client';

interface ConcedeDialogProps {
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConcedeDialog({ onClose, onConfirm }: ConcedeDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 modal-overlay flex items-center justify-center">
      <div className="text-box w-full max-w-md mx-4">
        <div className="mb-4">Are you sure you want to concede?</div>
        <div className="flex justify-end gap-4">
          <button className="battle-menu-button" onClick={onClose}>
            NO
          </button>
          <button className="battle-menu-button" onClick={onConfirm}>
            YES
          </button>
        </div>
      </div>
    </div>
  );
} 