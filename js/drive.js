/* حصصي — النسخ الاحتياطي على Google Drive
 * بيستخدم صلاحية drive.file بس: التطبيق بيشوف الملفات اللي هو عملها وبس، مش باقي الدرايف.
 * محتاج Client ID من Google Cloud (مرة واحدة) — الخطوات في الإعدادات. */
'use strict';

const Drive = (() => {
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const FOLDER = 'حصصي - نسخ احتياطية';
  const KEEP = 30;                       // آخر ٣٠ نسخة على الدرايف
  const API = 'https://www.googleapis.com/drive/v3';
  const TK = 'hesasy-gtok';
  let tok = null, exp = 0, gisP = null;
  try { const t = JSON.parse(localStorage.getItem(TK) || 'null'); if (t && t.exp > Date.now()) { tok = t.tok; exp = t.exp; } } catch (e) {}

  const cfg = () => App.st.settings.backup;
  const configured = () => !!(App.st && cfg().driveClient);
  const hasToken = () => !!tok && Date.now() < exp - 60000;
  const setTok = (t, sec) => { tok = t; exp = Date.now() + (+sec || 3600) * 1000; try { localStorage.setItem(TK, JSON.stringify({ tok, exp })); } catch (e) {} };
  const clearTok = () => { tok = null; exp = 0; try { localStorage.removeItem(TK); } catch (e) {} };

  function loadGis() {
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    if (!gisP) gisP = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = res;
      s.onerror = () => { gisP = null; s.remove(); rej(new Error('مش قادر يوصل لجوجل — اتأكد إن النت شغال')); };
      document.head.appendChild(s);
    });
    return gisP;
  }
  /* تسجيل الدخول لازم يبدأ من ضغطة زرار (المتصفح بيمنع النوافذ اللي بتفتح لوحدها) */
  async function signIn(consent) {
    if (hasToken() && !consent) return tok;
    if (!configured()) throw new Error('اربط Google Drive الأول من الإعدادات');
    await loadGis();
    App.picking = true;                  // متقفلش التطبيق وهو في نافذة جوجل
    try {
      return await new Promise((res, rej) => {
        const c = google.accounts.oauth2.initTokenClient({
          client_id: cfg().driveClient.trim(), scope: SCOPE,
          ...(cfg().driveEmail ? { login_hint: cfg().driveEmail } : {}),
          callback: r => {
            if (r && r.access_token) { setTok(r.access_token, r.expires_in); res(r.access_token); }
            else rej(new Error(r && r.error === 'access_denied' ? 'جوجل مسمحش — لازم توافق على صلاحية الدرايف' : 'جوجل رفض الدخول: ' + ((r && (r.error_description || r.error)) || 'غلط مش معروف')));
          },
          error_callback: e => rej(new Error(e && e.type === 'popup_closed' ? 'نافذة جوجل اتقفلت قبل ما تخلص' : e && e.type === 'popup_failed_to_open' ? 'المتصفح منع نافذة جوجل — اسمح بالـ Pop-ups للموقع' : 'مقدرش يفتح دخول جوجل'))
        });
        c.requestAccessToken({ prompt: consent ? 'consent' : '' });
      });
    } finally { setTimeout(() => { App.picking = false; }, 1500); }
  }

  async function api(url, opts = {}) {
    if (!hasToken()) throw Object.assign(new Error('محتاج تدخل على جوجل تاني'), { auth: true });
    const r = await fetch(url.startsWith('http') ? url : API + url, { ...opts, headers: { Authorization: 'Bearer ' + tok, ...(opts.headers || {}) } });
    if (r.status === 401) { clearTok(); throw Object.assign(new Error('محتاج تدخل على جوجل تاني'), { auth: true }); }
    if (!r.ok) {
      let m = ''; try { const j = await r.json(); m = (j.error && j.error.message) || ''; } catch (e) {}
      if (r.status === 403 && /has not been used|disabled/i.test(m)) throw new Error('فعّل Google Drive API في مشروع Google Cloud (الخطوة 2)');
      if (r.status === 403 && /quota|storage/i.test(m)) throw new Error('مساحة الدرايف خلصت');
      throw new Error('الدرايف رجّع غلط (' + r.status + ')' + (m ? ': ' + m : ''));
    }
    return r.status === 204 ? null : opts.raw ? r : r.json();
  }
  const q = s => encodeURIComponent(s);

  async function folderId() {
    const B = cfg();
    if (B.driveFolder) {
      try { const f = await api('/files/' + B.driveFolder + '?fields=id,trashed'); if (f && !f.trashed) return f.id; } catch (e) { if (e.auth) throw e; }
    }
    const found = await api('/files?spaces=drive&fields=files(id)&q=' + q(`name='${FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`));
    let id = found.files && found.files[0] && found.files[0].id;
    if (!id) id = (await api('/files?fields=id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: FOLDER, mimeType: 'application/vnd.google-apps.folder' }) })).id;
    B.driveFolder = id; Store.save(App.st);
    return id;
  }
  async function whoAmI() {
    try { const a = await api('/about?fields=user(emailAddress)'); const m = a && a.user && a.user.emailAddress; if (m) { cfg().driveEmail = m; Store.save(App.st); } return m; } catch (e) { return null; }
  }

  async function list() {
    const fid = await folderId();
    const r = await api('/files?spaces=drive&orderBy=createdTime desc&pageSize=100&fields=files(id,name,createdTime,size)&q=' + q(`'${fid}' in parents and trashed=false`));
    return (r.files || []).filter(f => /^hesasy-backup-.*\.json$/.test(f.name));
  }
  async function upload(state, reason) {
    const fid = await folderId();
    const name = Backup.fileName();
    const meta = { name, parents: [fid], mimeType: 'application/json', description: 'نسخة احتياطية من تطبيق حصصي · ' + (reason || '') };
    const bd = 'hesasy' + Math.random().toString(36).slice(2);
    const body = `--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${bd}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(Backup.pack(state, reason))}\r\n--${bd}--`;
    const f = await api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + bd }, body });
    try { const all = await list(); for (const x of all.slice(KEEP)) await api('/files/' + x.id, { method: 'DELETE' }); } catch (e) {}
    return f;
  }
  async function read(id) {
    const r = await api('/files/' + id + '?alt=media', { raw: true });
    const txt = await r.text();
    return Backup.readFile({ text: async () => txt });
  }
  function disconnect() {
    try { if (tok && window.google && google.accounts) google.accounts.oauth2.revoke(tok, () => {}); } catch (e) {}
    clearTok();
  }
  /* تحميل مكتبة جوجل بدري علشان أول ضغطة تفتح النافذة على طول */
  function warm() { if (configured() && navigator.onLine) loadGis().catch(() => {}); }

  return { KEEP, FOLDER, configured, hasToken, signIn, whoAmI, list, upload, read, disconnect, warm, folderId };
})();
window.Drive = Drive;
