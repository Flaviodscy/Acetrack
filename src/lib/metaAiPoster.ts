export type PosterStyle = "UFC" | "CYBER" | "VINTAGE" | "CHAMPION";

export type GeneratePosterInput = {
  winnerName: string;
  loserName: string;
  score: string;
  style: PosterStyle;
  winnerPhoto?: string; // data URL or remote URL
  loserPhoto?: string;
  aces?: number;
  winners?: number;
  maxServe?: string;
};

const META_AI_API_KEY = import.meta.env.VITE_META_AI_API_KEY || "";

export async function generateMatchPoster(input: GeneratePosterInput): Promise<string> {
  if (!META_AI_API_KEY) {
    // Fallback mock for dev without key
    return mockPosterUrl(input);
  }

  const prompt = buildPrompt(input);

  // NOTE: Replace with actual Meta AI image generation endpoint.
  // This is a placeholder implementation using a generic POST shape.
  // Meta's public image generation API endpoint and auth scheme may vary.
  const res = await fetch("https://api.ai.meta.com/v1/images/generate", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${META_AI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      style: input.style,
      aspect_ratio: "9:16",
      // If the API supports image conditioning, pass photos as base64
      images: [input.winnerPhoto, input.loserPhoto].filter(Boolean),
      negative_prompt: "blurry, low-res, watermark, text errors"
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta AI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  // Expected shape: { image_url: string } – adapt to actual response
  return data.image_url || data.url;
}

function buildPrompt(input: GeneratePosterInput): string {
  const styleDesc = {
    UFC: "UFC fight poster, bold red/black, muscular fighters, dramatic lighting, arena crowd",
    CYBER: "cyberpunk tennis duel poster, neon cyan magenta, holographic UI, futuristic stadium",
    VINTAGE: "vintage 1950s tennis champion poster, sepia tones, halftone texture, classic typography",
    CHAMPION: "elegant tennis champion poster, green accents, minimalist premium layout, trophy"
  }[input.style];

  return `
Create a high-resolution vertical match poster for a tennis duel.
${styleDesc}

Top title: OFFICIAL MAIN EVENT
Main text: ${input.winnerName.toUpperCase()} VS ${input.loserName.toUpperCase()}
Subtext: Score ${input.score}
Stats: Aces ${input.aces ?? 0}, Winners ${input.winners ?? 0}, Max Serve ${input.maxServe ?? ""}
Place two player portraits side by side in the center, using provided photos if available.
Keep text legible, no watermark, 4K quality.
`.trim();
}

function mockPosterUrl(input: GeneratePosterInput): string {
  // Dev fallback – returns a placeholder with query params for preview
  const params = new URLSearchParams({
    winner: input.winnerName,
    loser: input.loserName,
    score: input.score,
    style: input.style
  });
  return `https://placehold.co/1080x1920?text=${encodeURIComponent(`${input.winnerName} vs ${input.loserName}`)}&${params.toString()}`;
}
