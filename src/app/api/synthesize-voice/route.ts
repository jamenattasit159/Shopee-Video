import { NextRequest, NextResponse } from "next/server";
import {
  buildNarrationScript,
  generateSmartVoiceover,
  TTSEngine,
  VoiceOption,
} from "../../../lib/tts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      productName,
      price,
      storyboard,
      voiceType,
      customText,
      ttsEngine = "free",
      rate = "+0%",
      geminiVoice = "Puck",
    } = body;

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
    const result = await generateSmartVoiceover({
      text: scriptText,
      engine: (ttsEngine as TTSEngine) || "free",
      voiceType: selectedVoice,
      rate: rate || "+0%",
      geminiVoice: geminiVoice || "Puck",
    });

    if (!result.audioUrl) {
      return NextResponse.json(
        { success: false, error: "Failed to synthesize voiceover" },
        { status: 500 }
      );
    }

    // Measure exact audio duration via Audio-First Timeline Engine
    const { measureAudioDuration, synchronizeTimelineToAudio } = await import(
      "../../../lib/audioTimeline"
    );
    const audioMeta = await measureAudioDuration(result.audioUrl);
    const numScenes = storyboard?.scenes?.length || 3;
    const timeline = synchronizeTimelineToAudio({
      audioDurationSec: audioMeta.durationSec,
      numScenes,
      fps: 30,
    });

    return NextResponse.json({
      success: true,
      audioUrl: result.audioUrl,
      scriptText,
      engineUsed: result.engineUsed,
      fallbackNotice: result.fallbackNotice,
      durationSec: audioMeta.durationSec,
      durationFrames: audioMeta.durationFrames,
      timeline,
    });
  } catch (error: any) {
    console.error("Synthesize voice error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "TTS error" },
      { status: 500 }
    );
  }
}
