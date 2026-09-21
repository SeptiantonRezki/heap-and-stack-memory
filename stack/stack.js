function fun3() {
  console.log("-> fun3 dijalankan");
  console.log("<- fun3 selesai");
}

function fun2() {
  console.log("-> fun2 dijalankan");
  fun3(); // memanggil fun3
  console.log("<- fun2 selesai");
}

function fun1() {
  console.log("-> fun1 dijalankan");
  fun2(); // memanggil fun2
  console.log("<- fun1 selesai");
}

// Menjalankan program
fun1();

// -> fun1 dijalankan
//   -> fun2 dijalankan
//     -> fun3 dijalankan
//     <- fun3 selesai
//   <- fun2 selesai
// <- fun1 selesai

// recurisive function 
function panggilDiriSendiri() {
  // Fungsi ini memanggil dirinya sendiri tanpa henti (rekursif tanpa batas)
  panggilDiriSendiri();
}

// Jalankan fungsi
panggilDiriSendiri();
