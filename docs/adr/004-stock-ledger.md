# ADR-004: Stok sebagai ledger append-only

Status: **accepted** — 09/11/2026
Mengubah: PRD v0.3 §5.3 dan §5.7 (aturan "perbedaan stok dikurasi user" untuk stok dibatalkan)
Terkait: ADR-002 (model data + tombstone), ADR-003 (user-curated merge)

## Konteks

PRD v0.3 menyimpan stok sparepart sebagai field angka (`stock`) yang diedit langsung setiap
ada pemakaian atau pembelian, dan menetapkan bahwa perbedaan angka stok antara lokal dan cloud
diselesaikan lewat layar kurasi A vs B.

Cara itu punya tiga cacat:

1. **Tidak ada jejak.** Stok berubah dari 50 ke 43, tapi tidak ada catatan siapa mengambil,
   berapa, untuk mesin apa, kapan. Ini justru informasi yang dicari supervisor maintenance.
2. **Koreksi salah input tidak bisa dipertanggungjawabkan.** Angka diubah dari 43 ke 50 tanpa
   dasar. Tidak ada cara membedakan "koreksi" dari "manipulasi".
3. **Konflik sync tidak punya penyelesaian yang benar.** Device A mencatat 45, device B mencatat
   40 — keduanya berangkat dari 50 yang sama dan keduanya setengah benar (A tidak tahu B mengambil
   5, B tidak tahu A mengambil 5). Memilih salah satu berarti membuang kerja satu device;
   merge otomatis (last-write-wins, max, rata-rata) semuanya mengarang angka.

Cacat ketiga yang paling mahal, karena sync adalah inti proyek ini: layar kurasi konflik yang
dirancang di ADR-003 tidak akan pernah cukup untuk stok — user tidak punya cara tahu angka mana
yang benar, karena memang tidak ada yang benar.

## Keputusan

Stok **tidak disimpan** sebagai angka. Setiap stock in/out/adjustment adalah record
`StockMovement` yang **immutable** (append-only): tidak pernah di-update, tidak pernah dihapus.

Stok saat ini = **jumlah seluruh movement** untuk part tersebut.

```
part.id = P-001
  +10  IN       01/11  supplier  oleh Budi
  -5   OUT      02/11  M-014     oleh Teknisi A
  -3   OUT      02/11  M-022     oleh Teknisi B
  +1   ADJUST   03/11  koreksi salah input
  ----------------------------------------------
  stok  =  +3
```

Konsekuensi struktural: `SparePart` **tidak punya** field `stock`. Yang ada fungsi turunan
`stockOf(movements)` dan `isLowStock(stock, min_stock)` (sudah ada di `src/lib/stock.ts`
beserta test).

Koreksi kesalahan dilakukan dengan **movement baru** (tipe adjustment), bukan dengan mengedit
atau menghapus movement lama.

## Kenapa ini menyelesaikan konflik sync

Karena tidak ada record yang pernah diubah, tidak ada dua versi berbeda dari data yang sama.
Seluruh operasi stok adalah penambahan. Merge dua device = **union dua himpunan movement**.

Sifat union himpunan:

- **Komutatif** — A+B sama dengan B+A.
- **Idempoten** — sync dua kali tidak menggandakan data, selama movement punya UUID dari client
  (ADR-002).

Hasilnya: dua device offline yang sama-sama mencatat pemakaian **tidak mungkin konflik**.
Stok akhir = 50 − 5 − 5 = 40, dan itu benar — bukan hasil pemilihan salah satu versi.

Layar kurasi A vs B dari ADR-003 tetap ada dan tetap dipakai untuk equipment, jadwal PM,
dan daily report — yaitu record yang isinya benar-benar bisa berbeda. Stok keluar dari daftar itu.

## Trade-off yang diterima

Ditulis terang-terangan; ini bagian yang harus bisa dijelaskan di interview.

1. **Baca lebih mahal.** Menampilkan stok 1000 part berarti menjumlahkan movement. Rencana:
   hitung hanya untuk baris yang sedang tampil (pageSize 25) di v1; ukur dulu; kalau lambat,
   tambahkan `stock_cache` per part yang dihitung ulang saat ada movement — cache **tidak ikut
   di-sync** karena bisa dibangun ulang kapan saja.
2. **Tabel tumbuh terus.** Di produksi suatu hari butuh snapshot/kompaksi. Untuk demo v1:
   tidak perlu, cukup dicatat sebagai batasan yang diketahui.
3. **Stok bisa minus setelah merge.** Dua device offline sama-sama mengambil item terakhir:
   masing-masing lulus validasi lokal (`validateMovement` menolak out > stok yang terlihat),
   setelah union hasilnya minus. Keputusan: **tampilkan peringatan pada part tersebut dan minta
   user mengoreksi dengan movement baru** — jangan sembunyikan, jangan buang movement, jangan
   batalkan pekerjaan teknisi. Penolakan di level server tidak mungkin dilakukan tanpa online,
   dan menolak sync berarti data hilang.
4. **Bukan pola default.** Untuk app single-user yang selalu online dan tidak butuh audit,
   field angka biasa lebih murah. Ledger dipilih di sini karena tiga alasan yang diminta proyek:
   jejak audit, koreksi yang bisa dipertanggungjawabkan, dan merge offline tanpa konflik.

## Alternatif yang ditolak

- **Field `stock` yang diedit + riwayat opsional.** Ditolak: riwayat jadi formalitas, tetap tidak
  menyelesaikan konflik edit-vs-edit.
- **Angka + auto-merge (last-write-wins / max).** Ditolak: menghasilkan angka yang tidak pernah
  benar-benar terjadi, dan menyembunyikan kehilangan data.
- **Snapshot berkala + delta.** Kandidat v2 kalau jumlah movement jadi masalah performa. Bukan v1:
  menambah kompleksitas tanpa kebutuhan yang terbukti.

## Dampak ke dokumen

- `phase-2-inventory.md`: skema Dexie versi 2 (`parts`, `stock_movements`), tipe `SparePart` tanpa
  `stock`, form memakai `validateMovement`, low stock memakai `isLowStock`.
- PRD v0.4: §5.3 (field stok dihapus dari CRUD) dan §5.7 (aturan konflik khusus stok dibatalkan).
- Test wajib: stok hasil akumulasi = perhitungan manual (integrasi Dexie), dan merge dua himpunan
  movement menghasilkan total yang benar.