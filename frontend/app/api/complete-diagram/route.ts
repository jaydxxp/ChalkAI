import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Server-side only API key (no NEXT_PUBLIC prefix)
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" },
        { status: 500 }
      );
    }

    const { prompt, image_data } = (await request.json()) as {
      prompt: string;
      image_data?: string;
    };

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Build message content
    const content: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string }
    > = [];

    // Add reference image if provided
    if (image_data) {
      const imageDataUrl = image_data.startsWith("data:")
        ? image_data
        : `data:image/png;base64,${image_data}`;
      content.push({ type: "image", image: imageDataUrl });
    }

    // Add text prompt
    content.push({
      type: "text",
      text: `Generate a clean, high-quality diagram based on the provided reference image and the user's explanation.

The output should:
- Preserve the reference image's background style (usually a white background), but remove all pencil sketch borders, smudges, or uneven outlines.
- Focus on clarity and minimalism — use consistent line thickness, smooth shapes, and evenly spaced elements.
- Treat the drawing as a **diagram**, not an artwork: use clean arrows, boxes, and labeled components.
- Incorporate all entities, objects, or relationships mentioned in the user's explanation as labeled elements.
- If the explanation includes key terms, processes, or flow steps, visualize them using directional arrows or block structures.
- If paragraphs or captions appear in the original, retain them exactly, formatted cleanly.
- Return ONLY the generated image, no text response.

User explanation: ${prompt}`,
    });

    // Use generateText with image-capable Gemini model
    const result = await generateText({
      model: google("gemini-2.5-flash-image"),
      messages: [{ role: "user", content }],
    });

    // Extract image from files array
    const imageFile = result.files?.find((f) =>
      f.mediaType.startsWith("image/")
    );

    if (!imageFile) {
      return NextResponse.json(
        { error: "No image returned by model" },
        { status: 500 }
      );
    }

    // Use base64 property directly if available, otherwise convert uint8Array
    const base64Image = imageFile.base64 ?? 
      (imageFile.uint8Array ? Buffer.from(imageFile.uint8Array).toString("base64") : null);

    if (!base64Image) {
      return NextResponse.json(
        { error: "Could not extract image data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      image_data: base64Image,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
