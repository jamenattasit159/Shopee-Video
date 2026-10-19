"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  BookA,
  Clapperboard,
  FileText,
  History,
  ListOrdered,
  Mic,
  Moon,
  Pause,
  Play,
  Sparkles,
  Sun,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { VOICE_PRESETS } from "@/lib/voicePresets";
import { ScriptLineEditor } from "./ScriptLineEditor";
import { VoiceSettingsPanel } from "./VoiceSettingsPanel";
import { ResultPanel } from "./ResultPanel";
import { PronunciationDialog } from "./PronunciationDialog";
import { ClonedVoicesSection } from "./ClonedVoicesSection";
import { VoiceCloningModal, ReplicatedVoiceItem } from "../VoiceCloningModal";
import { useAudioPlayer } from "./useAudioPlayer";
import {
  DEFAULT_SETTINGS,
  GEMINI_VOICES,
  HistoryEntry,
  LineRole,
  SAMPLE_LINES,
  ScriptLine,
  SynthFile,
  SynthResponse,
  VoiceSettings,
  estimateSeconds,
  formatRate,
  formatTime,
  newLineId,
} from "./types";

const STORAGE = {
  draft: "voice-studio:draft",
  settings: "voice-studio:settings",
  history: "voice-studio:history",
  theme: "voice-studio:theme",
};
const MAX_HISTORY = 12;

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode) — the studio still works without it
  }
}

function splitScript(text: string): ScriptLine[] {
  const parts = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map((t, i) => {
    let role: LineRole = "body";
    if (i === 0) role = "hook";
    else if (i === parts.length - 1 && parts.length > 2) role = "cta";
    return { id: newLineId(), text: t, role };
  });
}

export function VoiceStudio() {
  const [theme, setTheme] = useState<"paper-dark" | "paper">("paper-dark");
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [mode, setMode] = useState<"lines" | "paste">("lines");
  const [pasteText, setPasteText] = useState("");

  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [result, setResult] = useState<SynthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, SynthFile>>({});
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [dictOpen, setDictOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [clones, setClones] = useState<ReplicatedVoiceItem[]>([]);
  const [clonesStatus, setClonesStatus] = useState<"loading" | "ready" | "error">("loading");

  const player = useAudioPlayer();
  const resultRef = useRef<HTMLElement>(null);

  // Restore per-viewer draft, settings and history.
  useEffect(() => {
    setTheme(readStorage(STORAGE.theme, "paper-dark"));
    const draft = readStorage<ScriptLine[]>(STORAGE.draft, []);
    setLines(draft.length ? draft : SAMPLE_LINES.map((l) => ({ ...l, id: newLineId() })));
    setSettings({ ...DEFAULT_SETTINGS, ...readStorage<Partial<VoiceSettings>>(STORAGE.settings, {}) });
    setHistory(readStorage<HistoryEntry[]>(STORAGE.history, []));
    setHydrated(true);
  }, []);

  const loadClones = useCallback(async () => {
    setClonesStatus("loading");
    try {
      const res = await apiFetch<{ voices?: ReplicatedVoiceItem[] }>("/api/replicated-voices", undefined, { silent: true });
      setClones(Array.isArray(res?.voices) ? res.voices : []);
      setClonesStatus("ready");
    } catch {
      setClonesStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadClones();
    // ?clone=1 (linked from the video studio) opens the cloning dialog straight away
    if (new URLSearchParams(window.location.search).get("clone") === "1") setCloneOpen(true);
  }, [loadClones]);

  // A saved clone may have been deleted since — fall back to a stock voice.
  useEffect(() => {
    if (!hydrated || clonesStatus !== "ready") return;
    const known = clones.some((c) => c.id === settings.geminiVoice) || GEMINI_VOICES.some((v) => v.id === settings.geminiVoice);
    if (!known) setSettings((s) => ({ ...s, geminiVoice: DEFAULT_SETTINGS.geminiVoice }));
  }, [hydrated, clonesStatus, clones, settings.geminiVoice]);

  useEffect(() => {
    if (hydrated) writeStorage(STORAGE.draft, lines);
  }, [lines, hydrated]);
  useEffect(() => {
    if (hydrated) writeStorage(STORAGE.settings, settings);
  }, [settings, hydrated]);
  useEffect(() => {
    if (hydrated) writeStorage(STORAGE.history, history);
  }, [history, hydrated]);
  useEffect(() => {
    if (hydrated) writeStorage(STORAGE.theme, theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (status !== "processing") return;
    const started = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed((Date.now() - started) / 1000), 250);
    return () => clearInterval(t);
  }, [status]);

  const validLines = useMemo(() => lines.filter((l) => l.text.trim()), [lines]);
  const totalChars = useMemo(() => validLines.reduce((n, l) => n + l.text.trim().length, 0), [validLines]);
  const rateForEstimate = settings.engine === "free" ? settings.rate : 0;
  const estimate = useMemo(
    () => validLines.reduce((s, l) => s + estimateSeconds(l.text, rateForEstimate), 0),
    [validLines, rateForEstimate]
  );

  const preset = VOICE_PRESETS.find((p) => p.id === settings.presetId) ?? VOICE_PRESETS[0];
  const activeClone = settings.engine === "gemini" ? clones.find((c) => c.id === settings.geminiVoice) ?? null : null;
  const voiceLabel =
    settings.engine === "gemini"
      ? activeClone
        ? `เสียงโคลน · ${activeClone.displayName}`
        : `Gemini · ${settings.geminiVoice}`
      : `${settings.voiceType === "female" ? "หญิง" : "ชาย"} · ${formatRate(settings.rate)}`;

  const requestBody = useCallback(
    (payloadLines: ScriptLine[], extra: Record<string, unknown> = {}) => ({
      lines: payloadLines.map((l) => ({ id: l.id, text: l.text.trim(), role: l.role })),
      ttsEngine: settings.engine,
      voiceType: settings.voiceType,
      geminiVoice: settings.geminiVoice,
      rate: formatRate(settings.rate),
      presetId: settings.presetId,
      intensity: settings.intensity,
      polish: settings.polish,
      skipCache: settings.skipCache,
      ...extra,
    }),
    [settings]
  );

  const generate = useCallback(async () => {
    if (!validLines.length || status === "processing") return;
    player.stop();
    setStatus("processing");
    setError(null);
    try {
      const res = await apiFetch<SynthResponse>("/api/synthesize-voice", {
        method: "POST",
        body: requestBody(validLines),
      });
      setResult(res);
      setResults(Object.fromEntries(res.files.map((f) => [f.id, f])));
      setStatus("success");
      if (res.audioUrl) {
        const entry: HistoryEntry = {
          id: newLineId(),
          createdAt: Date.now(),
          title: validLines[0].text.trim().slice(0, 60),
          audioUrl: res.audioUrl,
          duration: res.duration,
          voiceLabel,
          lineCount: res.files.length,
        };
        setHistory((h) => [entry, ...h.filter((e) => e.audioUrl !== entry.audioUrl)].slice(0, MAX_HISTORY));
      }
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    } catch (err: any) {
      setError(err?.message || null);
      setStatus("error");
    }
  }, [validLines, status, player, requestBody, voiceLabel]);

  const preview = useCallback(
    async (line: ScriptLine) => {
      setPreviewingId(line.id);
      try {
        const res = await apiFetch<SynthResponse>("/api/synthesize-voice", {
          method: "POST",
          body: requestBody([line], { previewOnly: true }),
        });
        const url = res.files[0]?.url;
        if (url) player.toggle(url);
      } catch {
        // surfaced by apiFetch toast
      } finally {
        setPreviewingId(null);
      }
    },
    [requestBody, player]
  );

  // Ctrl/Cmd + Enter = generate
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void generate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [generate]);

  const applyPaste = () => {
    const parsed = splitScript(pasteText);
    if (!parsed.length) return;
    setLines(parsed);
    setResults({});
    setPasteText("");
    setMode("lines");
  };

  const processing = status === "processing";
  const canGenerate = validLines.length > 0 && !processing;

  const cta = (
    <button type="button" className="btn btn-primary btn-block h-12 rounded-xl text-base" disabled={!canGenerate} onClick={generate}>
      {processing ? <span className="loading loading-spinner loading-sm" aria-hidden /> : <Wand2 className="size-5" />}
      {processing ? "กำลังสร้างเสียง..." : "สร้างเสียงพากย์"}
    </button>
  );

  return (
    <div data-theme={theme} className="min-h-screen bg-base-200 text-base-content">
      <header className="sticky top-0 z-30 border-b border-base-300/60 bg-base-100/85 backdrop-blur">
        <div className="navbar mx-auto max-w-7xl gap-2 px-4 sm:px-6">
          <div className="flex flex-1 items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-content">
              <AudioLines className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="font-semibold">Voice Studio</p>
              <p className="hidden text-xs opacity-60 sm:block">ระบบพากย์เสียง AI ภาษาไทย</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="btn btn-ghost btn-sm rounded-xl" onClick={() => setCloneOpen(true)}>
              <Mic className="size-4" />
              <span className="hidden sm:inline">โคลนเสียง</span>
            </button>
            <button type="button" className="btn btn-ghost btn-sm rounded-xl" onClick={() => setDictOpen(true)}>
              <BookA className="size-4" />
              <span className="hidden sm:inline">พจนานุกรม</span>
            </button>
            <Link href="/" className="btn btn-ghost btn-sm rounded-xl">
              <Clapperboard className="size-4" />
              <span className="hidden sm:inline">สตูดิโอวิดีโอ</span>
            </Link>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-square rounded-xl"
              aria-label={theme === "paper-dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
              onClick={() => setTheme((t) => (t === "paper-dark" ? "paper" : "paper-dark"))}
            >
              {theme === "paper-dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-32 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:pb-12 lg:pt-8">
        <div className="min-w-0 space-y-6">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">สร้างเสียงพากย์</h1>
            <p className="text-sm opacity-60">
              เขียนบททีละบรรทัด เลือกเสียง แล้วรับไฟล์เสียงรวมพร้อมใช้กับคลิปขายของ
            </p>
          </section>

          <section className="space-y-4" aria-labelledby="script-heading">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="script-heading" className="sr-only">บทพากย์</h2>
              <div role="tablist" className="tabs tabs-box tabs-sm rounded-xl bg-base-100">
                <button
                  role="tab"
                  type="button"
                  aria-selected={mode === "lines"}
                  className={`tab gap-2 rounded-lg ${mode === "lines" ? "tab-active" : ""}`}
                  onClick={() => setMode("lines")}
                >
                  <ListOrdered className="size-4" />
                  แยกบรรทัด
                </button>
                <button
                  role="tab"
                  type="button"
                  aria-selected={mode === "paste"}
                  className={`tab gap-2 rounded-lg ${mode === "paste" ? "tab-active" : ""}`}
                  onClick={() => setMode("paste")}
                >
                  <FileText className="size-4" />
                  วางบทยาว
                </button>
              </div>
              <p className="ml-auto text-xs tabular-nums opacity-60">
                {validLines.length} บรรทัด · {totalChars} ตัวอักษร · ประมาณ {formatTime(estimate)} นาที
              </p>
            </div>

            {mode === "paste" ? (
              <div className="space-y-3 rounded-2xl border border-base-300/60 bg-base-100 p-4">
                <label htmlFor="paste-script" className="text-sm font-medium">
                  วางบททั้งหมด
                </label>
                <textarea
                  id="paste-script"
                  rows={8}
                  className="textarea w-full rounded-xl text-base leading-relaxed"
                  placeholder={"บรรทัดแรกจะเป็น Hook\nบรรทัดกลางเป็นเนื้อหา\nบรรทัดสุดท้ายเป็นปิดการขาย"}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs opacity-60">ขึ้นบรรทัดใหม่ = แยกเป็นช่วงเสียงใหม่ (จะแทนที่บทปัจจุบัน)</p>
                  <button type="button" className="btn btn-neutral btn-sm rounded-xl" disabled={!pasteText.trim()} onClick={applyPaste}>
                    แยกเป็นบรรทัด
                  </button>
                </div>
              </div>
            ) : !hydrated ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-32 w-full rounded-2xl" />
                ))}
              </div>
            ) : lines.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-base-300 px-6 py-12 text-center">
                <span className="grid size-11 place-items-center rounded-xl bg-base-100">
                  <FileText className="size-5 opacity-60" />
                </span>
                <p className="mt-3 font-medium">ยังไม่มีบทพากย์</p>
                <p className="mt-1 text-sm opacity-60">เริ่มเขียนบรรทัดแรก หรือลองใช้บทตัวอย่าง</p>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm rounded-xl"
                    onClick={() => setLines([{ id: newLineId(), text: "", role: "hook" }])}
                  >
                    เพิ่มบรรทัดแรก
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm rounded-xl"
                    onClick={() => setLines(SAMPLE_LINES.map((l) => ({ ...l, id: newLineId() })))}
                  >
                    <Sparkles className="size-4" />
                    ใช้บทตัวอย่าง
                  </button>
                </div>
              </div>
            ) : (
              <ScriptLineEditor
                lines={lines}
                onChange={setLines}
                results={results}
                player={player}
                rate={rateForEstimate}
                processing={processing}
                previewingId={previewingId}
                onPreview={preview}
              />
            )}
          </section>

          <section ref={resultRef} className="scroll-mt-24 space-y-3" aria-labelledby="result-heading">
            <div className="flex items-center justify-between">
              <h2 id="result-heading" className="text-lg font-semibold">
                ไฟล์เสียง
              </h2>
              {status === "success" && (
                <span className="text-xs opacity-60">
                  {preset.nameTh} · {voiceLabel}
                </span>
              )}
            </div>
            <ResultPanel status={status} result={result} error={error} player={player} elapsedSec={elapsed} onRetry={generate} />
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <section className="rounded-2xl border border-base-300/60 bg-base-100 p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">ตั้งค่าเสียง</h2>
              <button
                type="button"
                className="btn btn-ghost btn-xs rounded-lg opacity-60"
                onClick={() => setSettings(DEFAULT_SETTINGS)}
                disabled={processing}
              >
                รีเซ็ต
              </button>
            </div>
            <VoiceSettingsPanel
              settings={settings}
              onChange={(p) => setSettings((s) => ({ ...s, ...p }))}
              disabled={processing}
              clonedVoices={clones}
            />
            <div className="mt-6 hidden space-y-2 lg:block">
              {cta}
              <p className="text-center text-xs opacity-50">
                กด <kbd className="kbd kbd-xs">Ctrl</kbd> + <kbd className="kbd kbd-xs">Enter</kbd> เพื่อสร้างเร็ว
              </p>
            </div>
          </section>

          <ClonedVoicesSection
            voices={clones}
            status={clonesStatus}
            selectedId={activeClone?.id ?? null}
            disabled={processing}
            onSelect={(v) => setSettings((s) => ({ ...s, engine: "gemini", geminiVoice: v.id }))}
            onRetry={loadClones}
            onOpenCloning={() => setCloneOpen(true)}
          />

          <section className="space-y-3" aria-labelledby="history-heading">
            <div className="flex items-center justify-between px-1">
              <h2 id="history-heading" className="flex items-center gap-2 text-sm font-medium">
                <History className="size-4 opacity-60" />
                ประวัติล่าสุด
              </h2>
              {history.length > 0 && (
                <button type="button" className="btn btn-ghost btn-xs rounded-lg opacity-60" onClick={() => setHistory([])}>
                  ล้างทั้งหมด
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-base-300 px-4 py-6 text-center text-sm opacity-60">
                ไฟล์เสียงที่สร้างจะถูกเก็บไว้ที่นี่
              </p>
            ) : (
              <ul className="space-y-1">
                {history.map((h) => (
                  <li key={h.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition duration-200 hover:bg-base-100">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-square shrink-0 rounded-xl bg-base-100 group-hover:bg-base-200"
                      aria-label={`เล่น ${h.title}`}
                      onClick={() => player.toggle(h.audioUrl)}
                    >
                      {player.isPlaying(h.audioUrl) ? <Pause className="size-4" /> : <Play className="size-4" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{h.title}</p>
                      <p className="truncate text-xs opacity-50">
                        {formatTime(h.duration)} · {h.lineCount} บรรทัด · {h.voiceLabel}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square rounded-lg opacity-0 transition hover:text-error focus-visible:opacity-100 group-hover:opacity-60"
                      aria-label={`ลบ ${h.title} ออกจากประวัติ`}
                      onClick={() => setHistory((list) => list.filter((e) => e.id !== h.id))}
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </main>

      {/* Mobile / tablet sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-base-300/60 bg-base-100/95 p-4 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="hidden min-w-0 flex-1 sm:block">
            <p className="truncate text-sm font-medium">{preset.nameTh}</p>
            <p className="truncate text-xs opacity-60">
              {voiceLabel} · ~{formatTime(estimate)}
            </p>
          </div>
          <div className="flex-1 sm:max-w-xs">{cta}</div>
          {lines.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-square h-12 w-12 rounded-xl"
              aria-label="ล้างบททั้งหมด"
              onClick={() => {
                setLines([]);
                setResults({});
              }}
              disabled={processing}
            >
              <Trash2 className="size-5" />
            </button>
          )}
        </div>
      </div>

      <PronunciationDialog open={dictOpen} onClose={() => setDictOpen(false)} />
      <VoiceCloningModal
        isOpen={cloneOpen}
        onClose={() => {
          setCloneOpen(false);
          // the dialog's manage tab can delete voices — resync the list
          void loadClones();
        }}
        onVoiceSelected={(voiceId) => {
          setSettings((s) => ({ ...s, engine: "gemini", geminiVoice: voiceId }));
          void loadClones();
        }}
      />
    </div>
  );
}
