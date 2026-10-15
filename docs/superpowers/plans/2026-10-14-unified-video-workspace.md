# Unified Video Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. ผู้ใช้เลือกทำในแชตนี้เท่านั้น ห้าม dispatch subagent

**Goal:** รวมรูป คลิป สตอรี่บอร์ด เสียง คำอ่าน ซับ และการส่งออกในหน้าทำงานเดียวสำหรับคลิปสินค้าผสมกราฟิกเล่าเรื่อง

**Architecture:** ใช้ versioned WorkspaceProject เป็นข้อมูลกลางของ media/scene/voice/pronunciation และแปลงข้อมูลเดิมโดยไม่เขียนทับต้นฉบับ แยกการเตรียมบท การสร้างเสียง และ timeline resolution ออกจาก UI; พรีวิวและ worker ใช้ resolved timeline เดียวกัน ต่อยอด TTS และ pronunciation เดิมผ่าน adapter โดยรักษาผู้ใช้เส้นทางเก่า

**Tech Stack:** Next.js/React เดิม, TypeScript/Zod, Tailwind 4 + daisyUI 5, Lucide, Remotion, FFmpeg/ffprobe, TTS adapters และ Python transcription เดิม

**Spec:** `docs/superpowers/specs/2026-10-14-unified-video-workspace-design.md`

สถานะ: แผนสำหรับตรวจทานตามคำขอ ยังไม่ได้เริ่ม implementation และแบบระบบยังรอการตรวจของผู้ใช้

## Global Constraints

- Next.js/React เดิม, Tailwind 4, daisyUI 5 รุ่นล่าสุดที่เข้ากันได้ ณ วันพัฒนา, Lucide; ใช้ semantic theme และรองรับไทย
- Dark mode เป็นหลัก; ตรวจ 390, 768, 1440 px; ไม่มี CSS ระบบใหม่ขนาดใหญ่
- คงงานเก่าและระบบบันทึก/กู้คืน; ห้ามเก็บ API key ในโปรเจกต์หรือ browser
- ตรวจและพัฒนาในแชตนี้เท่านั้น ไม่ใช้ subagent
- งานนี้วางแผนก่อน ยังไม่แก้โค้ดผลิตภัณฑ์
- ขีดจำกัด: 20 assets, ภาพ 20 MB/40 MP, วิดีโอ 200 MB/600 วินาที, 150 ฉาก, 300 วินาทีรวม, 30 fps, 1080×1920
- ก่อนพัฒนา snapshot งานที่ยังไม่ commit และตรวจ git diff; commit แต่ละ task เฉพาะไฟล์/ฮังก์งานนั้น ไม่รวมงานค้างอื่น

## Review Focus

1. ผลเสียงเก่ากลับมาหลังเปลี่ยนบท/เสียง ต้องไม่เขียนทับ revision ใหม่ — Task 4
2. งานเก่ามีเสียงรวม/ไฟล์หาย ต้องเปิดพร้อมคำอธิบาย ไม่ลบข้อมูล — Task 1, 7
3. แบรนด์ซ้อนกันและตัวพิมพ์ต่างกัน ต้องเปลี่ยนคำอ่านถูกส่วนและไม่เปลี่ยน display text — Task 3
4. เสียงยาวกว่าฟุตเทจ ต้องไม่ตัดเสียงทิ้งหรือ freeze โดยไม่แจ้ง — Task 5
5. เสียงหญิงล้มเหลว ต้องไม่ส่งกลับเสียงชายหรือเปลี่ยนแบรนด์เป็น “ตัวนี้” — Task 2, 4

## File structure / contracts

- `src/lib/workspace/types.ts`: Zod schema/types รวม WorkspaceProject, Scene, MediaAsset, VoiceSelection, NarrationArtifact, SpeechToken, ResolvedTimeline
- `src/lib/workspace/migrate.ts`: แปลง StudioProject และ ProductRecord เป็นสำเนา v2 พร้อม warnings
- `src/lib/workspace/voiceCatalog.ts`: รายการเสียงและ provider mapping ที่ตรวจสอบแล้ว
- `src/lib/workspace/script.ts`: ขอร่างฉาก/ปรับภาษาผู้พูดผ่าน generation adapters เดิม
- `src/lib/workspace/pronunciation.ts`: pure text matching/token mapping ไม่อ่าน filesystem
- `src/lib/workspace/narration.ts`: สร้างเสียง/ตรวจ hash/แปลงผลและ fallback policy ฝั่ง server
- `src/lib/workspace/timeline.ts`: resolve เวลาและวางเสียง/ซับ ไม่ผูก React
- `src/components/workspace/`: WorkspaceEditor, MediaLibrary, SceneList, SceneEditor, VoicePanel, PronunciationPanel, WorkspacePreview
- `src/app/api/workspace/{script,narration}/route.ts`: orchestration APIs ใหม่; studio media/projects/jobs ใช้ version dispatch
- `remotion/HybridProductVideo.tsx`: composition ใหม่ ใช้ 3 layouts ใน `remotion/hybrid/`
- `scripts/workspace-*.test.ts`: schema/migration, voice, script, speech, narration, timeline tests; `scripts/workspace-integration.ts`: API/render smoke

Types to define in Task 1 (all times in integer frames unless explicitly Sec):

```ts
type LanguageStyle = 'female-polite' | 'male-polite' | 'neutral';
type VoiceSelection = { voiceId: string; languageStyle: LanguageStyle; presetId: string; rate: string };
type VoiceDefinition = { id: string; provider: 'free' | 'gemini'; providerVoiceId: string; label: string; genderLabel: 'female' | 'male' | 'unspecified'; available: boolean };
type PronunciationEntry = { term: string; spoken: string };
type SpeechToken = { display: string; spoken: string; displayStart: number; displayEnd: number };
type PreparedSpeech = { displayText: string; textForSpeech: string; tokens: SpeechToken[]; reviewTerms: string[] };
type NarrationArtifact = { inputHash: string; url: string; durationFrames: number; captions: Array<{startFrame:number;endFrame:number;text:string}>; timingQuality:'word'|'phrase'; actualVoiceId:string };
type Scene = { id:string; assetId:string; inFrame:number; durationFrames:number; crop:'left'|'center'|'right'; layout:'footage-focus'|'product-callout'|'offer-close'; displayText:string; overlayText:string; audioMode:'original'|'narration'|'mix'; allowFreeze:boolean; narration?:NarrationArtifact };
// MediaAsset: discriminated union of image (dimensions) and video
// (dimensions, durationFrames, hasAudio, source captions); both id/name/url.
// WorkspaceProject: schemaVersion:2, id/name/revision, product:{name,price,highlights},
// assets:MediaAsset[], scenes:Scene[], voice:VoiceSelection,
// pronunciation:PronunciationEntry[], captionStyle:'clean'|'highlight'|'none',
// optional legacyAudio:{url,durationFrames,locked:true}.
// ResolvedTimeline: durationFrames + scenes with fromFrame/effectiveDurationFrames,
// captions at absolute frames, and blockers:string[]; retains project inputs.
```

## Task 1: Versioned project and migration

**Files:** Create types.ts, migrate.ts, `scripts/workspace-model.test.ts`; modify `src/app/api/studio/projects/route.ts`, `src/lib/studioServer.ts` to dispatch v1/v2 without changing legacy exports.

**Interfaces:** `parseWorkspace(input:unknown):WorkspaceProject`; `migrateStudio(p:StudioProject):{project:WorkspaceProject;warnings:string[]}`; `migrateProduct(p:ProductRecord):{project:WorkspaceProject;warnings:string[]}`. Preserve original IDs where possible; migration saves a new project ID. Existing readProject remains v1-compatible; add readWorkspace(id:string):Promise<WorkspaceProject>.

- [ ] Add failing tests: `migrateStudio_preserves_order_trim_caption`; `migrateProduct_retains_locked_full_audio`; `reject_bad_asset_reference_and_over_9000_frames`; `migration_does_not_mutate_source`. Assert sample v1 source in=1/out=4 becomes inFrame=30/durationFrames=90, locked audio URL unchanged, and source object deep-equals original.
- [ ] Run `npx tsx --test scripts/workspace-model.test.ts`; expect FAIL for missing implementation.
- [ ] Implement schema, union asset validation, migration and version-dispatched storage; missing files become warnings at open and blockers at render, not schema data loss. Unknown future versions return actionable error. Keep legacy source files untouched.
- [ ] Run test file; expect PASS, plus `npm run test:studio` passes all legacy tests.
- [ ] Review diff and commit `feat: add versioned unified workspace model`.

## Task 2: Clear voice selection and contextual language

**Files:** Create voiceCatalog.ts, script.ts, `src/app/api/workspace/script/route.ts`, `scripts/workspace-voice.test.ts`, `scripts/workspace-script.test.ts`; modify `src/lib/gemini.ts`, `src/lib/claude.ts`, `src/lib/tts.ts`.

**Interfaces:** `getVoice(id:string):VoiceDefinition`; `suggestScript(project:WorkspaceProject, mode:'draft'|'adapt-language'):Promise<{scenes:Scene[];warnings:string[]}>`. Extend ScriptGenerationParams with optional languageStyle; both generators and fallback consume it. New API accepts `{project,mode}` and returns proposal, never saves it automatically.

- [ ] Tests: voice metadata has unique IDs; mocked provider receives selected languageStyle; adaptation preserves product price and asset references; invalid model output is rejected. Female declarative/request fixtures require ค่ะ/คะ in their appropriate contexts; male fixture ครับ; neutral fixture no forced pronoun. Quoted text and brand fields remain unchanged. Use fixtures for deterministic tests and live sample review separately.
- [ ] Run `npx tsx --test scripts/workspace-voice.test.ts scripts/workspace-script.test.ts`; expect FAIL.
- [ ] Verify provider metadata against current official docs and audition samples; catalogue only verified voices, mark unknown as unspecified. Map existing Thai female/male voices explicitly. Implement schema-validated proposals with protected facts; do not globally replace Thai particles. Reject unsafe factual changes with retry/edit message.
- [ ] Remove silent gender-changing and “ตัวนี้” fallbacks from TTS path; retry original once then error. Preserve callers through adapter and expose actual voice ID to new narration layer. Use argument-array process invocation when touching existing shell-built TTS commands.
- [ ] Run tests; expect PASS. Manually listen to one female and one male output and review generated Thai request/declarative sentences.
- [ ] Commit `feat: unify voice identity and speaker language proposals`.

## Task 3: Editable pronunciation with display/speech separation

**Files:** Create pronunciation.ts, `scripts/workspace-speech.test.ts`; modify `src/lib/speechText.ts` to expose existing numeric normalization for reuse without global map side effects.

**Interfaces:** `prepareSpeech(displayText:string, entries:PronunciationEntry[], defaults:PronunciationEntry[]):PreparedSpeech`. Project entries override case-folded default keys; display offsets use JS string offsets. Resolve pronunciation matches first, longest-first in a single pass; numeric normalization applies to remaining tokens. No recursive replacements.

- [ ] Add assertions: prepareSpeech('dodolove', [{term:'dodolove',spoken:'ดูดูเลิฟ'}], []).textForSpeech === 'ดูดูเลิฟ'; displayText remains 'dodolove'; DODOLOVE maps identically; xdodolove is not replaced; longer phrase wins; overlapping Thai phrase uses longest explicit match; removing override restores default; tokens reconstruct original display text; price normalization remains tested.
- [ ] Run `npx tsx --test scripts/workspace-speech.test.ts`; expect FAIL.
- [ ] Implement pure matching, validation (nonempty entries, maximum 200 entries, term 100 chars/spoken 200 chars, conflicting normalized keys rejected) and review-term detection including brand names/units. Treat findings as suggestions, not proof of error. Keep global dictionary read-only by default in this flow.
- [ ] Run test; expect PASS. Review dodolove example in both prepared text and displayed text.
- [ ] Commit `feat: add project pronunciation overrides and speech tokens`.

## Task 4: Scene narration jobs and stale-result protection

**Files:** Create narration.ts, `src/app/api/workspace/narration/route.ts`, `scripts/workspace-narration.test.ts`; modify `src/lib/studioServer.ts`, `scripts/studio-worker.mjs`, `src/app/api/studio/jobs/route.ts`; extract reusable synthesis from `src/app/api/synthesize-voice/route.ts` without importing route handlers.

**Interfaces:** `narrationHash(scene:Scene,voice:VoiceSelection,speech:PreparedSpeech):string`; `synthesizeScene(scene:Scene,voice:VoiceSelection,speech:PreparedSpeech):Promise<NarrationArtifact>`; `canApplyNarration(currentHash:string,result:NarrationArtifact):boolean`. POST `{project,sceneIds}` → `{jobId,inputHashes}`; worker returns `{artifacts:[{sceneId,artifact}],errors:[{sceneId,message}]}` through existing polling. Serial queue; concurrency max 2 within synthesis.

- [ ] Tests with mocked TTS: changed pronunciation/voice/rate/preset changes hash; reordered scenes retain reusable audio; old result hash cannot apply; partial failure retains successful scenes; failed female call never invokes male; timeout reports retriable error; brand text remains intact in exact provider request.
- [ ] Run `npx tsx --test scripts/workspace-narration.test.ts`; expect FAIL.
- [ ] Implement cache keyed by provider, providerVoiceId, normalized spoken text, rate, effective style and normalization version; hash independently tracks display tokens for captions. Reuse provider timing if valid; otherwise obtain phrase times from existing transcription of generated audio and map to display tokens, falling back to one phrase for the scene with review warning. Do not claim word timing when alignment is uncertain.
- [ ] Apply results only when current scene hash matches; preserve edits while jobs run; mark all affected artifacts stale, disable export for stale narration, and allow per-scene retry. Persist status and recover after reload.
- [ ] Run mocked tests; expect PASS. Live audition “dodolove” in sentence must audibly read ดูดูเลิฟ; if provider fails, show failure and keep editable pronunciation rather than claim success.
- [ ] Commit `feat: generate revision-safe scene narration`.

## Task 5: Mixed media, timeline and hybrid rendering

**Files:** Create timeline.ts, `remotion/HybridProductVideo.tsx`, `remotion/hybrid/{FootageFocus,ProductCallout,OfferClose}.tsx`, `scripts/workspace-timeline.test.ts`; modify studio media/jobs routes, worker, `remotion/Root.tsx`.

**Interfaces:** `resolveTimeline(project:WorkspaceProject):ResolvedTimeline`; `workspaceSrt(timeline:ResolvedTimeline):string`. `HybridProductVideo` accepts `{timeline:ResolvedTimeline}`. Upload response asset is discriminated image/video; v1 video upload contract remains accepted by its adapter.

- [ ] Tests: mixed 2-image/2-video order survives; ceil(audioFrames+6) sets minimum scene length; insufficient footage without allowFreeze adds blocker; allowFreeze explicitly repeats final frame only; 9001 frames rejected; captions shifted after reorder use same integer offsets as render; display captions preserve dodolove; missing/stale audio blocks narration mode.
- [ ] Run `npx tsx --test scripts/workspace-timeline.test.ts`; expect FAIL.
- [ ] Extend media validation using actual decoding (Sharp image metadata/ffprobe video), image size and pixel limits; normalize orientation and strip image metadata; reject spoofed extensions/corrupt media. Never accept arbitrary filesystem URLs.
- [ ] Implement resolver and layouts. Render audioMode rules exactly, mix source -18 dB under narration; add original source captions only in original mode to avoid duplicate subtitles. Reuse resolved frames for Player, worker and SRT. Respect allowFreeze and warn before render when user choice is required.
- [ ] Run tests; expect PASS. Render a 4-scene mixed fixture and inspect scene boundaries, text safe zones, duration and audio with ffprobe plus visual/listening review.
- [ ] Commit `feat: render hybrid product scenes with one timeline`.

## Task 6: Unified editor, voice panel and pronunciation review

**Files:** Create components listed in file structure and `src/components/workspace/useWorkspace.ts`; modify `src/app/studio/page.tsx`; reuse existing voice/style controls through adapters instead of copying the 900-line storyboard component.

**Interfaces:** `WorkspaceEditor({initialProject:WorkspaceProject})`; child panels receive typed project slice and callbacks; `useWorkspace(initialProject)` owns project, selectedSceneId, undo/redo, dirty/save state and job recovery. Scene edits increment revision; derived full narration joins scene displayText.

- [ ] Create behavior tests for reducer: reorder retains stable selection; deleting selected scene picks next; undo restores deleted scene; pronunciation change invalidates only matching scene artifacts; switching voice marks affected narration stale; accepting language proposal is one undoable action.
- [ ] Run `npx tsx --test scripts/workspace-editor.test.ts`; expect FAIL.
- [ ] Implement daisyUI/Tailwind editor with labelled controls, upload/progress/errors, selectable scene thumbnails, drag handles plus move buttons, editable per-scene script, before/after language proposal, gender-labelled voice selection with preview and project pronunciation CRUD. “คำที่แสดง” and “คำอ่านสำหรับเสียง” must be visibly distinct. Single export CTA, explicit save state and no page-to-page transfer.
- [ ] Test reducer PASS; browser check at 390/768/1440 px for keyboard order, focus, no horizontal overflow, states and readable Thai. Verify all edits can be completed without leaving `/studio`.
- [ ] Commit `feat: unify storyboard media and narration editing`.

## Task 7: Entry points, legacy import and end-to-end acceptance

**Files:** Modify `src/app/page.tsx`, project route, `STUDIO.md`, `package.json`; create `scripts/workspace-integration.ts` and add `test:workspace` script for six workspace unit files plus editor tests.

**Interfaces:** `/studio?importProduct=<id>` opens an import preview fetched server-side by validated ID; save as new v2 project only after user chooses import. Existing studio project picker supports v1 conversion. Do not auto-redirect old unfinished drafts away from their editor.

- [ ] Integration assertions: upload 2 images + 2 videos; create/save/reload v2 preserving order, trims, voice and pronunciation; import v1 without changing source JSON; missing file returns warning and render blocker; mock stale narration result cannot re-enable export; render result metadata 1080×1920/30fps with SRT timestamps inside total duration.
- [ ] Run `npx tsx scripts/workspace-integration.ts` against local server using deterministic audio fixtures; expect initial missing-flow failure.
- [ ] Connect primary create action to unified editor, add legacy import preview, document migration/voice review/failure recovery and retain old project access. Do not delete legacy renderer until its saved projects are covered.
- [ ] Run `npm run test:workspace`, `npm run test:studio`, `npm run build`, and integration script; all must pass. Live TTS smoke is separate: require configured providers and report unavailable providers honestly, not as a passing test.
- [ ] Manually complete the spec acceptance workflow on actual product media and audition female/male, ค่ะ/คะ/ครับ, and ดูดูเลิฟ. Compare preview/export at same frame timestamps; confirm SRT shows dodolove. Save sample MP4 and screenshots for review.
- [ ] Commit `feat: make unified workspace the primary creation flow`.

## Delivery order and review

Tasks 1–4 establish data and reliable speech; Task 5 joins rendering; Task 6 exposes one-page workflow; Task 7 switches entry points only after parity. No public deployment in this plan. Auth/private storage/security upgrades remain a separate release prerequisite.

Self-review completed: all user requirements mapped to tasks; five Review Focus cases assigned; interfaces and integer-frame units shared; legacy data remains recoverable. Review this plan and linked design before implementation. Execution stays in this chat per the user's earlier preference.
