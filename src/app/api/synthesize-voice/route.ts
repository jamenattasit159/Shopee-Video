import { NextRequest, NextResponse } from "next/server";
import { buildNarrationScript, generateThaiVoiceover, VoiceOption } from "../../../lib/tts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productName, price, storyboard, voiceType, customText } = body;

    const scriptText =
      customText ||
      (storyboard ? buildNarrationScript(productName || "", price || "", storyboard) : "");

    if (!scriptText.trim()) {
      return NextResponse.json(
        { success: false, error: "Narration text is empty" },
        { status: 400 }
      );
    }

    const selectedVoice: VoiceOption = voiceType || "female";
    const audioUrl = await generateThaiVoiceover(
      scriptText,
      selectedVoice,
      `voice_${Date.now()}`
    );

    if (!audioUrl) {
      return NextResponse.json(
        { success: false, error: "Failed to synthesize voiceover" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      audioUrl,
      scriptText,
    });
  } catch (error: any) {
    console.error("Synthesize voice error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "TTS error" },
      { status: 500 }
    );
  }
}
