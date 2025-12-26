"use client";

import { useState, useCallback, useRef } from "react";
import { Whiteboard } from "@/components/whiteboard";
import { IntentInput } from "@/components/intent-input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Home() {
  const [intent, setIntent] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const exportFnRef = useRef<(() => Promise<string | null>) | null>(null);

  const handleExportReady = useCallback(
    (exportFn: () => Promise<string | null>) => {
      exportFnRef.current = exportFn;
    },
    []
  );

  const handleRequestSuggestion = useCallback(async () => {
    if (!exportFnRef.current) {
      setError("Canvas not ready. Please wait a moment and try again.");
      return;
    }

    if (!intent.trim()) {
      setError("Please provide an intent description");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Export canvas to PNG
      const imageDataUrl = await exportFnRef.current();

      let base64Image: string | undefined;

      // Convert data URL to base64 string
      if (imageDataUrl) {
        if (imageDataUrl.startsWith("data:image/png;base64,")) {
          // Extract base64 from data URL
          base64Image = imageDataUrl.replace("data:image/png;base64,", "");
        } else {
          // Fetch and convert
          const response = await fetch(imageDataUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          await new Promise((resolve, reject) => {
            reader.onloadend = resolve;
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const dataUrl = reader.result as string;
          base64Image = dataUrl.replace("data:image/png;base64,", "");
        }
      }

      // Call API with JSON
      const apiResponse = await fetch("/api/complete-diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: intent,
          image_data: base64Image,
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || "Failed to get AI suggestion");
      }

      const data = await apiResponse.json();
      setGeneratedImage(data.image_data);
    } catch (err) {
      console.error("Error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to get AI suggestion"
      );
    } finally {
      setIsLoading(false);
    }
  }, [intent]);

  const handleAcceptSuggestion = useCallback(() => {
    setGeneratedImage(null);
    setIntent("");
    setResetSignal((prev) => prev + 1);
    // The whiteboard component handles the actual insertion
  }, []);

  const handleClearCanvas = useCallback(() => {
    setGeneratedImage(null);
    setError(null);
    setIntent("");
    setResetSignal((prev) => prev + 1);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      {/* Header */}
      <header className="border-b border-input px-6 py-4">
        <h1 className="text-2xl font-semibold">ChalkAI - Diagram Refinement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Draw a rough diagram, describe your intent, and get AI-refined
          suggestions
        </p>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Whiteboard */}
        <div className="flex-1 relative min-h-0">
          <Whiteboard
            onExportReady={handleExportReady}
            generatedImage={generatedImage}
            onAcceptSuggestion={handleAcceptSuggestion}
          />

          {/* Preview generated image */}
          {generatedImage && (
            <div className="absolute bottom-4 right-4 border rounded-lg shadow-lg bg-background p-2 z-50">
              <p className="text-xs text-muted-foreground mb-2">AI Suggestion Preview</p>
              <img
                src={`data:image/png;base64,${generatedImage}`}
                alt="AI suggestion preview"
                className="max-w-[200px] max-h-[150px] rounded"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="border-t border-input px-6 py-4 bg-background">
          <div className="flex flex-col gap-4 max-w-4xl mx-auto">
            {/* Intent Input */}
            <IntentInput
              onIntentChange={setIntent}
              onSubmit={handleRequestSuggestion}
              disabled={isLoading}
              resetSignal={resetSignal}
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

              {generatedImage && (
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
  );
}
