import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, get, remove, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app), db = getDatabase(app);
const kok = document.querySelector("#panel");
const $ = s => document.querySelector(s);
const kacis = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let durum = {}, oyuncular = [], skorlar = {}, bitenler = {}, seciliHafta = 1, dinleyiciler = [];

onAuthStateChanged(auth, u => {
  dinleyiciler.forEach(f => f()); dinleyiciler = [];
  if (!u || u.isAnonymous) return girisEkrani();
  const hata = e => { kok.innerHTML = `<div class="kart"><div class="uyari">Yetki yok: ${kacis(e.message)}<br>Güvenlik kurallarındaki araştırmacı e-postasını kontrol edin.</div><button class="btn ikincil" id="cik">Çıkış</button></div>`; $("#cik").onclick = () => signOut(auth); };
  dinleyiciler.push(onValue(ref(db, "exam/state"), s => { durum = s.val() || {}; if (durum.week) seciliHafta = Number(durum.week); ciz(); }, hata));
  dinleyiciler.push(onValue(ref(db, "lobby/players"), s => { oyuncular = []; s.forEach(c => { oyuncular.push(c.val().name); }); ciz(); }, hata));
  dinleyiciler.push(onValue(ref(db, "exam/scores"), s => { skorlar = s.val() || {}; ciz(); }, hata));
  dinleyiciler.push(onValue(ref(db, "exam/done"), s => { bitenler = s.val() || {}; ciz(); }, hata));
});

function girisEkrani(mesaj) {
  kok.innerHTML = `<div class="ust"><img src="icon-192.png" alt=""><h1>Araştırmacı Paneli</h1></div>
  <div class="kart"><h2>Giriş</h2>
    <input type="email" id="ep" placeholder="E-posta" autocomplete="username">
    <input type="password" id="sf" placeholder="Şifre" autocomplete="current-password">
    <button class="btn" id="gir">Giriş yap</button>
    ${mesaj ? `<div class="uyari">${kacis(mesaj)}</div>` : ""}</div>`;
  $("#gir").onclick = () => signInWithEmailAndPassword(auth, $("#ep").value.trim(), $("#sf").value)
    .catch(e => girisEkrani("Giriş başarısız: " + e.code));
}

const fazAdi = { lobby: "Bekleme odası açık", in_progress: "Quiz devam ediyor", finished: "Kapalı" };

// Bir öğrencinin bir haftadaki puanı (Android ve web kayıtları aynı yapıda)
function haftaPuanlari(hk) {
  const liste = {};
  for (const [id, haftalar] of Object.entries(skorlar)) {
    const h = haftalar && haftalar[hk]; if (!h) continue;
    for (const p of Object.values(h)) {
      const ad = p.name || "Anonim";
      liste[id] = liste[id] || { ad, puan: 0, dogru: 0 };
      liste[id].puan += Number(p.score) || 0; liste[id].dogru++;
    }
  }
  for (const [id, h] of Object.entries(bitenler)) if (h && h[hk] && !liste[id]) liste[id] = { ad: h[hk].name || "Anonim", puan: 0, dogru: 0 };
  return Object.values(liste).sort((a, b) => b.puan - a.puan);
}

function ciz() {
  const hk = "week" + seciliHafta;
  const tablo = haftaPuanlari(hk);
  const bitenSayi = Object.values(bitenler).filter(h => h && h[hk]).length;
  const madalya = ["🥇", "🥈", "🥉"];
  kok.innerHTML = `<div class="ust"><img src="icon-192.png" alt=""><h1>Araştırmacı Paneli</h1></div>
  <div class="kart">
    <h3>Durum: ${fazAdi[durum.phase] || "Kapalı"}${durum.week ? ` · ${durum.week}. hafta` : ""}</h3>
    <label class="soluk">Hafta</label>
    <div class="hiz" style="justify-content:flex-start;flex-wrap:wrap">${UNITES.map(u => `<button data-h="${u.hafta}" class="${u.hafta === seciliHafta ? "secili" : ""}">${u.hafta}</button>`).join("")}</div>
    <button class="btn ikincil" id="lobi">1) Bekleme odasını aç (${seciliHafta}. hafta)</button>
    <button class="btn" id="basla">2) Quiz'i başlat</button>
    <button class="btn ikincil" id="kapat">3) Quiz'i kapat</button>
    <p class="soluk" style="margin-top:12px">Bekleme odasında: <b>${oyuncular.length}</b> öğrenci · Bu haftayı bitiren: <b>${bitenSayi}</b></p>
    <div class="oyuncular">${oyuncular.map(a => `<span>${kacis(a)}</span>`).join("")}</div>
    <button class="btn ikincil" id="temizle">Bekleme odasını temizle</button>
  </div>
  <div class="kart">
    <h3>${seciliHafta}. hafta puan tablosu</h3>
    ${tablo.length ? `<table><tr><th>#</th><th>Öğrenci</th><th>Doğru</th><th>Puan</th></tr>
      ${tablo.map((r, i) => `<tr><td>${madalya[i] || i + 1}</td><td>${kacis(r.ad)}</td><td>${r.dogru}</td><td><b>${r.puan}</b></td></tr>`).join("")}</table>` : `<p class="soluk">Henüz puan yok.</p>`}
    <button class="btn ikincil" id="csv">Tüm puanları CSV indir</button>
  </div>
  <div class="kart">
    <h3>Soruları yükle</h3>
    <p class="soluk">Bilgisayarınızdaki <b>sorular/sorular.json</b> dosyasını seçin. Sorular sitede durmaz; sadece veritabanına yüklenir ve öğrenciler yalnızca quiz açıkken görebilir.</p>
    <input type="file" id="dosya" accept=".json,application/json">
    <p id="yukmesaj" class="soluk"></p>
    <button class="btn ikincil" id="cik">Çıkış yap</button>
  </div>`;

  kok.querySelectorAll("[data-h]").forEach(b => b.onclick = () => { seciliHafta = Number(b.dataset.h); ciz(); });
  $("#lobi").onclick = () => set(ref(db, "exam/state"), { phase: "lobby", week: seciliHafta, weekKey: "week" + seciliHafta, openedAt: serverTimestamp() });
  $("#basla").onclick = async () => {
    const q = await get(ref(db, "quiz/week" + seciliHafta));
    if (!q.exists()) return alert(seciliHafta + ". hafta için soru yüklenmemiş.");
    if (!confirm(seciliHafta + ". hafta quiz'i başlatılsın mı?")) return;
    set(ref(db, "exam/state"), { phase: "in_progress", week: seciliHafta, weekKey: "week" + seciliHafta, startedAt: serverTimestamp() });
  };
  $("#kapat").onclick = () => set(ref(db, "exam/state"), { phase: "finished", week: seciliHafta, weekKey: "week" + seciliHafta, finishedAt: serverTimestamp() });
  $("#temizle").onclick = () => { if (confirm("Bekleme odasındaki isimler silinsin mi? (Puanlar silinmez)")) remove(ref(db, "lobby/players")); };
  $("#cik").onclick = () => signOut(auth);
  $("#csv").onclick = csvIndir;
  $("#dosya").onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const veri = JSON.parse(await f.text());
      const anahtarlar = Object.keys(veri).filter(k => /^week\d+$/.test(k));
      if (!anahtarlar.length) throw new Error("Dosyada week1, week2… anahtarları bulunamadı");
      for (const k of anahtarlar) await set(ref(db, "quiz/" + k), veri[k]);
      $("#yukmesaj").textContent = "✓ Yüklendi: " + anahtarlar.map(k => `${k} (${veri[k].length} soru)`).join(", ");
    } catch (err) { $("#yukmesaj").textContent = "Hata: " + err.message; }
  };
}

// Analiz için: öğrenci, hafta, doğru sayısı, puan
function csvIndir() {
  const satirlar = [["ogrenci_id", "ad", "hafta", "dogru_sayisi", "puan"]];
  for (const [id, haftalar] of Object.entries(skorlar)) for (const [hk, kayitlar] of Object.entries(haftalar || {})) {
    let puan = 0, dogru = 0, ad = "";
    for (const p of Object.values(kayitlar || {})) { puan += Number(p.score) || 0; dogru++; ad = p.name || ad; }
    satirlar.push([id, ad, hk.replace("week", ""), dogru, puan]);
  }
  const csv = "\ufeff" + satirlar.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = "quiz_puanlari.csv"; a.click();
}
