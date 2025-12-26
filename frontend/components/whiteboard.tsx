"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw, Editor, AssetRecordType, createShapeId, TLShapeId, Box } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";

interface WhiteboardProps {
  onExportReady: (exportFn: () => Promise<string | null>) => void;
  onInsertReady: (insertFn: () => void) => void;
  generatedImage: string | null;
  onAcceptSuggestion: () => void;
  onDrawingActivity?: () => void;
}

// Context to track what was exported (for targeted replacement)
interface ExportContext {
  shapeIds: TLShapeId[];
  bounds: Box;
}

export function Whiteboard({
  onExportReady,
  onInsertReady,
  generatedImage,
  onAcceptSuggestion,
  onDrawingActivity,
}: WhiteboardProps) {
  const editorRef = useRef<Editor | null>(null);
  const exportContextRef = useRef<ExportContext | null>(null);
  const generatedImageRef = useRef<string | null>(null);

  // Keep generatedImageRef in sync
  useEffect(() => {
    generatedImageRef.current = generatedImage;
  }, [generatedImage]);

  // Insert image function (shared by Tab key and Accept button)
  const insertImage = useCallback(() => {
    const editor = editorRef.current;
    const imageData = generatedImageRef.current;
    if (!editor || !imageData) return;

    const context = exportContextRef.current;

    // Delete only the shapes that were exported (or all if no context)
    if (context && context.shapeIds.length > 0) {
      editor.deleteShapes(context.shapeIds);
    } else {
      const ids = Array.from(editor.getCurrentPageShapeIds());
      if (ids.length) editor.deleteShapes(ids);
    }

    const dataUrl = `data:image/png;base64,${imageData}`;
    const img = new Image();
    img.src = dataUrl;

    img.onload = () => {
      const width = img.width || 800;
      const height = img.height || 600;
      const targetBounds = context?.bounds || editor.getViewportPageBounds();
      const maxW = targetBounds.w;
      const maxH = targetBounds.h;
      const scale = Math.min(maxW / width, maxH / height, 1);
      const w = width * scale;
      const h = height * scale;

      const assetId = AssetRecordType.createId();
      const shapeId = createShapeId();

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

      const x = targetBounds.x + targetBounds.w / 2 - w / 2;
      const y = targetBounds.y + targetBounds.h / 2 - h / 2;

      editor.createShape({
        id: shapeId,
        type: "image",
        x,
        y,
        props: { w, h, assetId },
      });

      exportContextRef.current = null;
      onAcceptSuggestion();
    };

    img.onerror = () => {
      console.error("Failed to load generated image");
      exportContextRef.current = null;
    };
  }, [onAcceptSuggestion]);

  // Expose insertImage to parent
  useEffect(() => {
    onInsertReady(insertImage);
  }, [insertImage, onInsertReady]);

  // Mount editor + export
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      if (onDrawingActivity) {
        editor.store.listen((entry) => {
          const hasShapeChanges = Object.keys(entry.changes.added).some(k => k.startsWith('shape:')) ||
            Object.keys(entry.changes.updated).some(k => k.startsWith('shape:'));
          if (hasShapeChanges) {
            onDrawingActivity();
          }
        }, { source: 'user', scope: 'document' });
      }

      const exportCanvas = async (): Promise<string | null> => {
        const selectedIds = editor.getSelectedShapeIds();
        const idsToExport: TLShapeId[] = selectedIds.length > 0 
          ? [...selectedIds] 
          : Array.from(editor.getCurrentPageShapeIds());
        
        if (!idsToExport.length) return null;

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

        exportContextRef.current = { shapeIds: idsToExport, bounds: combinedBounds };

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
    [onExportReady, onDrawingActivity]
  );

  // Tab key handler
  useEffect(() => {
    if (!generatedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      e.preventDefault();
      insertImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [generatedImage, insertImage]);

  return (
    <div className="relative w-full h-full">
      <Tldraw onMount={handleMount} className="w-full h-full" />
    </div>
  );
}
