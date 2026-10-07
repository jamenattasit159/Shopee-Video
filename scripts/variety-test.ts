import { bundle } from "@remotion/bundler";
import { getCompositions, renderStill } from "@remotion/renderer";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import {
  ALL_PACK_IDS,
  countDnaDifferences,
  HistoryItem,
  pickStyleDNA,
} from "../src/lib/styleDirector";
import { StyleDNA } from "../remotion/types";
import { defaultShopeeVideoProps } from "../remotion/ShopeeProductVideo";

interface TestProduct {
  id: string;
  name: string;
  price: string;
  dominantColors: string[];
}

const TEST_PRODUCTS: TestProduct[] = [
  { id: "prod-1", name: "กระติกน้ำสแตนเลสเก็บความเย็น", price: "฿289", dominantColors: ["#EF4444"] }, // Red
  { id: "prod-2", name: "หูฟังบลูทูธไร้สายพรีเมียม", price: "฿459", dominantColors: ["#F8FAFC"] }, // White
  { id: "prod-3", name: "สมาร์ทวอทช์กันน้ำฟังก์ชันครบ", price: "฿690", dominantColors: ["#0F172A"] }, // Black
  { id: "prod-4", name: "ผงมัทฉะเกรดพิธีชงชาแท้", price: "฿320", dominantColors: ["#10B981"] }, // Green
  { id: "prod-5", name: "เซรั่มวิตามินซีผิวกระจ่างใส", price: "฿199", dominantColors: ["#F59E0B"] }, // Yellow
  { id: "prod-6", name: "เครื่องพ่นอโรมาลาเวนเดอร์", price: "฿345", dominantColors: ["#8B5CF6"] }, // Purple
  { id: "prod-7", name: "ลูกกลิ้งนวดหน้าเก็บความเย็น", price: "฿159", dominantColors: ["#06B6D4"] }, // Cyan
  { id: "prod-8", name: "ลิปแมทท์ติดทนตลอดวัน", price: "฿129", dominantColors: ["#EC4899"] }, // Pink
  { id: "prod-9", name: "กระเป๋ายิมสปอร์ตจุของเยอะ", price: "฿379", dominantColors: ["#F97316"] }, // Orange
  { id: "prod-10", name: "พัดลมพกพาสีมินต์สดใส", price: "฿189", dominantColors: ["#14B8A6"] }, // Mint
];

async function runVarietyTest() {
  console.log("================================================================================");
  console.log("            ANTI-REPETITION & VARIETY TEST (10 PRODUCTS BATCH)                  ");
  console.log("================================================================================\n");

  const history: HistoryItem[] = [];
  const assignedDnas: { product: TestProduct; dna: StyleDNA; diff: number }[] = [];
  const usedPacks = new Set<string>();

  for (let i = 0; i < TEST_PRODUCTS.length; i++) {
    const prod = TEST_PRODUCTS[i];
    const prevDna = assignedDnas[i - 1]?.dna;

    const dna = pickStyleDNA({
      productId: prod.id,
      batchIndex: i,
      history,
      dominantColors: prod.dominantColors,
    });

    const diff = countDnaDifferences(dna, prevDna);
    assignedDnas.push({ product: prod, dna, diff });
    usedPacks.add(dna.pack);

    history.push({
      productId: prod.id,
      createdAt: new Date().toISOString(),
      dna,
    });
  }

  // Print Table
  console.log(
    " #   PACK                 PALETTE              STRUCTURE         HOOK             TEMPO    DIFF"
  );
  console.log(
    "-----------------------------------------------------------------------------------------------"
  );

  let allDiffPassed = true;
  for (let i = 0; i < assignedDnas.length; i++) {
    const { product, dna, diff } = assignedDnas[i];
    const num = String(i + 1).padEnd(3);
    const pack = dna.pack.padEnd(20);
    const palette = dna.palette.slice(0, 19).padEnd(20);
    const structure = dna.structure.padEnd(17);
    const hook = dna.hookFormula.padEnd(16);
    const tempo = dna.tempo.padEnd(8);
    const diffText = i === 0 ? "INIT" : `${diff}/10 axes`;

    if (i > 0 && diff < 6) {
      allDiffPassed = false;
    }

    console.log(`${num} ${pack} ${palette} ${structure} ${hook} ${tempo} ${diffText}`);
  }

  console.log(
    "-----------------------------------------------------------------------------------------------"
  );
  console.log(`Packs utilized in batch: ${usedPacks.size} unique packs.`);
  console.log(`Adjacent difference requirement (>= 6/10): ${allDiffPassed ? "PASSED ✅" : "FAILED ❌"}\n`);

  // Rendering Contact Sheet
  console.log("=== RENDERING CONTACT SHEET (10 PRODUCTS × 3 FRAMES) ===");
  const outDir = path.resolve("out");
  await fs.mkdir(outDir, { recursive: true });

  console.log("Bundling Remotion composition...");
  const entryPoint = path.resolve("remotion/index.ts");
  const publicDir = path.resolve("public");
  const bundleLocation = await bundle({ entryPoint, publicDir });
  const compositions = await getCompositions(bundleLocation);
  const composition = compositions.find((c) => c.id === "ShopeeProductVideo");

  if (!composition) {
    throw new Error("ShopeeProductVideo composition not found!");
  }

  const thumbWidth = 240;
  const thumbHeight = 426; // 16:9 vertical ratio for 1080x1920
  const cols = 3;
  const rows = TEST_PRODUCTS.length;
  const sheetWidth = cols * thumbWidth;
  const sheetHeight = rows * thumbHeight;

  const compositeInputs: sharp.OverlayOptions[] = [];

  for (let r = 0; r < rows; r++) {
    const { product, dna } = assignedDnas[r];
    console.log(`Rendering Row ${r + 1}/10: [${dna.pack}] ${product.name}...`);

    const framesToRender = [
      { frame: 30, col: 0, tag: "hook" },
      { frame: 140, col: 1, tag: "feat" },
      { frame: 340, col: 2, tag: "cta" },
    ];

    const compProps = {
      ...defaultShopeeVideoProps,
      productName: product.name,
      price: product.price,
      styleDNA: dna,
      hook: {
        ...defaultShopeeVideoProps.hook,
        headline: product.name,
        subheadline: "ของดีตรงปก คุ้มค่าเกินราคา",
        badgeText:
          dna.pack === "comic-popart"
            ? "💥 BAM! ปังมาก"
            : dna.pack === "zine-newspaper"
            ? "📰 ข่าวด่วนวันนี้"
            : dna.pack === "supermarket-flyer"
            ? "🔥 ด่วนลดพิเศษ"
            : dna.pack === "soft-kawaii"
            ? "✨ คิ้วท์มากใจฟู"
            : dna.pack === "notebook-doodle"
            ? "✏️ จดลิสต์ด่วน"
            : dna.pack === "pinboard-corkboard"
            ? "📌 ปักหมุดไอเทมเด็ด"
            : dna.pack === "sticker-bomb"
            ? "⚡ ไม่ซื้อคือพลาด"
            : "🏷️ ของดีบอกต่อ",
      },
      scenes: [
        {
          ...defaultShopeeVideoProps.scenes[0],
          highlightTitle: "ฟังก์ชันเด็ดน่าใช้",
          highlightDesc: "วัสดุเกรดพรีเมียม ตอบโจทย์ตรงปก",
        },
        {
          ...defaultShopeeVideoProps.scenes[1],
          highlightTitle: "ดีไซน์สวยโดนใจ",
          highlightDesc: "พกพาสะดวก คุ้มค่ายิ่งกว่าเดิม",
        },
      ],
    };

    const compositionToRender = {
      ...composition,
      props: compProps,
    };

    for (const fItem of framesToRender) {
      const tempPath = path.join(outDir, `temp_${r}_${fItem.tag}.png`);

      await renderStill({
        composition: compositionToRender,
        serveUrl: bundleLocation,
        output: tempPath,
        frame: fItem.frame,
        inputProps: compProps,
      });

      // Resize thumbnail
      const resizedBuffer = await sharp(tempPath)
        .resize(thumbWidth, thumbHeight, { fit: "cover" })
        .toBuffer();

      await fs.unlink(tempPath).catch(() => {});

      compositeInputs.push({
        input: resizedBuffer,
        left: fItem.col * thumbWidth,
        top: r * thumbHeight,
      });
    }
  }

  console.log("\nAssembling Contact Sheet with Sharp...");
  const contactSheetPath = path.join(outDir, "contact-sheet.png");

  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 17, g: 24, b: 39, alpha: 1 },
    },
  })
    .composite(compositeInputs)
    .png()
    .toFile(contactSheetPath);

  console.log(`\n✅ Contact Sheet created at: ${contactSheetPath}`);
  console.log(`Dimensions: ${sheetWidth}×${sheetHeight}px (10 rows × 3 columns)`);
}

runVarietyTest().catch((err) => {
  console.error("Variety test failed:", err);
  process.exit(1);
});
