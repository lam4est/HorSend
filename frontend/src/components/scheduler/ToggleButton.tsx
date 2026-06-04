type ToggleButtonProps = {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

export default function ToggleButton ({ checked, disabled, onChange }: ToggleButtonProps) {
  return (
    <label className="toggle-button">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-button__slider" />
    </label>
  )
}
