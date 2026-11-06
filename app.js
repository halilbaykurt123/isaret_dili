import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, get, push, onValue, off, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig, GIRIS_VIDEOSU, SORU_SURESI_SN } from "./firebase-config.js";

const UNITES = window.UNITES;
const $ = s => document.querySelector(s);
const kok = $("#uygulama");
const kacis = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- Yerel kayıt (tarayıcıda; sadece kolaylık için) ----------
const yerel = {
  oku(k, v) { try { const x = localStorage.getItem(k); return x == null ? v : JSON.parse(x); } catch { return v; } },
  yaz(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
let ogrenilen = yerel.oku("ogrenilen", {});
const ogrenildiMi = v => !!ogrenilen[v];
function ogrenildiYap(v, deger) { ogrenilen[v] = deger; if (!deger) delete ogrenilen[v]; yerel.yaz("ogrenilen", ogrenilen); }
const haftaKelimeleri = u => u.gruplar.flatMap(g => g.kelimeler);
const haftaIlerleme = u => { const k = haftaKelimeleri(u); return { ok: k.filter(x => ogrenildiMi(x[1])).length, top: k.length }; };

// ---------- Firebase ----------
let db = null, auth = null, uid = null, durum = {}, fbHata = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app); auth = getAuth(app);
  onAuthStateChanged(auth, u => {
    if (u) { uid = u.uid; durumuDinle(); toplamPuaniGetir(); }
  });
  signInAnonymously(auth).catch(e => { fbHata = e.message; ciz(); });
} catch (e) { fbHata = e.message; }

let durumDinleniyor = false;
function durumuDinle() {
  if (durumDinleniyor) return; durumDinleniyor = true;
  onValue(ref(db, "exam/state"), s => { durum = s.val() || {}; if (!sinavCalisiyor) ciz(); else sinavDurumDegisti(); },
    e => { fbHata = e.message; ciz(); });
}
let toplamPuan = null;
async function toplamPuaniGetir() {
  try {
    const s = await get(ref(db, `exam/scores/${uid}`));
    let t = 0; s.forEach(h => h.forEach(p => { t += Number(p.val().score) || 0; }));
    toplamPuan = t; if (!sinavCalisiyor && rota().ad === "ana") ciz();
  } catch { toplamPuan = null; }
}
const sinavAcik = () => durum.phase === "lobby" || durum.phase === "in_progress";
const aktifHafta = () => Number(durum.week) || yerel.oku("sonHafta", 1);

// ---------- Yönlendirme ----------
function rota() {
  const h = location.hash.replace(/^#\/?/, "");
  if (h.startsWith("hafta/")) return { ad: "hafta", n: Number(h.split("/")[1]) };
  if (h.startsWith("etkinlik/")) return { ad: "etkinlik", n: Number(h.split("/")[1]) };
  if (h === "sinav") return { ad: "sinav" };
  return { ad: "ana" };
}
window.addEventListener("hashchange", () => { dinlemeyiDurdur(); if (sinavCalisiyor && rota().ad !== "sinav") sinaviBirak(); ciz(); window.scrollTo(0, 0); });

function ust(geri) {
  return `<div class="ust">${geri ? `<button class="geri" onclick="location.hash='#/'">‹ Ana sayfa</button>` :
    `<img src="icon-192.png" alt=""><h1>Sesli İşaret Dili</h1>`}</div>`;
}

function ciz() {
  const r = rota();
  if (r.ad === "hafta") return haftaSayfasi(r.n);
  if (r.ad === "sinav") return sinavSayfasi();
  if (r.ad === "etkinlik") return etkinlikSayfasi(r.n);
  anaSayfa();
}

// ---------- ANA SAYFA (ARCS) ----------
function anaSayfa() {
  const ah = aktifHafta();
  const ogrenilenSayi = Object.keys(ogrenilen).length;
  const video = GIRIS_VIDEOSU
    ? `<div class="video-kutu"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(GIRIS_VIDEOSU)}?rel=0&playsinline=1" allow="encrypted-media; picture-in-picture" allowfullscreen title="Giriş videosu"></iframe></div>`
    : `<div class="video-kutu bos-video">Giriş videosu eklenecek<br>(firebase-config.js → GIRIS_VIDEOSU)</div>`;

  kok.innerHTML = ust(false) + `
  <section class="kart">
    <div class="etiket e-a"><i></i>Dikkat</div>
    <h2>Merhaba, hoş geldin! 👋</h2>
    <p>Bu uygulamayla altı hafta boyunca Türk İşaret Dili'nin temel işaretlerini kısa videolarla öğreneceksin.
    Her hafta yeni bir konu var: videoları kendi hızında izle, işaretleri kendi ellerinle tekrar et ve
    ders sonunda kısa bir quiz'le kendini dene.</p>
    <div class="soru">🤔 Bir öğrencin sana derdini işaretle anlatsa, onu anlayabilir miydin?</div>
  </section>

  <section class="kart">
    <div class="etiket e-r"><i></i>Uygunluk</div>
    <h3>İşaret dili neden önemli?</h3>
    <p class="soluk">Bir gün sınıfında işitme kaybı olan bir öğrencin olabilir. Birkaç işaret bile bir insanın gününü değiştirebilir.</p>
    ${video}
  </section>

  <section class="kart">
    <div class="etiket e-c"><i></i>Güven</div>
    <h3>Haftalık hedeflerin</h3>
    <p class="soluk">Her hafta neyi başaracağını burada görürsün. Bir işareti öğrendiğinde işaretle, ilerleme çubuğun dolsun.</p>
    ${UNITES.map(u => {
      const p = haftaIlerleme(u);
      return `<button class="hafta ${u.hafta === ah ? "aktif" : ""}" onclick="location.hash='#/hafta/${u.hafta}'">
        <div class="ust-satir"><b>${u.hafta}. Hafta${u.hafta === ah ? '<span class="rozet">Bu hafta</span>' : ""}</b><small>${p.ok}/${p.top} işaret</small></div>
        <div>${kacis(u.baslik)}</div>
        <div class="cubuk"><span style="width:${p.top ? Math.round(p.ok / p.top * 100) : 0}%"></span></div>
      </button>`;
    }).join("")}
  </section>

  <section class="kart">
    <div class="etiket e-s"><i></i>Doyum</div>
    <h3>Başarıların</h3>
    <div class="puan">
      <div><b>${ogrenilenSayi}</b><small>öğrenilen işaret</small></div>
      <div><b>${toplamPuan == null ? "–" : toplamPuan}</b><small>quiz puanı</small></div>
    </div>
    ${ogrenilenSayi ? `<p style="margin-top:12px">🎉 Şimdiye kadar <b>${ogrenilenSayi}</b> işaret öğrendin. Harika gidiyorsun!</p>` : ""}
    <button class="btn" ${sinavAcik() ? "" : "disabled"} onclick="location.hash='#/hafta/${durum.week}'">
      ${sinavAcik() ? `▶ ${durum.week}. hafta quiz'i açık, haftaya git` : "🔒 Quiz ders saatinde açılır"}
    </button>
    <p class="soluk" style="margin:8px 0 0;font-size:14px;text-align:center">Quiz'e her haftanın kendi sayfasından katılırsın.</p>
    ${fbHata ? `<div class="uyari">Bağlantı sorunu: ${kacis(fbHata)}</div>` : ""}
  </section>`;
}

// ---------- HAFTA SAYFASI ----------
function haftaSayfasi(n) {
  const u = UNITES.find(x => x.hafta === n);
  if (!u) { location.hash = "#/"; return; }
  yerel.yaz("sonHafta", n);
  const p = haftaIlerleme(u);
  kok.innerHTML = ust(true) + `
  <section class="kart">
    <div class="etiket e-c"><i></i>${n}. Hafta</div>
    <h2>${kacis(u.baslik)}</h2>
    <p class="soluk" style="margin-bottom:4px">Bu hafta sonunda:</p>
    <ul class="hedefler">${u.hedefler.map(h => `<li>${kacis(h)}</li>`).join("")}</ul>
    <div class="cubuk" style="margin-top:14px"><span style="width:${Math.round(p.ok / p.top * 100)}%"></span></div>
    <p class="soluk" style="margin:6px 0 0;font-size:14px">${p.ok}/${p.top} işaret öğrenildi</p>
  </section>
  <section class="kart">
    <p>Bir işarete dokun, videoyu istediğin kadar izle, gerekirse yavaşlat ve kendi ellerinle tekrar et.</p>
    ${u.gruplar.map(g => `<div class="grup-baslik">${kacis(g.ad)}</div>
      <div class="izgara">${g.kelimeler.map(([ad, v]) =>
        `<button class="isaret ${ogrenildiMi(v) ? "ogrenildi" : ""}" data-v="${v}">${kacis(ad)}</button>`).join("")}</div>`).join("")}
    ${p.ok === p.top ? `<div class="soru" style="margin-top:16px">🎉 Tebrikler! Bu haftanın bütün işaretlerini öğrendin.</div>` : ""}
  </section>
  <section class="kart">
    <div class="etiket e-a"><i></i>Etkinlik</div>
    <h3>Söyle, işaretini gör</h3>
    <p class="soluk">Bu haftanın kelimelerinden birini sesli söyle; uygulama işaretini göstersin. Sonra sen de işareti kendi ellerinle yap.</p>
    <button class="btn" onclick="location.hash='#/etkinlik/${n}'">🎤 Etkinliğe git</button>
  </section>
  <section class="kart">
    <div class="etiket e-s"><i></i>${n}. Hafta Quiz</div>
    <h3>Kendini dene</h3>
    <p class="soluk">Quiz ders sonunda, araştırmacı açtığında başlar. Her soru için 15 saniyen var; ne kadar hızlı cevaplarsan o kadar çok puan alırsın.</p>
    ${(() => {
      const acik = sinavAcik() && Number(durum.week) === n;
      return `<button class="btn" ${acik ? "" : "disabled"} onclick="location.hash='#/sinav'">
        ${acik ? (durum.phase === "in_progress" ? "▶ Quiz başladı, hemen katıl" : "▶ Quiz'e katıl (bekleme odası)") : "🔒 Bu haftanın quiz'i ders saatinde açılır"}
      </button>`;
    })()}
  </section>`;
  const liste = haftaKelimeleri(u);
  kok.querySelectorAll(".isaret").forEach(b => b.onclick = () => oynatici(liste, liste.findIndex(k => k[1] === b.dataset.v), () => haftaSayfasi(n)));
}

function oynatici(liste, i, kapaninca) {
  let hiz = yerel.oku("hiz", 1);
  const perde = document.createElement("div");
  perde.className = "perde";
  document.body.appendChild(perde);
  const kapat = () => { perde.remove(); kapaninca(); };
  perde.onclick = e => { if (e.target === perde) kapat(); };
  function goster() {
    const [ad, v] = liste[i];
    perde.innerHTML = `<div class="oynatici">
      <video src="videos/${v}.mp4" autoplay muted loop playsinline></video>
      <h2>${kacis(ad)}</h2>
      <div class="hiz">${[1, 0.75, 0.5].map(h => `<button data-h="${h}" class="${h === hiz ? "secili" : ""}">${h === 1 ? "Normal" : h + "x"}</button>`).join("")}</div>
      <button class="btn ${ogrenildiMi(v) ? "ikincil" : ""}" id="ogr">${ogrenildiMi(v) ? "✓ Öğrendim" : "Öğrendim"}</button>
      <div class="satir">
        <button class="btn ikincil" id="onc" ${i === 0 ? "disabled" : ""}>‹ Önceki</button>
        <button class="btn ikincil" id="snr" ${i === liste.length - 1 ? "disabled" : ""}>Sonraki ›</button>
      </div>
      <button class="btn ikincil" id="kpt">Kapat</button>
    </div>`;
    const vid = perde.querySelector("video");
    vid.playbackRate = hiz;
    vid.onloadedmetadata = () => { vid.playbackRate = hiz; };
    perde.querySelectorAll(".hiz button").forEach(b => b.onclick = () => { hiz = Number(b.dataset.h); yerel.yaz("hiz", hiz); goster(); });
    perde.querySelector("#ogr").onclick = () => { ogrenildiYap(v, !ogrenildiMi(v)); goster(); };
    perde.querySelector("#onc").onclick = () => { i--; goster(); };
    perde.querySelector("#snr").onclick = () => { i++; goster(); };
    perde.querySelector("#kpt").onclick = kapat;
  }
  goster();
}

// ---------- ETKİNLİK: sesli işaret arama (orijinal Android ekranı) ----------
const normal = s => String(s || "").toLocaleLowerCase("tr-TR").replace(/[?!.,;:¿¡'"’]/g, "").replace(/\s+/g, " ").trim();
const SOZLUK = (() => {
  const h = new Map();
  // Önce haftalık kelimeler (ünitelerle ve quiz'le aynı video), sonra orijinal sesli arama listesi
  for (const u of UNITES) for (const g of u.gruplar) for (const [ad, v] of g.kelimeler)
    for (const parca of ad.split("/")) { const n = normal(parca); if (n && !h.has(n)) h.set(n, v); }
  for (const [k, v] of Object.entries(window.SESLI || {})) { const n = normal(k); if (n && !h.has(n)) h.set(n, v); }
  return h;
})();
const SOZLUK_UZUN = [...SOZLUK.keys()].filter(k => k.length >= 2).sort((a, b) => b.length - a.length);
function eslestir(metin) {
  const t = normal(metin);
  if (!t) return null;
  if (SOZLUK.has(t)) return SOZLUK.get(t);
  const ara = " " + t + " ";
  const k = SOZLUK_UZUN.find(k => ara.includes(" " + k + " "));
  return k ? SOZLUK.get(k) : null;
}
const videoAdi = (() => { const m = {}; for (const u of UNITES) for (const g of u.gruplar) for (const [ad, v] of g.kelimeler) m[v] ??= ad; return m; })();

let aktifTanima = null, mikIzni = false;
function dinlemeyiDurdur() { if (aktifTanima) { try { aktifTanima.abort(); } catch {} aktifTanima = null; } }

function etkinlikSayfasi(n) {
  const u = UNITES.find(x => x.hafta === n);
  if (!u) { location.hash = "#/"; return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  kok.innerHTML = `<div class="ust"><button class="geri" onclick="location.hash='#/hafta/${n}'">‹ ${n}. Hafta</button></div>
  <section class="kart" style="text-align:center">
    <div class="etiket e-a"><i></i>Etkinlik · ${n}. Hafta</div>
    <h2>Söyle, işaretini gör</h2>
    <button class="mik" id="mik" aria-label="Konuşmak için dokun">🎤</button>
    <p class="soluk" id="durum">${SR ? "Engelleri kaldırmak için lütfen konuşun" : "Bu tarayıcı sesli girişi desteklemiyor; kelimeyi aşağıya yazabilirsin."}</p>
    <div class="soru" id="sonuc">Kelime: —</div>
    <video id="vid" muted loop playsinline style="display:none;width:100%;border-radius:12px;background:#000;max-height:45vh;margin-top:12px"></video>
    <div class="satir" style="margin-top:4px">
      <input type="text" id="yaz" placeholder="ya da kelimeyi yaz" autocomplete="off" style="flex:1">
      <button class="btn ikincil" id="goster" style="width:auto;padding:0 18px">Göster</button>
    </div>
  </section>
  <section class="kart">
    <h3>Bu haftanın kelimeleri</h3>
    <p class="soluk">Bunlardan birini söylemeyi dene. Önceki haftaların kelimeleri de çalışır.</p>
    <div class="cipler">${u.gruplar.flatMap(g => g.kelimeler).map(([ad, v]) => `<button class="cip" data-v="${v}" data-ad="${kacis(ad)}">${kacis(ad)}</button>`).join("")}</div>
  </section>`;

  const durumYaz = m => { $("#durum").textContent = m; };
  const vid = $("#vid");
  const goster = (soylenen, v) => {
    $("#sonuc").textContent = "Kelime: " + soylenen;
    if (!v) { vid.style.display = "none"; vid.removeAttribute("src"); durumYaz("Bu kelimenin işareti bulunamadı, başka bir kelime dene."); return; }
    vid.src = `videos/${v}.mp4`; vid.style.display = "block"; vid.playbackRate = yerel.oku("hiz", 1);
    vid.play().catch(() => {});
    durumYaz("Şimdi sen de işareti kendi ellerinle yap.");
  };
  const metindenGoster = metinler => {
    for (const m of metinler) { const v = eslestir(m); if (v) return goster(m.trim(), v); }
    goster((metinler[0] || "").trim(), null);
  };

  $("#goster").onclick = () => { const t = $("#yaz").value; if (t.trim()) metindenGoster([t]); };
  $("#yaz").onkeydown = e => { if (e.key === "Enter") $("#goster").click(); };
  kok.querySelectorAll(".cip").forEach(b => b.onclick = () => goster(b.dataset.ad, b.dataset.v));

  const mik = $("#mik");
  mik.onclick = async () => {
    if (!SR) { durumYaz("Bu tarayıcı sesli girişi desteklemiyor; kelimeyi aşağıya yazabilirsin."); $("#yaz").focus(); return; }
    if (aktifTanima) { aktifTanima.stop(); return; }
    // Önce mikrofon iznini açıkça iste: izin penceresi çıkar ve sorunun ne olduğu ayırt edilebilir
    if (!mikIzni && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const akis = await navigator.mediaDevices.getUserMedia({ audio: true });
        akis.getTracks().forEach(t => t.stop());
        mikIzni = true;
      } catch (err) {
        durumYaz(
          err.name === "NotFoundError" ? "Bu cihazda mikrofon bulunamadı. Telefonundan dene ya da kelimeyi aşağıya yaz." :
          err.name === "NotAllowedError" ? "Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesine dokun, Mikrofon'u \"İzin ver\" yap ve sayfayı yenile." :
          err.name === "NotReadableError" ? "Mikrofon açılamadı: başka bir uygulama kullanıyor olabilir ya da cihaz ayarlarında kapalı." :
          "Mikrofon açılamadı (" + err.name + ").");
        return;
      }
    }
    const t = new SR();
    t.lang = "tr-TR"; t.interimResults = false; t.maxAlternatives = 5;
    t.onstart = () => { mik.classList.add("dinliyor"); durumYaz("Dinliyorum…"); };
    t.onresult = e => metindenGoster([...e.results[0]].map(a => a.transcript));
    t.onerror = e => durumYaz({
      "not-allowed": "Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden Mikrofon'a izin ver ve sayfayı yenile.",
      "service-not-allowed": "Bu tarayıcı ses tanıma servisine izin vermiyor. Android'de Chrome, iPhone'da Safari kullan ya da kelimeyi yaz.",
      "audio-capture": "Mikrofon bulunamadı ya da çalışmıyor. Kelimeyi aşağıya yazabilirsin.",
      "network": "Ses tanıma için internet bağlantısı gerekiyor.",
      "no-speech": "Ses algılanamadı, tekrar dene.",
      "aborted": ""
    }[e.error] ?? "Ses tanınamadı (" + e.error + "), kelimeyi yazabilirsin.");
    t.onend = () => { if (aktifTanima === t) aktifTanima = null; mik.classList.remove("dinliyor"); };
    aktifTanima = t;
    try { t.start(); } catch (err) { aktifTanima = null; durumYaz("Mikrofon başlatılamadı: " + err.message); }
  };
}

// ---------- SINAV (bekleme odası + quiz) ----------
let sinavCalisiyor = false, lobiDinleyici = null, soruZamanlayici = null;

function sinaviBirak() {
  sinavCalisiyor = false;
  clearInterval(soruZamanlayici);
  if (lobiDinleyici) { off(ref(db, "lobby/players"), "value", lobiDinleyici); lobiDinleyici = null; }
}

function sinavSayfasi() {
  if (!db || fbHata) { kok.innerHTML = ust(true) + `<div class="kart"><div class="uyari">Sunucuya bağlanılamadı. ${kacis(fbHata || "")}</div></div>`; return; }
  if (!uid) { kok.innerHTML = ust(true) + `<div class="kart"><p>Bağlanıyor…</p></div>`; return; }
  if (!sinavAcik()) {
    kok.innerHTML = ust(true) + `<div class="kart"><div class="buyuk-ikon">🔒</div><h2 style="text-align:center">Quiz şu an kapalı</h2>
      <p class="soluk" style="text-align:center">Quiz sadece ders saatinde, araştırmacı açtığında erişilebilir.</p></div>`;
    return;
  }
  const ad = yerel.oku("ad", "");
  if (!ad) {
    kok.innerHTML = ust(true) + `<div class="kart"><div class="etiket e-s"><i></i>${durum.week}. Hafta Quiz</div>
      <h2>Adın ve soyadın</h2><p class="soluk">Puanların bu isimle kaydedilecek.</p>
      <input type="text" id="ad" maxlength="40" autocomplete="name" placeholder="Örn. Ayşe Yılmaz">
      <button class="btn" id="kat">Bekleme odasına gir</button></div>`;
    $("#kat").onclick = () => {
      const v = $("#ad").value.trim().replace(/\s+/g, " ");
      if (v.length < 3) { $("#ad").focus(); return; }
      yerel.yaz("ad", v); sinavSayfasi();
    };
    return;
  }
  bekle(ad);
}

async function bekle(ad) {
  sinavCalisiyor = true;
  const hk = "week" + durum.week;
  try {
    const bitti = await get(ref(db, `exam/done/${uid}/${hk}`));
    if (bitti.exists()) {
      sinavCalisiyor = false;
      const d = bitti.val();
      kok.innerHTML = ust(true) + `<div class="kart"><div class="buyuk-ikon">✅</div><h2 style="text-align:center">Bu haftanın quiz'ini tamamladın</h2>
        <p class="soluk" style="text-align:center">${d.toplam} sorudan ${d.dogru} doğru · ${d.puan} puan</p></div>`;
      return;
    }
    await set(ref(db, `lobby/players/${uid}`), { name: ad, joinedAt: serverTimestamp() });
  } catch (e) {
    sinavCalisiyor = false;
    kok.innerHTML = ust(true) + `<div class="kart"><div class="uyari">Bekleme odasına girilemedi: ${kacis(e.message)}</div></div>`;
    return;
  }
  if (durum.phase === "in_progress") return quiziBaslat(ad);
  kok.innerHTML = ust(true) + `<div class="kart" style="text-align:center">
    <div class="etiket e-s"><i></i>${durum.week}. Hafta Quiz</div>
    <h2>Bekleme odası</h2>
    <p class="soluk">Merhaba <b>${kacis(ad)}</b>! Quiz başladığında ekran kendiliğinden açılacak.</p>
    <div class="oyuncular" id="oyuncular"></div></div>`;
  lobiDinleyici = onValue(ref(db, "lobby/players"), s => {
    const k = $("#oyuncular"); if (!k) return;
    const adlar = []; s.forEach(c => { adlar.push(c.val().name); });
    k.innerHTML = adlar.map(a => `<span>${kacis(a)}</span>`).join("");
  }, () => {});
}

function sinavDurumDegisti() {
  if (rota().ad !== "sinav") return;
  if (durum.phase === "in_progress" && !quizBasladi) quiziBaslat(yerel.oku("ad", ""));
  else if (!sinavAcik() && !quizBasladi) { sinaviBirak(); ciz(); }
}

let quizBasladi = false;
async function quiziBaslat(ad) {
  if (quizBasladi) return;
  quizBasladi = true;
  if (lobiDinleyici) { off(ref(db, "lobby/players"), "value", lobiDinleyici); lobiDinleyici = null; }
  const hafta = Number(durum.week), hk = "week" + hafta;
  let sorular;
  try {
    const s = await get(ref(db, `quiz/${hk}`));
    sorular = s.val();
  } catch (e) {
    quizBasladi = false; sinavCalisiyor = false;
    kok.innerHTML = ust(true) + `<div class="kart"><div class="uyari">Sorular alınamadı: ${kacis(e.message)}</div></div>`;
    return;
  }
  if (!sorular || !sorular.length) {
    quizBasladi = false; sinavCalisiyor = false;
    kok.innerHTML = ust(true) + `<div class="kart"><div class="uyari">Bu hafta için soru yüklenmemiş.</div></div>`;
    return;
  }
  sorular = karistir(sorular);
  // Videoları önceden yükle
  sorular.forEach(q => { const l = document.createElement("link"); l.rel = "prefetch"; l.href = `videos/${q.v}.mp4`; document.head.appendChild(l); });

  let i = 0, dogru = 0, puan = 0;
  // 3 saniyelik geri sayım
  for (let n = 3; n > 0; n--) {
    kok.innerHTML = ust(true) + `<div class="kart"><p style="text-align:center" class="soluk">${hafta}. Hafta Quiz · ${sorular.length} soru</p><div class="sayac">${n}</div></div>`;
    await bekleMs(1000);
  }
  while (i < sorular.length) {
    const sonuc = await soruSor(sorular[i], i, sorular.length);
    if (sonuc.dogru) {
      dogru++; puan += sonuc.puan;
      push(ref(db, `exam/scores/${uid}/${hk}`), { score: sonuc.puan, timestamp: serverTimestamp(), name: ad }).catch(() => {});
    }
    i++;
  }
  try { await set(ref(db, `exam/done/${uid}/${hk}`), { dogru, toplam: sorular.length, puan, name: ad, at: serverTimestamp() }); } catch {}
  quizBasladi = false; sinavCalisiyor = false;
  toplamPuaniGetir();
  const u = UNITES.find(x => x.hafta === hafta), sonraki = UNITES.find(x => x.hafta === hafta + 1);
  const ogr = u ? haftaIlerleme(u).ok : 0;
  kok.innerHTML = ust(true) + `<div class="kart" style="text-align:center">
    <div class="etiket e-s"><i></i>Doyum</div>
    <div class="buyuk-ikon">${dogru / sorular.length >= 0.5 ? "🎉" : "💪"}</div>
    <h2>${dogru / sorular.length >= 0.5 ? "Tebrikler!" : "İyi denemeydi!"}</h2>
    <div class="puan" style="margin:14px 0"><div><b>${dogru}/${sorular.length}</b><small>doğru</small></div><div><b>${puan}</b><small>puan</small></div></div>
    ${ogr ? `<p>Bu hafta <b>${ogr}</b> işaret öğrendin.</p>` : ""}
    ${sonraki ? `<p class="soluk">Gelecek hafta: <b>${kacis(sonraki.baslik)}</b></p>` : `<p class="soluk">Altı haftayı tamamladın. Emeğin için teşekkürler!</p>`}
    <button class="btn" onclick="location.hash='#/'">Ana sayfaya dön</button></div>`;
}

const bekleMs = ms => new Promise(r => setTimeout(r, ms));
const karistir = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Android uygulamasıyla aynı hız puanı
const hizPuani = s => s <= 1 ? 50 : s <= 2 ? 40 : s <= 5 ? 25 : s <= 7 ? 15 : s <= 14 ? 5 : 1;

function soruSor(q, i, n) {
  return new Promise(cozum => {
    const secenekler = karistir([q.c, ...q.w]);
    kok.innerHTML = ust(true) + `<div class="kart">
      <div class="bilgi"><span>Soru ${i + 1}/${n}</span><span id="kalan">${SORU_SURESI_SN} sn</span></div>
      <div class="sure"><span id="sure" style="width:100%"></span></div>
      <video src="videos/${q.v}.mp4" autoplay muted loop playsinline style="width:100%;border-radius:12px;background:#000;max-height:45vh"></video>
      <p class="soluk" style="margin:10px 0 0">Bu işaret ne anlama geliyor?</p>
      <div class="secenekler">${secenekler.map((s, k) => `<button class="secenek" data-k="${k}">${kacis(s)}</button>`).join("")}</div>
      <div class="mesaj" id="mesaj"></div></div>`;
    const baslangic = performance.now();
    let kalan = SORU_SURESI_SN, bitti = false;
    requestAnimationFrame(() => { $("#sure").style.width = ((kalan - 1) / SORU_SURESI_SN * 100) + "%"; });
    const butonlar = [...kok.querySelectorAll(".secenek")];
    const bitir = (sonuc, secilen) => {
      if (bitti) return; bitti = true;
      clearInterval(soruZamanlayici);
      butonlar.forEach(b => { b.disabled = true; if (b.textContent === q.c) b.classList.add("dogru"); });
      if (secilen && !sonuc.dogru) secilen.classList.add("yanlis");
      $("#mesaj").textContent = sonuc.dogru ? `✅ Doğru! +${sonuc.puan} puan` : secilen ? `❌ Doğru cevap: ${q.c}` : `⏰ Süre doldu. Doğru cevap: ${q.c}`;
      setTimeout(() => cozum(sonuc), 1800);
    };
    butonlar.forEach(b => b.onclick = () => {
      const sn = (performance.now() - baslangic) / 1000;
      const dogruMu = secenekler[Number(b.dataset.k)] === q.c;
      bitir({ dogru: dogruMu, puan: dogruMu ? 1 + hizPuani(sn) : 0 }, b);
    });
    soruZamanlayici = setInterval(() => {
      kalan--;
      const k = $("#kalan"), s = $("#sure");
      if (k) k.textContent = Math.max(kalan, 0) + " sn";
      if (s) s.style.width = (Math.max(kalan - 1, 0) / SORU_SURESI_SN * 100) + "%";
      if (kalan <= 0) bitir({ dogru: false, puan: 0 }, null);
    }, 1000);
  });
}

ciz();
