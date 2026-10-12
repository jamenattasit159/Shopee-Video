import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import fs from "fs/promises";
import path from "path";

const BASE_DIR = "D:/งานที่ให้ AI ทำ/shopee";

// Read existing product data
const rawDb = await fs.readFile(path.resolve("data/products.json"), "utf-8");
const productsDb = JSON.parse(rawDb);

const FOLDER_CONFIGS = [
  {
    folderName: "ครัมเด็ก",
    productId: "prod_1791635183107",
    productName: "Mama's Choice เซ็ทดูแลผิวลูกน้อย (ครีมทาหน้าเด็ก ครีมทาผื่นเด็ก ผื่นผ้าอ้อม)",
    price: "199.- โปรพิเศษ",
    narrationScript:
      "Mama's Choice เซ็ตดูแลผิวลูกน้อยตัวดังที่คุณแม่ต้องมี! เซ็ตบำรุงครบวงจร ใช้ได้ตั้งแต่แรกเกิด ช่วยลดผดผื่นผ้าอ้อม ผิวเนียนนุ่ม สารสกัดจากธรรมชาติแท้ ปลอดภัย อ่อนโยนสุดๆ ตอนนี้ลดหนักจัดโปรพิเศษ ด่วนเลย จิ้มตะกร้าส้มซ้ายล่าง รีบกดก่อนของหมดน้า!",
    images: [
      "/uploads/1791432512827_0_th-11134207-7ra0s-mcg79hp173sj72.webp",
      "/uploads/1791432512828_1_th-11134207-7rase-m2anjobuqgtg93.webp",
      "/uploads/1791432512829_2_th-11134207-7rasg-m2anjoc4q28x89.webp",
      "/uploads/1791432512830_3_th-11134207-81ztg-mprrk6fh0hz504.webp",
      "/uploads/1791432512831_4_th-11134207-81zto-mmr3918w934441.webp",
    ],
  },
  {
    folderName: "ทิชชู่",
    productId: "prod_1791791844541",
    productName: "DODOLOVE ทิชชู่เปียก Baby Wipes ผ้าเช็ดทำความสะอาดสำหรับเด็ก ออร์แกนิค ห่อใหญ่ 80 แผ่น",
    price: "เพื่อแม่เราลดได้",
    narrationScript:
      "แม่จ๋าาา ใครหาทิชชู่เปียกตัวดัง DODOLOVE ต้องรีบจัด! ผ้าหนานุ่ม ไม่ขาดง่าย เช็ดสะอาดได้ทั้งตัว อ่อนโยน ปลอดภัยไร้แอลกอฮอล์ ใช้ได้ตั้งแต่แรกเกิด ห่อใหญ่ 80 แผ่นสุดคุ้ม ลดแรงเพื่อแม่ๆ พิกัดในตะกร้าส้มซ้ายล่าง รีบกดด่วนโค้ดหมด!",
    images: [
      "/uploads/1791791844541_0_th-11134207-81zte-mqyc5i8aedxg9f.webp",
      "/uploads/1791791844542_1_th-11134207-81ztg-mqyc5oa2ud5154.webp",
      "/uploads/1791619971947_3_th-11134207-81zti-mpm4i9uroyki65.webp",
      "/uploads/1791791844544_3_th-11134207-81ztn-mpm4ew704a32cc.webp",
      "/uploads/1791619971948_4_th-11134207-81ztq-mrmx0p41fsoxd8.webp",
    ],
  },
  {
    folderName: "น้ำหอม",
    productId: "prod_1791788253668",
    productName: "Madame Fin มาดามฟินของแท้ น้ำหอมใหม่ รุ่น Element Of Energy 4 กลิ่น (ขนาด 50ml.)",
    price: "ลดแรงสุดกระแทกสุด",
    narrationScript:
      "ทุกคนฟังทางนี้! น้ำหอมตัวดัง Madame Fin Element Of Energy ของแท้ มีให้เลือกถึง 4 กลิ่นหอมเอกลักษณ์ หอมละมุน มีเสน่ห์ ติดทนยาวนานตลอดวัน จัดดีลเดือดลดราคาพิเศษกระแทกใจ พิกัดในตะกร้าส้มซ้ายล่าง รีบกดก่อนหมดน้า!",
    images: [
      "/uploads/1791774453208_0_th-11134201-81ztd-ms39jwybvocm94_resize_w450_nl.webp",
      "/uploads/1791774453209_1_th-11134207-81ztf-mn6sgvyedb7p64_resize_w450_nl.webp",
      "/uploads/1791774453210_2_th-11134207-81zth-mn6sb5su5szse2.webp",
      "/uploads/1791774453211_3_th-11134207-81zth-mn6sgvygzf9dc7_resize_w450_nl.webp",
      "/uploads/1791774453212_4_th-11134207-81ztj-mn6sh17gzbb654_resize_w450_nl.webp",
    ],
  },
  {
    folderName: "ประปุกนม",
    productId: "prod_1791790691185",
    productName: "DODOLOVE กระปุกเก็บนมผง กระปุกแบ่งนม กล่องเก็บนมผง ป้องกันความชื้น อเนกประสงค์",
    price: "ลดหนักเพื่อแม่ๆ",
    narrationScript:
      "แม่จ๋า เบื่อไหมที่นมผงลูกชื้นและจับตัวเป็นก้อน? หมดปัญหา! นี่เลย DODOLOVE กระปุกเก็บนมผงตัวช่วยคุณแม่ ฝาซีลแน่นกันความชื้น ช้อนตวงแม่เหล็กในตัว มีที่ปาดนมเป๊ะทุกครั้ง ปลอดภัย ฟู้ดเกรด ลดหนักเพื่อแม่ๆ พิกัดตะกร้าส้มซ้ายล่าง รีบกดเลย!",
    images: [
      "/uploads/1791790691186_0_th-11134207-81ztc-ml30h1akuhhh87.webp",
      "/uploads/1791790691188_1_th-11134207-81ztc-ml30h1e1s7wn50.webp",
      "/uploads/1791790691189_2_th-11134207-81zth-ml30h1ak0zk6c9.webp",
      "/uploads/1791790691191_3_th-11134207-81ztj-ml30h1ag8qgy4e.webp",
      "/uploads/1791790691192_4_th-11134207-81ztq-ml30h1ahq41sb9.webp",
    ],
  },
  {
    folderName: "มือตบ",
    productId: "prod_1791449222411",
    productName: "มือตบกล่อมนอน ช่วยในการนอนหลับ ที่กล่อมนอนเด็ก มีแบตในตัวสายชาร์จ USB",
    price: "VIP ลดเลย 30%",
    narrationScript:
      "ทุกคนนน เจอไอเทมเด็ดอีกแล้ว! มือตบกล่อมนอนเด็ก ตัวช่วยให้ลูกน้อยหลับปุ๋ย หลับลึก ไม่งอแง มีรีโมทไร้สายปรับจังหวะได้ 3 ระดับ แบตเตอรี่ในตัวชาร์จ USB สะดวกสุดๆ ปลอกผ้านุ่มถอดซักง่าย โปรพิเศษลด 30% พิกัดตะกร้าส้มซ้ายล่าง รีบกดด่วนเลยจ้า!",
    images: [
      "/uploads/1791445818063_0_th-11134201-81zti-mrkd7kw1ryf8eb.webp",
      "/uploads/1791445818065_1_th-11134207-7rasd-m4a4v3vti7pm5e.webp",
      "/uploads/1791445818066_2_th-11134207-7rasj-m4a4v3vtgtsad5.webp",
      "/uploads/1791449222411_3_m.webp",
    ],
  },
  {
    folderName: "อาบน้ำ",
    productId: "prod_1791512125859",
    productName: "Bond Shower Gel Head to Toe Active Rush 150 ml",
    price: "ราคาดี ส่งฟรี",
    narrationScript:
      "เบื่อไหมกับการต้องพกเจลอาบน้ำหลายขวด สระผมก็ต้องแยกอีก! นี่เลย Bond Head to Toe Active Rush เจลอาบน้ำและสระผม 2in1 ขวดเดียวจบ ทำความสะอาดหมดจดล้ำลึก ทั้งผิวและผม ฟองเยอะ ล้างออกง่าย ไม่เหนอะหนะ สดชื่นมั่นใจตลอดวัน ราคาสุดคุ้ม รีบจิ้มตะกร้าส้มซ้ายล่าง เก็บโค้ดส่งฟรีด่วน!",
    images: [
      "/uploads/1791512125860_0_th-11134207-81zte-mhriaa2gj1ttbc_resize_w450_nl.webp",
      "/uploads/1791512125861_1_th-11134207-81ztg-mjdsycmeb11e21_resize_w450_nl.webp",
      "/uploads/1791512125862_2_th-11134207-81ztj-mjduhzcl55hh48_resize_w450_nl.webp",
      "/uploads/1791512125863_3_th-11134207-81zto-mjdsyipuaiv8f9_resize_w450_nl.webp",
    ],
  },
];

async function main() {
  console.log("=== BATCH VIDEO RENDERER FOR SHOPEE FOLDERS ===");
  console.log(`Processing ${FOLDER_CONFIGS.length} product folders...\n`);

  // PHASE 1: Synthesize all voiceovers FIRST so that all audio files exist in /public
  console.log("[Phase 1/3] Synthesizing all Thai voiceovers before bundling...");
  for (let i = 0; i < FOLDER_CONFIGS.length; i++) {
    const item = FOLDER_CONFIGS[i];
    console.log(`  -> Synthesizing voice for [${item.folderName}]...`);
    try {
      const ttsRes = await fetch("http://localhost:3000/api/synthesize-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: item.productName,
          price: item.price,
          customText: item.narrationScript,
          voiceType: "female",
          rate: "+12%",
          ttsEngine: "free",
          presetId: "vendor-live",
          intensity: "mid",
          polish: false,
        }),
      });
      const ttsData = await ttsRes.json();
      if (ttsData.success && ttsData.audioUrl) {
        item.voiceoverUrl = ttsData.audioUrl;
        item.voiceoverDurationSec = ttsData.duration || 15;
        console.log(`     Voice ready: ${item.voiceoverUrl} (${item.voiceoverDurationSec.toFixed(1)}s)`);
      } else {
        console.warn(`     TTS fallback notice:`, ttsData.error || ttsData);
      }
    } catch (err) {
      console.warn(`     TTS error for ${item.folderName}:`, err.message);
    }
  }

  // PHASE 2: Bundle Remotion compositions once (with all audio and images present in public/)
  console.log("\n[Phase 2/3] Bundling Remotion compositions (one-time build with all audio assets)...");
  const entryPoint = path.resolve("remotion/index.ts");
  const publicDir = path.resolve("public");
  const bundleLocation = await bundle({ entryPoint, publicDir });
  console.log("Bundle ready!\n");

  const results = [];

  // PHASE 3: Render each video
  console.log("[Phase 3/3] Rendering video clips for each folder...");
  for (let i = 0; i < FOLDER_CONFIGS.length; i++) {
    const item = FOLDER_CONFIGS[i];
    console.log(`----------------------------------------------------------------`);
    console.log(`[${i + 1}/${FOLDER_CONFIGS.length}] Rendering folder: "${item.folderName}"`);
    console.log(`Product: ${item.productName}`);

    const dbProduct = productsDb.find((p) => p.id === item.productId);
    const storyboard = dbProduct?.storyboard || {
      hook: { headline: item.productName, durationSec: 3 },
      scenes: item.images.slice(0, 3).map((_, idx) => ({
        highlightTitle: `จุดเด่นที่ ${idx + 1}`,
        highlightDesc: "คุณภาพเยี่ยม ตรงปก",
        imageIndex: idx,
        durationSec: 4,
      })),
      cta: { ctaTitle: "จิ้มตะกร้าส้มซ้ายล่างเลย!", durationSec: 3 },
      theme: { primaryColor: "#EE4D2D", accentColor: "#FFBA00", bgColor: "#FFF4E0" },
    };

    const inputProps = {
      productName: item.productName,
      price: item.price,
      images: item.images,
      hook: storyboard.hook,
      scenes: storyboard.scenes,
      cta: storyboard.cta,
      theme: storyboard.theme,
      styleDNA: storyboard.styleDNA,
      voiceoverUrl: item.voiceoverUrl || undefined,
      voiceoverDurationSec: item.voiceoverDurationSec || undefined,
      bgmUrl: "/audio/bgm-upbeat.mp3",
    };

    const compositions = await getCompositions(bundleLocation, { inputProps });
    const composition = compositions.find((c) => c.id === "ShopeeProductVideo");
    if (!composition) {
      throw new Error("Composition 'ShopeeProductVideo' not found");
    }

    const durationSec = (composition.durationInFrames / composition.fps).toFixed(1);
    console.log(
      `Rendering video: ${composition.durationInFrames} frames (${durationSec}s @ ${composition.fps}fps)...`
    );

    const timestamp = Date.now();
    const finalFilename = `shopee_${item.productId}_${timestamp}.mp4`;
    const publicRenderPath = path.resolve(`public/renders/${finalFilename}`);

    const startTime = Date.now();
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: "h264",
      outputLocation: publicRenderPath,
      inputProps,
      concurrency: 4,
      chromiumOptions: { enableMultiProcessOnLinux: true },
      onProgress: ({ progress }) => {
        const percent = Math.floor(progress * 100);
        if (percent % 25 === 0) {
          process.stdout.write(` ${percent}%`);
        }
      },
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nRender finished in ${elapsed}s! Saved to: ${publicRenderPath}`);

    // Copy to root ./renders
    const rootRenderPath = path.resolve(`renders/${finalFilename}`);
    await fs.copyFile(publicRenderPath, rootRenderPath);

    // Copy to user's folder in D:\งานที่ให้ AI ทำ\shopee\<folderName>
    const userFolder = path.join(BASE_DIR, item.folderName);
    await fs.mkdir(userFolder, { recursive: true });

    const targetInUserFolder1 = path.join(userFolder, finalFilename);
    const targetInUserFolder2 = path.join(userFolder, `shopee_video_${item.folderName}.mp4`);
    await fs.copyFile(publicRenderPath, targetInUserFolder1);
    await fs.copyFile(publicRenderPath, targetInUserFolder2);

    console.log(`Copied video to user folder: ${targetInUserFolder2}`);

    // Update DB
    if (dbProduct) {
      dbProduct.voiceoverUrl = item.voiceoverUrl || undefined;
      dbProduct.voiceoverDurationSec = item.voiceoverDurationSec || undefined;
      dbProduct.renderedVideoUrl = `/renders/${finalFilename}`;
      dbProduct.storyboard.narrationScript = item.narrationScript;
    }

    results.push({
      folder: item.folderName,
      product: item.productName,
      duration: `${durationSec}s`,
      elapsed: `${elapsed}s`,
      outputFile: targetInUserFolder2,
    });
  }

  // Save updated DB
  await fs.writeFile(
    path.resolve("data/products.json"),
    JSON.stringify(productsDb, null, 2),
    "utf-8"
  );
  console.log("\nDatabase data/products.json updated successfully.");

  console.log("\n================================================================");
  console.log("             ALL 6 FOLDER VIDEOS COMPLETED SUCCESSFULLY!         ");
  console.log("================================================================");
  results.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.folder}] ${r.product.substring(0, 35)}...`);
    console.log(`   Duration: ${r.duration} | Render Time: ${r.elapsed}`);
    console.log(`   Path: ${r.outputFile}\n`);
  });
}

main().catch((err) => {
  console.error("Batch rendering error:", err);
  process.exit(1);
});
