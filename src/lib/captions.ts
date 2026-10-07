export interface CaptionPackage {
  styleName: string;
  styleDescription: string;
  captionText: string;
  hashtags: string[];
  fullPost: string;
}

export function generatePostCaptions(
  productName: string,
  price: string,
  highlights: string,
  ctaText?: string,
  originalUrl?: string
): CaptionPackage[] {
  const cleanHighlights = highlights
    .split(/[,.\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);

  const bulletPoints = cleanHighlights.map((h) => `✅ ${h}`).join("\n");
  const linkSuffix = originalUrl ? `\n🔗 สั่งซื้อได้ที่นี่: ${originalUrl}` : "";

  const commonHashtags = [
    "#Shopeeป้ายยา",
    "#ShopeeTH",
    "#รีวิวช้อปปี้",
    "#ของดีบอกต่อ",
    "#พิกัดในตะกร้าส้ม",
    "#ช้อปปี้ถูกชัวร์",
    "#TikTokป้ายยา",
    `#${productName.replace(/[^a-zA-Z0-9ก-๙]/g, "").slice(0, 15)}`,
  ];

  // 1. Viral Hype Style
  const viralCaption = `🔥 ใครกำลังเล็งตัวนี้อยู่บอกเลยว่าต้องรีบจัด! ${productName}
ลดเหลือเพียง ${price} เท่านั้น บอกเลยว่าคุ้มเกินราคามากก 😱

${bulletPoints}
${linkSuffix}

🛒 พิกัด: จิ้มที่ตะกร้าส้มมุมซ้ายล่างในคลิปได้เลยจ้า มีโค้ดส่งฟรีแจกด้วยน้า! 👇`;

  // 2. Authentic Review Style
  const reviewCaption = `✨ มารีวิวตามสัญญา! หลังจากได้ลองใช้ ${productName} แล้วชอบมากก
ดีไซน์สวย ตรงปก ไม่จกตา ในงบเบาๆ แค่ ${price} เท่านั้น

${bulletPoints}
${linkSuffix}

👉 พิกัดช้อป: กดที่ตะกร้าสีส้มด้านล่างซ้ายมือได้เลย แนะนำรีบเก็บโค้ดก่อนหมดน้า 📦`;

  // 3. Urgent Flash Sale Style
  const flashSaleCaption = `⚡ FLASH SALE วันนี้วันเดียว! ${productName}
ลดเดือดเหลือ ${price} (ปกติแพงกว่านี้เยอะมากก) ด่วนก่อนของจะหมดสต็อก! 🚨

${bulletPoints}
${linkSuffix}

🎟️ โค้ดส่วนลด + ส่งฟรีมีจำนวนจำกัด!
🛒 รีบจิ้มตะกร้าส้มซ้ายล่างแล้วกดสั่งซื้อด่วนเลย 👇`;

  return [
    {
      styleName: "🔥 สายป้ายยาตื่นเต้น (Viral Hype)",
      styleDescription: "กระตุ้นความอยากได้ ใช้ภาษาวัยรุ่น อีโมจิจัดเต็ม เหมาะกับ TikTok/Shopee Video",
      captionText: viralCaption,
      hashtags: commonHashtags,
      fullPost: `${viralCaption}\n\n${commonHashtags.join(" ")}`,
    },
    {
      styleName: "✨ รีวิวป้ายยาจริงใจ (Authentic Review)",
      styleDescription: "ฟีลเพื่อนบอกเพื่อน เล่าความประทับใจ น่าเชื่อถือ ลูกค้าตัดสินใจซื้อง่าย",
      captionText: reviewCaption,
      hashtags: commonHashtags,
      fullPost: `${reviewCaption}\n\n${commonHashtags.join(" ")}`,
    },
    {
      styleName: "⚡ จัดโปร Flash Sale เร่งด่วน (Urgency Deal)",
      styleDescription: "เน้นราคาพิเศษ จำกัดเวลา กระตุ้นให้คนดูรีบกดสั่งซื้อทันทีเพื่อไม่ให้พลาดสิทธิ์",
      captionText: flashSaleCaption,
      hashtags: commonHashtags,
      fullPost: `${flashSaleCaption}\n\n${commonHashtags.join(" ")}`,
    },
  ];
}
