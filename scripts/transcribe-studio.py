"""Local Thai transcription. Output source timestamps; timeline mapping happens in studio.ts."""
import json
import os
import sys
from faster_whisper import WhisperModel

model = WhisperModel(os.environ.get("TRANSCRIPTION_MODEL", "small"), device="cpu", compute_type="int8")
segments, _ = model.transcribe(sys.argv[1], language="th", word_timestamps=True, vad_filter=True, beam_size=5)
cues = []
for segment in segments:
    words = segment.words or []
    if not words:
        if segment.text.strip():
            cues.append({"id": str(len(cues)), "start": segment.start, "end": segment.end, "text": segment.text.strip()})
        continue
    group = []
    def flush():
        if group:
            cues.append({"id": str(len(cues)), "start": group[0].start, "end": max(group[-1].end, group[0].start + 0.05), "text": "".join(w.word for w in group).strip()})
            group.clear()
    for word in words:
        if group and (len("".join(w.word for w in group)) + len(word.word) > 32 or word.end - group[0].start > 2.5):
            flush()
        group.append(word)
    flush()
with open(sys.argv[2], "w", encoding="utf-8") as file:
    json.dump(cues, file, ensure_ascii=False)
