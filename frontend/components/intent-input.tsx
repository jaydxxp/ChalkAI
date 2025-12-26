"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

interface IntentInputProps {
  onIntentChange: (intent: string) => void
  onSubmit: () => void
  disabled?: boolean
  resetSignal?: number
}

export function IntentInput({ onIntentChange, onSubmit, disabled, resetSignal }: IntentInputProps) {
  const [intent, setIntent] = useState("")

  // Reset intent when resetSignal changes
  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      setIntent("")
    }
  }, [resetSignal])

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

