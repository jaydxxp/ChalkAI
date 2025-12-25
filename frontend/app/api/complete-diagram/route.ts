import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Install zod if not present
// bun add zod

export const runtime = "nodejs"
export const maxDuration = 30

const ResponseSchema = z.object({
  svg: z.string().describe("The complete SVG diagram as a string"),
})

export async function POST(request: NextRequest) {
  try {
    // Use server-side environment variables (without NEXT_PUBLIC_ prefix)
    // NEXT_PUBLIC_ variables are exposed to client-side, which is a security risk for API keys
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash"
    
    const formData = await request.formData()
    const imageFile = formData.get("image") as File
    const intent = formData.get("intent") as string

    if (!imageFile) {
      return NextResponse.json(
        { error: "Missing image file" },
        { status: 400 }
      )
    }

    if (!intent || intent.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing intent description" },
        { status: 400 }
      )
    }

    // Check for API key first
    if (!apiKey) {
      console.error("Missing GOOGLE_GENERATIVE_AI_API_KEY environment variable")
      return NextResponse.json(
        { error: "API key not configured. Please set GOOGLE_GENERATIVE_AI_API_KEY in .env.local (without NEXT_PUBLIC_ prefix)" },
        { status: 500 }
      )
    }

    // Set the API key in process.env so @ai-sdk/google can read it
    // (it reads from GOOGLE_GENERATIVE_AI_API_KEY automatically)
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && apiKey) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey
    }

    // Convert image file to base64
    const arrayBuffer = await imageFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")
    const mimeType = imageFile.type || "image/png"
    const dataUrl = `data:${mimeType};base64,${base64Image}`

    // Prepare the prompt for diagram refinement
    const prompt = `You are a diagram refinement assistant. Your task is to take a rough, incomplete diagram sketch and refine it into a clean, complete, and accurate diagram based on the user's intent.

CRITICAL RULES:
1. The input diagram is INCOMPLETE or ROUGH - your job is to complete and refine it, not replace it
2. Use the intent text to understand what the diagram should represent
3. Do NOT introduce new concepts that aren't in the original sketch
4. Do NOT add decorative elements, colors, or styling beyond what's necessary
5. Preserve any text labels exactly as they appear
6. Make lines straight, shapes regular, and connections clear
7. Output ONLY valid SVG code - no markdown, no explanations, just the SVG element
8. The SVG should be minimal, clean, and suitable for educational diagrams
9. Use black strokes on white background (or transparent)
10. Keep the overall structure and layout similar to the input

User Intent: "${intent}"

Analyze the input diagram and produce a refined, complete SVG diagram that fulfills the intent while preserving the original structure.`

    console.log("Calling Gemini API with model:", modelName)
    console.log("Image size:", imageFile.size, "bytes")
    console.log("Intent:", intent)
    
    let result
    try {
      // The google() function automatically reads GOOGLE_GENERATIVE_AI_API_KEY from process.env
      result = await generateObject({
        model: google(modelName),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                image: dataUrl,
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        schema: ResponseSchema,
      })
    } catch (apiError) {
      console.error("Gemini API error:", apiError)
      const errorMessage = apiError instanceof Error ? apiError.message : "Unknown API error"
      
      // Provide helpful error messages
      if (errorMessage.includes("API key") || errorMessage.includes("authentication")) {
        return NextResponse.json(
          { error: "Invalid API key. Please check your GOOGLE_GENERATIVE_AI_API_KEY in .env.local" },
          { status: 401 }
        )
      }
      if (errorMessage.includes("model") || errorMessage.includes("not found")) {
        return NextResponse.json(
          { error: `Model ${modelName} not found. Try setting GEMINI_MODEL=gemini-1.5-flash in .env.local` },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: "Failed to call Gemini API", details: errorMessage },
        { status: 500 }
      )
    }

    const svg = result.object.svg

    // Validate that the response is actually SVG
    if (!svg || !svg.trim().startsWith("<svg")) {
      return NextResponse.json(
        { error: "AI did not return valid SVG" },
        { status: 500 }
      )
    }

    return NextResponse.json({ svg })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Failed to process diagram", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

