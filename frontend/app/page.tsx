"use client"

import { useState, useCallback, useRef } from "react"
import { Whiteboard } from "@/components/whiteboard"
import { IntentInput } from "@/components/intent-input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function Home() {
  const [intent, setIntent] = useState("")
  const [suggestionSvg, setSuggestionSvg] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const exportFnRef = useRef<(() => Promise<string | null>) | null>(null)

  const handleExportReady = useCallback((exportFn: () => Promise<string | null>) => {
    exportFnRef.current = exportFn
  }, [])

  const handleRequestSuggestion = useCallback(async () => {
    if (!exportFnRef.current) {
      setError("Canvas not ready. Please wait a moment and try again.")
      return
    }

    if (!intent.trim()) {
      setError("Please provide an intent description")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Export canvas to PNG
      const imageDataUrl = await exportFnRef.current()
      
      if (!imageDataUrl) {
        setError("Please draw something on the canvas first")
        setIsLoading(false)
        return
      }

      // Convert data URL to blob
      let blob: Blob
      try {
        // If it's already a data URL, convert directly
        if (imageDataUrl.startsWith("data:")) {
          const response = await fetch(imageDataUrl)
          blob = await response.blob()
        } else {
          // If it's a URL, fetch it
          const response = await fetch(imageDataUrl)
          blob = await response.blob()
        }
      } catch (fetchError) {
        console.error("Error converting image to blob:", fetchError)
        setError("Failed to process canvas image")
        setIsLoading(false)
        return
      }

      // Create form data
      const formData = new FormData()
      formData.append("image", blob, "canvas.png")
      formData.append("intent", intent)

      // Call API
      const apiResponse = await fetch("/api/complete-diagram", {
        method: "POST",
        body: formData,
      })

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json()
        throw new Error(errorData.error || "Failed to get AI suggestion")
      }

      const data = await apiResponse.json()
      setSuggestionSvg(data.svg)
    } catch (err) {
      console.error("Error:", err)
      setError(err instanceof Error ? err.message : "Failed to get AI suggestion")
    } finally {
      setIsLoading(false)
    }
  }, [intent])

  const handleAcceptSuggestion = useCallback(() => {
    setSuggestionSvg(null)
    // The whiteboard component handles the actual replacement
  }, [])

  const handleClearCanvas = useCallback(() => {
    // This would need to be implemented in the whiteboard component
    // For now, we'll just clear the suggestion
    setSuggestionSvg(null)
    setError(null)
  }, [])

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Header */}
      <header className="border-b border-input px-6 py-4">
        <h1 className="text-2xl font-semibold">ChalkAI - Diagram Refinement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Draw a rough diagram, describe your intent, and get AI-refined suggestions
        </p>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Whiteboard */}
        <div className="flex-1 relative min-h-0">
          <Whiteboard
            onExportReady={handleExportReady}
            suggestionSvg={suggestionSvg}
            onAcceptSuggestion={handleAcceptSuggestion}
          />
        </div>

        {/* Controls */}
        <div className="border-t border-input px-6 py-4 bg-background">
          <div className="flex flex-col gap-4 max-w-4xl mx-auto">
            {/* Intent Input */}
            <IntentInput
              onIntentChange={setIntent}
              onSubmit={handleRequestSuggestion}
              disabled={isLoading}
            />

            {/* Action Buttons */}
            <div className="flex gap-2 items-center">
              <Button
                onClick={handleRequestSuggestion}
                disabled={isLoading || !intent.trim()}
                className="flex-1 sm:flex-initial"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Get AI Suggestion"
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleClearCanvas}
                disabled={isLoading}
              >
                Clear
              </Button>

              {suggestionSvg && (
                <div className="ml-auto text-sm text-muted-foreground">
                  Press <kbd className="px-2 py-1 bg-muted rounded text-xs">TAB</kbd> to accept
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-4 py-2 rounded border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
