// Suatu kejadian ada celah memori kosong yang tidak bisa di pakai lagi oleh proses selanjutnya

// [ KOSONG 1MB ][     12MB     ][ KOSONG 3MB ][    8MB    ][  500KB  ] => new [4MB]
//  (Celah A)      (Req B)        (Celah C)     (Req D)     (Req E)     => new req F

// request F masuk => file 4MB => 
// 3MB dan 1MB terpecah (terfragmentasi) di dua celah terpisah, program kita tidak bisa menaruh di size memori kosong
// sehinngga meminta lahan tambahan ( konsumsi RAM naik terus )

// KASUS
// kalau dalam skala kecil tidak menjadikan masalah, tetapii jika skala sudah besar dengan ada 10000 request dari user, RAM akan OOM ( out of memory )
// OOM killer dijalankan => Proses Pemakan RAM Terbesar Dibunuh (SIGKILL / Signal 9 (oom_score ( paling tinggi))
// jika app kamu yang paling memakan RAM (signal 9) => maka akan di kill ( jika ada docker, aplikasi bisa restart:always)
// server di kill ( kalau memang memakai resouce dari RAM paling tinggi ) => maka Batasi Memori di Tingkat Runtime / Container

// kode menimbulkan memory fragmentation 
// server.ts (Bun.js)
import { serve } from "bun";

// Cache sementara di memori (misal: menyimpan sampel gambar yang sedang diproses)
const processingCache = new Map<string, Uint8Array>();

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/process" && req.method === "POST") {
      const id = Crypto.randomUUID();
      
      // 1. Terima buffer file dengan ukuran acak (1MB - 15MB)
      const imageBuffer = new Uint8Array(await req.arrayBuffer());

      // 2. Alokasikan buffer baru ukuran acak untuk hasil olahan (Interleaved Allocation)
      const processedBuffer = new Uint8Array(imageBuffer.length + 512);
      processedBuffer.set(imageBuffer);

      // 3. Simpan sementara di Map (Membuat objek hidup berselang-seling di Heap)
      processingCache.set(id, processedBuffer);

      // 4. Hapus data secara acak setelah jeda singkat (Meninggalkan celah/holes di memori)
      setTimeout(() => {
        processingCache.delete(id);
      }, Math.random() * 2000);

      return new Response(`Processed ${id}`);
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log("Server pemroses gambar berjalan di port 3000");


// memperbaiki
// Untuk case ini kita langsung mengalokasikan sebuah RAM dengan total 100 x 16MB = 1,6 GB untuk langsung memakai resouce
// tetapi jika ada proses gambar ke 101 akan mengantri terlebih dahulu, sehingga tidak terjadi OOM

// [   SLOT 1 (16MB)   ][   SLOT 2 (16MB)   ][   SLOT 3 (16MB)   ][   SLOT 4 (16MB)   ]
// [ KOSONG (16MB)     ][ TERPAKAI (16MB)   ][ KOSONG (16MB)     ][ KOSONG (16MB)     ]

// buffer-pool.ts
export class FixedBufferPool {
  private pool: Uint8Array[] = [];
  private bufferSize: number;

  constructor(poolSize: number, bufferSize: number) {
    this.bufferSize = bufferSize;
    // Alokasi awal (Pre-allocate) memori dengan ukuran seragam
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(new Uint8Array(bufferSize));
    }
  }

  // Pinjam buffer dari pool
  acquire(): Uint8Array {
    return this.pool.pop() || new Uint8Array(this.bufferSize);
  }

  // Kembalikan buffer ke pool (tanpa perlu di-GC / di-free ke OS)
  release(buf: Uint8Array) {
    buf.fill(0); // Bersihkan isi data lama
    this.pool.push(buf);
  }
}

// server-fixed.ts
import { FixedBufferPool } from "./buffer-pool";

// Buat pool 100 buffer berukuran tetap (misal: 16MB)
const imagePool = new FixedBufferPool(100, 16 * 1024 * 1024);

serve({
  port: 3000,
  async fetch(req) {
    if (req.method === "POST") {
      // 1. Pinjam buffer yang sudah ada (tidak memicu alokasi RAM baru)
      const buffer = imagePool.acquire();

      try {
        const fileData = new Uint8Array(await req.arrayBuffer());
        buffer.set(fileData); // Salin data ke buffer terstruktur

        // Lakukan pemrosesan gambar di sini ...

        return new Response("Success");
      } finally {
        // 2. Selalu kembalikan buffer ke pool setelah selesai
        imagePool.release(buffer);
      }
    }
    return new Response("OK");
  },
});

// Untuk versi yang dynamic => kebutuhan memori akan bertambah sampai batasan tertentu ( tergantung sebarapa banyak req dari user )
export class DynamicBufferPool {
  private pool: Uint8Array[] = [];
  private allocatedCount = 0;
  private readonly maxSlots: number;
  private readonly slotSize: number;
  private waitingQueue: Array<(buffer: Uint8Array) => void> = [];

  constructor(maxSlots: number, slotSizeInMB: number) {
    this.maxSlots = maxSlots;
    this.slotSize = slotSizeInMB * 1024 * 1024; // Konversi MB ke Bytes
  }

  /**
   * Mengambil buffer dari pool.
   * Jika pool kosong tapi belum mencapai maxSlots, buat buffer baru.
   * Jika sudah mencapai maxSlots, tunggu sampai ada buffer yang release.
   */
  async acquire(): Promise<Uint8Array> {
    // 1. Jika ada buffer menganggur di pool, pakai langsung (O(1))
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }

    // 2. Jika pool kosong TAPI belum capai limit, buat Uint8Array baru (Lazy)
    if (this.allocatedCount < this.maxSlots) {
      this.allocatedCount++;
      return new Uint8Array(this.slotSize);
    }

    // 3. Jika pool kosong DAN sudah capai limit, antre sampai ada yang release
    return new Promise<Uint8Array>((resolve) => {
      this.waitingQueue.push(resolve);
    });
  }

  /**
   * Mengembalikan buffer ke pool agar bisa dipakai ulang oleh request lain.
   */
  release(buffer: Uint8Array): void {
    // Bersihkan isi buffer (opsional, tapi bagus untuk keamanan data antar-request)
    buffer.fill(0);

    // Jika ada request yang sedang antre, langsung berikan buffer ini ke dia
    if (this.waitingQueue.length > 0) {
      const nextRequestResolve = this.waitingQueue.shift()!;
      nextRequestResolve(buffer);
      return;
    }

    // Jika tidak ada yang antre, simpan buffer kembali ke pool untuk reuse
    this.pool.push(buffer);
  }

  /**
   * Helper untuk melihat statistik penggunaan memori pool saat ini
   */
  get stats() {
    return {
      createdBuffers: this.allocatedCount,
      availableInPool: this.pool.length,
      inUse: this.allocatedCount - this.pool.length,
      waitingQueueLength: this.waitingQueue.length,
      currentRamUsageMB: (this.allocatedCount * this.slotSize) / (1024 * 1024),
    };
  }
}

// Sediakan pool dengan batas maksimal 20 slot @ 8 MB
// RAM awal di startup: 0 MB!
const imageProcessingPool = new DynamicBufferPool(20, 8); 

async function handleImageUpload(req: Request) {
  // 1. Pinjam buffer (jika belum ada, dia akan bikin baru di sini)
  const buffer = await imageProcessingPool.acquire();

  try {
    // 2. Gunakan buffer untuk proses biner / image
    // Contoh: baca file upload ke buffer
    const fileBytes = new Uint8Array(await req.arrayBuffer());
    buffer.set(fileBytes.subarray(0, buffer.length));

    // Lakukan pemrosesan gambar...
    console.log("RAM Pool Terpakai saat ini:", imageProcessingPool.stats);

    return new Response("Gambar berhasil diproses");
  } finally {
    // 3. SELALU kembalikan buffer di blok 'finally' agar tidak bocor
    imageProcessingPool.release(buffer);
  }
}

// ada masalah lagi yaitu user harus mengantri ( karena melebih 100/ batasan yang kita buat di BE )
// 1 Ynag ini user harus benar2 menunggu, tetapi FE lebih mudah, karena kita tegas kalau melebih 5s, user harus mengulang lagi 
// [Request Ke-21 Masuk]
//       │
//       ▼
// Apakah Pool Penuh? ──(Ya)──> Masuk 'waitingQueue' (Menunggu slot)
//        │                                  │
//        │                         ┌────────┴────────┐
//        │                         │                 │
//        │                 (Dapat Slot < 5s)   (Timeout > 5s)
//        │                         │                 │
//        ▼                         ▼                 ▼
// [Proses Gambar] ───> Return HTTP 200 OK   Return HTTP 429 / 503
//                                          ("Server Sibuk, Coba Lagi")

// 2. Yang ini user dikasi tahu kalau sudah di process, tetapi dari FE nya harus implementasi ( push notification atau pakai web socket ) 
// [User Upload] ────(HTTP POST)────> [API Server / BE]
//                                           │
//    ┌──────────────────────────────────────┴──────────────────────────────────────┐
//    │ 1. Buat Job ID & simpan status "PENDING" ke Database/Redis                 │
//    │ 2. Masukkan Task ke Event Loop / Queue (menggunakan Buffer Pool)            │
//    │ 3. LANGSUNG kirim respon HTTP 202 Accepted ke Frontend                      │
//    └──────────────────────────────────────┬──────────────────────────────────────┘
//                                           │
//                                           ▼
//                          [Response HTTP 202 ( Accepted ) ke Frontend]
//                            { jobId: "abc-123", status: "PROCESSING" }


// TAMBAHAN






