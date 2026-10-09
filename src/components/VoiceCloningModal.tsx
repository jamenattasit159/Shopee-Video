"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Volume2,
  RefreshCw,
  FileAudio,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export interface ReplicatedVoiceItem {
  id: string;
  displayName: string;
  type?: string;
  createTime?: string;
}

interface VoiceCloningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceSelected: (voiceId: string, voiceName: string) => void;
}

const MANDATORY_CONSENT_TEXT_TH =
  "ฉันเป็นเจ้าของเสียงนี้ และฉันยินยอมให้ Google ใช้เสียงนี้เพื่อสร้างแบบจำลองเสียงสังเคราะห์";

const SAMPLE_REFERENCE_SCRIPT_TH =
  "สวัสดีครับทุกคน วันนี้เจอของดีบอกต่อ เป็นไอเทมเด็ดที่ต้องมีติดบ้านไว้เลย คุณภาพดีงามมาก คุ้มค่าคุ้มราคา ใช้จริงแล้วชอบสุดๆ บอกเลยว่าไม่ผิดหวังแน่นอนครับ";

export const VoiceCloningModal: React.FC<VoiceCloningModalProps> = ({
  isOpen,
  onClose,
  onVoiceSelected,
}) => {
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");
  const [voices, setVoices] = useState<ReplicatedVoiceItem[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState<boolean>(false);
  const [voiceName, setVoiceName] = useState<string>("เสียงของฉัน (My Voice)");

  // Step 1: Reference Audio
  const [sourceAudioBlob, setSourceAudioBlob] = useState<Blob | null>(null);
  const [sourceAudioUrl, setSourceAudioUrl] = useState<string | null>(null);
  const [isRecordingSource, setIsRecordingSource] = useState<boolean>(false);
  const [sourceDuration, setSourceDuration] = useState<number>(0);

  // Step 2: Consent Audio
  const [consentAudioBlob, setConsentAudioBlob] = useState<Blob | null>(null);
  const [consentAudioUrl, setConsentAudioUrl] = useState<string | null>(null);
  const [isRecordingConsent, setIsRecordingConsent] = useState<boolean>(false);
  const [consentDuration, setConsentDuration] = useState<number>(0);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch replicated voices on open or tab switch
  const fetchVoices = async () => {
    setIsLoadingVoices(true);
    try {
      const res = await fetch("/api/replicated-voices");
      const data = await res.json();
      if (data.success && Array.isArray(data.voices)) {
        setVoices(data.voices);
      }
    } catch (err: any) {
      console.error("Failed to load voices:", err);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVoices();
      setSubmitError(null);
      setSubmitSuccess(null);
    } else {
      stopRecording();
    }
  }, [isOpen]);

  // Clean up recording timers
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingSource(false);
    setIsRecordingConsent(false);
  };

  // Start recording
  const handleStartRecord = async (type: "source" | "consent") => {
    try {
      setSubmitError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);

        if (type === "source") {
          setSourceAudioBlob(audioBlob);
          setSourceAudioUrl(url);
          setIsRecordingSource(false);
        } else {
          setConsentAudioBlob(audioBlob);
          setConsentAudioUrl(url);
          setIsRecordingConsent(false);
        }

        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();

      if (type === "source") {
        setIsRecordingSource(true);
        setSourceDuration(0);
        timerRef.current = setInterval(() => {
          setSourceDuration((prev) => prev + 1);
        }, 1000);
      } else {
        setIsRecordingConsent(true);
        setConsentDuration(0);
        timerRef.current = setInterval(() => {
          setConsentDuration((prev) => prev + 1);
        }, 1000);
      }
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setSubmitError("ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตสิทธิ์การใช้งานไมโครโฟนในเบราว์เซอร์");
    }
  };

  const handleStopRecord = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // Handle direct file uploads
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "source" | "consent"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (type === "source") {
      setSourceAudioBlob(file);
      setSourceAudioUrl(url);
    } else {
      setConsentAudioBlob(file);
      setConsentAudioUrl(url);
    }
  };

  // Submit voice replication request
  const handleCreateVoice = async () => {
    if (!sourceAudioBlob || !consentAudioBlob) {
      setSubmitError("กรุณาบันทึกหรืออัปโหลดทั้งเสียงตัวอย่าง (Reference) และเสียงยินยอม (Consent)");
      return;
    }

    if (!voiceName.trim()) {
      setSubmitError("กรุณาระบุชื่อเสียง");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const formData = new FormData();
      formData.append("displayName", voiceName.trim());
      formData.append("sourceAudio", sourceAudioBlob, "source.webm");
      formData.append("consentAudio", consentAudioBlob, "consent.webm");

      const res = await fetch("/api/replicated-voices", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการโคลนเสียง");
      }

      setSubmitSuccess(`🎉 โคลนเสียงสำเร็จแล้ว! สร้างโมเดล: ${data.voice.displayName}`);
      await fetchVoices();

      // Automatically select new voice
      onVoiceSelected(data.voice.id, data.voice.displayName);

      // Reset form
      setSourceAudioBlob(null);
      setSourceAudioUrl(null);
      setConsentAudioBlob(null);
      setConsentAudioUrl(null);

      // Switch to manage tab after brief delay
      setTimeout(() => {
        setActiveTab("manage");
      }, 1500);
    } catch (err: any) {
      console.error("Voice creation failed:", err);
      setSubmitError(err.message || "เกิดข้อผิดพลาดในการส่งข้อมูลไปยัง Gemini API");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete replicated voice
  const handleDeleteVoice = async (voiceId: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบโมเดลเสียงนี้?")) return;

    try {
      const res = await fetch(`/api/replicated-voices?id=${encodeURIComponent(voiceId)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setVoices((prev) => prev.filter((v) => v.id !== voiceId));
      } else {
        alert(data.error || "ไม่สามารถลบเสียงได้");
      }
    } catch (err) {
      console.error("Delete voice error:", err);
      alert("เกิดข้อผิดพลาดในการลบเสียง");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-base-100 border border-base-300 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300/80 bg-base-200/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-base-content flex items-center gap-2">
                โคลนเสียงด้วย Gemini 3.8 Flash
                <span className="badge badge-primary badge-sm font-normal">Voice Replication</span>
              </h3>
              <p className="text-xs text-base-content/60">
                ฝึกโมเดลเสียงส่วนบุคคลของคุณเพื่อใช้พากย์คลิป Shopee & TikTok
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square rounded-lg text-base-content/60 hover:text-base-content"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-base-300 px-6 pt-2 bg-base-100">
          <button
            onClick={() => setActiveTab("create")}
            className={`pb-3 px-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "create"
                ? "border-primary text-primary"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            <Mic className="w-4 h-4" />
            โคลนเสียงใหม่
          </button>
          <button
            onClick={() => {
              setActiveTab("manage");
              fetchVoices();
            }}
            className={`pb-3 px-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "manage"
                ? "border-primary text-primary"
                : "border-transparent text-base-content/60 hover:text-base-content"
            }`}
          >
            <Volume2 className="w-4 h-4" />
            เสียงโคลนของฉัน ({voices.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === "create" ? (
            <div className="space-y-6">
              {/* Voice Name Input */}
              <div className="form-control">
                <label className="label py-1">
                  <span className="label-text font-semibold text-xs text-base-content">
                    ชื่อเรียกโมเดลเสียง
                  </span>
                </label>
                <input
                  type="text"
                  value={voiceName}
                  onChange={(e) => setVoiceName(e.target.value)}
                  placeholder="เช่น เสียงรีวิวของฉัน, เสียงบอส (โหมดรีวิว)"
                  className="input input-bordered input-sm w-full rounded-xl bg-base-100 focus:border-primary"
                />
              </div>

              {/* Step 1: Reference Audio */}
              <div className="border border-base-300 rounded-2xl p-4 bg-base-200/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-content text-xs font-bold flex items-center justify-center">
                      1
                    </span>
                    <h4 className="font-semibold text-sm text-base-content">
                      เสียงตัวอย่างการพูด (Reference Audio)
                    </h4>
                  </div>
                  <span className="text-[11px] text-base-content/60">
                    ความยาวแนะนำ 10 - 30 วินาที
                  </span>
                </div>

                <div className="bg-base-100 border border-base-300/80 rounded-xl p-3 text-xs text-base-content/80 leading-relaxed">
                  <span className="font-semibold text-primary block mb-1">
                    💡 ตัวอย่างบทพูดภาษาไทย (อ่านตามนี้ได้เลยครับ):
                  </span>
                  &ldquo;{SAMPLE_REFERENCE_SCRIPT_TH}&rdquo;
                </div>

                {/* Recorder / Uploader Controls */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {!isRecordingSource ? (
                    <button
                      type="button"
                      onClick={() => handleStartRecord("source")}
                      className="btn btn-outline btn-sm rounded-xl gap-2 hover:btn-primary"
                    >
                      <Mic className="w-4 h-4 text-primary" />
                      {sourceAudioBlob ? "อัดเสียงตัวอย่างใหม่" : "กดเพื่อเริ่มอัดเสียง"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecord}
                      className="btn btn-error btn-sm rounded-xl gap-2 animate-pulse"
                    >
                      <Square className="w-4 h-4" />
                      หยุดการอัด ({sourceDuration}s)
                    </button>
                  )}

                  <label className="btn btn-ghost btn-sm rounded-xl gap-2 cursor-pointer text-base-content/70 hover:text-base-content">
                    <Upload className="w-4 h-4" />
                    อัปโหลดไฟล์ (.wav, .mp3, .m4a)
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "source")}
                    />
                  </label>

                  {sourceAudioUrl && (
                    <div className="flex items-center gap-2 ml-auto">
                      <audio controls src={sourceAudioUrl} className="h-8 max-w-[220px]" />
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Mandatory Consent Audio */}
              <div className="border border-warning/40 bg-warning/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-warning text-warning-content text-xs font-bold flex items-center justify-center">
                      2
                    </span>
                    <h4 className="font-semibold text-sm text-base-content flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-warning" />
                      เสียงยืนยันความยินยอม (Consent Audio)
                    </h4>
                  </div>
                  <span className="badge badge-warning badge-sm font-medium">
                    Google บังคับตามกฎหมาย
                  </span>
                </div>

                <div className="bg-base-100 border border-warning/30 rounded-xl p-3.5 space-y-1">
                  <p className="text-[11px] text-base-content/70 font-medium">
                    ผู้พูดต้องอ่านประโยคนี้ให้ชัดถ้อยชัดคำ (Google จะตรวจสอบว่าเป็นเสียงคนเดียวกัน):
                  </p>
                  <p className="text-sm font-bold text-base-content tracking-wide bg-warning/10 p-2 rounded-lg border border-warning/20">
                    &ldquo;{MANDATORY_CONSENT_TEXT_TH}&rdquo;
                  </p>
                </div>

                {/* Recorder / Uploader Controls for Consent */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {!isRecordingConsent ? (
                    <button
                      type="button"
                      onClick={() => handleStartRecord("consent")}
                      className="btn btn-outline btn-warning btn-sm rounded-xl gap-2"
                    >
                      <Mic className="w-4 h-4" />
                      {consentAudioBlob ? "อัดเสียงยินยอมใหม่" : "กดเพื่ออัดเสียงยินยอม"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopRecord}
                      className="btn btn-error btn-sm rounded-xl gap-2 animate-pulse"
                    >
                      <Square className="w-4 h-4" />
                      หยุดการอัด ({consentDuration}s)
                    </button>
                  )}

                  <label className="btn btn-ghost btn-sm rounded-xl gap-2 cursor-pointer text-base-content/70 hover:text-base-content">
                    <Upload className="w-4 h-4" />
                    อัปโหลดไฟล์
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, "consent")}
                    />
                  </label>

                  {consentAudioUrl && (
                    <div className="flex items-center gap-2 ml-auto">
                      <audio controls src={consentAudioUrl} className="h-8 max-w-[220px]" />
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Error Display */}
              {submitError && (
                <div className="alert alert-error text-xs rounded-xl py-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="alert alert-success text-xs rounded-xl py-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}
            </div>
          ) : (
            /* Manage Voices Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-base-content/70">
                  เสียงโคลนที่บันทึกอยู่ในโปรเจกต์ Google AI Studio ของคุณ (สูงสุด 200 เสียง)
                </span>
                <button
                  onClick={fetchVoices}
                  disabled={isLoadingVoices}
                  className="btn btn-ghost btn-xs rounded-lg gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingVoices ? "animate-spin" : ""}`} />
                  รีเฟรช
                </button>
              </div>

              {isLoadingVoices ? (
                <div className="flex flex-col items-center justify-center py-12 text-base-content/60 space-y-2">
                  <span className="loading loading-spinner loading-md text-primary" />
                  <span className="text-xs">กำลังโหลดรายการเสียง...</span>
                </div>
              ) : voices.length === 0 ? (
                <div className="border border-dashed border-base-300 rounded-2xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-base-200 text-base-content/40 flex items-center justify-center mx-auto">
                    <FileAudio className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-sm text-base-content">ยังไม่มีเสียงที่โคลนไว้</h5>
                    <p className="text-xs text-base-content/60 mt-1">
                      กดแท็บ &quot;โคลนเสียงใหม่&quot; เพื่อเริ่มบันทึกเสียงของคุณเป็นครั้งแรก
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="btn btn-primary btn-sm rounded-xl gap-2 mt-2"
                  >
                    <Mic className="w-4 h-4" />
                    เริ่มต้นโคลนเสียง
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {voices.map((v) => (
                    <div
                      key={v.id}
                      className="border border-base-300 rounded-xl p-3.5 bg-base-100 flex items-center justify-between hover:border-primary/50 transition-colors shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-base-content">
                            {v.displayName}
                          </span>
                          <span className="badge badge-sm badge-outline font-mono text-[10px]">
                            {v.id}
                          </span>
                        </div>
                        <div className="text-[11px] text-base-content/60 flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-success" />
                          <span>แบบจำลองเสียงพร้อมใช้งาน (Replicated Voice)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onVoiceSelected(v.id, v.displayName);
                            onClose();
                          }}
                          className="btn btn-primary btn-xs rounded-lg gap-1"
                        >
                          เลือกใช้เสียงนี้
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVoice(v.id)}
                          className="btn btn-ghost btn-xs btn-square text-error hover:bg-error/10 rounded-lg"
                          title="ลบโมเดลเสียง"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {activeTab === "create" && (
          <div className="px-6 py-4 border-t border-base-300 bg-base-200/50 flex items-center justify-between">
            <span className="text-xs text-base-content/60">
              {sourceAudioBlob && consentAudioBlob
                ? "✅ เสียงครบทั้ง 2 ไฟล์แล้ว พร้อมสร้างโมเดล"
                : "กรุณาเตรียมเสียงให้ครบทั้ง 2 ขั้นตอน"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost btn-sm rounded-xl"
                disabled={isSubmitting}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleCreateVoice}
                disabled={!sourceAudioBlob || !consentAudioBlob || isSubmitting}
                className="btn btn-primary btn-sm rounded-xl gap-2 font-medium"
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    กำลังสร้างโมเดลเสียง AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    เริ่มโคลนเสียงด้วย Gemini 3.8
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
