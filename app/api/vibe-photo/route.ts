import { analyzePhotoForVibe } from "@/lib/groq-vision";
import type { VibeShift } from "@/lib/types";

// POST /api/vibe-photo — multipart form with a `photo` file field.
//
// This is the only place GROQ_API_KEY is read from a route:
// components/photo-vibe-overlay.tsx (a client component) never imports
// lib/groq-vision.ts directly, so the key never reaches the browser.
export async function POST(request: Request) {
  const form = await request.formData();
  const photo = form.get("photo");
  if (!(photo instanceof File)) {
    return Response.json({ shift: null }, { status: 400 });
  }

  const shift: VibeShift | null = await analyzePhotoForVibe(photo);
  return Response.json({ shift });
}
