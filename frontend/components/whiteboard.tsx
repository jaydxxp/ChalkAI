"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Tldraw, Editor } from "@tldraw/tldraw"
import "@tldraw/tldraw/tldraw.css"

interface WhiteboardProps {
  onExportReady: (exportFn: () => Promise<string | null>) => void
  suggestionSvg: string | null
  onAcceptSuggestion: () => void
}

export function Whiteboard({
  onExportReady,
  suggestionSvg,
  onAcceptSuggestion,
}: WhiteboardProps) {
  const editorRef = useRef<Editor | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor

    // Create export function now that editor is ready
    const exportCanvas = async (): Promise<string | null> => {
      if (!editorRef.current) {
        console.error("Editor not available")
        return null
      }

      try {
        const shapes = editorRef.current.getCurrentPageShapes()
        console.log("Shapes found:", shapes.length)
        
        if (shapes.length === 0) {
          console.warn("No shapes to export")
          return null
        }

        // Use tldraw's built-in toImage method
        try {
          // Get all shape IDs from the current page
          const shapeIds = editorRef.current.getCurrentPageShapeIds()
          
          if (shapeIds.size === 0) {
            console.warn("No shapes to export")
            return null
          }

          // Convert Set to Array
          const shapeIdsArray = Array.from(shapeIds)
          
          // Use editor.toImage() method
          const result = await editorRef.current.toImage(shapeIdsArray, {
            format: "png",
            background: true, // Include white background
            scale: 2, // Higher quality
          })

          // Convert blob to data URL
          const imageDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(result.blob)
          })

          console.log("Export successful via toImage, data URL length:", imageDataUrl.length)
          return imageDataUrl
        } catch (error) {
          console.error("toImage export failed:", error)
          
          // Fallback: Try alternative export method
          try {
            // Try using getSnapshot and render manually
            const snapshot = editorRef.current.store.getSnapshot()
            const shapes = editorRef.current.getCurrentPageShapes()
            
            if (shapes.length === 0) {
              return null
            }

            // Get viewport bounds
            const bounds = editorRef.current.getViewportPageBounds()
            const width = Math.max(bounds.w, 800)
            const height = Math.max(bounds.h, 600)

            // Create canvas and render shapes manually
            const exportCanvas = document.createElement("canvas")
            const scale = 2
            exportCanvas.width = width * scale
            exportCanvas.height = height * scale
            const ctx = exportCanvas.getContext("2d")
            
            if (!ctx) {
              return null
            }

            // Fill white background
            ctx.fillStyle = "#ffffff"
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)

            // This is a simplified fallback - in production you'd properly render shapes
            // For now, return a placeholder or try to find the canvas
            console.warn("Using simplified fallback export")
            
            // Try to find the actual canvas element one more time
            const container = containerRef.current
            if (container) {
              // Wait a bit for canvas to be ready
              await new Promise(resolve => setTimeout(resolve, 100))
              
              const canvases = container.querySelectorAll("canvas")
              for (const canvas of canvases) {
                if (canvas.width > 50 && canvas.height > 50) {
                  ctx.scale(scale, scale)
                  ctx.drawImage(canvas, 0, 0, width, height)
                  return exportCanvas.toDataURL("image/png", 1.0)
                }
              }
            }

            return null
          } catch (fallbackError) {
            console.error("Fallback export also failed:", fallbackError)
            return null
          }
        }
      } catch (error) {
        console.error("Export error:", error)
        return null
      }
    }

    // Notify parent that export function is ready
    onExportReady(exportCanvas)
  }, [onExportReady])

  // Handle TAB key for accepting suggestion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab" && suggestionSvg && editorRef.current) {
        e.preventDefault()
        
        const editor = editorRef.current
        
        // Clear all current shapes
        const shapes = editor.getCurrentPageShapes()
        shapes.forEach((shape) => {
          editor.deleteShape(shape.id)
        })

        // Convert SVG to PNG and create an image shape
        const svgBlob = new Blob([suggestionSvg], { type: "image/svg+xml" })
        const svgUrl = URL.createObjectURL(svgBlob)
        
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = async () => {
          try {
            const bounds = editor.getViewportPageBounds()
            const centerX = bounds.x + bounds.w / 2
            const centerY = bounds.y + bounds.h / 2
            
            // Convert SVG to PNG using canvas
            const canvas = document.createElement("canvas")
            const scale = 2
            canvas.width = (img.width || 800) * scale
            canvas.height = (img.height || 600) * scale
            const ctx = canvas.getContext("2d")
            
            if (ctx) {
              ctx.scale(scale, scale)
              ctx.drawImage(img, 0, 0)
              
              // Convert to blob and create asset
              canvas.toBlob(async (blob) => {
                if (blob && editorRef.current) {
                  try {
                    // Create a file from blob
                    const file = new File([blob], "diagram.png", { type: "image/png" })
                    
                    // Use tldraw's asset creation
                    const assetId = editorRef.current.createAssetId()
                    
                    // Create image shape with the asset
                    // Note: This is a simplified approach. In production, you'd properly upload the asset
                    const width = img.width || 800
                    const height = img.height || 600
                    
                    editorRef.current.createShape({
                      type: "image",
                      x: centerX - width / 2,
                      y: centerY - height / 2,
                      props: {
                        w: width,
                        h: height,
                        assetId: assetId,
                      },
                    })
                    
                    // Store the image data (in production, this would be uploaded to a server)
                    // For MVP, we'll use a workaround with base64
                    const reader = new FileReader()
                    reader.onload = () => {
                      const base64 = reader.result as string
                      // Store temporarily (in production, use proper asset management)
                      ;(window as any).__tldrawAssetCache = (window as any).__tldrawAssetCache || {}
                      ;(window as any).__tldrawAssetCache[assetId] = base64
                    }
                    reader.readAsDataURL(blob)
                  } catch (err) {
                    console.error("Error creating image shape:", err)
                  }
                }
                URL.revokeObjectURL(svgUrl)
              }, "image/png")
            } else {
              URL.revokeObjectURL(svgUrl)
            }
          } catch (err) {
            console.error("Error processing SVG:", err)
            URL.revokeObjectURL(svgUrl)
          }
        }
        img.onerror = () => {
          console.error("Error loading SVG image")
          URL.revokeObjectURL(svgUrl)
        }
        img.src = svgUrl

        onAcceptSuggestion()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [suggestionSvg, onAcceptSuggestion])

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <Tldraw onMount={handleMount} className="w-full h-full" />
      {suggestionSvg && (
        <div className="absolute inset-0 pointer-events-none z-50 border-4 border-blue-500 border-dashed bg-blue-500/5">
          <div className="absolute top-4 left-4 bg-white dark:bg-black px-4 py-2 rounded shadow-lg border border-blue-500">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              AI Suggestion (Press TAB to accept)
            </p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="bg-white dark:bg-gray-900 p-4 rounded shadow-xl max-w-4xl max-h-[80vh] overflow-auto"
              dangerouslySetInnerHTML={{ __html: suggestionSvg }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

