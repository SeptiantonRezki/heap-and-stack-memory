// Mengamankan Endpoint Berita / Catalog Produk (Traffic Tinggi)

// Di aplikasi e-commerce atau media berita, halaman utama (homepage) 
// akan diakses oleh jutaan orang sekaligus. Semua orang melihat data produk/berita yang sama.

const homepageCache = new LRUCache<string, any>({
  max: 10, // Cukup simpan 10 kategori/halaman utama
  ttl: 1000 * 60 * 1, // Simpan 1 menit saja
});

async function getHomepageData() {
  const cacheKey = "homepage_banner_products";

  if (homepageCache.has(cacheKey)) {
    return homepageCache.get(cacheKey);
  }

  // Jika cache kosong, query ke Database (misal query-nya berat/kompleks)
  const data = await db.products.findMany({ where: { isFeatured: true } });

  // Simpan ke cache
  homepageCache.set(cacheKey, data);
  return data;
}
