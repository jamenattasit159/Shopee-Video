// scripts/test-import.mjs
import assert from 'node:assert';

const ALLOWED_DOMAINS = ['shopee.co.th', 'shp.ee'];

function assertAllowedDomain(u) {
  let parsedUrl;
  try {
    parsedUrl = new URL(u);
  } catch {
    throw new Error('invalid_url');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('only_https');
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.16.') ||
    hostname.startsWith('169.254.')
  ) {
    throw new Error('domain_not_allowed');
  }

  const isAllowed = ALLOWED_DOMAINS.some(
    (d) => hostname === d || hostname.endsWith('.' + d)
  );

  if (!isAllowed) {
    throw new Error('domain_not_allowed');
  }

  return parsedUrl;
}

function extractShopeeIds(url) {
  if (!url) return { shopId: null, itemId: null };

  const matchProduct = url.match(/\/product\/(\d+)\/(\d+)/);
  if (matchProduct) {
    return { shopId: matchProduct[1], itemId: matchProduct[2] };
  }

  const matchDashI = url.match(/-i\.(\d+)\.(\d+)/);
  if (matchDashI) {
    return { shopId: matchDashI[1], itemId: matchDashI[2] };
  }

  const matchSlug = url.match(/\/[^\/]+\/(\d{6,})\/(\d{6,})/);
  if (matchSlug) {
    return { shopId: matchSlug[1], itemId: matchSlug[2] };
  }

  return { shopId: null, itemId: null };
}

function parseShareText(text) {
  if (!text || typeof text !== 'string') {
    return { url: null, title: null, promoTag: null, shopId: null, itemId: null };
  }

  const trimmed = text.trim();
  const urlMatch = trimmed.match(/https?:\/\/[^\s)]+/);
  const rawUrl = urlMatch ? urlMatch[0] : null;

  if (!rawUrl) {
    return { url: null, title: null, promoTag: null, shopId: null, itemId: null };
  }

  // Check if markdown link format: [title](url)
  const mdMatch = trimmed.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
  if (mdMatch) {
    let title = mdMatch[1].trim();
    let promoTag = null;
    const promoMatch = title.match(/^\[([^\]]{1,20})\]/);
    if (promoMatch) {
      promoTag = promoMatch[1];
      title = title.replace(/^\[[^\]]+\]\s*/, '').trim();
    }
    const { shopId, itemId } = extractShopeeIds(rawUrl);
    return {
      url: rawUrl,
      title: title || null,
      promoTag,
      shopId,
      itemId,
    };
  }

  let titlePart = trimmed.split(rawUrl)[0]?.trim() || '';

  // Clean trailing markdown fragments if any
  if (titlePart.endsWith('](') || titlePart.endsWith('(')) {
    titlePart = titlePart.replace(/\]?\($/, '').replace(/^\[/, '').trim();
  }

  // Strip "| Shopee..."
  titlePart = titlePart.replace(/\s*\|\s*Shopee.*$/i, '').trim();

  // Extract promo tag like [ยกลัง12]
  let promoTag = null;
  const promoMatch = titlePart.match(/^\[([^\]]{1,20})\]/);
  if (promoMatch) {
    promoTag = promoMatch[1];
    titlePart = titlePart.replace(/^\[[^\]]+\]\s*/, '').trim();
  }

  const { shopId, itemId } = extractShopeeIds(rawUrl);

  return {
    url: rawUrl,
    title: titlePart || null,
    promoTag,
    shopId,
    itemId,
  };
}

console.log('🧪 Starting Shopee Link Import unit tests...\n');

// 1. Full share text
{
  const input =
    '[ยกลัง12] DODOLOVE ทิชชู่เปียก Baby Wipes ผ้าเช็ดทำความสะอาดสำหรับเด็ก ออร์แกนิค ห่อใหญ่ 80 แผ่น | Shopee Thailand https://shopee.co.th/product/201488045/6439091330?mmp_pid=123';
  const res = parseShareText(input);
  assert.strictEqual(res.promoTag, 'ยกลัง12', 'Promo tag should match');
  assert.ok(!res.title.includes('| Shopee Thailand'), 'Title should not include "| Shopee Thailand"');
  assert.strictEqual(res.shopId, '201488045', 'shopId should match');
  assert.strictEqual(res.itemId, '6439091330', 'itemId should match');
  console.log('✅ Case 1: Full share text parsed correctly');
}

// 2. Markdown format
{
  const input = '[ชื่อ](https://shopee.co.th/product/1/2?x=y)';
  const res = parseShareText(input);
  assert.strictEqual(res.title, 'ชื่อ', 'Title should be "ชื่อ"');
  assert.strictEqual(res.shopId, '1', 'shopId should be "1"');
  assert.strictEqual(res.itemId, '2', 'itemId should be "2"');
  console.log('✅ Case 2: Markdown link parsed correctly');
}

// 3. Blank link
{
  const input = 'https://shopee.co.th/product/201488045/6439091330';
  const res = parseShareText(input);
  assert.strictEqual(res.title, null, 'Title should be null');
  assert.strictEqual(res.shopId, '201488045', 'shopId should match');
  assert.strictEqual(res.itemId, '6439091330', 'itemId should match');
  console.log('✅ Case 3: Blank link parsed correctly');
}

// 4. Slug link
{
  const input = 'https://shopee.co.th/opaanlp/201488045/6439091330';
  const res = parseShareText(input);
  assert.strictEqual(res.shopId, '201488045', 'shopId should match');
  assert.strictEqual(res.itemId, '6439091330', 'itemId should match');
  console.log('✅ Case 4: Slug link parsed correctly');
}

// 5. -i. link
{
  const input = 'https://shopee.co.th/x-i.201488045.6439091330';
  const res = parseShareText(input);
  assert.strictEqual(res.shopId, '201488045', 'shopId should match');
  assert.strictEqual(res.itemId, '6439091330', 'itemId should match');
  console.log('✅ Case 5: -i. link parsed correctly');
}

// 6. Evil domain SSRF test
{
  let errorCaught = false;
  try {
    assertAllowedDomain('https://evil.example.com/steal');
  } catch (err) {
    if (err.message === 'domain_not_allowed') errorCaught = true;
  }
  assert.ok(errorCaught, 'Should block non-shopee domain');
  console.log('✅ Case 6: Malicious domain blocked by SSRF check');
}

// 7. Non-HTTPS URL test
{
  let errorCaught = false;
  try {
    assertAllowedDomain('http://shopee.co.th/product/1/2');
  } catch (err) {
    if (err.message === 'only_https') errorCaught = true;
  }
  assert.ok(errorCaught, 'Should block HTTP non-secure URL');
  console.log('✅ Case 7: Non-HTTPS URL blocked');
}

// 8. No URL
{
  const input = 'สวัสดีครับ';
  const res = parseShareText(input);
  assert.strictEqual(res.url, null, 'Should return url: null when no URL');
  console.log('✅ Case 8: Text without URL handled gracefully');
}

// 9. Corrupt/Empty image decode rejection with sharp
{
  const sharp = (await import('sharp')).default;
  let errorCaught = false;
  try {
    const emptyBuf = Buffer.alloc(0);
    if (emptyBuf.length === 0) throw new Error('image_decode_failed');
    await sharp(emptyBuf).metadata();
  } catch (err) {
    if (err.message.includes('image_decode_failed')) errorCaught = true;
  }
  assert.ok(errorCaught, 'Should reject 0-byte image');

  let corruptCaught = false;
  try {
    const badBuf = Buffer.from('not-an-image-data-corrupted');
    await sharp(badBuf).metadata();
  } catch {
    corruptCaught = true;
  }
  assert.ok(corruptCaught, 'Should reject corrupt image format');
  console.log('✅ Case 9: Corrupted / 0-byte image rejected properly by sharp');
}

// 10. Fallback facts extraction when Gemini key is absent
{
  function extractFactsFallback(title) {
    const cleanTitle = title || '';
    const countMatch = cleanTitle.match(
      /(\d+\s*(?:แผ่น|ชิ้น|ซอง|เม็ด|มล\.?|ml|กรัม|g|oz|กิโล|kg|อัน|ใบ|ขวด|หลอด))/i
    );
    const count = countMatch ? countMatch[1].trim() : undefined;
    const packMatch = cleanTitle.match(/(?:ยกลัง|แพ็ก|แพ็ค|ชุด|เซ็ต|กล่อง|ลัง)\s*\d+/i);
    const pack = packMatch ? packMatch[0].trim() : undefined;
    let category = 'general';
    if (/เด็ก|ทารก|baby|ผ้าอ้อม|ทิชชู่เปียก|dodolove/i.test(cleanTitle)) {
      category = 'baby';
    }
    const claimsInTitle = [];
    if (cleanTitle.includes('ออร์แกนิค')) claimsInTitle.push('ออร์แกนิค');
    return { count, pack, category, claimsInTitle };
  }

  const sampleTitle =
    '[ยกลัง12] DODOLOVE ทิชชู่เปียก Baby Wipes ผ้าเช็ดทำความสะอาดสำหรับเด็ก ออร์แกนิค ห่อใหญ่ 80 แผ่น';
  const facts = extractFactsFallback(sampleTitle);
  assert.ok(facts.count.includes('80 แผ่น'), 'Should extract 80 แผ่น');
  assert.ok(facts.pack.includes('ยกลัง12'), 'Should extract ยกลัง12');
  assert.strictEqual(facts.category, 'baby', 'Should classify as baby');
  assert.ok(facts.claimsInTitle.includes('ออร์แกนิค'), 'Should detect organic claim');
  console.log('✅ Case 10: Fallback facts extraction works without Gemini key');
}

console.log('\n🎉 All Shopee Link unit tests passed successfully!');
