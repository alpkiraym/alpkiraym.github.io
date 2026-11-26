/* ===== ZİYARETÇİ SAYACI · Giray Akademi =====
   Bütün programlarda </body>'den önce tek satır:  <script type="module" src="/sayac.js"></script>
   - Her tarayıcı oturumunda bir kez sayılır (aynı oturumda başka programa geçmek yeniden saymaz).
   - Sayfa açık durdukça "şu an çevrimiçi" listesinde görünür, kapanınca kendiliğinden düşer.
   - Sayfada #ziyaretci kutusu varsa (ana sayfa) rakamları oraya yazar.
   Veriler: Firebase Realtime Database · proje ihtisas-3c6f9 · stats/total, stats/days/YYYY-AA-GG, online/{id}
*/
const URL_DB = 'https://ihtisas-3c6f9-default-rtdb.europe-west1.firebasedatabase.app';
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

function gun(ofs) { // İstanbul saatine göre YYYY-AA-GG
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' })
    .format(new Date(Date.now() - (ofs || 0) * 864e5));
}

try {
  const { initializeApp } = await import(SDK + 'firebase-app.js');
  const { getDatabase, ref, runTransaction, set, onDisconnect, onValue, query, orderByKey, startAt } =
    await import(SDK + 'firebase-database.js');
  const db = getDatabase(initializeApp({ databaseURL: URL_DB }, 'sayac'));

  // 1) Sayım: oturum başına bir kez
  let sayildi = false;
  try { sayildi = sessionStorage.getItem('ga_sayac') === '1'; } catch (e) {}
  if (!sayildi) {
    try { sessionStorage.setItem('ga_sayac', '1'); } catch (e) {}
    const art = (n) => (n || 0) + 1;
    runTransaction(ref(db, 'stats/total'), art).catch(() => {});
    runTransaction(ref(db, 'stats/days/' + gun()), art).catch(() => {});
  }

  // 2) Çevrimiçi kaydı
  let id = '';
  try { id = sessionStorage.getItem('ga_sayac_id') || ''; } catch (e) {}
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).replace(/-/g, '').slice(0, 24);
    try { sessionStorage.setItem('ga_sayac_id', id); } catch (e) {}
  }
  const ben = ref(db, 'online/' + id);
  onValue(ref(db, '.info/connected'), (s) => {
    if (s.val() !== true) return;
    onDisconnect(ben).remove().then(() => set(ben, true)).catch(() => {});
  });

  // 3) Gösterim (yalnızca #ziyaretci olan sayfada)
  const kutu = document.getElementById('ziyaretci');
  if (kutu) {
    const fmt = (n) => Number(n || 0).toLocaleString('tr-TR');
    const yaz = (k, n) => { const e = kutu.querySelector('[data-z="' + k + '"]'); if (e) e.textContent = fmt(n); };
    onValue(ref(db, 'stats/total'), (s) => yaz('toplam', s.val()));
    onValue(ref(db, 'online'), (s) => yaz('simdi', s.size || 0));
    const hafta = gun(6), ay = gun(29);
    onValue(query(ref(db, 'stats/days'), orderByKey(), startAt(ay)), (s) => {
      let h = 0, a = 0;
      s.forEach((c) => { const v = c.val() || 0; a += v; if (c.key >= hafta) h += v; });
      yaz('hafta', h); yaz('ay', a);
    });
    kutu.hidden = false;
  }
} catch (e) { /* internet yoksa ya da engellendiyse sessizce geçer */ }
