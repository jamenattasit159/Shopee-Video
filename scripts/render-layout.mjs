import sharp from 'sharp';

export const cleanText = (value) => String(value ?? '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s+/g, ' ').trim();
export const xml = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// Only a complete, positive monetary value may be presented as a price.
export function displayPrice(value) {
  const text = String(value ?? '').trim();
  if (!/^(?:฿\s*)?\d+(?:,\d{3})*(?:\.\d{1,2})?\s*(?:บาท|THB)?$/i.test(text)) return '';
  const amount = Number(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? `฿${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : '';
}

const measurements = new Map();
async function width(text, size, weight) {
  if (!text) return 0;
  const key = `${size}/${weight}/${text}`;
  if (!measurements.has(key)) {
    const { info } = await sharp({ text: { text: xml(text), font: `Tahoma ${weight} ${size}`, dpi: 72, rgba: true } }).png().toBuffer({ resolveWithObject: true });
    measurements.set(key, info.width);
  }
  return measurements.get(key);
}

// Ignore previously split model output: reflow the original sentence at real Thai word boundaries.
export async function fitThaiText(value, maxWidth = 880, maxSize = 72, maxLines = 2, weight = 'Bold') {
  const text = cleanText(value);
  if (!text) return { lines: [], size: maxSize };
  const segments = [...new Intl.Segmenter('th', { granularity: 'word' }).segment(text)].map((s) => s.segment);
  // ICU can tokenize product vocabulary such as ทิชชู่ as ทิช / ชู่.
  const protectedRanges = [];
  for (const phrase of ['ทิชชู่เปียก', 'ทิชชู่', 'ปลอดภัย', 'แอลกอฮอล์', 'ออร์แกนิค', 'DODOLOVE', 'ตะกร้า', 'Shopee']) {
    let start = text.indexOf(phrase);
    while (start !== -1) { protectedRanges.push([start, start + phrase.length]); start = text.indexOf(phrase, start + 1); }
  }
  const boundaries = [];
  let offset = 0;
  for (const segment of segments) { offset += segment.length; if (offset < text.length && !protectedRanges.some(([a, b]) => offset > a && offset < b)) boundaries.push(offset); }
  for (let size = maxSize; size >= Math.min(18, maxSize); size -= 2) {
    if (await width(text, size, weight) <= maxWidth) return { lines: [text], size };
    if (maxLines === 1) continue;
    let best;
    for (const boundary of boundaries) {
      const lines = [text.slice(0, boundary).trim(), text.slice(boundary).trim()];
      if (lines.some((s) => !s)) continue;
      const widths = await Promise.all(lines.map((s) => width(s, size, weight)));
      if (Math.max(...widths) > maxWidth) continue;
      const score = Math.abs(widths[0] - widths[1]);
      if (!best || score < best.score) best = { lines, size, score };
    }
    if (best) return { lines: best.lines, size: best.size };
  }
  throw new Error(`ข้อความยาวเกินพื้นที่วิดีโอ กรุณาย่อข้อความ: ${text}`);
}

export async function buildSceneOverlaySvg({ role, headline, subheadline, captionText, badgeText, productName, price, buttonText, index, count, video, primaryColor }) {
  const accent = /^#[\da-f]{6}$/i.test(primaryColor || '') ? primaryColor : '#ee4d2d';
  const title = await fitThaiText(headline || productName, 856, 76);
  const description = cleanText(subheadline);
  const caption = cleanText(captionText);
  const support = await fitThaiText(caption || description, 850, 42, 2, 'Regular');
  const badge = await fitThaiText(badgeText || (role === 'cta' ? 'ดูรายละเอียดและราคาล่าสุด' : 'รายละเอียดสินค้า'), 740, 28, 1, 'Regular');
  let product = { lines: [], size: 25 };
  if (title.lines.length === 1) {
    try { product = await fitThaiText(productName, 850, 25, 1, 'Regular'); }
    catch { /* The optional identifier must not crowd the main headline. */ }
  }
  const cta = await fitThaiText(buttonText || 'ดูสินค้าที่ Shopee', 780, 42, 1);
  const amount = displayPrice(price);
  const text = (layout, x, y, fill = '#ffffff', weight = 400, anchor = 'start') => layout.lines.map((line, i) => `<text x="${x}" y="${y + i * layout.size * 1.5}" font-family="Tahoma, Noto Sans Thai, sans-serif" font-size="${layout.size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${xml(line)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>
      <linearGradient id="top" x2="0" y2="1"><stop stop-color="#101416" stop-opacity=".96"/><stop offset="1" stop-color="#101416" stop-opacity="0"/></linearGradient>
      <linearGradient id="bottom" x2="0" y2="1"><stop stop-color="#101416" stop-opacity="0"/><stop offset=".35" stop-color="#101416" stop-opacity=".95"/><stop offset="1" stop-color="#101416"/></linearGradient>
    </defs>
    ${video ? '<rect width="1080" height="550" fill="url(#top)"/><rect y="1250" width="1080" height="670" fill="url(#bottom)"/>' : ''}
    <rect x="72" y="116" width="6" height="31" rx="3" fill="${xml(accent)}"/>
    ${text(badge, 96, 142, '#e5e7eb')}
    <text x="952" y="142" font-family="Tahoma" font-size="25" fill="#e5e7eb" text-anchor="end">${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}</text>
    ${text(title, 72, 254, '#ffffff', 700)}
    ${text(product, 72, 390, '#b7c1c7')}
    ${role === 'cta' && amount ? `<text x="72" y="1500" font-family="Tahoma" font-size="72" font-weight="700" fill="#ffffff">${xml(amount)}</text>` : text(support, 72, 1475)}
    ${role === 'cta' ? `<rect x="72" y="1560" width="828" height="110" rx="24" fill="${xml(accent)}"/>${text(cta, 486, 1631, '#ffffff', 700, 'middle')}` : `<path d="M72 1600H900" stroke="#ffffff" stroke-opacity=".16"/><text x="72" y="1655" font-family="Tahoma" font-size="30" fill="#e5e7eb">ดูรายละเอียดสินค้าในตะกร้า</text>`}
  </svg>`;
}
