import express from 'express';
import { LRUCache } from 'lru-cache';
import { getProfileFromDatabase } from './db';


// Menampung Data Profile / Sesi User (Sering Diakses)
// Setiap kali user mengeklik halaman baru di aplikasi, backend biasanya perlu mengecek data profile user dari Database.
// Daripada menembak Database 1.000 kali per detik untuk user yang sama, kita simpan data profile tersebut di memori aplikasi selama beberapa menit.

const app = express();

// 1. Inisialisasi Cache di tingkat aplikasi
// Batasi max 1.000 user dan hapus otomatis setelah 5 menit (TTL)
const userProfileCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 menit
});

// 2. Implementasi di Endpoint API Profile User
app.get('/api/user/:id', async (req, res) => {
  const userId = req.params.id;

  // STEP A: Cek apakah data user sudah ada di RAM (Cache Hit)
  if (userProfileCache.has(userId)) {
    console.log("⚡ Ambil dari Cache (RAM) - Sangat Cepat!");
    return res.json(userProfileCache.get(userId));
  }

  // STEP B: Jika tidak ada di RAM (Cache Miss), ambil dari Database
  console.log("🐢 Ambil dari Database - Lebih Lambat...");
  const userFromDb = await getProfileFromDatabase(userId);

  // STEP C: Simpan hasilnya ke Cache untuk request berikutnya
  userProfileCache.set(userId, userFromDb);

  return res.json(userFromDb);
});
