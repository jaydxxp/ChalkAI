"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw, Editor, AssetRecordType, createShapeId } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";

interface WhiteboardProps {
  onExportReady: (exportFn: () => Promise<string | null>) => void;
  generatedImage: string | null;
  onAcceptSuggestion: () => void;
}

export function Whiteboard({
  onExportReady,
  generatedImage,
  onAcceptSuggestion,
}: WhiteboardProps) {
  const editorRef = useRef<Editor | null>(null);

  // Mount editor + export
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      const exportCanvas = async (): Promise<string | null> => {
        const ids = Array.from(editor.getCurrentPageShapeIds());
        if (!ids.length) return null;

        const result = await editor.toImage(ids, {
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

      // Clear canvas
      const ids = Array.from(editor.getCurrentPageShapeIds());
      if (ids.length) editor.deleteShapes(ids);

      // Create PNG image asset with base64 data
      const dataUrl = `data:image/png;base64,${generatedImage}`;

      // Load image to get dimensions
      const img = new Image();
      img.src = dataUrl;

      img.onload = () => {
        const width = img.width || 800;
        const height = img.height || 600;

        const bounds = editor.getViewportPageBounds();

        const maxW = bounds.w * 0.8;
        const maxH = bounds.h * 0.8;

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

        // Create image shape referencing the asset
        editor.createShape({
          id: shapeId,
          type: "image",
          x: bounds.x + bounds.w / 2 - w / 2,
          y: bounds.y + bounds.h / 2 - h / 2,
          props: {
            w,
            h,
            assetId,
          },
        });

        onAcceptSuggestion();
      };

      img.onerror = () => {
        console.error("Failed to load generated image");
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

