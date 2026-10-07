export type FieldSource =
  | 'share-text'
  | 'redirect-url'
  | 'affiliate-api'
  | 'gemini'
  | 'screenshot'
  | 'user';

export type FieldStatus = 'ok' | 'review' | 'missing';

export interface DraftField<T> {
  value: T | null;
  source: FieldSource | null;
  status: FieldStatus; // ok = มาจากแหล่งน่าเชื่อถือ / review = ควรตรวจ / missing = ไม่พบ
  note?: string; // เช่น "ราคานี้อาจเปลี่ยนแปลง"
}

export interface DraftImage {
  path: string;
  source: FieldSource;
  verified: boolean;
}

export interface ProductDraftFacts {
  brand?: string;
  productType?: string;
  count?: string;
  pack?: string;
  claimsInTitle?: string[];
}

export interface ProductDraft {
  originalUrl: string; // ลิงก์ต้นฉบับทั้งเส้น (ห้ามตัด query ทิ้ง ใช้เป็นลิงก์ affiliate)
  resolvedUrl: string | null;
  shopId: string | null;
  itemId: string | null;
  name: DraftField<string>;
  price: DraftField<number>; // บาท
  originalPrice?: DraftField<number>;
  shopName?: DraftField<string>;
  promoTag?: DraftField<string>; // เช่น "ยกลัง12" ที่อยู่ในวงเล็บหน้าชื่อ
  images: DraftImage[];
  facts: ProductDraftFacts; // ข้อเท็จจริงที่ Gemini แยกจากชื่อ ใช้เท่านั้น ห้ามแต่งเพิ่ม
  category?: string; // เช่น baby, beauty, kitchen
  warnings: string[]; // เช่น "ภาพอาจไม่ตรงกับชื่อสินค้า"
  fetchedAt: string; // ISO time
}

export interface ProductImportMeta {
  originalUrl: string;
  shopId?: string | null;
  itemId?: string | null;
  fetchedAt: string;
  confirmedAt?: string;
}
