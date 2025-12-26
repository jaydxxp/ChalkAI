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
      text: `Generate a clean, high-quality, professional diagram as a PNG image based on the provided reference image and the user’s explanation.

IMPORTANT INTERPRETATION RULE:
- Treat the reference image as a rough sketch or visual hint, NOT as a final diagram.
- You are allowed and expected to redraw, correct, and standardize shapes, proportions, and outlines to create a proper textbook-style diagram.

Diagram guidelines:
- Use a clean white background.
- Replace all rough, hand-drawn, or uneven outlines with precise, smooth, and well-proportioned shapes.
- Redraw objects using correct canonical forms (e.g., cylinders, boxes, arrows, tubes) even if the sketch is distorted or incomplete.
- Do NOT trace the sketch. Reconstruct the diagram clearly and accurately.
- Use consistent line thickness and clean geometry.
- Use arrows and connectors to clearly show structure, flow, or relationships.
- Include and clearly label all entities, components, and relationships mentioned in the user’s explanation.
- If the sketch is ambiguous, resolve it into the most reasonable and standard diagram based on the explanation.

Text handling:
- Preserve any text or labels from the reference image exactly if they exist.
- Add missing labels ONLY if they are clearly implied by the user’s explanation.

Output requirements:
- Output only the generated PNG image.
- Do not include any text, explanations, or captions outside the image.

User explanation:
${prompt}
`,
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
