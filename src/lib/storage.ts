import fs from "fs/promises";
import path from "path";
import { ProductRecord } from "../../remotion/types";

const DATA_FILE = path.join(process.cwd(), "data", "products.json");

export async function ensureStorageDirectories(): Promise<void> {
  const dirs = [
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "public", "uploads"),
    path.join(process.cwd(), "public", "renders"),
    path.join(process.cwd(), "renders"),
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (mkdirErr: any) {
      if (mkdirErr?.code !== 'EEXIST') {
        console.warn(`[storage] Could not create directory ${dir}:`, mkdirErr?.message);
      }
    }
  }

  try {
    await fs.access(DATA_FILE);
  } catch (accessErr: any) {
    if (accessErr?.code === 'ENOENT') {
      await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
    } else {
      console.warn(`[storage] Access error on ${DATA_FILE}:`, accessErr?.message);
    }
  }
}

export async function getProducts(): Promise<ProductRecord[]> {
  await ensureStorageDirectories();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Error reading products.json:", error);
    return [];
  }
}

export async function getProductById(id: string): Promise<ProductRecord | null> {
  const products = await getProducts();
  return products.find((p) => p.id === id) || null;
}

export async function saveProduct(product: ProductRecord): Promise<void> {
  await ensureStorageDirectories();
  const products = await getProducts();
  const index = products.findIndex((p) => p.id === product.id);

  if (index >= 0) {
    products[index] = product;
  } else {
    products.unshift(product);
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), "utf-8");
}

export async function updateProductVideo(
  id: string,
  videoUrl: string
): Promise<void> {
  const products = await getProducts();
  const target = products.find((p) => p.id === id);
  if (target) {
    target.renderedVideoUrl = videoUrl;
    await fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), "utf-8");
  }
}
