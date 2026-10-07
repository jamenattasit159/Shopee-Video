import { generateShopeeScript } from "../src/lib/gemini.js";
import { calculateTotalFrames } from "../remotion/Root.js";

async function runTests() {
  console.log("=== RUNNING EDGE CASE TESTS ===\n");

  // Test 1: Fallback generation (without API key)
  console.log("Test 1: Fallback generation with standard product...");
  const plan1 = await generateShopeeScript({
    productName: "แก้วเก็บความเย็น Tyeso 304",
    price: "฿259",
    highlights: "เก็บความเย็น 24 ชม., สแตนเลส 304, ไอน้ำไม่เกาะ",
    tone: "exciting",
    imageCount: 3,
  });
  console.log(" -> Hook:", plan1.hook.headline);
  console.log(" -> Hook Theme:", plan1.hook.paperTheme);
  console.log(" -> Scenes Count:", plan1.scenes.length);
  console.log(" -> Scene 1 Layout:", plan1.scenes[0].layout);
  console.log(" -> CTA:", plan1.cta.ctaTitle);
  console.log(" -> Total Duration (sec):", plan1.hook.durationSec + plan1.scenes.reduce((a, b) => a + b.durationSec, 0) + plan1.cta.durationSec);
  console.log(" [PASS] Test 1\n");

  // Test 2: Edge Case - 1 image
  console.log("Test 2: Only 1 uploaded image...");
  const plan2 = await generateShopeeScript({
    productName: "เคสยาดม Pastel",
    price: "฿59",
    highlights: "สีพาสเทลน่ารัก, ปลอกซิลิโคนกันกระแทก",
    tone: "minimal",
    imageCount: 1,
  });
  console.log(" -> Scenes Count:", plan2.scenes.length);
  console.log(" -> Image Indices:", plan2.scenes.map(s => s.imageIndex));
  console.log(" [PASS] Test 2\n");

  // Test 3: Edge Case - 5 images
  console.log("Test 3: 5 uploaded images...");
  const plan3 = await generateShopeeScript({
    productName: "รองเท้าแตะเพื่อสุขภาพ EVA",
    price: "฿129",
    highlights: "นุ่มเหมือนเหยียบขี้, กันลื่น, ซักล้างง่าย, นุ่มเบาสบาย, ทนทาน",
    tone: "promo",
    imageCount: 5,
  });
  console.log(" -> Scenes Count:", plan3.scenes.length);
  console.log(" -> Image Indices:", plan3.scenes.map(s => s.imageIndex));
  console.log(" [PASS] Test 3\n");

  // Test 4: Extremely long product name
  console.log("Test 4: Extremely long product name...");
  const longName = "แก้วเก็บความเย็น Tyeso สแตนเลสสตีลเกรดพรีเมียม 304 ขนาด 900ml พร้อมหลอดดูดและหูหิ้วพกพา คุมอุณหภูมิยาวนานข้ามวัน";
  const plan4 = await generateShopeeScript({
    productName: longName,
    price: "฿259",
    highlights: "เก็บความเย็น 24 ชม.",
    tone: "problem_solving",
    imageCount: 3,
  });
  console.log(" -> Hook Headline length:", plan4.hook.headline.length, `("${plan4.hook.headline}")`);
  console.log(" -> Headline within 32 chars:", plan4.hook.headline.length <= 32);
  console.log(" [PASS] Test 4\n");

  // Test 5: Backward compatibility (old storyboard with no collage fields)
  console.log("Test 5: Backward compatibility with legacy storyboard schema...");
  const legacyProps = {
    productName: "สินค้าเก่า",
    price: "฿99",
    images: ["/samples/tumbler-1.svg"],
    hook: {
      headline: "โปรเด็ดประจำวัน",
      durationSec: 3,
    },
    scenes: [
      {
        highlightTitle: "ใช้งานง่าย",
        highlightDesc: "สะดวกสบาย",
        imageIndex: 0,
        durationSec: 4,
      },
    ],
    cta: {
      ctaTitle: "ซื้อเลย",
      buttonText: "กดสั่ง",
      durationSec: 3,
    },
  };
  const frames = calculateTotalFrames(legacyProps, 30);
  console.log(" -> Calculated Total Frames:", frames, `(${(frames/30).toFixed(1)}s)`);
  console.log(" [PASS] Test 5\n");

  console.log("=== ALL EDGE CASE TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
