'use client';

interface HealthBarProps {
  current: number;
  max: number;
}

export default function HealthBar({ current, max }: HealthBarProps) {
  const percentage = (current / max) * 100;
  const getHealthColor = () => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 20) return 'bg-yellow-400';
    return 'bg-red-500';
  };

  return (
    <div className="pokemon-health-bar">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-pokemon">HP</span>
        <div className="flex-1 h-2 bg-gray-300 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getHealthColor()}`}
            style={{ 
              width: `${percentage}%`,
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <span className="text-sm font-pokemon">
          {current}/{max}
        </span>
      </div>
    </div>
  );
} 