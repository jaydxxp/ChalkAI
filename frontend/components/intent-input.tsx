"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"

interface IntentInputProps {
  onIntentChange: (intent: string) => void
  onSubmit: () => void
  disabled?: boolean
}

export function IntentInput({ onIntentChange, onSubmit, disabled }: IntentInputProps) {
  const [intent, setIntent] = useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 120) // Enforce 120 char limit
    setIntent(value)
    onIntentChange(value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="w-full">
      <Input
        type="text"
        placeholder="Describe your diagram intent (max 120 characters)..."
        value={intent}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        maxLength={120}
        className="w-full"
      />
      <p className="text-xs text-muted-foreground mt-1 text-right">
        {intent.length}/120
      </p>
    </div>
  )
}

