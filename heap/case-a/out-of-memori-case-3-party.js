// Menghindari Panggilan API Pihak Ketiga (Bayar / Ada Rate Limit)

// Misalnya aplikasimu memanggil API RajaOngkir, Google Maps, atau OpenAI/ChatGPT. 
// Setiap panggilan API itu bayar atau ada batas kuota harian.

const ongkirCache = new LRUCache<string, number>({
  max: 5000, // Cukup simpan 5000 rute terpopuler
  ttl: 1000 * 60 * 60 * 24, // Simpan 24 jam (karena tarif ongkir jarang berubah)
});

async function cekOngkir(kotaAsal: string, kotaTujuan: string) {
  const key = `${kotaAsal}_to_${kotaTujuan}`;

  // Jika rute Jakarta -> Surabaya sudah pernah dicari orang lain hari ini:
  if (ongkirCache.has(key)) {
    return ongkirCache.get(key); // Ambil dari RAM, hemat biaya API!
  }

  // Jika belum ada, baru panggil API RajaOngkir (Bayar)
  const tarif = await callRajaOngkirAPI(kotaAsal, kotaTujuan);

  ongkirCache.set(key, tarif);
  return tarif;
}
