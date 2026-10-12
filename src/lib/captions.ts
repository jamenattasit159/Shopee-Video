export interface CaptionPackage {
  styleName: string;
  styleDescription: string;
  captionText: string;
  hashtags: string[];
  fullPost: string;
}

/**
 * Post caption generator.
 * Picks 3 different storytelling angles per product and varies openers,
 * highlight formatting, CTA and hashtags. Output is deterministic per product
 * (same input → same captions, so re-renders don't flicker), but different
 * products get different combinations. Pass `variant` to get a fresh set.
 */

// ── Seeded randomness ────────────────────────────────────────────────
const hashString = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const createRng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type Rng = () => number;
const pick = <T,>(rng: Rng, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const shuffle = <T,>(rng: Rng, arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ── Product helpers ──────────────────────────────────────────────────
/** Shopee titles are long keyword lists — keep a readable short name. */
const shortenName = (name: string, max = 38): string => {
  const clean = name.replace(/\s+/g, " ").replace(/[\[\]【】|]/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 12 ? cut.slice(0, lastSpace) : cut).trim();
};

const CATEGORY_RULES: Array<{ match: RegExp; tags: string[]; noun: string }> = [
  { match: /น้ำหอม|perfume|eau de|โคโลญ/i, tags: ["#น้ำหอม", "#กลิ่นหอมติดทน", "#น้ำหอมติดทน"], noun: "น้ำหอม" },
  { match: /แก้ว|tumbler|กระบอกน้ำ|ขวดน้ำ/i, tags: ["#แก้วเก็บความเย็น", "#ของใช้ในบ้าน", "#แก้วน้ำ"], noun: "แก้ว" },
  { match: /ทิชชู่|wipe|ผ้าเปียก/i, tags: ["#ทิชชู่เปียก", "#ของใช้เด็ก", "#ของใช้แม่และเด็ก"], noun: "ทิชชู่เปียก" },
  { match: /ผ้าอ้อม|แพมเพิส|mamypoko|diaper/i, tags: ["#ผ้าอ้อมเด็ก", "#ของใช้เด็ก", "#แม่และเด็ก"], noun: "ผ้าอ้อม" },
  { match: /ลูกน้อย|เด็ก|baby|ทารก|หมอน|กล่อมนอน|นมผง/i, tags: ["#ของใช้เด็ก", "#แม่และเด็ก", "#คุณแม่มือใหม่"], noun: "ของใช้ลูก" },
  { match: /ครีม|เซรั่ม|skincare|โลชั่น|serum/i, tags: ["#สกินแคร์", "#ดูแลผิว", "#ผิวสวย"], noun: "สกินแคร์" },
  { match: /เจลอาบน้ำ|shower|แชมพู|สบู่/i, tags: ["#เจลอาบน้ำ", "#ของใช้ในห้องน้ำ", "#อาบน้ำสระผม"], noun: "ของใช้ในห้องน้ำ" },
];

const detectCategory = (text: string) => CATEGORY_RULES.find((c) => c.match.test(text));

const splitHighlights = (highlights: string): string[] =>
  highlights
    .split(/[,\n•✅]+|\.\s|\s-\s/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter((s) => s.length >= 3)
    .slice(0, 4);

/** "544" → "฿544". Non-numeric values ("ลดจะตกใจ") are promo text, not a price. */
const formatPrice = (price: string): { hasPrice: boolean; text: string } => {
  const p = (price || "").trim();
  if (!/\d/.test(p)) return { hasPrice: false, text: p };
  return { hasPrice: true, text: /[฿$]|บาท/.test(p) ? p : `฿${p}` };
};

/** Long Thai-slug Shopee URLs → short canonical product link. */
const shortenShopeeUrl = (url: string): string => {
  const m = url.match(/shopee\.co\.th\/.*?i\.(\d+)\.(\d+)/) || url.match(/shopee\.co\.th\/product\/(\d+)\/(\d+)/);
  if (m) return `https://shopee.co.th/product/${m[1]}/${m[2]}`;
  try {
    return decodeURI(url);
  } catch {
    return url;
  }
};

/** Leading Latin words of the title = brand, e.g. "Madame Fin มาดามฟิน..." → "#MadameFin". */
const brandTag = (productName: string): string => {
  const latin = productName.match(/^[A-Za-z0-9'&]+(?:\s+[A-Za-z0-9'&]+)?/);
  const raw = latin ? latin[0] : productName.split(/\s+/)[0];
  const tag = raw.replace(/[^a-zA-Z0-9ก-๙]/g, "").slice(0, 20);
  return tag.length > 1 ? `#${tag}` : "";
};

// ── Building blocks ──────────────────────────────────────────────────
const BULLET_STYLES: Array<(items: string[]) => string> = [
  (items) => items.map((h) => `✅ ${h}`).join("\n"),
  (items) => items.map((h, i) => `${["1️⃣", "2️⃣", "3️⃣", "4️⃣"][i]} ${h}`).join("\n"),
  (items) => items.map((h) => `▸ ${h}`).join("\n"),
  (items) => items.map((h) => `💡 ${h}`).join("\n"),
];

const CTA_LINES = [
  "🛒 พิกัดอยู่ตะกร้าส้มมุมซ้ายล่างเลย",
  "👇 จิ้มตะกร้าส้มในคลิปได้เลย",
  "🧺 กดตะกร้าส้มแล้วเช็กโค้ดส่วนลดก่อนจ่ายด้วยน้า",
  "📌 เซฟคลิปไว้ก่อน แล้วจิ้มตะกร้าส้มตอนพร้อม",
  "🛍️ ของอยู่ในตะกร้าส้มแล้ว ไปส่องรีวิวคนซื้อจริงก่อนได้",
];

const ENGAGEMENT_LINES = [
  "คอมเมนต์บอกหน่อย ใช้อยู่ตัวไหนกันบ้าง? 💬",
  "แท็กเพื่อนที่ต้องมีตัวนี้ 👀",
  "ใครเคยใช้แล้วมาแชร์ในคอมเมนต์ได้เลย ⬇️",
  "ถ้าชอบแนวนี้ กดติดตามไว้ มีของดีมาป้ายอีกเรื่อยๆ ✨",
  "",
];

const CORE_HASHTAGS = [
  "#Shopeeป้ายยา",
  "#ShopeeTH",
  "#ของดีบอกต่อ",
  "#พิกัดในตะกร้าส้ม",
  "#TikTokป้ายยา",
  "#รีวิวของดี",
  "#ช้อปปี้",
  "#ป้ายยา",
  "#ของมันต้องมี",
];

// ── Angles (storytelling styles) ─────────────────────────────────────
interface AngleContext {
  rng: Rng;
  name: string;
  price: string; // formatted price, or promo text when hasPrice is false
  hasPrice: boolean;
  items: string[];
  bullets: string;
  noun: string;
}

interface Angle {
  id: string;
  styleName: string;
  styleDescription: string;
  tags: string[];
  build: (c: AngleContext) => string;
}

/** One line about price/promo, phrased correctly for either case. */
const priceLine = (c: AngleContext, numeric: string[]) =>
  c.hasPrice ? pick(c.rng, numeric) : c.price ? `🔻 โปรตอนนี้: ${c.price}` : "";

const ANGLES: Angle[] = [
  {
    id: "hype",
    styleName: "🔥 สายป้ายยาตื่นเต้น (Viral Hype)",
    styleDescription: "เปิดแรง ภาษาวัยรุ่น พลังงานสูง เหมาะกับ TikTok / Shopee Video",
    tags: ["#ป้ายยาด่วน", "#ของมันต้องมี"],
    build: (c) =>
      [
        pick(c.rng, [
          `หยุดเลื่อนก่อน! ${c.name} ตัวนี้แหละที่หากันอยู่ 🔥`,
          `ใครยังไม่มี ${c.name} ถือว่าพลาดมากก 😳`,
          `ป้ายยาแบบไม่กั๊ก ${c.name} ตัวนี้ปังจริง 🔥`,
          `เจอแล้ว! ${c.name} ที่คนพูดถึงกันทั้งฟีด`,
        ]),
        priceLine(c, [`ราคาตอนนี้ ${c.price} เท่านั้น`, `ได้มาในราคา ${c.price} คุ้มเกิ๊น`, `${c.price} กับของระดับนี้ คือดีมาก`]),
        "",
        c.bullets,
      ].join("\n"),
  },
  {
    id: "review",
    styleName: "✨ รีวิวจริงใจ (Honest Review)",
    styleDescription: "ฟีลเพื่อนเล่าให้ฟัง โทนสบายๆ น่าเชื่อถือ ช่วยให้คนตัดสินใจง่าย",
    tags: ["#รีวิวจริง", "#รีวิวช้อปปี้"],
    build: (c) =>
      [
        pick(c.rng, [
          `เล่าแบบตรงๆ เกี่ยวกับ ${c.name} 📝`,
          `สรุปให้แบบไม่อวย ${c.name} มีดีตรงไหน?`,
          `${c.name} ดีจริงไหม? มาดูกัน 👀`,
        ]),
        "",
        c.bullets,
        "",
        // Only call out a favourite when there is more than one point to choose from
        c.items.length > 1
          ? pick(c.rng, [
              `จุดที่ชอบสุดคือ "${c.items[0]}"`,
              `ถ้าให้เลือกข้อเดียว ขอยกให้ "${c.items[0]}"`,
              `ใครกำลังลังเล ข้อนี้ช่วยตัดสินใจได้: ${c.items[0]}`,
            ])
          : "",
        priceLine(c, [`ราคา ${c.price}`, `งบ ${c.price}`, `ค่าตัว ${c.price}`]),
      ].join("\n"),
  },
  {
    id: "deal",
    styleName: "⚡ เน้นดีล / ราคา (Deal Focus)",
    styleDescription: "ชูราคาเป็นพระเอก ชวนเช็กโค้ดส่วนลด กระตุ้นให้กดซื้อ",
    tags: ["#โปรช้อปปี้", "#ของถูกบอกต่อ"],
    build: (c) =>
      [
        c.hasPrice
          ? pick(c.rng, [
              `💸 ${c.price} ได้ ${c.name}`,
              `⚡ ดีลน่าเก็บ: ${c.name} ราคา ${c.price}`,
              `🏷️ ราคาตอนนี้ ${c.price} สำหรับ ${c.name}`,
            ])
          : `⚡ ดีลน่าเก็บ: ${c.name}${c.price ? ` — ${c.price}` : ""}`,
        pick(c.rng, [
          "ก่อนกดอย่าลืมเก็บโค้ดส่งฟรีกับคูปองร้านด้วยน้า",
          "เช็กโค้ดส่วนลดในหน้าสินค้าก่อนจ่าย คุ้มขึ้นอีก",
          "โปรเปลี่ยนไวมาก เห็นแล้วรีบเช็กเลย",
        ]),
        "",
        c.bullets,
      ].join("\n"),
  },
  {
    id: "pov",
    styleName: "🎬 เล่าเป็นเรื่อง (POV Story)",
    styleDescription: "เปิดด้วยสถานการณ์ที่คนดูอินตาม แล้วพาไปเจอสินค้า ดูไม่ขายตรงเกินไป",
    tags: ["#POV", "#ชีวิตง่ายขึ้น"],
    build: (c) =>
      [
        pick(c.rng, [
          `POV: เพื่อนถามว่าใช้${c.noun}อะไร แล้วเราตอบได้อย่างภูมิใจ 😌`,
          `POV: เลิกเสียเงินกับ${c.noun}ที่ไม่เวิร์ก แล้วมาเจอตัวนี้`,
          `POV: เปิดกล่องแล้วรู้เลยว่าคิดถูก 📦`,
        ]),
        "",
        c.name,
        ...c.items.slice(0, 3).map((h) => `→ ${h}`),
        priceLine(c, [`ทั้งหมดนี้ในราคา ${c.price}`, `ราคา ${c.price} จบ`, `แค่ ${c.price}`]),
      ].join("\n"),
  },
  {
    id: "problem",
    styleName: "🧩 ปัญหา → ทางออก (Problem / Solution)",
    styleDescription: "เริ่มจากปัญหาที่คนดูเจอ แล้วโชว์ว่าสินค้าช่วยแก้ยังไง",
    tags: ["#ตัวช่วย", "#ของใช้ดีบอกต่อ"],
    build: (c) =>
      [
        pick(c.rng, [
          `เคยเจอไหม ${c.noun}ที่ซื้อมาแล้วไม่ตอบโจทย์? 😩`,
          `ปัญหาเดิมๆ ที่หลายคนเจอกับ${c.noun} — มีทางออกแล้ว`,
          `ถ้ากำลังหา${c.noun}ที่ตอบโจทย์จริงๆ อ่านต่อ 👇`,
        ]),
        "",
        `ทางออกคือ ${c.name}`,
        c.bullets,
        "",
        priceLine(c, [`ราคา ${c.price}`, `ค่าตัวแค่ ${c.price}`]),
      ].join("\n"),
  },
  {
    id: "listicle",
    styleName: "📋 สรุปเป็นข้อ (Quick List)",
    styleDescription: "อ่านจบใน 5 วินาที เหมาะกับคนดูที่ชอบข้อมูลกระชับ",
    tags: ["#สรุปให้", "#ของดีต้องบอกต่อ"],
    build: (c) => {
      const list = [...c.items];
      if (c.hasPrice) list.push(`ราคา ${c.price}`);
      else if (c.price) list.push(`โปรตอนนี้: ${c.price}`);
      return [
        list.length >= 2
          ? pick(c.rng, [
              `${list.length} เหตุผลที่ ${c.name} น่าโดน 👇`,
              `สรุปสั้นๆ ทำไมต้อง ${c.name}`,
              `${c.name} ใน ${list.length} บรรทัด`,
            ])
          : `สรุปสั้นๆ ทำไมต้อง ${c.name}`,
        "",
        list.map((h, i) => `${i + 1}. ${h}`).join("\n"),
      ].join("\n");
    },
  },
];

export function generatePostCaptions(
  productName: string,
  price: string,
  highlights: string,
  ctaText?: string,
  originalUrl?: string,
  aiDisclaimer: boolean = true,
  variant: number = 0
): CaptionPackage[] {
  const rng = createRng(hashString(`${productName}|${price}|${highlights}|${variant}`));
  const name = shortenName(productName);
  const items = splitHighlights(highlights);
  const category = detectCategory(`${productName} ${highlights}`);
  const { hasPrice, text: priceText } = formatPrice(price);

  const link = originalUrl ? `🔗 สั่งซื้อ: ${shortenShopeeUrl(originalUrl)}` : "";
  const disclaimerSuffix = aiDisclaimer ? "\n\n🎙️ คลิปนี้ใช้เสียงสังเคราะห์ด้วย AI" : "";
  const productTag = brandTag(productName);
  const ctaPool = ctaText ? [...CTA_LINES, `🛒 ${ctaText}`] : CTA_LINES;

  // 3 different angles; no repeated bullet style / CTA / engagement line within one set
  const angles = shuffle(rng, ANGLES).slice(0, 3);
  const bulletStyles = shuffle(rng, BULLET_STYLES);
  const ctas = shuffle(rng, ctaPool);
  const engagements = shuffle(rng, ENGAGEMENT_LINES);

  return angles.map((angle, i) => {
    const body = angle
      .build({
        rng,
        name,
        price: priceText,
        hasPrice,
        items,
        bullets: items.length ? bulletStyles[i % bulletStyles.length](items) : "",
        noun: category?.noun || "ของใช้",
      })
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const captionText = [body, link, ctas[i % ctas.length], engagements[i % engagements.length]]
      .filter(Boolean)
      .join("\n\n");

    const hashtags = Array.from(
      new Set([
        ...shuffle(rng, CORE_HASHTAGS).slice(0, 3),
        ...(category ? shuffle(rng, category.tags).slice(0, 2) : []),
        angle.tags[0],
        productTag,
      ])
    ).filter(Boolean);

    return {
      styleName: angle.styleName,
      styleDescription: angle.styleDescription,
      captionText,
      hashtags,
      fullPost: `${captionText}${disclaimerSuffix}\n\n${hashtags.join(" ")}`,
    };
  });
}
