"use client";

import { useCallback, useEffect, useRef } from "react";
import { Tldraw, Editor, RecordType, TLAssetId } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";


interface WhiteboardProps {
  onExportReady: (exportFn: () => Promise<string | null>) => void;
  suggestionSvg: string | null;
  onAcceptSuggestion: () => void;
}

export function Whiteboard({
  onExportReady,
  suggestionSvg,
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
    if (!suggestionSvg || !editorRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      e.preventDefault();

      const editor = editorRef.current!;

      // Clear canvas
      editor.deleteShapes(Array.from(editor.getCurrentPageShapeIds()));

      const assetId = `asset:${crypto.randomUUID()}` as TLAssetId


      const width = 800;
      const height = 600;

      // ✅ Create asset properly
      editor.createAssets([
  {
    id: assetId,
    typeName: "asset",
    type: "image",
    props: {
      name: "ai-diagram.svg",
      src: `data:image/svg+xml;utf8,${encodeURIComponent(suggestionSvg)}`,
      mimeType: "image/svg+xml",
      w: width,
      h: height,
      isAnimated: false,
    },
    meta: {}, // ✅ REQUIRED
  },
])


      const bounds = editor.getViewportPageBounds();

      // ✅ Create image shape
      editor.createShape({
        type: "image",
        x: bounds.x + bounds.w / 2 - width / 2,
        y: bounds.y + bounds.h / 2 - height / 2,
        props: {
          assetId,
          w: width,
          h: height,
        },
      });

      onAcceptSuggestion();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [suggestionSvg, onAcceptSuggestion]);

  return (
    <div className="relative w-full h-full">
      <Tldraw onMount={handleMount} className="w-full h-full" />

      {suggestionSvg && (
        <div className="absolute inset-0 pointer-events-none z-50 border-4 border-blue-500 border-dashed bg-blue-500/5">
          <div className="absolute top-4 left-4 bg-white px-4 py-2 rounded shadow border border-blue-500">
            <p className="text-sm font-medium text-blue-700">
              AI Suggestion (Press TAB to accept)
            </p>
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="bg-white p-4 rounded shadow-xl max-w-4xl max-h-[80vh] overflow-auto"
              dangerouslySetInnerHTML={{ __html: suggestionSvg }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
