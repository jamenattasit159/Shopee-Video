// src/lib/shopeeLink.ts

export const ALLOWED_DOMAINS = ['shopee.co.th', 'shp.ee'];

export interface ParsedShareResult {
  url: string | null;
  title: string | null;
  promoTag: string | null;
  shopId: string | null;
  itemId: string | null;
}

/**
 * ป้องกัน SSRF: ตรวจสอบว่า URL เป็น HTTPS และอยู่ใน Allowlist ของ Shopee เท่านั้น
 */
export function assertAllowedDomain(u: string): URL {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(u);
  } catch {
    throw new Error('invalid_url');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('only_https');
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // ป้องกัน private IP หรือ localhost
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

function cleanTitleFromSlug(rawSlug: string): { title: string | null; promoTag: string | null } {
  try {
    let raw = rawSlug.replace(/-i\.\d+\.\d+$/, '');
    let decoded = decodeURIComponent(raw).replace(/^-+|-+$/g, '');
    let promoTag: string | null = null;
    const promoMatch = decoded.match(
      /^(?:\[([^\]]+)\]|(ลด\d+[^-]*|โค้ด[^-]*|ยกลัง\d*|แถม\d*))/i
    );
    if (promoMatch) {
      promoTag = promoMatch[1] || promoMatch[2];
      decoded = decoded.replace(promoMatch[0], '').replace(/^-+/, '');
    }

    // แปลง hyphen ให้เป็น space อย่างเหมาะสมทั้งภาษาไทยและอังกฤษ
    let title = decoded
      .replace(/-(?=[ก-๙])|(?<=[ก-๙])-/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return { title: title.length > 3 ? title : null, promoTag };
  } catch {
    return { title: null, promoTag: null };
  }
}

/**
 * แยก shopId และ itemId จาก URL ของ Shopee
 * รองรับรูปแบบ:
 * - /product/201488045/6439091330
 * - -i.201488045.6439091330
 * - /some-product-slug/201488045/6439091330
 * - Query parameters (?itemid=...&shopid=...)
 */
export function extractShopeeIds(url: string): { shopId: string | null; itemId: string | null } {
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

  try {
    const parsed = new URL(url);
    const qItemId = parsed.searchParams.get('itemid') || parsed.searchParams.get('itemId');
    const qShopId = parsed.searchParams.get('shopid') || parsed.searchParams.get('shopId');
    if (qItemId) {
      return { shopId: qShopId || null, itemId: qItemId };
    }
  } catch (err: any) {
    console.debug(`[shopeeLink] URL parse error for ${url}:`, err?.message);
  }

  return { shopId: null, itemId: null };
}

/**
 * ถอดรหัสชื่อสินค้าและ promoTag จาก URL Slug ของ Shopee (เช่น .../<slug>-i.<shopId>.<itemId> หรือ /<slug>)
 */
export function extractTitleFromUrl(url: string): { title: string | null; promoTag: string | null } {
  if (!url) return { title: null, promoTag: null };

  // 1. ตรวจสอบรูปแบบมาตรฐาน <slug>-i.<shopId>.<itemId>
  const matchSlugI = url.match(/\/([^\/?#]+)-i\.\d+\.\d+/);
  if (matchSlugI && matchSlugI[1]) {
    const res = cleanTitleFromSlug(matchSlugI[1]);
    if (res.title && res.title.length > 3) return res;
  }

  // 2. ตรวจสอบรูปแบบ /<slug>/<shopId>/<itemId>
  const matchSlugPath = url.match(/\/([^\/?#]+)\/\d{6,}\/\d{6,}/);
  if (matchSlugPath && matchSlugPath[1] && matchSlugPath[1] !== 'product') {
    const res = cleanTitleFromSlug(matchSlugPath[1]);
    if (res.title && res.title.length > 3) return res;
  }

  // 3. Fallback: ถอดรหัส slug แรกของ pathname บน shopee.co.th (เช่น /Mama's-Choice-เซรั่มบำรุงผิว)
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('shopee.co.th')) {
      const segments = parsed.pathname.split('/').filter(Boolean);
      const firstSegment = segments[0];
      const ignoredSegments = [
        'search',
        'cart',
        'user',
        'buyer',
        'portal',
        'api',
        'help',
        'daily_discover',
        'flash_sale',
        'mall',
      ];
      if (firstSegment && !ignoredSegments.includes(firstSegment.toLowerCase())) {
        const res = cleanTitleFromSlug(firstSegment);
        if (res.title && res.title.length > 3) return res;
      }
    }
  } catch (err: any) {
    console.debug(`[shopeeLink] URI decode error for slug:`, err?.message);
  }

  return { title: null, promoTag: null };
}

/**
 * Tier 0: แยกข้อความแชร์เป็น URL, ชื่อสินค้า, promoTag และ ids
 */
export function parseShareText(text: string): ParsedShareResult {
  if (!text || typeof text !== 'string') {
    return { url: null, title: null, promoTag: null, shopId: null, itemId: null };
  }

  const trimmed = text.trim();
  const urlMatch = trimmed.match(/https?:\/\/[^\s)]+/);
  const rawUrl = urlMatch ? urlMatch[0] : null;

  if (!rawUrl) {
    return { url: null, title: null, promoTag: null, shopId: null, itemId: null };
  }

  // รูปแบบ markdown link เช่น [ชื่อ](url)
  const mdMatch = trimmed.match(/^\[([\s\S]+?)\]\((https?:\/\/[^\s)]+)\)/);
  if (mdMatch) {
    let title = mdMatch[1]
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']')
      .replace(/\s*\|\s*Shopee.*$/i, '')
      .trim();

    let promoTag: string | null = null;
    const promoMatch = title.match(/^\[([^\]]{1,50})\]/);
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

  // ข้อความแชร์ทั่วไป: ชื่อสินค้าอยู่หน้า URL
  let titlePart = trimmed.split(rawUrl)[0]?.trim() || '';

  // ทำความสะอาด markdown fragments ตกค้างถ้ามี
  if (titlePart.endsWith('](') || titlePart.endsWith('(')) {
    titlePart = titlePart.replace(/\]?\($/, '').replace(/^\[/, '').trim();
  }

  // Unescape และตัดคำต่อท้ายเช่น "| Shopee Thailand"
  titlePart = titlePart
    .replace(/\\\[/g, '[')
    .replace(/\\\]/g, ']')
    .replace(/\s*\|\s*Shopee.*$/i, '')
    .trim();

  // ตรวจสอบ promoTag เช่น [ยกลัง12]
  let promoTag: string | null = null;
  const promoMatch = titlePart.match(/^\[([^\]]{1,50})\]/);
  if (promoMatch) {
    promoTag = promoMatch[1];
    titlePart = titlePart.replace(/^\[[^\]]+\]\s*/, '').trim();
  }

  // หากไม่มีชื่อสินค้าในข้อความแชร์ (เช่น วาง URL เปล่า) ให้พยายามถอดรหัสจาก URL Slug
  if (!titlePart && rawUrl) {
    const fromSlug = extractTitleFromUrl(rawUrl);
    if (fromSlug.title) {
      titlePart = fromSlug.title;
      promoTag = promoTag || fromSlug.promoTag;
    }
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

/**
 * Tier 1: ตามรีไดเรกต์ของลิงก์สั้น (เช่น s.shopee.co.th / shp.ee) อย่างปลอดภัย
 */
export async function resolveShortLink(url: string, maxHops = 5): Promise<string> {
  let cur = url;

  for (let i = 0; i < maxHops; i++) {
    assertAllowedDomain(cur);

    try {
      const res = await fetch(cur, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) {
        cur = new URL(loc, cur).toString();
        continue;
      }

      return cur;
    } catch (err: any) {
      if (err.message === 'domain_not_allowed' || err.message === 'only_https') {
        throw err;
      }
      return cur;
    }
  }

  throw new Error('too_many_redirects');
}
