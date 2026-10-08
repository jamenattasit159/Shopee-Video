// src/app/api/import-link/route.ts
import fs from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { downloadAndIngestImage } from '../../../lib/imageIngest';
import { enrichProductWithGemini } from '../../../lib/productEnrich';
import { fetchShopeeAffiliateProduct } from '../../../lib/shopeeAffiliate';
import {
  assertAllowedDomain,
  extractShopeeIds,
  extractTitleFromUrl,
  parseShareText,
  resolveShortLink,
} from '../../../lib/shopeeLink';
import { ProductDraft } from '../../../lib/types';

const CACHE_FILE = path.join(process.cwd(), 'data', 'import-cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 ชั่วโมง

// Simple in-memory rate limiter per IP: 20 requests per minute
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < 60000);
  if (recent.length >= 25) {
    return false;
  }
  recent.push(now);
  rateLimitMap.set(ip, recent);
  return true;
}

async function getCachedDraft(itemId: string): Promise<ProductDraft | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE, 'utf-8');
    const cache = JSON.parse(raw);
    const entry = cache[itemId];
    if (entry && Date.now() - entry.cachedAt < CACHE_TTL_MS) {
      return entry.draft;
    }
  } catch {
    // Cache miss or file doesn't exist yet
  }
  return null;
}

async function saveDraftToCache(itemId: string, draft: ProductDraft): Promise<void> {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });

    let cache: Record<string, { draft: ProductDraft; cachedAt: number }> = {};
    try {
      const raw = await fs.readFile(CACHE_FILE, 'utf-8');
      cache = JSON.parse(raw);
    } catch {
      cache = {};
    }

    cache[itemId] = {
      draft,
      cachedAt: Date.now(),
    };

    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write import cache:', err);
  }
}

async function processSingleInput(
  rawInput: string,
  bypassCache: boolean = false
): Promise<ProductDraft> {
  const warnings: string[] = [];

  if (!rawInput || typeof rawInput !== 'string' || rawInput.trim().length === 0) {
    throw {
      code: 'no_url',
      message: 'กรุณาระบุลิงก์สินค้าหรือข้อความแชร์จาก Shopee',
    };
  }

  if (rawInput.length > 2000) {
    throw {
      code: 'input_too_long',
      message: 'ข้อความที่วางมีความยาวเกินกำหนด (สูงสุด 2,000 ตัวอักษร)',
    };
  }

  // ตรวจจับกรณีผู้ใช้วางรหัสค้นหาในแอป Shopee (Shopee Search Code เช่น AHY-VQC-QNT)
  const trimmedInput = rawInput.trim();
  const searchCodeMatch = trimmedInput.match(/^([A-Za-z0-9]{3})-([A-Za-z0-9]{3})-([A-Za-z0-9]{3})$/);
  if (searchCodeMatch) {
    throw {
      code: 'shopee_search_code',
      message: `รหัส "${trimmedInput.toUpperCase()}" เป็นโค้ดสำหรับค้นหาในแอป Shopee (ไม่ใช่ลิงก์เว็บตรง)\n\nวิธีใช้งาน:\n1. เปิดแอป Shopee และวางรหัสนี้ในช่องค้นหา (Search Bar)\n2. กดเข้าหน้าสินค้า ➔ กดไอคอน "แชร์" ➔ เลือก "คัดลอกลิงก์" (Copy Link)\n3. นำลิงก์ที่ได้มาวางในช่องนี้ หรือใช้ปุ่ม "อัปโหลดภาพหน้าจอสินค้า (OCR)" แทนได้ทันทีครับ`,
    };
  }

  // Tier 0: Parse share text
  const parsed = parseShareText(rawInput);
  if (!parsed.url) {
    throw {
      code: 'no_url',
      message: 'ไม่พบลิงก์สินค้า Shopee ในข้อความที่วาง กรุณาตรวจสอบลิงก์อีกครั้ง',
    };
  }

  // SSRF Protection: Validate domain
  try {
    assertAllowedDomain(parsed.url);
  } catch (domainErr: any) {
    if (domainErr.message === 'only_https') {
      throw {
        code: 'domain_not_allowed',
        message: 'ลิงก์ต้องขึ้นต้นด้วย https:// เท่านั้น',
      };
    }
    throw {
      code: 'domain_not_allowed',
      message: 'อนุญาตเฉพาะลิงก์จาก Shopee (shopee.co.th หรือ shp.ee) เท่านั้น เพื่อความปลอดภัย',
    };
  }

  let originalUrl = parsed.url;
  let resolvedUrl: string | null = parsed.url;
  let shopId = parsed.shopId;
  let itemId = parsed.itemId;

  // Tier 1: ตามรีไดเรกต์ลิงก์สั้นหากยังไม่ได้ itemId
  if (!itemId) {
    try {
      resolvedUrl = await resolveShortLink(parsed.url);
      const extracted = extractShopeeIds(resolvedUrl);
      shopId = shopId || extracted.shopId;
      itemId = itemId || extracted.itemId;
    } catch (redirectErr: any) {
      warnings.push('ไม่สามารถตามลิงก์สั้นได้โดยตรง แต่จะพยายามอ่านข้อมูลเท่าที่มี');
    }
  }

  // ตรวจสอบแคชก่อน หากมีและไม่ได้กดดึงใหม่ (bypassCache)
  if (!bypassCache && itemId) {
    const cached = await getCachedDraft(itemId);
    // ต้องมีชื่อสินค้าด้วย ไม่ใช่แคชร่างที่ชื่อว่างเปล่า
    if (cached && cached.name?.value) {
      return cached;
    }
  }

  let finalTitle = parsed.title;
  let promoTag = parsed.promoTag;

  // หากยังไม่มีชื่อสินค้า ให้พยายามดึงจาก resolvedUrl หรือ originalUrl
  if (!finalTitle && (resolvedUrl || originalUrl)) {
    const fromUrl = extractTitleFromUrl(resolvedUrl || originalUrl);
    if (fromUrl.title) {
      finalTitle = fromUrl.title;
      promoTag = promoTag || fromUrl.promoTag;
    }
  }

  let priceValue: number | null = null;
  let originalPriceValue: number | null = null;
  let shopNameValue: string | null = null;
  let downloadedImages: { path: string; source: any; verified: boolean }[] = [];

  // Tier 2: Shopee Affiliate Open API (ถ้ามี credentials)
  if (itemId) {
    try {
      const affiliateData = await fetchShopeeAffiliateProduct(itemId, shopId, originalUrl);
      if (affiliateData) {
        if (!finalTitle && affiliateData.name) {
          finalTitle = affiliateData.name;
        }
        if (typeof affiliateData.price === 'number' && affiliateData.price > 0) {
          priceValue = affiliateData.price;
        }
        if (affiliateData.originalPrice) {
          originalPriceValue = affiliateData.originalPrice;
        }
        if (affiliateData.shopName) {
          shopNameValue = affiliateData.shopName;
        }

        // ดาวน์โหลดรูปภาพจาก API
        if (affiliateData.imageUrl) {
          try {
            const savedImg = await downloadAndIngestImage(affiliateData.imageUrl, itemId, 0);
            downloadedImages.push({
              path: savedImg,
              source: 'affiliate-api',
              verified: true,
            });
          } catch (imgErr) {
            console.warn('Failed to download image from Affiliate API:', imgErr);
            warnings.push('ไม่สามารถดาวน์โหลดรูปภาพจาก Shopee API อัตโนมัติได้');
          }
        }
      }
    } catch (apiErr) {
      console.warn('Tier 2 Affiliate API error:', apiErr);
    }
  }

  // Tier 3: Gemini Enrichment (สกัดข้อมูลโครงสร้าง + ตรวจรูป)
  let enrichedFacts = {};
  let detectedCategory = 'general';
  let imageMatchesName = true;

  if (finalTitle) {
    try {
      const firstImgPath = downloadedImages[0]?.path || null;
      const enrichResult = await enrichProductWithGemini(finalTitle, firstImgPath);
      enrichedFacts = enrichResult.facts || {};
      if (enrichResult.category) {
        detectedCategory = enrichResult.category;
      }
      imageMatchesName = enrichResult.imageMatchesName;
      if (enrichResult.warnings && enrichResult.warnings.length > 0) {
        warnings.push(...enrichResult.warnings);
      }
    } catch (enrichErr) {
      console.warn('Enrichment error:', enrichErr);
    }
  }

  // ตรวจสอบช่องที่ยังขาด เพื่อใส่คำเตือนและแนะนำขั้นตอนถัดไป
  if (!priceValue) {
    warnings.push('ดึงราคาอัตโนมัติไม่ได้ กรุณากรอกราคาเอง หรืออัปโหลดภาพหน้าจอเพื่อใช้ Gemini ช่วยอ่าน');
  }
  if (downloadedImages.length === 0) {
    warnings.push('ไม่พบรูปภาพสินค้าอัตโนมัติ กรุณาอัปโหลดรูปภาพสินค้าเพื่อสร้างวิดีโอ');
  }

  const draft: ProductDraft = {
    originalUrl,
    resolvedUrl,
    shopId,
    itemId,
    name: {
      value: finalTitle || null,
      source: finalTitle ? (parsed.title ? 'share-text' : 'affiliate-api') : null,
      status: finalTitle ? 'ok' : 'missing',
    },
    price: {
      value: priceValue,
      source: priceValue ? 'affiliate-api' : null,
      status: priceValue ? 'ok' : 'missing',
      note: priceValue ? 'ราคา ณ เวลาที่ดึง อาจเปลี่ยนแปลงตามโปรโมชัน' : undefined,
    },
    originalPrice: originalPriceValue
      ? {
          value: originalPriceValue,
          source: 'affiliate-api',
          status: 'ok',
        }
      : undefined,
    shopName: shopNameValue
      ? {
          value: shopNameValue,
          source: 'affiliate-api',
          status: 'ok',
        }
      : undefined,
    promoTag: promoTag
      ? {
          value: promoTag,
          source: 'share-text',
          status: 'ok',
        }
      : undefined,
    images: downloadedImages,
    facts: enrichedFacts,
    category: detectedCategory,
    warnings,
    fetchedAt: new Date().toISOString(),
  };

  // บันทึกลงแคชหากมี itemId
  if (itemId) {
    await saveDraftToCache(itemId, draft);
  }

  return draft;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'rate_limited',
            message: 'คุณทำรายการบ่อยเกินไป กรุณารอประมาณ 1 นาทีแล้วลองใหม่อีกครั้งครับ',
          },
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { input, inputs, bypassCache } = body;

    // Single input
    if (typeof input === 'string') {
      const draft = await processSingleInput(input, !!bypassCache);
      return NextResponse.json({ ok: true, draft });
    }

    // Multiple inputs (Batch mode: สูงสุด 10 รายการ, concurrency 2)
    if (Array.isArray(inputs) && inputs.length > 0) {
      const limitedInputs = inputs.slice(0, 10);
      const results: { success: boolean; draft?: ProductDraft; error?: string }[] = [];

      // Concurrency 2 pool
      for (let i = 0; i < limitedInputs.length; i += 2) {
        const chunk = limitedInputs.slice(i, i + 2);
        const chunkPromises = chunk.map(async (inp) => {
          try {
            const draft = await processSingleInput(inp, !!bypassCache);
            return { success: true, draft };
          } catch (err: any) {
            return {
              success: false,
              error: err?.message || 'ไม่สามารถดึงข้อมูลรายการนี้ได้',
            };
          }
        });
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
      }

      return NextResponse.json({ ok: true, batch: results });
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'invalid_request',
          message: 'กรุณาระบุฟิลด์ input หรือ inputs ในคำขอ',
        },
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in /api/import-link:', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code || 'internal_error',
          message: error.message || 'เกิดข้อผิดพลาดในการนำเข้าลิงก์ กรุณาลองใหม่อีกครั้ง',
        },
      },
      { status: 500 }
    );
  }
}
