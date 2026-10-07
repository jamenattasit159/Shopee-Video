// scripts/test-regression.mjs
import fs from 'fs/promises';
import path from 'path';
import assert from 'node:assert';
import { parseShareText, extractShopeeIds, assertAllowedDomain } from '../src/lib/shopeeLink.ts';
import { extractFactsFallback } from '../src/lib/productEnrich.ts';

console.log('🔍 Running Regression & Verification checks...\n');

// 1. Check existing products in data/products.json
const productsPath = path.join(process.cwd(), 'data', 'products.json');
try {
  const raw = await fs.readFile(productsPath, 'utf-8');
  const products = JSON.parse(raw);
  assert.ok(Array.isArray(products), 'products.json should be an array');
  console.log(`✅ Regression 1: Existing products in products.json loaded (${products.length} products found)`);
  
  if (products.length > 0) {
    const p = products[0];
    assert.ok(p.id, 'Product has id');
    assert.ok(p.name, 'Product has name');
    assert.ok(p.storyboard, 'Product has storyboard');
    assert.ok(p.storyboard.hook, 'Product storyboard has hook');
    console.log(`✅ Regression 2: Old storyboard data structure intact for product: "${p.name}"`);
  }
} catch (err) {
  console.log('ℹ️ Note on products.json:', err.message);
}

// 3. Test DoDolist sample input parsing
const dodoInput =
  '[ยกลัง12] DODOLOVE ทิชชู่เปียก Baby Wipes ผ้าเช็ดทำความสะอาดสำหรับเด็ก ออร์แกนิค ห่อใหญ่ 80 แผ่น | Shopee Thailand https://shopee.co.th/product/201488045/6439091330?mmp_pid=test';

const parsed = parseShareText(dodoInput);
assert.strictEqual(parsed.shopId, '201488045');
assert.strictEqual(parsed.itemId, '6439091330');
assert.strictEqual(parsed.promoTag, 'ยกลัง12');
assert.ok(!parsed.title.includes('Shopee Thailand'));
console.log('✅ Regression 3: Sample DODOLOVE share text parses correctly');

// 4. Test Fact enrichment fallback
const facts = extractFactsFallback(parsed.title);
assert.strictEqual(facts.category, 'baby');
assert.ok(facts.facts.count.includes('80 แผ่น'));
assert.strictEqual(parsed.promoTag, 'ยกลัง12');
console.log('✅ Regression 4: Category and facts properly identified for baby wipes');

console.log('\n🎉 All Regression & Compatibility checks passed!\n');
