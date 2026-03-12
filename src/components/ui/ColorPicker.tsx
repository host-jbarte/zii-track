const COLORS = [
  '#06b6d4', '#22d3ee', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#10b981', '#64748b',
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
}

export default function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-7 h-7 rounded-lg transition-all duration-150 hover:scale-110"
          style={{
            backgroundColor: c,
            boxShadow: value === c
              ? `0 0 0 2px white, 0 0 12px ${c}`
              : `0 0 8px ${c}40`,
          }}
        />
      ))}
    </div>
  )
}
