// Array global yang menyimpang data secara permanen
const cacheGlobal: string[] = [];

function simpanDataKeMemori() {
  // Membuat string berukuran ~10 MB di HEAP
  const dataBesar = new Array(10_000_000).join("X");

  // KESALAHAN: Memasukkan data ke array global tanpa pernah menghapusnya
  cacheGlobal.push(dataBesar);

  // Cek perkiraan penggunaan RAM (Heap) saat ini
  const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`[LEAK] Heap Digunakan: ${memoryUsage.toFixed(2)} MB`);
}

// Menjalankan fungsi secara terus-menerus setiap 500ms
setInterval(() => {
  simpanDataKeMemori();
}, 500);
