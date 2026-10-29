'use client';

interface Slot {
  _id: string;
  slotLabel: string;
  status: 'empty' | 'occupied' | 'reserved';
}

interface SlotGridProps {
  slots: Slot[];
  compact?: boolean;
}

const STATUS_CONFIG = {
  empty: {
    bg: 'bg-emerald-400 dark:bg-emerald-500',
    label: 'Empty',
    border: 'border-emerald-500'
  },
  occupied: {
    bg: 'bg-red-400 dark:bg-red-500',
    label: 'Occupied',
    border: 'border-red-500'
  },
  reserved: {
    bg: 'bg-amber-400 dark:bg-amber-500 slot-reserved',
    label: 'Reserved',
    border: 'border-amber-500'
  }
};

export default function SlotGrid({ slots, compact = false }: SlotGridProps) {
  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${config.bg.split(' ')[0]}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {config.label} ({slots.filter(s => s.status === status).length})
            </span>
          </div>
        ))}
      </div>

      {/* Slot Grid */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? '32px' : '44px'}, 1fr))` }}>
        {slots.map(slot => {
          const config = STATUS_CONFIG[slot.status];
          return (
            <div
              key={slot._id}
              title={`${slot.slotLabel} — ${config.label}`}
              className={`
                ${compact ? 'h-8' : 'h-11'}
                ${config.bg}
                rounded-lg border ${config.border}
                flex items-center justify-center
                cursor-pointer group relative
                transition-transform hover:scale-110
              `}
            >
              {!compact && (
                <span className="text-white text-xs font-bold leading-none drop-shadow">
                  {slot.slotLabel}
                </span>
              )}
              {/* Tooltip for compact */}
              {compact && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {slot.slotLabel} — {config.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {slots.length === 0 && (
        <div className="flex items-center justify-center h-24 text-gray-400 text-sm">
          No slots configured yet
        </div>
      )}
    </div>
  );
}
