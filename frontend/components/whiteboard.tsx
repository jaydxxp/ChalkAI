"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw, Editor, AssetRecordType, createShapeId, TLShapeId, Box } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";

interface WhiteboardProps {
  onExportReady: (exportFn: () => Promise<string | null>) => void;
  generatedImage: string | null;
  onAcceptSuggestion: () => void;
}

// Context to track what was exported (for targeted replacement)
interface ExportContext {
  shapeIds: TLShapeId[];
  bounds: Box;
}

export function Whiteboard({
  onExportReady,
  generatedImage,
  onAcceptSuggestion,
}: WhiteboardProps) {
  const editorRef = useRef<Editor | null>(null);
  const exportContextRef = useRef<ExportContext | null>(null);

  // Mount editor + export
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      const exportCanvas = async (): Promise<string | null> => {
        // Check for selection first
        const selectedIds = editor.getSelectedShapeIds();
        const idsToExport: TLShapeId[] = selectedIds.length > 0 
          ? [...selectedIds] 
          : Array.from(editor.getCurrentPageShapeIds());
        
        if (!idsToExport.length) return null;

        // Calculate combined bounds of all shapes to export
        let combinedBounds: Box | null = null;
        for (const id of idsToExport) {
          const shapeBounds = editor.getShapePageBounds(id);
          if (shapeBounds) {
            if (!combinedBounds) {
              combinedBounds = shapeBounds.clone();
            } else {
              combinedBounds = combinedBounds.expand(shapeBounds);
            }
          }
        }

        if (!combinedBounds) return null;

        // Store context for replacement
        exportContextRef.current = { 
          shapeIds: idsToExport, 
          bounds: combinedBounds 
        };

        const result = await editor.toImage(idsToExport, {
          format: "png",
          background: true,
          scale: 2,
        });

        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(result.blob);
        });
      };

      onExportReady(exportCanvas);
    },
    [onExportReady]
  );

  // Accept AI suggestion
  useEffect(() => {
    if (!generatedImage || !editorRef.current) return;

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      e.preventDefault();

      const editor = editorRef.current!;
      const context = exportContextRef.current;

      // Delete only the shapes that were exported (or all if no context)
      if (context && context.shapeIds.length > 0) {
        editor.deleteShapes(context.shapeIds);
      } else {
        // Fallback: delete all shapes
        const ids = Array.from(editor.getCurrentPageShapeIds());
        if (ids.length) editor.deleteShapes(ids);
      }

      // Create PNG image asset with base64 data
      const dataUrl = `data:image/png;base64,${generatedImage}`;

      // Load image to get dimensions
      const img = new Image();
      img.src = dataUrl;

      img.onload = () => {
        const width = img.width || 800;
        const height = img.height || 600;

        // Use original bounds if available, otherwise viewport
        const targetBounds = context?.bounds || editor.getViewportPageBounds();

        // Scale to fit in target area
        const maxW = targetBounds.w;
        const maxH = targetBounds.h;
        const scale = Math.min(maxW / width, maxH / height, 1);

        const w = width * scale;
        const h = height * scale;

        // Create asset ID and shape ID
        const assetId = AssetRecordType.createId();
        const shapeId = createShapeId();

        // Create the image asset first
        editor.createAssets([
          {
            id: assetId,
            type: "image",
            typeName: "asset",
            props: {
              name: "ai-generated.png",
              src: dataUrl,
              w: width,
              h: height,
              mimeType: "image/png",
              isAnimated: false,
            },
            meta: {},
          },
        ]);

        // Position at center of original bounds (or viewport center)
        const x = targetBounds.x + targetBounds.w / 2 - w / 2;
        const y = targetBounds.y + targetBounds.h / 2 - h / 2;

        // Create image shape referencing the asset
        editor.createShape({
          id: shapeId,
          type: "image",
          x,
          y,
          props: {
            w,
            h,
            assetId,
          },
        });

        // Clear context after use
        exportContextRef.current = null;

        onAcceptSuggestion();
      };

      img.onerror = () => {
        console.error("Failed to load generated image");
        exportContextRef.current = null;
      };
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [generatedImage, onAcceptSuggestion]);

  return (
    <div className="relative w-full h-full">
      <Tldraw onMount={handleMount} className="w-full h-full" />
    </div>
  );
}

