function hitungTotalTransaksi() {
  const dataTransaksi = [100, 250, 50, 400, 150]; // Nilai transaksi
  let total = 0;

  // Skenario: Fungsi ini dipanggil jutaan kali per detik (misal di server API)
  for (let i = 0; i < 1_000_000; i++) {
    
    // ❌ MASALAH: Membuat objek baru { amount, tax } di setiap iterasi loop!
    // Objek ini dibuat di Heap, dipakai 1 baris di bawahnya, lalu LANGSUNG DIBUANG.
    const tempObj = { 
      amount: dataTransaksi[i % 5], 
      tax: dataTransaksi[i % 5] * 0.1 
    };

    // Objek tempObj dibuang di sini karena tidak dipakai lagi
    total += tempObj.amount + tempObj.tax; 
  }

  return total;
}

hitungTotalTransaksi();


//========================================================||||||=====================================================

function hitungTotalTransaksiOptimized() {
  const dataTransaksi = [100, 250, 50, 400, 150];
  let total = 0;

  for (let i = 0; i < 1_000_000; i++) {
    const amount = dataTransaksi[i % 5];
    
    // ✅ SOLUSI: Gunakan variabel primitif (number) di Stack/Register CPU.
    // Tidak ada alokasi Objek di Heap sama sekali!
    total += amount + (amount * 0.1);
  }

  return total;
}

hitungTotalTransaksiOptimized();
