import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, get, remove, update, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig, SORU_SURESI_SN } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app), db = getDatabase(app);
const kok = document.querySelector("#panel");
const $ = s => document.querySelector(s);
const kacis = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const UNITES = window.UNITES;
const kelimeAdi = {}, kelimeHafta = {};
for (const u of UNITES) for (const g of u.gruplar) for (const [ad, v] of g.kelimeler) { kelimeAdi[v] ??= ad; kelimeHafta[v] ??= u.hafta; }
const kodNo = k => parseInt(String(k).slice(1)) || 0;
const kodSirala = (a, b) => kodNo(a) - kodNo(b);
// Öğrenci uygulamasıyla aynı zamanlama: geri sayım 3 sn, soru başına 15 + 2 + 5 sn
const SORU_MS = SORU_SURESI_SN * 1000, DONGU_MS = SORU_MS + 7000, GERI_SAYIM_MS = 3000;

let durum = {}, lobi = {}, katilimci = {}, skorlar = {}, bitenler = {}, denemeler = {}, ilerleme = {}, sorular = {};
let saatFarki = 0, seciliHafta = 1, haftaSecildi = false, dinleyiciler = [], cizZamanlayici = null;

onAuthStateChanged(auth, u => {
  dinleyiciler.forEach(f => f()); dinleyiciler = [];
  if (!u || u.isAnonymous) return girisEkrani();
  const hata = e => {
    kok.innerHTML = `<div class="kart"><div class="uyari">Yetki yok: ${kacis(e.message)}<br>Güvenlik kurallarındaki araştırmacı e-postasını kontrol edin.</div><button class="btn ikincil" id="cik">Çıkış</button></div>`;
    $("#cik").onclick = () => signOut(auth);
  };
  const dinle = (yol, f) => dinleyiciler.push(onValue(ref(db, yol), s => { f(s.val() || {}); cizGecikmeli(); }, hata));
  dinle("exam/state", v => { durum = v; if (v.week && (!haftaSecildi || v.phase === "in_progress")) seciliHafta = Number(v.week); });
  dinle("lobby/players", v => lobi = v);
  dinle("study/participants", v => katilimci = v);
  dinle("study/scores", v => skorlar = v);
  dinle("study/done", v => bitenler = v);
  dinle("study/attempt", v => denemeler = v);
  dinle("study/progress", v => ilerleme = v);
  dinle("quiz", v => sorular = v);
  dinleyiciler.push(onValue(ref(db, ".info/serverTimeOffset"), s => { saatFarki = Number(s.val()) || 0; }));
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
const cizGecikmeli = () => { clearTimeout(cizZamanlayici); cizZamanlayici = setTimeout(ciz, 150); };

// Quiz'in o anki adımı (öğrenci telefonlarıyla aynı hesap)
function akisMetni() {
  if (durum.phase !== "in_progress" || !durum.startedAt) return "";
  const n = (sorular[durum.weekKey] || []).length;
  const t = Date.now() + saatFarki - durum.startedAt - GERI_SAYIM_MS;
  if (t < 0) return "Geri sayım…";
  const i = Math.floor(t / DONGU_MS);
  if (i >= n) return "Bütün sorular bitti; quiz'i kapatabilirsin.";
  const ic = t - i * DONGU_MS;
  return `Soru ${i + 1}/${n} · ` + (ic < SORU_MS ? `cevap süresi (${Math.ceil((SORU_MS - ic) / 1000)} sn)` : ic < SORU_MS + 2000 ? "doğru cevap gösteriliyor" : "puan tablosu");
}
setInterval(() => { const e = $("#akis"); if (e) e.textContent = akisMetni(); }, 500);

// Bir haftanın sonuçları: kod başına cevaplanan, doğru, puan, tamamlandı mı
function haftaTablosu(hk) {
  const satir = {};
  for (const [k, h] of Object.entries(skorlar)) {
    const c = h && h[hk]; if (!c) continue;
    const r = satir[k] = { kod: k, cevap: 0, dogru: 0, puan: 0 };
    for (const p of Object.values(c)) { if (!p.cevapsiz) r.cevap++; if (p.dogru) r.dogru++; r.puan += Number(p.score) || 0; }
  }
  for (const [k, h] of Object.entries(bitenler)) if (h && h[hk]) { satir[k] ??= { kod: k, cevap: 0, dogru: 0, puan: 0 }; satir[k].bitti = true; }
  return Object.values(satir).sort((a, b) => b.puan - a.puan || kodSirala(a.kod, b.kod));
}

function ciz() {
  const hk = "week" + seciliHafta, tablo = haftaTablosu(hk), n = (sorular[hk] || []).length;
  const lobidekiler = Object.keys(lobi).sort(kodSirala);
  const bagli = Object.entries(katilimci).filter(([, p]) => p && p.uid).map(([k]) => k).sort(kodSirala);
  const yarida = Object.keys(denemeler).filter(k => denemeler[k]?.[hk] && !bitenler[k]?.[hk]).sort(kodSirala);
  const madalya = ["🥇", "🥈", "🥉"];
  const sure = n ? Math.round((GERI_SAYIM_MS + n * DONGU_MS) / 1000) : 0;
  kok.innerHTML = `<div class="ust"><img src="icon-192.png" alt=""><h1>Araştırmacı Paneli</h1></div>
  <div class="kart">
    <h3>Durum: ${fazAdi[durum.phase] || "Kapalı"}${durum.week ? ` · ${durum.week}. hafta` : ""}</h3>
    <p id="akis" style="font-weight:700;color:var(--mor);min-height:1.5em">${akisMetni()}</p>
    <label class="soluk">Hafta</label>
    <div class="hiz" style="justify-content:flex-start;flex-wrap:wrap">${UNITES.map(u => `<button data-h="${u.hafta}" class="${u.hafta === seciliHafta ? "secili" : ""}">${u.hafta}</button>`).join("")}</div>
    <p class="soluk" style="margin:4px 0 0">${n ? `${n} soru · quiz yaklaşık ${Math.floor(sure / 60)} dk ${sure % 60} sn sürer` : "Bu hafta için soru yüklenmemiş."}</p>
    <button class="btn ikincil" id="lobi">1) Bekleme odasını aç (${seciliHafta}. hafta)</button>
    <button class="btn" id="basla">2) Quiz'i başlat (herkes aynı anda)</button>
    <button class="btn ikincil" id="kapat">3) Quiz'i kapat</button>
    <p class="soluk" style="margin-top:12px">Bekleme odasında: <b>${lobidekiler.length}</b> öğrenci · Bu haftayı bitiren: <b>${tablo.filter(r => r.bitti).length}</b></p>
    <div class="oyuncular">${lobidekiler.map(k => `<span>${kacis(k)}</span>`).join("")}</div>
  </div>
  <div class="kart">
    <h3>${seciliHafta}. hafta sonuçları</h3>
    ${tablo.length ? `<table><tr><th>#</th><th>Kod</th><th>Cevap</th><th>Doğru</th><th>Puan</th><th></th></tr>
      ${tablo.map((r, i) => `<tr><td>${madalya[i] || i + 1}</td><td>${kacis(r.kod)}</td><td>${r.cevap}/${n}</td><td>${r.dogru}</td><td><b>${r.puan}</b></td><td>${r.bitti ? "✓" : "…"}</td></tr>`).join("")}</table>` : `<p class="soluk">Henüz sonuç yok.</p>`}
    ${yarida.length && durum.phase !== "in_progress" ? `<p class="soluk" style="margin-top:14px"><b>Yarıda kalanlar</b> (başlayıp bitirmeyen). Sıfırlarsan öğrenci bu haftanın quiz'ine yeniden girebilir:</p>
      <div class="oyuncular">${yarida.map(k => `<button class="cip" data-sifirla="${k}">${kacis(k)} · sıfırla</button>`).join("")}</div>` : ""}
  </div>
  <div class="kart">
    <h3>Katılımcılar (${bagli.length})</h3>
    <p class="soluk">Bir kod ilk girildiği telefona bağlanır. Öğrenci telefon değiştirdiyse ya da yanlış kod girdiyse koda dokunup serbest bırak.</p>
    <div class="oyuncular">${bagli.map(k => `<button class="cip" data-birak="${k}">${kacis(k)} · ${Object.keys(ilerleme[k] || {}).length} işaret</button>`).join("") || `<span class="soluk">Henüz kod giren yok.</span>`}</div>
  </div>
  <div class="kart">
    <h3>Analiz verisi (CSV)</h3>
    <div class="satir" style="flex-wrap:wrap">
      <button class="btn ikincil" id="csvPuan" style="flex:1">Puanlar</button>
      <button class="btn ikincil" id="csvCevap" style="flex:1">Cevaplar</button>
      <button class="btn ikincil" id="csvIlerleme" style="flex:1">İlerleme</button>
    </div>
  </div>
  <div class="kart">
    <h3>Soruları yükle</h3>
    <p class="soluk">Bilgisayarınızdaki <b>sorular/sorular.json</b> dosyasını seçin. Sorular sitede durmaz; sadece veritabanına yüklenir ve öğrenciler yalnızca quiz açıkken görebilir.</p>
    <input type="file" id="dosya" accept=".json,application/json">
    <p id="yukmesaj" class="soluk"></p>
    <button class="btn ikincil" id="denemeSil">${seciliHafta}. haftanın quiz verilerini sil (deneme sonrası)</button>
    <button class="btn ikincil" id="cik">Çıkış yap</button>
  </div>`;

  kok.querySelectorAll("[data-h]").forEach(b => b.onclick = () => { seciliHafta = Number(b.dataset.h); haftaSecildi = true; ciz(); });
  $("#lobi").onclick = () => update(ref(db), {
    "exam/state": { phase: "lobby", week: seciliHafta, weekKey: hk, openedAt: serverTimestamp() },
    "lobby/players": null,
    [`study/board/${hk}`]: null          // önceki grubun canlı tablosu temizlenir (puan kayıtları silinmez)
  });
  $("#basla").onclick = () => {
    if (!n) return alert(seciliHafta + ". hafta için soru yüklenmemiş.");
    if (!confirm(`${seciliHafta}. hafta quiz'i şimdi herkes için başlasın mı? (${lobidekiler.length} öğrenci bekleme odasında)`)) return;
    set(ref(db, "exam/state"), { phase: "in_progress", week: seciliHafta, weekKey: hk, startedAt: serverTimestamp() });
  };
  $("#kapat").onclick = () => set(ref(db, "exam/state"), { phase: "finished", week: seciliHafta, weekKey: hk, finishedAt: serverTimestamp() });
  kok.querySelectorAll("[data-sifirla]").forEach(b => b.onclick = () => {
    const k = b.dataset.sifirla;
    if (!confirm(`${k} kodunun ${seciliHafta}. hafta quiz kaydı silinsin mi? Öğrenci quiz'e yeniden girebilecek.`)) return;
    update(ref(db), { [`study/attempt/${k}/${hk}`]: null, [`study/scores/${k}/${hk}`]: null, [`study/board/${hk}/${k}`]: null });
  });
  kok.querySelectorAll("[data-birak]").forEach(b => b.onclick = () => {
    const k = b.dataset.birak;
    if (confirm(`${k} kodu serbest bırakılsın mı? Öğrenci kodu başka bir telefonda yeniden girebilir; puanları ve ilerlemesi korunur.`)) remove(ref(db, `study/participants/${k}/uid`));
  });
  $("#denemeSil").onclick = () => {
    if (prompt(`${seciliHafta}. haftanın BÜTÜN quiz kayıtları (puanlar, cevaplar, tamamlama) silinecek. Onaylamak için SİL yaz:`) !== "SİL") return;
    const g = { [`study/board/${hk}`]: null };
    for (const k of new Set([...Object.keys(skorlar), ...Object.keys(bitenler), ...Object.keys(denemeler)]))
      Object.assign(g, { [`study/scores/${k}/${hk}`]: null, [`study/done/${k}/${hk}`]: null, [`study/attempt/${k}/${hk}`]: null });
    update(ref(db), g);
  };
  $("#cik").onclick = () => signOut(auth);
  $("#csvPuan").onclick = () => csvIndir("quiz_puanlari.csv", puanSatirlari());
  $("#csvCevap").onclick = () => csvIndir("quiz_cevaplari.csv", cevapSatirlari());
  $("#csvIlerleme").onclick = () => csvIndir("ogrenilen_isaretler.csv", ilerlemeSatirlari());
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

// ---------- CSV (Excel'de Türkçe karakterlerle açılır; ayraç noktalı virgül) ----------
const tarih = t => (typeof t === "number" ? new Date(t).toISOString() : "");
function puanSatirlari() {
  const r = [["kod", "hafta", "soru_sayisi", "cevaplanan", "dogru", "puan", "tamamlandi"]];
  const haftalar = new Set(); for (const h of Object.values(skorlar)) for (const hk of Object.keys(h || {})) haftalar.add(hk);
  for (const hk of [...haftalar].sort()) for (const x of haftaTablosu(hk).sort((a, b) => kodSirala(a.kod, b.kod)))
    r.push([x.kod, hk.replace("week", ""), (sorular[hk] || []).length, x.cevap, x.dogru, x.puan, x.bitti ? 1 : 0]);
  return r;
}
function cevapSatirlari() {
  const r = [["kod", "hafta", "soru_no", "video", "kelime", "secilen", "dogru", "puan", "sure_sn", "cevapsiz", "zaman"]];
  for (const k of Object.keys(skorlar).sort(kodSirala)) for (const [hk, c] of Object.entries(skorlar[k] || {}))
    for (const [q, p] of Object.entries(c || {}).sort((a, b) => parseInt(a[0].slice(1)) - parseInt(b[0].slice(1))))
      r.push([k, hk.replace("week", ""), parseInt(q.slice(1)) + 1, p.v, kelimeAdi[p.v] || "", p.secilen ?? "", p.dogru ? 1 : 0, p.score, p.sure ?? "", p.cevapsiz ? 1 : 0, tarih(p.timestamp)]);
  return r;
}
function ilerlemeSatirlari() {
  const r = [["kod", "video", "kelime", "hafta", "zaman"]];
  for (const k of Object.keys(ilerleme).sort(kodSirala)) for (const [v, t] of Object.entries(ilerleme[k] || {}))
    r.push([k, v, kelimeAdi[v] || "", kelimeHafta[v] || "", tarih(t)]);
  return r;
}
function csvIndir(ad, satirlar) {
  const csv = "﻿" + satirlar.map(s => s.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = ad; a.click();
}
