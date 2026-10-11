import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const PRESETS = [
  {
    id: "vendor-live",
    nameTh: "พ่อค้าไลฟ์สด",
    desc: "พลังงานสูง ยิ้มในน้ำเสียง พูดเร็วขึ้นเล็กน้อย เน้นคำสำคัญและราคา",
    atempo: 1.08,
    targetLufs: -14,
  },
  {
    id: "market-hype",
    nameTh: "ตลาดนัดตื่นเต้น",
    desc: "ตื่นเต้นกระตือรือร้น จังหวะกระชับ เว้นจังหวะสั้นๆ ก่อนบอกราคา",
    atempo: 1.10,
    targetLufs: -14,
  },
  {
    id: "friendly-trust",
    nameTh: "เพื่อนแนะนำของ",
    desc: "อบอุ่น เป็นกันเอง ไม่เร่งขาย เหมือนแนะนำให้เพื่อนสนิท",
    atempo: 1.03,
    targetLufs: -14,
  },
  {
    id: "whisper-secret",
    nameTh: "กระซิบของดี",
    desc: "กระซิบเล่าความลับน่ารัก เสียงใกล้ไมค์ พลังงานต่ำแต่ตื่นเต้น",
    atempo: 1.00,
    targetLufs: -14,
  },
  {
    id: "calm-reviewer",
    nameTh: "รีวิวจริงจัง",
    desc: "นิ่ง มั่นใจ ชัดเจน เหมือนผู้รีวิวที่ใช้จริงและเชี่ยวชาญ",
    atempo: 1.02,
    targetLufs: -14,
  },
  {
    id: "flash-close",
    nameTh: "เร่งปิดการขาย",
    desc: "ชัดเจนมั่นใจ เร่งจังหวะเล็กน้อย ชวนกดตะกร้าส้มทันที",
    atempo: 1.08,
    targetLufs: -14,
  },
];

const INTENSITIES = ["low", "mid", "high"];

async function main() {
  const outDir = path.join(rootDir, "out", "voice-samples");
  const audioDir = path.join(outDir, "audio");
  await fs.mkdir(audioDir, { recursive: true });

  const testText =
    "ทุกคนนน เจอของเด็ดอีกแล้ว แก้วเก็บความเย็น Tyeso สแตนเลส 304 เก็บเย็นสะใจ 24 ชั่วโมง ตอนนี้จัดโปรพิเศษเหลือเพียง 259 บาทเท่านั้น พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง รีบกดก่อนของหมดน้า!";

  console.log("Generating Voice Presets Evaluation Samples...");
  console.log(`Target directory: ${outDir}`);

  // Test calling synthesize-voice endpoint on running dev server
  const serverUrl = "http://localhost:3000";

  const matrix = [];

  for (const preset of PRESETS) {
    for (const intensity of INTENSITIES) {
      console.log(`Synthesizing: ${preset.id} (${intensity})...`);
      let polishedFile = null;
      let rawFile = null;

      try {
        const res = await fetch(`${serverUrl}/api/synthesize-voice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customText: testText,
            presetId: preset.id,
            intensity,
            polish: true,
            previewOnly: true,
          }),
        });

        const data = await res.json();
        if (data && data.success && data.files && data.files[0]) {
          const file = data.files[0];
          // Copy to outDir/audio
          const sourcePath = path.join(rootDir, "public", file.url.replace(/^\//, ""));
          const targetName = `${preset.id}_${intensity}_polished.wav`;
          const targetPath = path.join(audioDir, targetName);
          if (fsSync.existsSync(sourcePath)) {
            await fs.copyFile(sourcePath, targetPath);
            polishedFile = `audio/${targetName}`;
          }

          if (file.rawUrl) {
            const rawSource = path.join(rootDir, "public", file.rawUrl.replace(/^\//, ""));
            const rawTargetName = `${preset.id}_${intensity}_raw.wav`;
            const rawTargetPath = path.join(audioDir, rawTargetName);
            if (fsSync.existsSync(rawSource)) {
              await fs.copyFile(rawSource, rawTargetPath);
              rawFile = `audio/${rawTargetName}`;
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to synthesize ${preset.id} (${intensity}):`, err.message);
      }

      matrix.push({
        presetId: preset.id,
        nameTh: preset.nameTh,
        desc: preset.desc,
        intensity,
        polishedFile: polishedFile || "",
        rawFile: rawFile || polishedFile || "",
      });
    }
  }

  // Generate modern HTML evaluation dashboard
  const htmlContent = `<!DOCTYPE html>
<html lang="th" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ชุดตัวอย่างเสียงพากย์พ่อค้า (Voice Style Presets Evaluation)</title>
  <link href="https://cdn.jsdelivr.net/npm/daisyui@4.12.10/dist/full.min.css" rel="stylesheet" type="text/css" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Noto Sans Thai', sans-serif; }
  </style>
</head>
<body class="bg-base-200 text-base-content min-h-screen p-4 sm:p-8">
  <div class="max-w-5xl mx-auto space-y-8">
    <!-- Header -->
    <div class="card bg-base-100 border border-base-300 rounded-2xl p-6 shadow-sm">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="badge badge-primary font-semibold">Voice Style Presets</span>
            <span class="badge badge-outline">6 สไตล์ &times; 3 ระดับ</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold">ชุดตัวอย่างเสียงพากย์พ่อค้า (ประเมินด้วยหู)</h1>
          <p class="text-sm text-base-content/70 mt-1">
            คลิกฟังเปรียบเทียบแต่ละสไตล์ ระดับความแรง และการขัดเสียง พร้อมให้คะแนนประเมิน
          </p>
        </div>
        <div class="alert alert-info py-2 px-3 text-xs rounded-xl max-w-sm">
          <span>💡 <strong>คำชี้แจงสำคัญ:</strong> AI Agent ไม่สามารถฟังเสียงจริงด้วยตนเองได้ จึงสร้างหน้านี้เพื่อให้ท่านทดลองฟังและตัดสินความสมจริงด้วยหูของท่านเอง</span>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-base-300/60 bg-base-200/50 rounded-xl p-3 text-xs">
        <span class="font-bold text-primary">ประโยคทดสอบมาตรฐาน:</span>
        <p class="text-base-content/80 mt-0.5">"${testText}"</p>
      </div>
    </div>

    <!-- Presets Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${PRESETS.map((p) => {
        const presetItems = matrix.filter((m) => m.presetId === p.id);
        return `
        <div class="card bg-base-100 border border-base-300 rounded-2xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between border-b border-base-200 pb-3">
            <div>
              <h2 class="text-lg font-bold flex items-center gap-2">
                ${p.nameTh}
                <span class="badge badge-sm badge-ghost text-xs">${p.id}</span>
              </h2>
              <p class="text-xs text-base-content/70 mt-0.5">${p.desc}</p>
            </div>
            <div class="text-right text-[11px] text-base-content/50">
              <div>เร่งสปีด: ${p.atempo}x</div>
              <div>ความดัง: ${p.targetLufs} LUFS</div>
            </div>
          </div>

          <!-- Intensities -->
          <div class="space-y-3">
            ${presetItems
              .map((item) => `
              <div class="bg-base-200/60 rounded-xl p-3 border border-base-300/40 space-y-2">
                <div class="flex items-center justify-between text-xs">
                  <span class="font-semibold">
                    ความแรง: <span class="badge badge-xs ${
                      item.intensity === "high"
                        ? "badge-warning"
                        : item.intensity === "mid"
                        ? "badge-primary"
                        : "badge-ghost"
                    }">${item.intensity.toUpperCase()}</span>
                  </span>
                  <span class="text-[11px] text-base-content/60">
                    ${item.intensity === "low" ? "เบา (ธรรมชาติ)" : item.intensity === "mid" ? "กลาง (มาตรฐาน)" : "จัดเต็ม (พลังงานสูง)"}
                  </span>
                </div>

                <!-- Audio Players -->
                <div class="space-y-1.5">
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] w-20 text-success font-medium">✨ ขัดเสียงแล้ว:</span>
                    ${
                      item.polishedFile
                        ? `<audio controls src="${item.polishedFile}" class="h-8 flex-1"></audio>`
                        : `<span class="text-[11px] text-base-content/40">ยังไม่มีไฟล์เสียง</span>`
                    }
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-[11px] w-20 text-base-content/60">🎙️ เสียงดิบ:</span>
                    ${
                      item.rawFile
                        ? `<audio controls src="${item.rawFile}" class="h-8 flex-1"></audio>`
                        : `<span class="text-[11px] text-base-content/40">ยังไม่มีไฟล์เสียง</span>`
                    }
                  </div>
                </div>
              </div>
            `)
              .join("")}
          </div>

          <!-- Evaluation Form -->
          <div class="pt-3 border-t border-base-200 space-y-2 text-xs">
            <span class="font-bold text-base-content/80">ให้คะแนนประเมินสไตล์นี้ (1-5 ดาว):</span>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div class="bg-base-200/40 p-2 rounded-lg">
                <div class="text-[11px] text-base-content/70">(ก) เหมือนเสียงฉัน:</div>
                <div class="rating rating-xs mt-1">
                  <input type="radio" name="rating-me-${p.id}" class="mask mask-star-2 bg-orange-400" />
                  <input type="radio" name="rating-me-${p.id}" class="mask mask-star-2 bg-orange-400" />
                  <input type="radio" name="rating-me-${p.id}" class="mask mask-star-2 bg-orange-400" checked />
                  <input type="radio" name="rating-me-${p.id}" class="mask mask-star-2 bg-orange-400" />
                  <input type="radio" name="rating-me-${p.id}" class="mask mask-star-2 bg-orange-400" />
                </div>
              </div>
              <div class="bg-base-200/40 p-2 rounded-lg">
                <div class="text-[11px] text-base-content/70">(ข) พ่อค้าน่าซื้อ:</div>
                <div class="rating rating-xs mt-1">
                  <input type="radio" name="rating-hype-${p.id}" class="mask mask-star-2 bg-orange-400" />
                  <input type="radio" name="rating-hype-${p.id}" class="mask mask-star-2 bg-orange-400" />
                  <input type="radio" name="rating-hype-${p.id}" class="mask mask-star-2 bg-orange-400" />
                  <input type="radio" name="rating-hype-${p.id}" class="mask mask-star-2 bg-orange-400" checked />
                  <input type="radio" name="rating-hype-${p.id}" class="mask mask-star-2 bg-orange-400" />
                </div>
              </div>
              <div class="bg-base-200/40 p-2 rounded-lg">
                <div class="text-[11px] text-base-content/70">(ค) เป็นธรรมชาติ:</div>
                <div class="rating rating-xs mt-1">
                  <input type="radio" name="rating-nat-${p.id}" class="mask mask-star-2 bg-orange-400" />
                  <input type="radio" name="rating-nat-${p.id}" class="mask mask-star-2 bg-orange-400" />
                  <input type="radio" name="rating-nat-${p.id}" class="mask mask-star-2 bg-orange-400" />
                  <input type="radio" name="rating-nat-${p.id}" class="mask mask-star-2 bg-orange-400" checked />
                  <input type="radio" name="rating-nat-${p.id}" class="mask mask-star-2 bg-orange-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
        `;
      }).join("")}
    </div>
  </div>
</body>
</html>`;

  const htmlPath = path.join(outDir, "index.html");
  await fs.writeFile(htmlPath, htmlContent, "utf-8");
  console.log(`Generated HTML dashboard: ${htmlPath}`);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
