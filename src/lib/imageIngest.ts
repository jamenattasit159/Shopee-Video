// src/lib/imageIngest.ts
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/**
 * ตรวจสอบความปลอดภัยของ URL รูปภาพ (เฉพาะ HTTPS และไม่ใช่ IP ภายใน)
 */
export function assertSafeImageUrl(imageUrl: string): URL {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    throw new Error('invalid_image_url');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('only_https_image_allowed');
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
    throw new Error('internal_ip_blocked');
  }

  return parsedUrl;
}

/**
 * ประมวลผล Image Buffer ด้วย sharp
 * 1. ตรวจสอบว่า decode ได้
 * 2. ปรับขนาดด้านยาวไม่เกิน 2,000px
 * 3. แปลงเป็น PNG คุณภาพสูง
 * 4. บันทึกลง public/uploads/
 */
export async function processAndSaveImageBuffer(
  buffer: Buffer,
  itemId: string,
  index: number = 0
): Promise<string> {
  if (!buffer || buffer.length === 0) {
    throw new Error('image_decode_failed');
  }

  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('image_size_exceeded_10mb');
  }

  try {
    const sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();

    if (!metadata || !metadata.width || !metadata.height) {
      throw new Error('image_decode_failed');
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const safeId = (itemId || 'img').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeId}_${index}_${Date.now()}.png`;
    const targetPath = path.join(uploadsDir, filename);

    // ปรับขนาดให้อยู่ในกรอบ 2000x2000px โดยคงอัตราส่วนเดิม (fit: inside)
    await sharpInstance
      .resize({
        width: 2000,
        height: 2000,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 8 })
      .toFile(targetPath);

    return `/uploads/${filename}`;
  } catch (err: any) {
    console.error('Sharp decode error:', err);
    throw new Error('image_decode_failed');
  }
}

/**
 * ดาวน์โหลดรูปภาพจาก URL อย่างปลอดภัย ตรวจสอบและบันทึกลง disk
 */
export async function downloadAndIngestImage(
  imageUrl: string,
  itemId: string,
  index: number = 0
): Promise<string> {
  assertSafeImageUrl(imageUrl);

  const res = await fetch(imageUrl, {
    method: 'GET',
    signal: AbortSignal.timeout(10000), // 10 วินาที timeout
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });

  if (!res.ok) {
    throw new Error(`image_fetch_failed: ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('image') && !contentType.includes('octet-stream')) {
    throw new Error('invalid_image_content_type');
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return await processAndSaveImageBuffer(buffer, itemId, index);
}
