# 🎬 PAPER COLLAGE ANIMATION — Agent Instruction
> คำสั่งสำหรับ AI Agent (Antigravity) ให้รีแฟกเตอร์ Remotion Engine ของโปรเจกต์ Shopee Affiliate Video
> จากแอนิเมชันแบบ CSS เรียบๆ (fade / slide / zoom) → **สไตล์ Paper Collage + Stop-Motion** แบบคลิปป้ายยาที่นิยมบน TikTok / Reels / Shopee Video

---

## 0. บทบาทและเป้าหมาย

คุณคือ **Senior Motion Designer + Remotion Engineer**
งานของคุณคือแก้ไขโฟลเดอร์ `remotion/` ให้วิดีโอที่เรนเดอร์ออกมามีลักษณะเหมือน **"ตัดกระดาษแปะบนโต๊ะแล้วถ่ายสต็อปโมชัน"** ไม่ใช่ animation ลื่นๆ แบบเว็บไซต์

**ห้ามแตะ** (เว้นแต่จำเป็นจริงๆ และต้องแจ้งเหตุผล):
- `src/app/api/*` และ `src/lib/storage.ts`
- โครงสร้าง Next.js Dashboard 4 ขั้นตอน
- ขนาด Composition: **1080x1920 @ 30fps, 15 วินาที (450 frames)**

**สิ่งที่ต้องทำ:**
1. สร้างระบบ Paper Collage (texture, cutout, sticker outline, tape, torn paper)
2. สร้างระบบ Stop-Motion Timing (ขยับเป็นจังหวะ 8–12 fps ไม่ลื่นเกินไป)
3. เขียน Scene ใหม่ทั้ง Hook / Feature / CTA
4. ขยาย schema ของ storyboard + อัปเดต prompt ของ Gemini ให้ออกแบบ collage ได้
5. ตรวจคุณภาพด้วยการเรนเดอร์ภาพนิ่งและวิดีโอจริง ก่อนรายงานว่าเสร็จ

---

## 1. Visual Language (ภาษาภาพ)

### 1.1 องค์ประกอบหลักที่ต้องมีในทุกฉาก
| องค์ประกอบ | รายละเอียด |
|---|---|
| **พื้นหลังกระดาษ** | กระดาษคราฟต์ / กระดาษสีพาสเทล / สมุดกริด สลับตามซีน + overlay เกรนกระดาษ (opacity 0.08–0.15) |
| **Cutout สินค้า** | ภาพสินค้าตัดขอบ มี **ขอบสติกเกอร์สีขาวหนา 8–14px** + เงาแข็ง (hard shadow) offset 6–10px |
| **ขอบฉีก (Torn edge)** | แถบกระดาษ/ป้ายข้อความขอบไม่เรียบ ไม่ใช่สี่เหลี่ยมมนสะอาดๆ |
| **เทปกาว (Washi tape)** | แปะมุมรูป/ป้าย เอียง -8° ถึง 8° โปร่งแสงเล็กน้อย |
| **ลายมือ / Doodle** | ลูกศร, วงกลมเน้น, ขีดเส้นใต้, ดาว, ประกายแสง วาดแบบ hand-drawn (SVG stroke ไม่เรียบ) |
| **ฮาล์ฟโทน / จุดสกรีน** | ใช้เป็นพื้นหลังรอง หรือเงาเฉพาะจุด |
| **สติกเกอร์ / แสตมป์** | "ลดแรง", "ส่งฟรี", "ของมันต้องมี" ฯลฯ หมุนเอียงเล็กน้อย |

### 1.2 Color Palette (ค่าเริ่มต้น ปรับตาม tone ที่ผู้ใช้เลือก)
```ts
export const PALETTE = {
  shopeeOrange: '#EE4D2D',
  sunnyYellow: '#FFD23F',
  cream: '#FFF4E0',
  kraft: '#D9B382',
  ink: '#1B1B1B',
  mint: '#7ED9B7',
  pink: '#FF8FB1',
  sky: '#8EC9FF',
  white: '#FFFFFF',
};
```
- ใช้สีสด **3 สีต่อคลิป** + ครีม/ดำ/ขาวเป็นสีกลาง
- ตัวหนังสือหลัก: **ดำ (#1B1B1B) บนพื้นเหลือง/ขาว/ครีม** หรือ **ขาวบนส้ม** เท่านั้น เพื่อ contrast สูง
- แมปกับ tone: `ตื่นเต้น` → ส้ม+เหลือง+ชมพู / `มินิมอล` → ครีม+คราฟต์+ดำ / `แก้ปัญหา` → ฟ้า+เหลือง+ขาว / `จัดโปร` → แดงส้ม+เหลือง+ดำ

### 1.3 Typography (ฟอนต์ไทย)
ใช้ `@remotion/google-fonts` โหลดแบบ subset `thai` + `latin`:
- **หัวข้อ/ราคา:** `Kanit` (700–900) หรือ `Prompt` (800)
- **ลายมือ/คำเน้น:** `Mali` (700) หรือ `Itim` หรือ `Sriracha`
- **ห้ามใช้ฟอนต์ระบบ** เพราะเรนเดอร์ใน headless Chromium อาจไม่ตรงกัน
- ข้อความไทยต้องใช้ `line-height >= 1.3` และเว้น padding บน/ล่างอย่างน้อย 0.2em ป้องกันสระ/วรรณยุกต์โดนตัดเมื่อใส่ filter
- ทุกข้อความต้องมี **stroke ขาว/ดำ** (`-webkit-text-stroke` หรือ `paint-order: stroke fill`) แบบสติกเกอร์ ห้ามวางตัวหนังสือเปลือยบนรูป

---

## 2. Motion Language (ภาษาการเคลื่อนไหว) ⭐ สำคัญที่สุด

หัวใจของ Paper Collage คือ **"ความไม่ลื่น"** อย่างตั้งใจ

### 2.1 กฎเหล็ก
1. **Stop-motion timing:** องค์ประกอบกระดาษขยับเป็นขั้นบันได **12 fps (ทุก 2.5 เฟรมจาก 30fps → ใช้ hold 2–3 เฟรม)** ไม่ใช่ทุกเฟรม
2. **Boil / Jitter:** ขณะอยู่นิ่ง ให้สั่นเบาๆ ทุกครั้งที่ขยับขั้น (rotate ±1.2°, translate ±3px, scale ±1%) และเปลี่ยน `seed` ของ filter ขอบฉีกทุกขั้น ให้ขอบ "เดือด" เหมือนวาดมือ
3. **Pop-in แบบ overshoot:** ของเข้าฉากด้วย scale 0 → 1.12 → 1.0 (spring หนักๆ, damping ต่ำ) ห้ามใช้ fade-in ล้วน
4. **Cut transition:** เปลี่ยนซีนด้วยการ **ปาดกระดาษ / ฉีกกระดาษ / พลิกหน้า / สแลปแถบกระดาษทับ** ห้ามใช้ cross-fade
5. **Layer parallax แบบกระดาษ:** แต่ละชั้นขยับด้วยความเร็วต่างกัน มีเงาตกบนชั้นล่างเสมอ
6. **ห้าม** ease ลื่นยาวๆ, ห้ามซูมเนียนแบบ Ken Burns เดิม (แทนที่ด้วย "ดันกระดาษเข้า" เป็นขั้นๆ)
7. จังหวะ **ตัดเร็ว:** ทุก 0.8–1.5 วินาทีต้องมีอะไรเปลี่ยน (ภาพ, ข้อความ, สติกเกอร์) ห้ามนิ่งเกิน 1.5 วินาที

### 2.2 Helper: Stop-Motion Clock
สร้างไฟล์ `remotion/lib/stopMotion.ts`
```ts
import { useCurrentFrame, random } from 'remotion';

/** คืนค่าเฟรมที่ถูก "ค้าง" ให้เป็นขั้นบันได เช่น 30fps -> ~12fps (hold = 2 หรือ 3) */
export const useStepFrame = (hold = 3) => {
  const frame = useCurrentFrame();
  return Math.floor(frame / hold) * hold;
};

/** ค่าสั่นแบบ deterministic ต่อขั้น (เรนเดอร์ซ้ำได้ผลเดิมเสมอ) */
export const useBoil = (seedKey: string, hold = 3, amp = { rot: 1.2, pos: 3, scale: 0.01 }) => {
  const step = useStepFrame(hold) / hold;
  const r = (n: string) => random(`${seedKey}-${n}-${step}`) * 2 - 1;
  return {
    rotate: r('r') * amp.rot,
    x: r('x') * amp.pos,
    y: r('y') * amp.pos,
    scale: 1 + r('s') * amp.scale,
    seed: Math.floor(random(`${seedKey}-seed-${step}`) * 100),
  };
};
```
> ต้องใช้ `random()` ของ Remotion เท่านั้น **ห้ามใช้ `Math.random()`** เพราะ render แบบ multi-thread จะไม่ตรงกัน

### 2.3 Helper: Spring Pop
```ts
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const usePop = (delay = 0, damping = 9) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 180, mass: 0.7 } });
};
```

---

## 3. Paper Components ที่ต้องสร้าง (`remotion/paper/`)

### 3.1 `PaperFilters.tsx` — SVG Filters ใช้ร่วมทั้งคลิป
วาง `<PaperFilters />` ครั้งเดียวที่ root ของ `ShopeeProductVideo.tsx`
```tsx
export const PaperFilters: React.FC<{ seed: number }> = ({ seed }) => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      {/* ขอบฉีก/ขอบตัดมือ */}
      <filter id="torn" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed={seed} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="14" />
      </filter>

      {/* ขอบสติกเกอร์สีขาว + เงาแข็ง */}
      <filter id="sticker" x="-20%" y="-20%" width="140%" height="140%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="10" result="dilated" />
        <feFlood floodColor="#fff" result="white" />
        <feComposite in="white" in2="dilated" operator="in" result="outline" />
        <feOffset in="dilated" dx="8" dy="10" result="shadowShape" />
        <feFlood floodColor="#000" floodOpacity="0.28" result="shadowColor" />
        <feComposite in="shadowColor" in2="shadowShape" operator="in" result="shadow" />
        <feMerge>
          <feMergeNode in="shadow" />
          <feMergeNode in="outline" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* เกรนกระดาษ */}
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed={seed} />
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" />
      </filter>
    </defs>
  </svg>
);
```
- `seed` ส่งมาจาก `useBoil().seed` เพื่อให้ขอบเดือด
- **Performance:** SVG filter หนัก ให้เปลี่ยน seed ได้แค่ตามจังหวะ stop-motion (ทุก 3 เฟรม) ไม่ใช่ทุกเฟรม และอย่าซ้อน filter เกิน 2 ชั้นต่อ element

### 3.2 รายการ Component

| ไฟล์ | หน้าที่ |
|---|---|
| `PaperBackground.tsx` | พื้นหลัง (kraft / grid / halftone / solid) + grain overlay + ขอบกระดาษฉีกด้านบน/ล่าง |
| `CutoutImage.tsx` | ภาพสินค้าแบบตัดแปะ: sticker outline + hard shadow + boil + pop-in |
| `TornStrip.tsx` | แถบกระดาษฉีกใส่ข้อความ (เหลือง/ส้ม/ขาว) เอียงเล็กน้อย |
| `WashiTape.tsx` | เทปกาวลายทาง/ลายจุด แปะมุม |
| `StickerText.tsx` | ข้อความหนา + stroke + เงาแข็ง สไตล์สติกเกอร์ มีคำหลักไฮไลต์ด้วยปากกาเน้น |
| `Doodle.tsx` | ลูกศร, วงกลมเน้น, ขีดเส้นใต้, ดาว, ประกายแสง วาดด้วย `stroke-dashoffset` แบบ step |
| `PriceBurst.tsx` | ป้ายราคาทรงดาวระเบิด/ป้ายแผ่นกระดาษฉีก พร้อมโปรโมชัน |
| `CartCTA.tsx` | **แทน `ShopeeCartBadge.tsx` เดิม** ตะกร้าส้ม + มือชี้ + ปุ่ม "ช้อปเลย" แบบสติกเกอร์ เด้งเป็นจังหวะ |
| `PaperTransition.tsx` | ทรานซิชันเปลี่ยนซีน (ดู 3.4) |

### 3.3 ตัวอย่าง `CutoutImage.tsx`
```tsx
import { Img, AbsoluteFill } from 'remotion';
import { useBoil } from '../lib/stopMotion';
import { usePop } from '../lib/motion';

type Props = {
  src: string;
  delay?: number;
  baseRotate?: number;
  width?: number;
  x?: number;
  y?: number;
  id: string;
};

export const CutoutImage: React.FC<Props> = ({ src, delay = 0, baseRotate = -4, width = 760, x = 0, y = 0, id }) => {
  const pop = usePop(delay);
  const boil = useBoil(id);

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width,
        transform: `translate(-50%, -50%) translate(${x + boil.x}px, ${y + boil.y}px)
                    rotate(${baseRotate + boil.rotate}deg) scale(${pop * boil.scale})`,
        filter: 'url(#sticker)',
      }}
    >
      <Img src={src} style={{ width: '100%', display: 'block' }} />
    </div>
  );
};
```

### 3.4 Paper Transitions (ใช้ `@remotion/transitions`)
ติดตั้ง: `npm i @remotion/transitions @remotion/google-fonts @remotion/noise @remotion/shapes @remotion/paths`
สร้าง custom presentation อย่างน้อย **3 แบบ** แล้วสลับใช้ตามซีน:
1. **Slap Strip** — แถบกระดาษสีสแลปทับจากซ้าย/ขวา แล้วเลื่อนออก (6–8 เฟรม)
2. **Torn Wipe** — ฉีกกระดาษเผยซีนถัดไป ขอบฉีกใช้ clip-path ที่ได้จาก noise
3. **Page Flip / Shuffle** — การ์ดกระดาษซ้อนกันแล้วปัดทิ้งออกนอกจอเหมือนสับไพ่
ความยาวทรานซิชัน **6–10 เฟรม** เท่านั้น (เร็ว คม ไม่ลากยาว)

---

## 4. Product Cutout Pipeline (ตัดพื้นหลังสินค้า)

ภาพที่ผู้ใช้อัปโหลดมักมีพื้นหลัง ต้องแปลงเป็น cutout PNG โปร่งใสก่อนเข้า Remotion

1. เพิ่มขั้นตอน **background removal** ตอนอัปโหลด (`/api/products`) ตามลำดับความสำคัญ:
   - ตัวเลือก A (แนะนำ): `@imgly/background-removal-node` (รันในเครื่อง ไม่ต้องใช้คีย์)
   - ตัวเลือก B: เรียก Python `rembg` ผ่าน child process
   - ตัวเลือก C (fallback): ถ้าตัดไม่สำเร็จ ให้ใช้ภาพเดิม + กรอบกระดาษ polaroid/ขอบฉีก แทน sticker outline
2. บันทึกผลเป็น `public/uploads/<id>_cutout.png` และเก็บ path ลง `products.json` ฟิลด์ `cutoutImages[]`
3. Remotion เลือกใช้ `cutoutImages` ก่อน ถ้าไม่มีให้ fallback เป็น `images`
4. ภาพที่ไม่ใช่สินค้าชิ้นเดียว (เช่นภาพ lifestyle) ให้ใช้เป็น **กรอบโพลารอยด์/ภาพแปะเทป** ไม่ต้องตัดพื้นหลัง

---

## 5. Scene Design (ผังฉาก 15 วินาที)

> ทุกฉากต้องมีอย่างน้อย: พื้นหลังกระดาษ, 1 cutout/ภาพสินค้า, 1 StickerText, 2 องค์ประกอบตกแต่ง (tape/doodle/sticker)

### 🔥 Hook — 0:00–0:03 (frame 0–90)
- 0–6f: จอเปล่ากระดาษคราฟต์ → **สแลปแถบกระดาษสีเหลือง** พร้อมหัวข้อ Hook ตัวใหญ่ (สูงสุด 2 บรรทัด)
- 6–20f: cutout สินค้า **เด้งเข้าจากล่าง** overshoot + ประกายแสง + ลูกศรวาดมือชี้
- 20–60f: คำหลัก (เช่น "ของมันต้องมี!") ไฮไลต์ด้วยปากกาเน้น, สติกเกอร์หมุนเล็กน้อย
- 60–90f: ตัดเร็วด้วยทรานซิชัน Slap Strip ไปฉากถัดไป

### ✨ Feature — 0:03–0:12 (frame 90–360) แบ่ง 2–3 ซีน ซีนละ ~3 วินาที
- ซีนละ **1 จุดเด่น** : ไอคอน/อิโมจิแบบสติกเกอร์ + ข้อความสั้น ≤ 20 ตัวอักษรไทย
- สลับเลย์เอาต์ในแต่ละซีนไม่ให้ซ้ำ:
  - **A:** สินค้าใหญ่กลางจอ, ข้อความบนแถบฉีกด้านบน, ลูกศรชี้
  - **B:** ภาพซ้อนกันแบบโพลารอยด์ 2–3 ใบเอียงๆ แปะเทป + ข้อความล่าง
  - **C:** สินค้า + วงกลมวาดมือเน้นจุดเด่น + callout bubble
- ภายในซีน: ข้อความ/สติกเกอร์ทยอยเข้า (stagger 6–10 เฟรม)
- มีเอฟเฟกต์ "ภาพค้างแล้วขยับสั่น" ตลอด ห้ามนิ่งสนิท

### 🛒 CTA — 0:12–0:15 (frame 360–450)
- พื้นหลังสีส้ม Shopee + halftone
- `PriceBurst` ราคาโผล่แบบระเบิดพร้อมโปรโมชัน/ส่งฟรี
- `CartCTA` ตะกร้าส้ม + ลูกศรชี้ลงมุมซ้ายล่าง (ตำแหน่งตะกร้าบน Shopee Video) เด้งเป็นจังหวะ
- ข้อความ "กดตะกร้าส้มเลย!" ตัวใหญ่ + สติกเกอร์ "จำนวนจำกัด"
- 6 เฟรมสุดท้าย: ค้างภาพนิ่งให้อ่านทัน (ไม่ตัดเร็ว)

### Safe Zones (ห้ามวางข้อความสำคัญนอกพื้นที่นี้)
```
บน    : เว้น 180px
ล่าง  : เว้น 400px  (ยกเว้น CartCTA ที่ตั้งใจอยู่มุมซ้ายล่าง)
ขวา   : เว้น 140px  (ปุ่ม like/comment ของแพลตฟอร์ม)
ซ้าย  : เว้น 60px
```

---

## 6. Audio / SFX

- ใช้ `<Audio />` + `<Sequence>` วาง SFX ตรงจังหวะภาพ: *pop, paper slap, paper tear, whoosh สั้น, sparkle, cash register*
- สร้างโฟลเดอร์ `public/sfx/` (ถ้ายังไม่มีไฟล์ ให้สร้าง placeholder + ใส่ TODO และเขียนชื่อไฟล์ที่ต้องการใน `public/sfx/README.md` อย่าดาวน์โหลดไฟล์ที่ไม่ทราบลิขสิทธิ์)
- ทุกเสียง **sync กับ keyframe** ของภาพ ไม่เกิน ±2 เฟรม
- BGM (ถ้ามี) ลดระดับเสียงเหลือ 20–30% ให้ SFX เด่น

---

## 7. ขยาย Schema & Gemini Prompt

### 7.1 อัปเดต `remotion/types.ts`
```ts
export type PaperTheme = 'kraft' | 'cream-grid' | 'halftone-orange' | 'pastel-mint';
export type SceneLayout = 'hero-center' | 'polaroid-stack' | 'callout-circle';
export type TransitionType = 'slap-strip' | 'torn-wipe' | 'page-shuffle';

export interface CollageScene {
  type: 'hook' | 'feature' | 'cta';
  headline: string;            // ≤ 24 ตัวอักษรไทย
  highlightWord?: string;      // คำที่ใส่ปากกาเน้น
  sticker?: string;            // เช่น "ส่งฟรี", "ลดแรง"
  emoji?: string;              // ไอคอนประกอบ
  layout: SceneLayout;
  imageIndex: number;          // ใช้ภาพที่เท่าไรของสินค้า
  paperTheme: PaperTheme;
  transitionOut: TransitionType;
  sfx?: ('pop' | 'slap' | 'tear' | 'sparkle' | 'cash')[];
}
```
คงฟิลด์เดิมไว้เพื่อ backward compatible และมี **ค่า default** ถ้า storyboard เก่าไม่มีฟิลด์ใหม่ (เติมให้อัตโนมัติ ห้าม crash)

### 7.2 อัปเดต Prompt ใน `src/lib/gemini.ts`
เพิ่มคำสั่งให้ Gemini ตอบ **JSON ตาม schema ด้านบน** (ใช้ `responseSchema` / structured output) และใส่กฎ:
- Hook ต้องดึงอารมณ์ภายใน 3 วินาที ใช้ภาษาพูดแบบรีวิวจริง ไม่เว่อร์เกินจริง ห้ามอ้างสรรพคุณทางการแพทย์/คำโฆษณาเกินจริงที่ผิดนโยบาย Shopee
- ทุก headline ≤ 24 ตัวอักษร, ไม่ซ้ำกันระหว่างซีน
- เลือก `layout` ไม่ซ้ำกันติดกัน 2 ซีน
- เลือก `paperTheme` ตาม tone ที่ผู้ใช้เลือก
- อัปเดต **Fallback Storyboard Generator** ให้สร้างข้อมูลชุดใหม่นี้ด้วย (ต้องรันได้โดยไม่มี API Key)

---

## 8. อัปเดตไฟล์เดิม

| ไฟล์เดิม | สิ่งที่ต้องทำ |
|---|---|
| `HookScene.tsx` | เขียนใหม่ตามหัวข้อ 5 ใช้ component ใน `remotion/paper/` |
| `FeatureScene.tsx` | เขียนใหม่ รองรับ 3 layout |
| `CTAScene.tsx` | เขียนใหม่ ใช้ `PriceBurst` + `CartCTA` |
| `KenBurnsImage.tsx` | **เลิกใช้** (ย้ายไป `_deprecated/`) แทนด้วย `CutoutImage` |
| `AnimatedTextBadge.tsx` | แทนด้วย `StickerText` + `TornStrip` |
| `ShopeeCartBadge.tsx` | แทนด้วย `CartCTA` |
| `ShopeeProductVideo.tsx` | ใช้ `<TransitionSeries>` + วาง `<PaperFilters />` + `<Audio>` |
| `Root.tsx` | คง 1080x1920 @ 30fps, คำนวณ duration จาก scenes |
| `VideoPlayerPreview.tsx` | ต้อง preview ได้เหมือนผล render (โหลดฟอนต์ให้เสร็จก่อนเล่น) |

---

## 9. ข้อห้าม (Anti-patterns)

- ❌ fade-in/fade-out ล้วนๆ เป็นการเปลี่ยนซีน
- ❌ ซูม/แพนลื่นยาวตลอดคลิป
- ❌ กล่องสี่เหลี่ยมมนสะอาดๆ แบบ UI เว็บ, gradient ลื่นๆ, glassmorphism
- ❌ ตัวหนังสือไม่มีขอบ/ไม่มีพื้นรอง
- ❌ ใช้ `Math.random()`, `Date.now()` หรือ CSS `transition`/`@keyframes` ใน composition (Remotion ต้องขับด้วย frame เท่านั้น)
- ❌ ใช้ภาพ/ฟอนต์/เสียงจากแหล่งไม่ทราบลิขสิทธิ์
- ❌ ข้อความเล็กกว่า 56px บนจอ 1080 กว้าง
- ❌ วางข้อความใน Safe Zone ที่โดนปุ่มแพลตฟอร์มทับ

---

## 10. ขั้นตอนทำงานของ Agent (Workflow)

1. **สำรวจ:** อ่านโค้ดใน `remotion/` และ `src/lib/gemini.ts` สรุปสั้นๆ ว่ามีอะไรบ้างก่อนแก้
2. **วางแผน:** เขียนแผนไฟล์ที่จะสร้าง/แก้เป็น checklist แล้วเริ่มทำตามลำดับ: `lib/stopMotion` → `paper/*` → Scenes → `ShopeeProductVideo` → schema/Gemini → cutout pipeline → SFX
3. **ติดตั้ง dependency** ที่จำเป็น (หัวข้อ 3.4 และ 4) และตรวจว่า `npm run build` ผ่าน
4. **ตรวจทีละซีน** ด้วยภาพนิ่ง:
   ```bash
   npx remotion still remotion/index.ts ShopeeProductVideo out/hook.png --frame=30
   npx remotion still remotion/index.ts ShopeeProductVideo out/feature1.png --frame=150
   npx remotion still remotion/index.ts ShopeeProductVideo out/cta.png --frame=400
   ```
   (ปรับ entry/composition id ให้ตรงกับโปรเจกต์จริง) ดูภาพแล้วเทียบกับ Checklist หัวข้อ 11
5. **เรนเดอร์ทดสอบเต็มคลิป:** `node scripts/render.mjs` เปิดดูว่าจังหวะ stop-motion ไม่ช้า/ไม่กระตุกเกินไป
6. **ทดสอบกรณีขอบ:** ใช้สินค้าตัวอย่าง (แก้วเก็บความเย็น), อัปโหลด 1 ภาพ, อัปโหลด 5 ภาพ, ไม่มี API Key (fallback), ชื่อสินค้ายาวมาก
7. **รายงานผล:** สรุปไฟล์ที่แก้/สร้าง, สิ่งที่ยังไม่ได้ทำ, ปัญหาที่พบ, และเวลา render เฉลี่ย

---

## 11. Acceptance Checklist (ต้องผ่านครบก่อนส่งงาน)

**Visual**
- [ ] ทุกซีนมองแล้วรู้สึก "ตัดกระดาษแปะ" ทันที มีเงาแข็ง ขอบสติกเกอร์ เกรนกระดาษ
- [ ] สินค้าเด่นชัด ตัดขอบสะอาด ไม่มีขอบเหลือจากพื้นหลังเดิม
- [ ] ข้อความอ่านง่ายบนมือถือ ไม่หลุด Safe Zone สระ/วรรณยุกต์ไทยไม่ถูกตัด
- [ ] ไม่เกิน 3 สีสดต่อคลิป

**Motion**
- [ ] เห็นจังหวะ stop-motion ชัด (ขอบเดือด/สั่นเบาๆ) แต่ไม่ปวดตา
- [ ] ทุกองค์ประกอบเข้าฉากด้วย pop/slap ไม่ใช่ fade
- [ ] ทรานซิชันแต่ละอัน 6–10 เฟรม และมีอย่างน้อย 2 แบบในคลิปเดียว
- [ ] ไม่มีช่วงใดนิ่งเกิน 1.5 วินาที (ยกเว้น 6 เฟรมท้าย)

**Technical**
- [ ] ผล Preview (Player) กับผล Render เหมือนกัน
- [ ] Render ซ้ำสองรอบได้ผลเหมือนกันทุกเฟรม (deterministic)
- [ ] ไม่มี warning/error ใน console, `npm run build` ผ่าน
- [ ] Render 15 วินาทีเสร็จในเวลาที่ยอมรับได้ (ถ้าช้าเกิน ให้ลด filter / ใช้ texture PNG สำเร็จรูป / ตั้ง `--concurrency`)
- [ ] storyboard เก่าใน `products.json` ยังเปิดและเรนเดอร์ได้

---

## 12. หมายเหตุสำหรับ Agent

- หากข้อกำหนดใดทำไม่ได้หรือขัดกัน (เช่น filter ทำให้ render ช้ามาก) **ให้เลือกทางที่คุณภาพภาพดีที่สุดภายใต้ข้อจำกัด และอธิบายเหตุผลในรายงาน** ห้ามเงียบข้ามไป
- ถ้าต้องตัดสินใจเรื่องดีไซน์ที่ไม่ได้ระบุ ให้ยึด 3 คำนี้: **สด • หยาบแบบตั้งใจ • อ่านง่าย**
- ทำงานเป็นขั้นเล็กๆ และ commit/สรุปทุกครั้งที่จบหนึ่งกลุ่มงาน
