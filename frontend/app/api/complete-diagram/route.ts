import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 30

function cleanAndValidateSVG(text: string): string | null {
  if (!text) return null;

  // Remove markdown code blocks
  text = text.replace(/```svg\n?/g, '').replace(/```\n?/g, '');
  
  // Remove any text before the first <svg
  const svgStartIndex = text.indexOf('<svg');
  if (svgStartIndex === -1) return null;
  text = text.substring(svgStartIndex);
  
  // Remove any text after the last </svg>
  const svgEndIndex = text.lastIndexOf('</svg>');
  if (svgEndIndex === -1) return null;
  text = text.substring(0, svgEndIndex + 6);
  
  // Basic validation
  if (!text.startsWith('<svg') || !text.endsWith('</svg>')) {
    return null;
  }
  
  // Check for balanced tags
  const openTags = (text.match(/<svg/g) || []).length;
  const closeTags = (text.match(/<\/svg>/g) || []).length;
  if (openTags !== closeTags) return null;
  
  // Ensure proper namespace
  if (!text.includes('xmlns="http://www.w3.org/2000/svg"')) {
    text = text.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  
  // Add viewBox if missing
  if (!text.includes('viewBox')) {
    text = text.replace('<svg', '<svg viewBox="0 0 800 600"');
  }
  
  return text.trim();
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-exp"
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_GENERATIVE_AI_API_KEY" },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const intent = formData.get("intent") as string

    if (!imageFile) {
      return NextResponse.json({ error: "Missing image file" }, { status: 400 })
    }

    if (!intent?.trim()) {
      return NextResponse.json({ error: "Missing intent" }, { status: 400 })
    }

    // Convert image to base64
    const buffer = Buffer.from(await imageFile.arrayBuffer())
    const base64Image = buffer.toString("base64")
    const mimeType = imageFile.type || "image/png"
    const dataUrl = `data:${mimeType};base64,${base64Image}`

    const prompt = `You are an expert SVG diagram generator. Analyze the provided image and create a clean, accurate SVG representation.

USER INTENT: "${intent}"

CRITICAL REQUIREMENTS:
1. Output ONLY the SVG code - no explanations, no markdown, no extra text
2. Start with <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
3. End with </svg>
4. Use proper SVG syntax with all tags closed
5. Preserve all text labels exactly as shown
6. Use simple shapes: <rect>, <circle>, <line>, <path>, <text>
7. Use black strokes (#000000) and white/transparent fills
8. Maintain the diagram's structure and relationships

FORBIDDEN:
- Do NOT add markdown code blocks
- Do NOT add explanations or comments
- Do NOT invent content not in the image
- Do NOT use complex gradients or effects

Generate the SVG now:`;

    let retries = 0;
    const maxRetries = 2;
    let validSVG: string | null = null;

    while (retries <= maxRetries && !validSVG) {
      const result = await generateText({
        model: google(modelName),
        messages: [
          {
            role: "user",
            content: [
              { type: "image", image: dataUrl },
              { type: "text", text: prompt },
            ],
          },
        ],
        temperature: retries > 0 ? 0.3 : 0.1, // Lower temperature on retries
      })

      validSVG = cleanAndValidateSVG(result.text);
      
      if (!validSVG) {
        console.warn(`Attempt ${retries + 1} failed. Raw output:`, result.text);
        retries++;
      }
    }

    if (!validSVG) {
      return NextResponse.json(
        { 
          error: "Failed to generate valid SVG after multiple attempts",
          details: "The AI model did not produce properly formatted SVG code"
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ svg: validSVG });

  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      {
        error: "Failed to process diagram",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}