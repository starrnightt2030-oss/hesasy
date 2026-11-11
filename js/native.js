/* حصصي — نسخة تطبيق أندرويد (APK)
 * الملف ده بيشتغل بس جوه التطبيق المثبت (Capacitor). في المتصفح مبيعملش أي حاجة.
 * - البيانات بتتحفظ جوه التطبيق نفسه (مش في المتصفح) — مسح بيانات Chrome مش بيأثر عليها
 * - نسخة تلقائية بعد كل تعديل + نسخة يومية (آخر ٥) في ذاكرة الموبايل: Documents/Hesasy — بتفضل حتى لو اتمسح التطبيق
 * - البصمة، إشعارات الحصص والتطبيق مقفول، PDF للطباعة، حفظ ومشاركة الملفات، التحديثات من GitHub */
'use strict';
(function () {
  const C = window.Capacitor;
  const IS = !!(C && C.isNativePlatform && C.isNativePlatform());
  window.IS_NATIVE = IS;
  if (!IS) return;
  const P = C.Plugins;
  const FS = P.Filesystem, SH = P.Share, LN = P.LocalNotifications, BIO = P.BiometricAuthNative, BR = P.Browser, CA = P.App, SB = P.StatusBar;
  const ROOT = 'Hesasy', DOCS = 'DOCUMENTS', CACHE = 'CACHE';
  const REPO = 'starrnightt2030-oss/hesasy';
  const BUILD = window.HESASY_BUILD || { version: App.version, code: 0 };
  document.documentElement.classList.add('native');

  const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
  const safe = n => String(n).replace(/[\\/:*?"<>|]+/g, ' ').trim();

  const Native = window.Native = {
    folder: 'Documents/' + ROOT,
    async ensurePerm() {
      try { const p = await FS.checkPermissions(); if (p.publicStorage !== 'granted') await FS.requestPermissions(); } catch (e) {}
    },
    async save(blob, name, sub) {
      await Native.ensurePerm();
      const path = ROOT + (sub ? '/' + sub : '') + '/' + safe(name);
      await FS.writeFile({ path, data: await b64(blob), directory: DOCS, recursive: true });
      return 'Documents/' + path;
    },
    async share(files, title, text) {
      const uris = [];
      for (const f of files) {
        const path = 'share/' + safe(f.name);
        await FS.writeFile({ path, data: await b64(f.blob), directory: CACHE, recursive: true });
        uris.push((await FS.getUri({ path, directory: CACHE })).uri);
      }
      await SH.share({ title: title || 'حصصي', text: text || undefined, files: uris.length ? uris : undefined, dialogTitle: title || 'مشاركة' });
    },
    async list(sub) {
      try { const r = await FS.readdir({ path: ROOT + (sub ? '/' + sub : ''), directory: DOCS }); return r.files.map(f => typeof f === 'string' ? f : f.name); } catch (e) { return []; }
    },
    async remove(path) { try { await FS.deleteFile({ path: ROOT + '/' + path, directory: DOCS }); } catch (e) {} }
  };

  /* ---------- مشاركة وتنزيل الملفات ---------- */
  navigator.canShare = () => true;
  navigator.share = async d => {
    const files = await Promise.all((d.files || []).map(async f => ({ blob: f, name: f.name })));
    try { await Native.share(files, d.title, d.text || d.url); }
    catch (e) { const er = new Error(e.message || 'share'); er.name = /cancel/i.test(e.message || '') ? 'AbortError' : 'Error'; throw er; }
  };
  // أي <a download> بلينك blob بيتحفظ في Documents/Hesasy بدل التنزيل (الـ WebView مبيعرفش ينزّل)
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && /^blob:|^data:/.test(this.href)) {
      const name = this.download, href = this.href;
      fetch(href).then(r => r.blob()).then(b => Native.save(b, name, /\.json$|\.txt$/.test(name) ? 'backups' : 'files'))
        .then(p => toast('اتحفظ في ' + esc(p.replace(/\/[^/]*$/, '')), { ms: 4000 }))
        .catch(e => toast('مقدرناش نحفظ الملف: ' + esc(e.message || e), { type: 'err', sound: 'err' }));
      return;
    }
    return origClick.call(this);
  };
  // روابط برّه التطبيق (واتساب، GitHub) تفتح في التطبيق المناسب
  const origOpen = window.open;
  window.open = (url, target) => {
    if (/^https:\/\/(wa\.me|api\.whatsapp)/.test(url)) { location.href = url; return null; }
    if (/^https?:/.test(url)) { BR.open({ url }); return null; }
    return origOpen.call(window, url, target);
  };

  /* ---------- البصمة ---------- */
  Security.bioAvailable = async () => { try { const r = await BIO.checkBiometry(); return !!(r.isAvailable || r.deviceIsSecure); } catch (e) { return false; } };
  const auth = reason => BIO.internalAuthenticate({ reason: reason || 'افتح حصصي', cancelTitle: 'الباسورد', allowDeviceCredential: true, androidTitle: App.st ? App.st.settings.appName : 'حصصي', androidSubtitle: reason || 'تأكيد الهوية', androidConfirmationRequired: false });
  Security.bioRegister = async () => { await auth('تفعيل الفتح بالبصمة'); const s = await Security.get(); s.bio = { native: true }; await Security.set(s); return true; };
  Security.bioVerify = async () => { const s = await Security.get(); if (!s.bio) return false; await auth(); return true; };

  /* ---------- النسخ في ذاكرة الموبايل ---------- */
  const fname = (p) => { const d = new Date(), z = n => String(n).padStart(2, '0'); return p + d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + '_' + z(d.getHours()) + z(d.getMinutes()) + '.json'; };
  const pack = (st, reason) => JSON.stringify({ app: 'hesasy', v: 1, at: new Date().toISOString(), reason, data: st });
  // اسم ثابت لكل تثبيت (لو التطبيق اتمسح واتثبت تاني مش هيقدر يكتب فوق ملف التثبيت القديم)
  let inst = null;
  try { inst = localStorage.getItem('hesasy-inst'); if (!inst) { inst = Math.random().toString(36).slice(2, 6); localStorage.setItem('hesasy-inst', inst); } } catch (e) { inst = 'a'; }
  Backup.folderSupported = () => true;
  Backup.folderInfo = async () => ({ name: Native.folder, perm: 'granted' });
  Backup.pickFolder = async () => { await Native.ensurePerm(); return Native.folder; };
  Backup.writeFolder = async (st) => {
    const name = fname('hesasy-backup-');
    await Native.save(new Blob([pack(st, 'تلقائي يومي')], { type: 'application/json' }), name, 'backups');
    const names = (await Native.list('backups')).filter(n => /^hesasy-backup-.*\.json$/.test(n)).sort().reverse();
    for (const n of names.slice(Backup.KEEP)) await Native.remove('backups/' + n);
    return { ok: true, folder: Native.folder + '/backups', kept: Math.min(names.length, Backup.KEEP) };
  };
  // نسخة "آخر حفظ" بعد كل تعديل (بعد ٣ ثواني من آخر تغيير)
  let latestT = null, latestOk = null;
  const writeLatest = async () => {
    try {
      if (!App.st || (!App.st.students.length && !App.st.groups.length)) return;
      await Native.save(new Blob([pack(App.st, 'آخر حفظ')], { type: 'application/json' }), 'hesasy-latest-' + inst + '.json');
      latestOk = new Date();
    } catch (e) { console.warn('latest', e); }
  };
  Native.lastSaved = () => latestOk;
  const origSave = Store.save;
  Store.save = st => { origSave(st); clearTimeout(latestT); latestT = setTimeout(writeLatest, 3000); scheduleSoon(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(latestT); writeLatest(); } });

  /* ---------- الطباعة: PDF بمقاس A4 ---------- */
  Report.print = async (doc) => {
    if (!window.jspdf) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/lib-jspdf.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }).catch(() => {});
    if (!window.jspdf) return toast('مكتبة PDF مش محمّلة', { type: 'err' });
    toast('بيجهّز ملف PDF…', { icon: 'print', ms: 2500 });
    try {
      const pages = await Report.toPages(doc);
      const pdf = new jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      pages.forEach((c, i) => { if (i) pdf.addPage(); pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST'); });
      const blob = pdf.output('blob');
      const name = Report.fileName((Report.cur && Report.cur.title) || 'تقرير', 0, 1).replace(/\.png$/, '.pdf');
      const where = await Native.save(blob, name, 'reports');
      toast('اتحفظ PDF في ' + esc(where.replace(/\/[^/]*$/, '')), { ms: 4000 });
      await Native.share([{ blob, name }], name);   // من القايمة: طباعة، أو Drive، أو واتساب
    } catch (e) { if (!/cancel/i.test(e.message || '')) toast('مقدرناش نعمل PDF: ' + esc(e.message || e), { type: 'err', sound: 'err' }); }
  };
  Report.save = async (pages, title) => {
    const bl = await Report.blobs(pages);
    let where = '';
    for (let i = 0; i < bl.length; i++) where = await Native.save(bl[i], Report.fileName(title, i, bl.length), 'reports');
    toast((bl.length > 1 ? `اتحفظت ${bl.length} صور` : 'الصورة اتحفظت') + ' في ' + esc(where.replace(/\/[^/]*$/, '')), { sound: 'ok', ms: 4000 });
  };

  /* ---------- إشعارات الحصص (بتوصل والتطبيق مقفول) ---------- */
  let schedT = null;
  const scheduleSoon = () => { clearTimeout(schedT); schedT = setTimeout(scheduleAll, 4000); };
  Native.notifPerm = async (ask) => {
    try { let p = await LN.checkPermissions(); if (p.display !== 'granted' && ask) p = await LN.requestPermissions(); return p.display; } catch (e) { return 'denied'; }
  };
  async function scheduleAll() {
    try {
      if (!App.st || (await Native.notifPerm(false)) !== 'granted') return;
      const pend = await LN.getPending();
      if (pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
      const st = App.st, R = st.settings.reminders, list = [], now = Date.now();
      let id = 1000;
      for (let i = 0; i < 14; i++) {
        const d = E.addDays(E.today(), i);
        const day = E.sessionsOnDay(st, d).filter(o => o.status === 'normal' && E.studentsInSession(st, o).length);
        day.forEach(o => {
          const [y, m, dd] = d.split('-').map(Number), [h, mi] = o.time.split(':').map(Number);
          const at = new Date(y, m - 1, dd, h, mi - (R.before || 30));
          if (at.getTime() <= now + 30000) return;
          const g = E.groupById(st, o.groupId), sub = E.SUBJ[g.subjectId];
          list.push({ id: id++, title: 'حصة ' + sub.name + ' بعد ' + (R.before || 30) + ' دقيقة', body: E.GRADES[sub.grade] + (g.name ? ' · ' + g.name : '') + ' · ' + E.fmtTime(o.time) + ' · ' + E.studentsInSession(st, o).length + ' طالب',
            schedule: { at, allowWhileIdle: true }, smallIcon: 'ic_stat_hesasy', iconColor: '#E8962E', extra: { hash: '#/session/' + encodeURIComponent(o.key) } });
        });
        if (R.daily) {
          const [y, m, dd] = d.split('-').map(Number);
          const at = new Date(y, m - 1, dd, 9, 0);
          if (at.getTime() > now + 30000 && day.length)
            list.push({ id: id++, title: 'حصص النهارده: ' + day.length, body: day.map(o => E.SUBJ[E.groupById(st, o.groupId).subjectId].short + ' ' + E.fmtTime(o.time)).join(' · '),
              schedule: { at, allowWhileIdle: true }, smallIcon: 'ic_stat_hesasy', iconColor: '#E8962E', extra: { hash: '#/home' } });
        }
      }
      if (list.length) await LN.schedule({ notifications: list.slice(0, 60) });
    } catch (e) { console.warn('notif', e); }
  }
  Native.scheduleAll = scheduleAll;
  try { LN.addListener('localNotificationActionPerformed', ev => { const h = ev.notification && ev.notification.extra && ev.notification.extra.hash; if (h) location.hash = h; }); } catch (e) {}

  /* ---------- زرار الرجوع ---------- */
  let exitAt = 0;
  CA.addListener('backButton', () => {
    const ovs = document.querySelectorAll('.overlay');
    if (document.querySelector('.rv')) { history.back(); return; }
    if (ovs.length) { const o = ovs[ovs.length - 1]; const c = o.querySelector('[data-close]'); if (c) c.click(); else o.remove(); return; }
    const r = location.hash.replace(/^#\/?/, '');
    if (!App.unlocked || r === '' || r === 'home' || r === 'exit-guard') {
      if (Date.now() - exitAt < 2500) { CA.exitApp(); return; }
      exitAt = Date.now(); toast('اضغط رجوع تاني للخروج', { type: 'warn', icon: 'logout', ms: 2500 }); return;
    }
    history.back();
  });
  // التطبيق راح الخلفية / رجع (علشان القفل)
  CA.addListener('appStateChange', ({ isActive }) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => !isActive });
    document.dispatchEvent(new Event('visibilitychange'));
    if (isActive) { scheduleSoon(); setTimeout(checkApkUpdate, 1500); }
  });

  /* ---------- تحديث التطبيق من GitHub ---------- */
  let updShown = false;
  async function checkApkUpdate() {
    if (updShown || !App.unlocked) return;
    try {
      const r = await fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      const m = /-(\d+)$/.exec(j.tag_name || '');
      const code = m ? +m[1] : 0;
      if (!code || code <= (BUILD.code || 0)) return;
      const asset = (j.assets || []).find(a => /\.apk$/.test(a.name));
      if (!asset) return;
      updShown = true;
      Sound.play('chime');
      const s = sheet(`<div class="alarm-ic amber" style="animation:wobble 1.2s ease-in-out 2">${ic('download', 40)}</div>
        <h2 style="text-align:center">فيه تحديث جديد للتطبيق</h2>
        <div class="sm muted" style="text-align:center">${esc(j.name || j.tag_name)}</div>
        <div class="banner green">${ic('check', 18)}<span>نزّل الملف وثبّته فوق التطبيق الحالي — <b>بياناتك كلها بتفضل زي ما هي</b>.</span></div>
        <div class="grid2"><button class="btn ghost" data-close>بعدين</button><button class="btn accent" id="apk-dl">${ic('download', 18)} نزّل التحديث</button></div>`, { center: true, onClose: () => setTimeout(() => { updShown = false; }, 6 * 3600 * 1000) });
      $('#apk-dl', s.el).onclick = () => { BR.open({ url: asset.browser_download_url }); s.close(); };
    } catch (e) {}
  }
  Native.checkUpdate = checkApkUpdate;

  /* ---------- بدء التشغيل ---------- */
  try { SB.setBackgroundColor({ color: '#10213A' }); SB.setStyle({ style: 'DARK' }); } catch (e) {}
  window.addEventListener('load', () => {
    setTimeout(() => { scheduleAll(); checkApkUpdate(); }, 5000);
    setInterval(scheduleAll, 6 * 3600 * 1000);
  });
  // ربط Google Drive بيحتاج متصفح — في التطبيق بنستخدم زرار "ابعت" (Drive / واتساب)
  if (window.Drive) { Drive.configured = () => false; Drive.warm = () => {}; }
  ACT.driveSetup = () => toast('في نسخة التطبيق: النسخ بيتحفظ لوحده في ذاكرة الموبايل، وزرار "ابعت" بيرفع على Drive أو واتساب', { type: 'warn', ms: 6000 });
  ACT.askNotif = async () => { const p = await Native.notifPerm(true); App.ui.nativeNotif = p; if (p === 'granted') { toast('الإشعارات اتفعلت — هيجيلك تذكير قبل كل حصة حتى والتطبيق مقفول'); scheduleAll(); } else toast('الإشعارات مقفولة — افتحها من إعدادات الموبايل ← التطبيقات ← حصصي', { type: 'warn', ms: 6000 }); render(); };
  Native.notifPerm(false).then(p => { App.ui.nativeNotif = p; });
})();
