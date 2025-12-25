# Quick Setup Guide

## 1. Install Dependencies

```bash
cd frontend
bun install
```

## 2. Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
```

**Getting your API key:**
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and paste it in `.env.local`

**Note:** The `GEMINI_MODEL` is optional. Default is `gemini-2.0-flash-exp`. If that model isn't available, try:
- `gemini-1.5-flash`
- `gemini-1.5-pro`

## 3. Run the Development Server

```bash
bun run dev
```

## 4. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## Testing the Application

1. **Draw something**: Use the whiteboard to create a rough sketch
2. **Enter intent**: Type a description (e.g., "flowchart showing user login process")
3. **Get suggestion**: Click "Get AI Suggestion"
4. **Accept**: Press TAB to accept the refined diagram

## Troubleshooting

### API Key Issues
- Make sure `.env.local` is in the `frontend` directory
- Restart the dev server after adding/changing environment variables
- Verify the API key is valid in Google AI Studio

### Export Issues
- Make sure you've drawn something before requesting a suggestion
- Check browser console for errors

### Model Not Found
- Try changing `GEMINI_MODEL` to `gemini-1.5-flash` in `.env.local`
- Check [Google AI documentation](https://ai.google.dev/docs) for available models

