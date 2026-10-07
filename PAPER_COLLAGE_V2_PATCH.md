# 🛠️ PAPER COLLAGE — V2 PATCH
> ไฟล์นี้ **ต่อยอดจาก `PAPER_COLLAGE_ANIMATION.md`** (อ่านไฟล์นั้นก่อน แล้วค่อยทำตามไฟล์นี้)
> แก้ 2 ปัญหาที่พบจากผลลัพธ์จริง:
> **(A) ตัวหนังสืออ่านยาก**  **(B) ทุกคลิปหน้าตาเหมือนกันหมด แม้คนละสินค้า**

ของที่ "ใช้ได้ดีแล้ว" ให้เก็บไว้: ความน่ารักของ Polaroid + เทปกาว, พื้นหลังจุดฮาล์ฟโทน, แถบฉีกสีเหลือง, โทนสีมิ้นต์ — แต่ให้ย้ายไปเป็น **หนึ่งใน Style Pack** ไม่ใช่สไตล์เดียวของระบบ

---

# PART A — แก้ตัวหนังสืออ่านไม่ออก

## A1. ปัญหาที่ตรวจพบจากภาพตัวอย่าง (Root Causes)

| # | ปัญหา | สาเหตุ |
|---|---|---|
| 1 | หัวข้อบนแถบเหลืองตัวตัน อักษรเบียด รูในตัวอักษร (ก ๑ ธ ค) ตัน | ฟอนต์ display หนักเกิน + ตัวอักษรชิดกัน + อาจมี stroke ทับเข้าด้านใน |
| 2 | ซับไตเติลล่างตัวเล็ก มี stroke + เงา + พื้นไล่เฉด ทำให้เป็นก้อนเบลอ | ไม่มีพื้นรองทึบ, contrast ต่ำ, ตัวเล็กเกินสำหรับมือถือ |
| 3 | คำไฮไลต์ ("ตรงปก") พื้นเหลืองหม่นบนพื้นเขียวเข้ม แยกไม่ชัด | สีไฮไลต์โปร่งเกินไป |
| 4 | แคปชั่นใต้ Polaroid เล็กมากและถูกใบอื่นบัง | ไม่มี z-order / collision check |
| 5 | ป้าย "POINT 2/2" จิ๋ว | ต่ำกว่าขนาดขั้นต่ำ |
| 6 | **หัวข้อบนกับซับไตเติลล่างพูดข้อความเดียวกัน** | เสียพื้นที่ + ดูซ้ำซ้อน |

## A2. กฎ Readability (บังคับทุกคลิป)

### ขนาดตัวอักษรขั้นต่ำ (บนผืน 1080×1920)
| ประเภท | ขนาดขั้นต่ำ | หมายเหตุ |
|---|---|---|
| Headline (แถบหัวข้อ) | **88px** | สูงสุด 2 บรรทัด บรรทัดละ ≤ 14 ตัวอักษรไทย |
| ซับไตเติล / บรรยาย | **56px** | สูงสุด 2 บรรทัด บรรทัดละ ≤ 18 ตัวอักษร |
| แคปชั่นเล็ก (โพลารอยด์ ฯลฯ) | **44px** | ต้องไม่ถูกบัง ต้องไม่เอียงเกิน 3° |
| ป้ายแท็ก (POINT 1/3 ฯลฯ) | **40px** | หรือเลิกใช้ถ้าไม่จำเป็น |
| ราคา | **120px** | เด่นที่สุดในฉาก CTA |

### การเรนเดอร์ตัวอักษร
- ใช้ `paint-order: stroke fill` เสมอ เพื่อให้เส้น stroke **อยู่ด้านนอก** ไม่กินรูในตัวอักษร
  ```css
  -webkit-text-stroke: 0.07em #fff;   /* หรือ #1B1B1B */
  paint-order: stroke fill;
  ```
  ความหนา stroke **ไม่เกิน 0.08em** ของขนาดฟอนต์
- `letter-spacing: 0.01em` ถึง `0.03em` (ห้ามติดลบ), `line-height: 1.35` ขึ้นไป
- **ห้ามเอียง (skew), ห้ามบิดด้วย displacement filter กับตัวหนังสือ** — ใช้ filter ขอบฉีกเฉพาะ "แผ่นกระดาษพื้นหลังป้าย" ไม่ใช่ตัวอักษร (แยก layer: กระดาษมี filter / ข้อความอยู่ชั้นบนไม่มี filter)
- เอียงข้อความได้ไม่เกิน **±3°** (ตัวแผ่นกระดาษเอียงได้ ±6°)
- ตัวหนังสือ 1 ฉากใช้ **สูงสุด 2 ฟอนต์ + 2 สี**

### ฟอนต์ที่อนุญาต (Whitelist)
**ฟอนต์อ่านง่าย (ใช้เป็น Headline / Subtitle ได้):**
`Prompt` (700–800), `Kanit` (600–700 — **ห้ามใช้ 900**), `Noto Sans Thai` (800), `IBM Plex Sans Thai` (700), `Mitr` (500–600), `K2D` (700–800), `Krub` (700), `Bai Jamjuree` (700), `Athiti` (700)

**ฟอนต์ลายมือ / ตกแต่ง (ใช้ได้เฉพาะคำเน้น 1–3 คำ ขนาด ≥ 64px):**
`Mali` (600–700), `Itim`, `Sriracha`, `Pridi` (600)

**ฟอนต์ display หนักมาก (Chonburi ฯลฯ):** ใช้ได้เฉพาะสไตล์ Newspaper และต้อง ≥ 96px, ไม่ใส่ stroke

> ❌ **ห้ามใช้ Kanit 900 / ฟอนต์ที่รูอักษร (counter) ตัน** — ให้ agent ตรวจด้วยภาพ still ที่ย่อเหลือ 360px กว้าง

### Contrast
- Headline/ซับไตเติล ต้อง **contrast ratio ≥ 7:1** กับพื้นหลังที่ซ้อนอยู่ (คำนวณจากสีตัวหนังสือเทียบสีพื้นรอง)
- **ห้ามวางตัวหนังสือบนรูปหรือพื้นไล่เฉดโดยตรง** ต้องมี "แผ่นรอง" ทึบเสมอ: แถบกระดาษ / กล่องเข้ม opacity ≥ 0.85 / พื้นสีทึบ
- คำไฮไลต์: ใช้ **ปากกาเน้นสีสด ทึบ 100%** (เหลือง `#FFE14D`, ชมพู `#FF9ECF`, มิ้นต์ `#8DF0C8`) ตัวอักษรสีดำ `#1B1B1B`

### ซับไตเติลบรรยาย (Caption)
- ใช้ **แผ่นรองสีเข้มทึบ (`#1B1B1B` @ 0.88) มุมไม่โค้งเนียน (ขอบฉีกเล็กน้อย)** ตัวอักษรขาว ขนาด ≥ 56px
- ไฮไลต์ทีละคำตามเสียง (word-level highlight) ด้วยปากกาเน้นทึบ ไม่ใช่การเปลี่ยนพื้นหลังโปร่งๆ
- **หนึ่งข้อความ = หนึ่งที่เท่านั้น:** ห้ามให้ Headline กับ Caption ซ้ำเนื้อหากัน
  - Headline = **วลีสั้นเตะตา** (≤ 14 ตัวอักษร) เช่น "ดีไซน์ปัง!"
  - Caption = **ประโยคบรรยาย** ที่พูดจริง (ไม่ซ้ำกับ headline)
  - ถ้าไม่มีเสียงพากย์ ให้เลิกใช้ Caption ไปเลย

### Layout Collision (กันของบังกัน)
สร้าง util `remotion/lib/layoutGuard.ts`
- ทุก element ที่เป็นข้อความต้องประกาศ `zone` (กรอบสี่เหลี่ยม) และ **ห้ามซ้อนทับกับ zone ข้อความอื่น หรือกับ cutout ที่ z-index สูงกว่า**
- Polaroid/การ์ดภาพที่มีแคปชั่น: **ใบที่มีแคปชั่นต้องอยู่หน้าสุดเสมอ** หรือให้แคปชั่นอยู่นอกการ์ด
- ถ้าตรวจพบซ้อน ให้ผลักตำแหน่งอัตโนมัติ (ลดขนาดภาพ/ขยับ) แล้ว log warning

## A3. ขั้นตอนตรวจ Readability (Agent ต้องรันเอง)

1. เรนเดอร์ภาพนิ่งทุกซีน (`npx remotion still ...`)
2. ย่อภาพเหลือ **360×640** (เท่าจอมือถือเล็ก)
   ```bash
   convert out/feature2.png -resize 360x640 out/feature2_small.png
   ```
3. ลอง OCR ภาษาไทย (ตรวจว่าเครื่องอ่านออกหรือไม่ ถือเป็นตัวแทนความชัด):
   ```bash
   tesseract out/feature2_small.png - -l tha --psm 6
   ```
   ถ้า OCR ได้ข้อความตรงกับที่ตั้งใจ ≥ 80% ถือว่าผ่านเบื้องต้น (ถ้าไม่มี tesseract ให้ข้าม แล้วตรวจด้วยตา — **ดูภาพที่ย่อแล้วจริงๆ ด้วยตัวเองและบอกว่าอ่านออกหรือไม่**)
4. ตรวจขนาดฟอนต์ขั้นต่ำและ contrast ด้วยสคริปต์ `scripts/check-text.mjs` (อ่านค่า props ของ StickerText/Caption ทุกตัวแล้วเทียบตาราง A2) ถ้าไม่ผ่าน ให้ **build fail**

---

# PART B — ทำให้แต่ละคลิป "หน้าตาไม่ซ้ำกัน"

## B1. หลักคิด
ตอนนี้ระบบมี **สไตล์เดียว** ที่เปลี่ยนแค่ข้อความ/รูป ต้องเปลี่ยนเป็น:

> **1 สินค้า = 1 "Style DNA"** ที่ถูกสุ่มอย่างมีเงื่อนไข จากคลังที่ใหญ่พอ (Style Pack × Palette × Font × Layout × Transition × Hook × โครงเรื่อง × จังหวะ)
> และระบบ **จำประวัติ** ว่า 10–20 คลิปล่าสุดใช้อะไรไปแล้ว เพื่อไม่ให้ซ้ำ

และเพื่อให้ช่องยังจำได้: มี **Channel Signature** คงที่ 1 อย่าง (เช่นสติกเกอร์ชื่อช่อง/โลโก้เล็ก มุมเดิม ทุกคลิป) — สไตล์เปลี่ยนได้ แต่ลายเซ็นต้องคงที่

## B2. คลัง Style Pack (ต้องมีอย่างน้อย 8 แพ็ก)

แต่ละแพ็ก = ไดเรกทอรี `remotion/packs/<pack-id>/` ที่ export `PackDefinition` เดียวกัน (พื้นหลัง, ของตกแต่ง, รูปทรงสติกเกอร์, ทรานซิชัน, จังหวะ stop-motion, ชุดเลย์เอาต์)

| Pack ID | คอนเซ็ปต์ | จุดเด่นที่ต้องต่างจากแพ็กอื่นชัดเจน | จังหวะ |
|---|---|---|---|
| `kraft-scrapbook` | **(ของเดิมที่ชอบ)** กระดาษคราฟต์ โพลารอยด์ เทปกาว | โทนอุ่น ภาพแปะเอียง | กลาง |
| `notebook-doodle` | หน้าสมุดกริด ปากกาเน้น วาดมือ | เส้นวาดค่อยๆ ขีดขึ้น, วงกลมเน้น, ลูกศรโดเดิล | กลาง |
| `zine-newspaper` | หนังสือพิมพ์/ซีน ขาวดำ + สีเดียว | ตัวอักษรตัดแปะ (ransom note), ฮาล์ฟโทนหยาบ, พาดหัวข่าว | เร็ว |
| `sticker-bomb` | สติกเกอร์ระเบิดสีสด Memphis | รูปทรงเรขาคณิต ขอบหนาดำ, ของลอยทั่วจอ | เร็วมาก |
| `pinboard-corkboard` | บอร์ดไม้ก๊อก หมุด เชือกแดงโยงสู่สินค้า | ภาพปักหมุดแล้วเชือกโยง, โน้ตกระดาษเหลือง | ช้า-กลาง |
| `comic-popart` | การ์ตูนป๊อปอาร์ต | กรอบแพเนล, บอลลูนคำพูด, "BAM/ปัง!", จุดฮาล์ฟโทนใหญ่ | เร็ว |
| `supermarket-flyer` | ใบปลิวห้าง/ป้ายราคาตลาด | ป้ายราคาตัวแดงใหญ่ ดาวระเบิด เหลือง-แดง | เร็ว |
| `soft-kawaii` | พาสเทลน่ารัก เมฆ ดาว หัวใจ | วงกลมนุ่ม ขอบเมฆ คำศัพท์น่ารัก | ช้า-กลาง |
| `journal-washi` (เพิ่มได้) | แพลนเนอร์/สมุดไดอารี่ เทปวาชิลายต่างๆ | ตารางเวลา สติกเกอร์ไดอารี่ | กลาง |

> ทุกแพ็ก **ต้องคงกฎ Part A (readability)** และสไตล์ Paper Collage/Stop-Motion จากไฟล์แรก (ความรู้สึกตัดแปะ) แต่ต่างกันที่ "โลก" ที่ใช้เล่าเรื่อง

## B3. แกนความหลากหลาย (Variation Axes)

ทุกคลิปต้องถูกกำหนดค่าครบทุกแกนนี้ (เก็บเป็น `styleDNA` ใน storyboard):

| แกน | จำนวนตัวเลือกขั้นต่ำ | หมายเหตุ |
|---|---|---|
| `pack` | 8 | ตาม B2 |
| `palette` | 12 | ดู B4 |
| `fontPair` | 6 | จับคู่ Headline + Accent จาก Whitelist |
| `structure` | 6 | โครงเรื่อง ดู B5 |
| `hookFormula` | 8 | สูตร Hook ดู B6 |
| `layouts[]` | 8 ต่อแพ็ก | ลำดับเลย์เอาต์ไม่ซ้ำติดกัน |
| `transitions[]` | 6 | slap-strip, torn-wipe, page-shuffle, tape-peel, sticker-pop, fold-flip ฯลฯ |
| `tempo` | 3 | `chill` (hold 4f) / `snappy` (hold 3f) / `hyper` (hold 2f) |
| `stickerShape` | 5 | ดาวระเบิด, เมฆ, ป้ายห้อย, วงกลมขอบหยัก, สี่เหลี่ยมฉีก |
| `sfxKit` | 3 | ชุดเสียงต่างกัน |

```ts
// remotion/types.ts
export interface StyleDNA {
  seed: number;
  pack: PackId;
  palette: PaletteId;
  fontPair: FontPairId;
  structure: StructureId;
  hookFormula: HookFormulaId;
  layouts: SceneLayout[];
  transitions: TransitionType[];
  tempo: 'chill' | 'snappy' | 'hyper';
  stickerShape: StickerShape;
  sfxKit: SfxKitId;
}
// เก็บ styleDNA ไว้ใน products.json ด้วย เพื่อให้ Preview และ Render ได้ผลเหมือนกันเสมอ
```

## B4. Palette: สร้างจากสีของสินค้า (ไม่ใช้พาเลตเดิมตายตัว)

ภาพตัวอย่างที่ผ่านมา สินค้าเป็นแก้วสีแดง/เขียว แต่พื้นหลังเป็นมิ้นต์ทุกครั้ง ให้เปลี่ยนเป็น:

1. ตอนอัปโหลด **ดึงสีเด่นจากภาพสินค้า** (ใช้ `sharp` + `node-vibrant` หรืออัลกอริทึม k-means เอง) เก็บ `dominantColors[]` ลง products.json
2. ฟังก์ชัน `derivePalette(dominant, pack, rng)` เลือกกลยุทธ์สีแบบสุ่ม:
   - **Complementary** (สีตรงข้าม — สินค้าแดง → พื้นมิ้นต์/เขียวน้ำทะเล)
   - **Analogous** (สีใกล้เคียง)
   - **Triadic** (3 สีกระจาย)
   - **Mono + Accent** (โทนเดียว + สีเน้น 1 สี)
3. ล็อกให้สีตัวอักษร/แผ่นรองผ่านกฎ contrast (Part A) เสมอ ถ้าไม่ผ่านให้ปรับความสว่างอัตโนมัติ
4. มี **Shopee Orange `#EE4D2D`** เป็นสีบังคับเฉพาะฉาก CTA (ตะกร้า) ที่เหลือเปลี่ยนได้

## B5. โครงเรื่องไม่ซ้ำ (Structure)

เลิกใช้ "Hook → จุดเด่น 2 ข้อ → CTA" ตายตัว สลับเป็น:

| Structure | ลำดับ |
|---|---|
| `listicle` | "3 เหตุผลที่ต้องมี" → เหตุผล 1/2/3 → CTA |
| `problem-solution` | ปัญหา (เล่าให้เห็นภาพ) → สินค้าเข้ามาแก้ → ผลลัพธ์ → CTA |
| `price-first` | เปิดด้วยราคา/โปร → ทำไมคุ้ม → CTA |
| `unboxing-vibe` | เปิดกล่อง/เผยสินค้า → ดูใกล้ๆ → ใช้งาน → CTA |
| `pov-story` | "POV: ..." เล่าสถานการณ์สั้นๆ → สินค้า → CTA |
| `compare` | "ธรรมดา vs ตัวนี้" (เปรียบเทียบอย่างสุจริต ไม่ใส่ร้ายยี่ห้ออื่น) → CTA |

ความยาวรวมอยู่ที่ **12–18 วินาที** แปรผันได้ (ไม่ต้อง 15 เป๊ะทุกคลิป) — `Root.tsx` ต้องคำนวณ `durationInFrames` จาก storyboard

## B6. สูตร Hook (ไม่ซ้ำกัน)

`question` ("ใครยังใช้แบบเดิมอยู่?"), `pov`, `price-shock`, `listicle-number`, `secret/ของดีที่ไม่มีใครบอก`, `relatable-pain`, `seasonal` (ร้อน/ฝน/เปิดเทอม), `reaction` ("ไม่คิดว่าจะดีขนาดนี้")
> เนื้อหาต้องไม่เกินจริง ไม่อ้างสรรพคุณทางการแพทย์ ไม่ใส่ร้ายคู่แข่ง และเป็นไปตามนโยบาย Shopee Affiliate

## B7. ตัวเลือกสไตล์แบบมีเงื่อนไข (Anti-Repetition Engine)

สร้าง `src/lib/styleDirector.ts` (ฝั่ง Server เท่านั้น — ใช้ `Math.random` ได้ที่นี่ แต่ผลลัพธ์ต้องเก็บ seed ไว้)

### กฎการเลือก
1. **ห้ามซ้ำใน window 10 คลิปล่าสุด** สำหรับแกน `pack`, `palette`, `structure`, `hookFormula`
2. ใน **batch เดียวกัน (เช่น 10 คลิป/วัน)**: `pack` ต้อง **ไม่ซ้ำกันเลย** (8–10 แพ็ก = ใช้ครบ) และสองคลิปติดกัน ต้องต่างกัน **อย่างน้อย 6 จาก 10 แกน**
3. ถ้าผู้ใช้ล็อกสไตล์เอง (เลือกแพ็กจาก UI) ให้เคารพ แต่ยังสุ่มแกนอื่นให้ต่างกัน
4. บันทึกประวัติลง `data/style-history.json` (เก็บ 200 รายการล่าสุด)

```ts
type HistoryItem = { productId: string; createdAt: string; dna: StyleDNA };

function pickAvoiding<T>(pool: T[], recent: T[], rng: () => number): T {
  const fresh = pool.filter((p) => !recent.includes(p));
  const list = fresh.length ? fresh : pool;           // ถ้าหมดตัวเลือก ค่อยยอมซ้ำ
  return list[Math.floor(rng() * list.length)];
}

export function pickStyleDNA(opts: {
  productId: string;
  batchIndex: number;           // ลำดับในวันนี้ 0..N
  history: HistoryItem[];
  dominantColors: string[];
  lockedPack?: PackId;
  seed?: number;                // ส่ง seed มาเพื่อ "เรนเดอร์สไตล์เดิมซ้ำ"
}): StyleDNA {
  const seed = opts.seed ?? hash(`${opts.productId}|${Date.now()}|${opts.batchIndex}`);
  const rng = mulberry32(seed);
  const recent = opts.history.slice(-10).map((h) => h.dna);
  const todays = opts.history.filter((h) => isToday(h.createdAt)).map((h) => h.dna);

  const pack = opts.lockedPack ?? pickAvoiding(ALL_PACKS, todays.map((d) => d.pack).concat(recent.slice(-3).map((d) => d.pack)), rng);
  const palette = derivePalette(opts.dominantColors, pack, recent.map((d) => d.palette), rng);
  const structure = pickAvoiding(ALL_STRUCTURES, recent.map((d) => d.structure), rng);
  const hookFormula = pickAvoiding(ALL_HOOKS, recent.map((d) => d.hookFormula), rng);
  // ... fontPair, tempo, stickerShape, sfxKit, layouts[], transitions[] เลือกในลักษณะเดียวกัน

  const dna = { seed, pack, palette, structure, hookFormula /* ... */ } as StyleDNA;

  // ตรวจความต่างกับคลิปก่อนหน้า ถ้าต่างน้อยกว่า 6 แกน ให้สุ่มใหม่ (ลองได้สูงสุด 20 ครั้ง)
  return ensureDifferent(dna, opts.history.slice(-1)[0]?.dna, 6, rng);
}
```
> `mulberry32` / `hash` เป็นฟังก์ชัน seeded RNG ธรรมดา เขียนเองในไฟล์ได้

### ข้อควรระวัง
- **ใน Remotion composition ห้ามสุ่มเอง** — ใช้ค่าจาก `styleDNA` ที่เก็บไว้ + `random(seed)` ของ Remotion เท่านั้น เพื่อให้ Preview = Render
- ถ้า storyboard เก่าไม่มี `styleDNA` → เติมให้ด้วย `pack: 'kraft-scrapbook'` + ค่า default (ห้าม crash)

## B8. Gemini = "ผู้กำกับความคิดสร้างสรรค์" ไม่ใช่ผู้เลือกสไตล์

- **โค้ดเป็นคนเลือก `styleDNA`** (B7) แล้วส่งให้ Gemini เป็นข้อกำหนด: "ใช้ pack นี้ สูตร Hook นี้ โครงเรื่องนี้ โทนนี้"
- Gemini ทำหน้าที่เขียน **เนื้อหา** (headline, caption, sticker text) ให้เข้ากับสไตล์ เช่น `comic-popart` ใช้คำอุทาน "ปัง!", `zine-newspaper` ใช้พาดหัวข่าวสั้นๆ
- ส่งรายการ headline ของ **5 คลิปล่าสุด** ไปด้วย พร้อมคำสั่ง "ห้ามใช้ถ้อยคำ/โครงประโยคซ้ำกับรายการนี้"
- ใส่ `temperature` สูงขึ้นเล็กน้อย (0.9–1.0) สำหรับ headline
- ยังต้องมี **Fallback Generator** (ไม่มี API Key) ที่ใช้ `styleDNA` ด้วย โดยมีคลังประโยคแยกตามแพ็ก/สูตร Hook อย่างละ ≥ 5 แบบ

## B9. UI Dashboard (`ProductForm.tsx`, `ScriptStoryboard.tsx`)

- เพิ่มตัวเลือก **"สไตล์วิดีโอ": `สุ่มให้ (แนะนำ)` | เลือกเอง (แสดงการ์ดตัวอย่างแต่ละแพ็ก)`**
- ปุ่ม **"🎲 สุ่มสไตล์ใหม่"** ใน Step 2 — เปลี่ยน styleDNA แล้ว preview ใหม่ทันที โดยไม่ต้องสร้างสคริปต์ใหม่ทั้งหมด
- แสดง **Style chips** (แพ็ก / พาเลต / โครงเรื่อง / Hook) ให้ผู้ใช้เห็นและล็อกแต่ละแกนได้
- **โหมด Batch:** ใส่หลายสินค้าในคิว (สูงสุด 10) → ระบบแจกสไตล์แบบไม่ซ้ำในรอบเดียวกัน → เรนเดอร์ทีละคลิปในคิว

## B10. ตรวจความหลากหลาย (Agent ต้องทำ)

1. เขียน `scripts/variety-test.mjs`: จำลองสร้าง **10 สินค้า** (ใช้ข้อมูลจำลอง ไม่ต้องเรียก API จริง) แล้วพิมพ์ตาราง
   ```
   #  pack               palette      structure         hook          tempo   fontPair
   1  kraft-scrapbook    mint-coral   listicle          question      snappy  prompt+mali
   2  zine-newspaper     ...
   ```
   พร้อมคำนวณ **"ความต่างระหว่างคู่ติดกัน"** ต้อง ≥ 6/10 แกน และ **pack ไม่ซ้ำภายในชุด**
2. เรนเดอร์ภาพนิ่ง 3 เฟรม (Hook / Feature / CTA) ของแต่ละคลิป แล้วรวมเป็น **Contact Sheet** ภาพเดียว (10 แถว × 3 คอลัมน์ด้วย `montage` ของ ImageMagick หรือ `sharp`) บันทึกที่ `out/contact-sheet.png`
3. **ดู Contact Sheet ด้วยตัวเอง** แล้วตอบตามจริงว่า "แต่ละคลิปแยกออกจากกันได้ในพริบตาหรือไม่" ถ้ามี 2 คลิปที่ดูคล้ายกันเกินไป ให้ปรับแพ็ก/พาเลตแล้วทำใหม่
4. ทดสอบด้วยสินค้าสีต่างๆ (แดง / ขาว / ดำ / เขียว / หลายสี) ว่า `derivePalette` ให้ผลอ่านง่ายทุกกรณี

---

# PART C — แผนงานสำหรับ Agent (ลำดับทำ)

1. **ทำ Part A ก่อน** (เพราะแก้เร็วและกระทบทุกแพ็ก): แก้ `StickerText`, `TornStrip`, Caption, ฟอนต์, layoutGuard, `scripts/check-text.mjs`
2. รีแฟกเตอร์สไตล์ปัจจุบันให้เป็น Pack แรก `kraft-scrapbook` (โครง `PackDefinition`) โดยหน้าตาต้องคงเดิมแต่ตัวหนังสือชัดขึ้น
3. สร้าง `StyleDNA`, `styleDirector.ts`, `data/style-history.json`
4. ทำ Pack เพิ่มทีละตัว ตามลำดับ: `notebook-doodle` → `sticker-bomb` → `zine-newspaper` → `comic-popart` → `supermarket-flyer` → `pinboard-corkboard` → `soft-kawaii` (ทำแต่ละตัวเสร็จ ให้เรนเดอร์ still ตรวจ Part A ก่อนไปตัวถัดไป)
5. ทำ `derivePalette` + การดึงสีเด่นจากภาพสินค้า
6. ทำ Structure และ Hook Formula ใหม่ + อัปเดต prompt/Fallback ของ Gemini (B8)
7. อัปเดต UI (B9)
8. รัน `variety-test` + Contact Sheet (B10) และ readability check (A3)
9. รายงานผล: ไฟล์ที่เปลี่ยน, ภาพ Contact Sheet, ปัญหาคงค้าง, เวลา render ต่อคลิปเฉลี่ย

## ✅ Acceptance Checklist (V2)

**Readability**
- [ ] ย่อภาพเหลือ 360px กว้างแล้ว **อ่านทุกข้อความออก** (Headline, Caption, แคปชั่น, ราคา)
- [ ] ไม่มีข้อความซ้ำกันภายในฉากเดียว (Headline ≠ Caption)
- [ ] ไม่มีข้อความถูกของอื่นบัง / ไม่หลุด Safe Zone
- [ ] ไม่มีตัวหนังสือที่ใช้ filter บิดขอบ, ไม่มี Kanit 900
- [ ] `scripts/check-text.mjs` ผ่าน

**Variety**
- [ ] สร้าง 10 คลิปในวันเดียว → **ใช้ pack ไม่ซ้ำกัน** และคู่ติดกันต่างกัน ≥ 6/10 แกน
- [ ] สีพื้นหลังสัมพันธ์กับสีสินค้า (ไม่ใช่มิ้นต์ทุกคลิป)
- [ ] Hook และโครงเรื่องไม่ซ้ำกันในช่วง 10 คลิปล่าสุด
- [ ] ยังมี Channel Signature คงที่ในทุกคลิป
- [ ] เรนเดอร์ซ้ำด้วย seed เดิมได้ผลเหมือนเดิมทุกเฟรม
- [ ] Storyboard เก่าใน products.json ยังเปิดได้ (backward compatible)
- [ ] Contact Sheet ถูกสร้างและแนบในรายงาน

---

## หมายเหตุ
- ถ้าเวลา render ต่อคลิปนานเกิน (เพราะ SVG filter + หลายแพ็ก) ให้ cache texture กระดาษเป็น PNG สำเร็จรูป และเปลี่ยน filter seed เฉพาะตามจังหวะ stop-motion เท่านั้น
- ถ้าตัวเลือกใดทำไม่ได้หรือขัดกัน ให้เลือกทางที่ **อ่านง่ายก่อน สวยทีหลัง** และอธิบายเหตุผลในรายงาน
