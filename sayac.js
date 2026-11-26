/* ===== ZİYARETÇİ SAYACI · Giray Akademi =====
   Bütün programlarda </body>'den önce tek satır:  <script type="module" src="/sayac.js"></script>
   - Ders adı adresin ilk klasöründen alınır (/mecelle/ → mecelle, ana sayfa → ana).
   - Her tarayıcı oturumunda site için bir kez, her ders için de ayrıca bir kez sayılır.
   - Sayfa açık durdukça "şu an çevrimiçi" listesinde (hangi derste olduğuyla) görünür, kapanınca düşer.
   - Ana sayfa: #ziyaretci şeridi + ders kartı/simgelerinde çevrimiçi rozeti (hep görünür; 0 iken soluk) (+ masaüstü kartta haftalık ziyaret).
   - Dersler: sayfanın en sonunda (içerik bitince) o dersin rakamları; alt çubuğa dokunulmaz.
   - Önizleme: adres sonuna ?sayac=demo → Firebase'e bağlanmadan örnek rakamlar.
   Veriler: Firebase Realtime Database · proje ihtisas-3c6f9
     stats/total, stats/days/YYYY-AA-GG          (site geneli)
     dersler/{ders}/total, dersler/{ders}/days/…  (ders ders)
     online/{id} = ders
*/
const URL_DB = 'https://ihtisas-3c6f9-default-rtdb.europe-west1.firebasedatabase.app';
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const DEMO = /[?&]sayac=demo/.test(location.search);
const DERS = (location.pathname.split('/')[1] || 'ana').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) || 'ana';

const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');
function gun(ofs) { // İstanbul saatine göre YYYY-AA-GG
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' })
    .format(new Date(Date.now() - (ofs || 0) * 864e5));
}
function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

/* ---------- Görünüm ---------- */
const CSS = `
.zy-rz[hidden],.zy-hf[hidden],.zy-alt[hidden]{display:none!important}
.zy-rz{position:absolute;right:-6px;bottom:-6px;z-index:1;display:inline-flex;align-items:center;gap:4px;padding:3px 7px 3px 6px;border-radius:999px;background:#fff;color:#1f5a45;font:700 .72rem/1 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.22);font-variant-numeric:tabular-nums}
.zy-rz i,.zy-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#2fa36b;box-shadow:0 0 0 2px rgba(47,163,107,.2);animation:zyN 2s ease-in-out infinite}
@keyframes zyN{50%{box-shadow:0 0 0 4px rgba(47,163,107,0)}}
.zy-rz.zy-bos{background:#ece7dc;color:#8a8f86;box-shadow:0 1px 3px rgba(0,0,0,.15)}
.zy-rz.zy-bos i{background:#a9ada6;box-shadow:none;animation:none}
.app .facts .zy-hf{background:#e4efe8;color:#1f5a45}
.zy-alt{display:flex;justify-content:center;align-items:center;gap:6px;flex-wrap:wrap;margin:28px auto 6px;padding:12px 16px 4px;max-width:900px;border-top:1px solid #e3dccb;font:.78rem/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.01em;color:#6b7068;font-variant-numeric:tabular-nums;text-align:center}
.zy-alt b{color:#1f5a45;font-weight:600}
.zy-alt .s{opacity:.5}
@media (max-width:1024px), (hover:none) and (pointer:coarse) and (max-width:1440px){
 .zy-rz{right:-4px;bottom:-4px;font-size:.78rem;padding:4px 8px 4px 7px}
}`;
function stil() { const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }

// Ana sayfa: kart/simge rozetleri
const rozetler = {};
function anaSayfaRozet() {
  document.querySelectorAll('.apps a.app[href]').forEach((a) => {
    const k = (a.getAttribute('href').split('/')[1] || '').toLowerCase();
    const ico = a.querySelector('.ico');
    if (!k || !ico) return;
    const r = document.createElement('span');
    r.className = 'zy-rz zy-bos'; r.title = 'Şu an bu derste çalışanlar';
    r.innerHTML = '<i></i><b>0</b>';
    ico.appendChild(r);
    let hf = null;
    const facts = a.querySelector('.facts');
    if (facts) { hf = document.createElement('span'); hf.className = 'zy-hf'; hf.hidden = true; facts.appendChild(hf); }
    rozetler[k] = { r, hf };
  });
}
function rozetYaz(k, simdi) {
  const o = rozetler[k]; if (!o) return;
  o.r.querySelector('b').textContent = fmt(simdi);
  o.r.classList.toggle('zy-bos', !(simdi > 0)); // kimse yokken soluk gri, biri girince yeşil
}
function haftaYaz(k, n) {
  const o = rozetler[k]; if (!o || !o.hf) return;
  o.hf.textContent = fmt(n) + ' ziyaret / hafta';
  o.hf.hidden = !(n > 0);
}

// Ana sayfa: küçük sayaç şeridi
function seritYaz(k, n) {
  const kutu = document.getElementById('ziyaretci'); if (!kutu) return;
  const e = kutu.querySelector('[data-z="' + k + '"]'); if (e) e.textContent = fmt(n);
  kutu.hidden = false;
}

// Dersler: sayfanın en sonunda (içerik bitince) ince bir satır — alt çubuğa dokunmaz
let altSatir = null;
function dersAlt() {
  altSatir = document.createElement('div');
  altSatir.className = 'zy-alt'; altSatir.hidden = true;
  altSatir.innerHTML = '<span class="zy-dot"></span><span>Bu derste şu an <b data-a="simdi">–</b> kişi</span><span class="s">·</span>'
    + '<span>bu hafta <b data-a="hafta">–</b></span><span class="s">·</span><span>bu ay <b data-a="ay">–</b></span>'
    + '<span class="s">·</span><span>toplam <b data-a="toplam">–</b></span>';
  const once = document.querySelector('body > .sig') || document.querySelector('body > .gab') || document.querySelector('body > script');
  if (once) document.body.insertBefore(altSatir, once); else document.body.appendChild(altSatir);
}
function altYaz(k, n) {
  if (!altSatir) return;
  const e = altSatir.querySelector('[data-a="' + k + '"]'); if (e) e.textContent = fmt(n);
  altSatir.hidden = false;
}

/* ---------- Başlat ---------- */
stil();
const ANA = DERS === 'ana';
if (ANA) anaSayfaRozet(); else dersAlt();

if (DEMO) {
  const R = { mecelle: 3, meal: 5, madhal: 2, fikih_usulu: 1, islam_mezhepleri: 2, tefsir_usulu: 1 };
  const H = { mecelle: 85, meal: 142, madhal: 61, fikih_usulu: 48, islam_mezhepleri: 37, tefsir_usulu: 52, hadis_usulu: 40, eser_muellif_atlasi: 33, muhtar_lil_fetva: 21, guncel_inanc: 18, tahric: 12, feraiz: 27, ahval: 15, hadis_anlam_ve_yorum: 9 };
  if (ANA) {
    Object.keys(rozetler).forEach((k) => { rozetYaz(k, R[k] || 0); haftaYaz(k, H[k] || 0); });
    seritYaz('simdi', 14); seritYaz('hafta', 600); seritYaz('ay', 2318); seritYaz('toplam', 9764);
  } else {
    altYaz('simdi', 3); altYaz('hafta', 85); altYaz('ay', 310); altYaz('toplam', 1240);
  }
} else {
  try {
    const { initializeApp } = await import(SDK + 'firebase-app.js');
    const { getDatabase, ref, runTransaction, set, onDisconnect, onValue, query, orderByKey, startAt } =
      await import(SDK + 'firebase-database.js');
    const db = getDatabase(initializeApp({ databaseURL: URL_DB }, 'sayac'));
    const art = (n) => (n || 0) + 1;
    const hata = () => {};
    const bugun = gun(), hafta = gun(6), ay = gun(29);

    // 1) Sayım: site için oturumda bir kez, her ders için de oturumda bir kez
    if (ss('ga_sayac') !== '1') {
      ss('ga_sayac', '1');
      runTransaction(ref(db, 'stats/total'), art).catch(hata);
      runTransaction(ref(db, 'stats/days/' + bugun), art).catch(hata);
    }
    if (ss('ga_sayac_' + DERS) !== '1') {
      ss('ga_sayac_' + DERS, '1');
      runTransaction(ref(db, 'dersler/' + DERS + '/total'), art).catch(hata);
      runTransaction(ref(db, 'dersler/' + DERS + '/days/' + bugun), art).catch(hata);
    }

    // 2) Çevrimiçi kaydı (hangi derste olduğuyla)
    let id = ss('ga_sayac_id') || '';
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).replace(/-/g, '').slice(0, 24);
      ss('ga_sayac_id', id);
    }
    const ben = ref(db, 'online/' + id);
    onValue(ref(db, '.info/connected'), (s) => {
      if (s.val() !== true) return;
      onDisconnect(ben).remove().then(() => set(ben, DERS)).catch(hata);
    });

    // 3) Gösterim
    const gunTopla = (yol, fn) => onValue(query(ref(db, yol), orderByKey(), startAt(ay)), (s) => {
      let h = 0, a = 0;
      s.forEach((c) => { const v = c.val() || 0; a += v; if (c.key >= hafta) h += v; });
      fn(h, a);
    });
    if (ANA) {
      onValue(ref(db, 'online'), (s) => {
        const say = {}; let top = 0;
        s.forEach((c) => { top++; const k = typeof c.val() === 'string' ? c.val() : ''; say[k] = (say[k] || 0) + 1; });
        seritYaz('simdi', top);
        Object.keys(rozetler).forEach((k) => rozetYaz(k, say[k] || 0));
      });
      onValue(ref(db, 'stats/total'), (s) => seritYaz('toplam', s.val()));
      gunTopla('stats/days', (h, a) => { seritYaz('hafta', h); seritYaz('ay', a); });
      Object.keys(rozetler).forEach((k) =>
        onValue(query(ref(db, 'dersler/' + k + '/days'), orderByKey(), startAt(hafta)), (s) => {
          let h = 0; s.forEach((c) => { h += c.val() || 0; }); haftaYaz(k, h);
        }));
    } else if (altSatir) {
      onValue(ref(db, 'online'), (s) => { let n = 0; s.forEach((c) => { if (c.val() === DERS) n++; }); altYaz('simdi', n); });
      onValue(ref(db, 'dersler/' + DERS + '/total'), (s) => altYaz('toplam', s.val()));
      gunTopla('dersler/' + DERS + '/days', (h, a) => { altYaz('hafta', h); altYaz('ay', a); });
    }
  } catch (e) { /* internet yoksa ya da engellendiyse sessizce geçer */ }
}
