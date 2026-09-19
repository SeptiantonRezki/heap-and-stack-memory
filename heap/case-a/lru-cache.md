Implementasinya ada di Backend API / Service Layer:
apakah LRU membantu ? dengan LRU ini bisa memaksimalkan dan tidak bakal terkeana out-of-memory pada heap ?
1. Pasang LRUCache sebagai pintu pertama sebelum memanggil Database / API Luar.
2. Jika data ada di LRUCache -> Langsung kembalikan (Super Fast, hitungan <1ms).
3. Jika data belum ada -> Ambil dari DB -> Masukkan ke LRUCache -> Kembalikan ke pengguna.
4. Karakteristik LRU + TTL memastikan memori RAM servermu selalu stabil (tidak pernah kehabisan memori/OOM) karena data tua otomatis dibuang saat batas max atau ttl tercapai.
