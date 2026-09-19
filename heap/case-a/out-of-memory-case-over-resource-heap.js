import fs from "fs";

function processBigFile() {
  // ❌ MASALAH: readFileSync memuat seluruh file 5GB sekaligus ke Heap RAM
  // sehingga menyebabkan crash OOM (Out of Memory) karena melebihi kapasitas max Heap RAM.
  // contoh bawaan dari node js hanya 4GB heap RAM, sehingga file 5GB tidak bisa dimuat sekaligus.
  const data = fs.readFileSync("log-raksasa-5gb.log"); 

  console.log("Ukuran file:", data.length);
}

processBigFile();
// Result: Crash OOM karena ukuran file melebihi kapasitas max Heap RAM.
// Solusi: Gunakan Stream (fs.createReadStream) untuk membaca per-chunk.
