// src/lib/shopeeAffiliate.ts
import crypto from 'crypto';

export interface ShopeeAffiliateProductInfo {
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  shopName?: string;
  offerLink?: string;
  rating?: number;
  salesCount?: number;
}

/**
 * สร้าง Signature สำหรับ Shopee Affiliate Open API (HMAC-SHA256)
 */
function generateSignature(appId: string, secret: string, timestamp: number, payload: string): string {
  const baseString = `${appId}${timestamp}${payload}${secret}`;
  return crypto.createHash('sha256').update(baseString).digest('hex');
}

/**
 * Tier 2: ดึงข้อมูลสินค้าจาก Shopee Affiliate Open API (เฉพาะเมื่อมี Credentials)
 * หากไม่มี App ID / Secret ใน env หรือเรียกไม่สำเร็จ ให้คืนค่า null อย่างปลอดภัย (ห้าม crash)
 */
export async function fetchShopeeAffiliateProduct(
  itemId: string,
  shopId?: string | null,
  originalUrl?: string
): Promise<ShopeeAffiliateProductInfo | null> {
  const appId = process.env.SHOPEE_AFFILIATE_APP_ID;
  const secret = process.env.SHOPEE_AFFILIATE_SECRET;

  if (!appId || !secret || !appId.trim() || !secret.trim()) {
    // ไม่ได้ตั้งค่า credentials -> คืนค่า null เงียบๆ เพื่อให้ระบบใช้ข้อมูลจาก Tier 0-1 และ Tier 3 ต่อไป
    return null;
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    // GraphQL query หรือ ProductOfferV2 endpoint ของ Shopee Affiliate Open API
    const query = `
      query GetProductDetail($itemId: Long, $shopId: Long) {
        productOfferV2(itemId: $itemId, shopId: $shopId) {
          nodes {
            itemId
            productName
            price
            originalPrice
            imageUrl
            shopName
            offerLink
            rating
            sales
          }
        }
      }
    `;

    const payload = JSON.stringify({
      query,
      variables: {
        itemId: itemId ? Number(itemId) : undefined,
        shopId: shopId ? Number(shopId) : undefined,
      },
    });

    const signature = generateSignature(appId, secret, timestamp, payload);

    const endpoint = 'https://open-api.affiliate.shopee.co.th/graphql';

    const res = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
      },
      body: payload,
    });

    if (!res.ok) {
      console.warn(`Shopee Affiliate API returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const product = data?.data?.productOfferV2?.nodes?.[0];

    if (!product) {
      return null;
    }

    return {
      name: product.productName,
      price: Number(product.price) || 0,
      originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
      imageUrl: product.imageUrl,
      shopName: product.shopName,
      offerLink: product.offerLink || originalUrl,
      rating: product.rating,
      salesCount: product.sales,
    };
  } catch (err) {
    console.warn('Shopee Affiliate API error, falling back to draft:', err);
    return null;
  }
}
