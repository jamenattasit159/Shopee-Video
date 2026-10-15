import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { NextRequest } from 'next/server';
import { POST } from '../src/app/api/preflight/route.ts';

test('preflight uses the saved confirmation when the UI supplies only product id', async () => {
  const [record] = JSON.parse(await fs.readFile('data/products.json', 'utf8'));
  const response = await POST(new NextRequest('http://localhost:3000/api/preflight', { method: 'POST', body: JSON.stringify({ project: { ...record.storyboard, productName: record.name, price: record.price, images: record.images }, options: { productRecord: { id: record.id } } }) }));
  const body = await response.json();
  const confirmation = body.results.find((r) => r.id === 'product.confirmed');
  assert.equal(confirmation.pass, true, 'saved product was incorrectly treated as unconfirmed');
});
