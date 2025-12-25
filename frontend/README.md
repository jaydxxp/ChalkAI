# ChalkAI - Diagram Refinement Whiteboard

An AI-powered educational whiteboard that helps users create clean, complete diagrams from rough sketches.

## Features

- **Interactive Whiteboard**: Draw freely using tldraw with support for freehand drawing, lines, arrows, and shapes
- **AI-Powered Refinement**: Get AI suggestions to refine your rough sketches into clean diagrams
- **Human-in-the-Loop**: You remain in full control - accept suggestions with a single TAB keystroke
- **Intent-Based**: Describe your diagram intent in text to guide the AI

## Setup

### Prerequisites

- Bun (JavaScript runtime)
- Google Gemini API key

### Installation

1. Install dependencies:
```bash
bun install
```

2. Set up environment variables:
Create a `.env.local` file in the `frontend` directory:
```
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp  # Optional: specify model name
```

Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

3. Run the development server:
```bash
bun run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Draw**: Use the whiteboard to create a rough sketch of your diagram
2. **Describe**: Enter a brief description (max 120 characters) of what your diagram represents
3. **Get Suggestion**: Click "Get AI Suggestion" to receive a refined version
4. **Accept**: Press TAB to accept the suggestion and replace your original drawing
5. **Continue**: Keep drawing and refining as needed

## Technical Details

### Stack
- **Frontend**: Next.js 16+ (App Router), React 19, TypeScript
- **Whiteboard**: tldraw v4
- **UI Components**: shadcn/ui (minimal styling)
- **AI**: Google Gemini Flash 2.5 (via @ai-sdk/google)
- **Runtime**: Bun

### Architecture
- Canvas logic separated from AI logic
- AI integration isolated in `/api/complete-diagram`
- Modular, readable code structure
- Fail-safe error handling

## Project Structure

```
frontend/
├── app/
│   ├── api/
│   │   └── complete-diagram/
│   │       └── route.ts          # AI processing endpoint
│   ├── page.tsx                   # Main application page
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
├── components/
│   ├── ui/                        # shadcn/ui components
│   ├── whiteboard.tsx             # tldraw whiteboard component
│   └── intent-input.tsx           # Intent description input
└── lib/
    └── utils.ts                   # Utility functions
```

## API Endpoint

### POST `/api/complete-diagram`

Accepts multipart form data:
- `image`: PNG representation of the canvas
- `intent`: Short intent string (max 120 chars)

Returns:
- `svg`: AI-generated SVG diagram

## Notes

- The AI is designed for diagram refinement, not creative illustration
- SVG output is strictly enforced
- Original drawings are never auto-modified
- TAB key acceptance is instantaneous and reliable

## Development

```bash
# Development
bun run dev

# Build
bun run build

# Start production server
bun run start

# Lint
bun run lint
```

## License

MIT
