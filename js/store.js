/* حصصي — التخزين والأمان والنسخ الاحتياطي */
(function (root) {
  'use strict';
  const DB_NAME = 'hesasy';
  const KEEP = 5;            // نسخ الفولدر / الملفات
  const KEEP_DAILY = 7, KEEP_OTHER = 8; // النسخ الداخلية: آخر ٧ أيام + آخر ٨ نسخ قبل/بعد العمليات
  let dbp = null;

  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
        if (!d.objectStoreNames.contains('backups')) d.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

  async function kvGet(k) { const d = await db(); return reqP(d.transaction('kv').objectStore('kv').get(k)); }
  async function kvSet(k, v) {
    const d = await db(); const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k);
    return new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abort')); });
  }
  async function kvDel(k) { const d = await db(); const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').delete(k); return new Promise(res => { t.oncomplete = res; }); }

  /* ---------- البيانات ---------- */
  /* كل حفظ بيتختم بوقته (_savedAt). لو IndexedDB فشلت مرة والحفظ راح localStorage،
   * التحميل بياخد الأحدث فيهم — علشان نسخة قديمة متغطيش على تعديلات أحدث.
   * لو التحميل نفسه فشل، الحفظ بيتقفل (Store.blocked) علشان منكتبش بيانات فاضية فوق القديمة. */
  let saveTimer = null, pending = null, failCount = 0;
  const lsGet = () => { try { const s = localStorage.getItem('hesasy-state'); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
  const stamp = x => (x && x._savedAt) || '';
  const Store = {
    blocked: false, lastError: null, lastOk: null,
    async load() {
      let kv = null, kvErr = null;
      try { kv = await kvGet('state'); } catch (e) { kvErr = e; }
      const ls = lsGet();
      if (kvErr && !ls) { const er = new Error('LOAD_FAILED'); er.cause = kvErr; throw er; }
      if (!kv) return ls || null;
      if (ls && stamp(ls) > stamp(kv)) return ls;
      return kv;
    },
    save(state) {
      if (Store.blocked) return;
      pending = state;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => Store.flush(), 250);
    },
    async flush() {
      if (!pending || Store.blocked) return;
      pending._savedAt = new Date().toISOString();
      const s = JSON.parse(JSON.stringify(pending));
      pending = null;
      try {
        await kvSet('state', s);
        failCount = 0; Store.lastOk = s._savedAt; Store.lastError = null;
        try { if (localStorage.getItem('hesasy-state')) localStorage.removeItem('hesasy-state'); } catch (e) {}
      } catch (e) {
        failCount++; Store.lastError = e;
        try { localStorage.setItem('hesasy-state', JSON.stringify(s)); Store.lastOk = s._savedAt; }
        catch (e2) { if (window.onStoreFail) window.onStoreFail(e2); }
      }
    },
    async persist() { try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) {} return false; },
    async wipeData() { await kvDel('state'); },
    kvGet, kvSet
  };

  /* ---------- الباسورد (PBKDF2) ---------- */
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function hashPw(pw, saltB64) {
    const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
    return { salt: b64(salt), hash: b64(bits) };
  }
  const Security = {
    async get() { return (await kvGet('security')) || { pin: null, admin: null, bio: null, lock: true }; },
    async set(sec) { await kvSet('security', sec); },
    async setPin(pin) { const s = await Security.get(); s.pin = Object.assign(await hashPw(pin), { len: String(pin).length }); await Security.set(s); },
    async setAdmin(pw) { const s = await Security.get(); s.admin = await hashPw(pw); await Security.set(s); },
    async checkPin(pin) { const s = await Security.get(); if (!s.pin) return true; const h = await hashPw(pin, s.pin.salt); return h.hash === s.pin.hash; },
    async checkAdmin(pw) { const s = await Security.get(); if (!s.admin) return false; const h = await hashPw(pw, s.admin.salt); return h.hash === s.admin.hash; },

    /* البصمة / قفل الشاشة عن طريق WebAuthn */
    async bioAvailable() {
      try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; }
    },
    async bioRegister(appName) {
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: appName || 'حصصي' },
          user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'teacher', displayName: 'المدرس' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
          timeout: 60000, attestation: 'none'
        }
      });
      const s = await Security.get();
      s.bio = { id: b64(cred.rawId) };
      await Security.set(s);
      return true;
    },
    async bioVerify() {
      const s = await Security.get();
      if (!s.bio) return false;
      const a = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [{ type: 'public-key', id: unb64(s.bio.id), transports: ['internal'] }],
          userVerification: 'required', timeout: 60000
        }
      });
      return !!a;
    },
    async bioRemove() { const s = await Security.get(); s.bio = null; await Security.set(s); }
  };

  /* ---------- النسخ الاحتياطي ---------- */
  const pack = (state, reason) => ({ app: 'hesasy', v: 1, at: new Date().toISOString(), reason: reason || 'يدوي', data: state });
  const fileName = () => {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return 'hesasy-backup-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes()) + '.json';
  };

  const Backup = {
    KEEP, KEEP_DAILY, pack, fileName,
    async list() {
      const d = await db();
      const all = await reqP(d.transaction('backups').objectStore('backups').getAll());
      return all.sort((a, b) => b.at.localeCompare(a.at)).map(b => ({ id: b.id, at: b.at, reason: b.reason, students: (b.data.students || []).length, groups: (b.data.groups || []).length }));
    },
    async get(id) { const d = await db(); return reqP(d.transaction('backups').objectStore('backups').get(id)); },
    async add(state, reason) {
      const d = await db();
      const t = d.transaction('backups', 'readwrite');
      t.objectStore('backups').add(pack(JSON.parse(JSON.stringify(state)), reason));
      await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); });
      await Backup.prune();
    },
    async prune() {
      const d = await db();
      const all = await reqP(d.transaction('backups').objectStore('backups').getAll());
      all.sort((a, b) => b.at.localeCompare(a.at));
      // النسخ الفاضية مش بتزق نسخة فيها بيانات برّه
      const has = b => b.data && ((b.data.students || []).length || (b.data.groups || []).length);
      const daily = all.filter(b => b.reason === 'تلقائي يومي'), other = all.filter(b => b.reason !== 'تلقائي يومي');
      const keepIds = new Set([...daily.filter(has).slice(0, KEEP_DAILY), ...other.filter(has).slice(0, KEEP_OTHER)].map(b => b.id));
      // دايمًا سيب آخر نسخة فيها بيانات حتى لو قديمة
      const lastGood = all.find(has); if (lastGood) keepIds.add(lastGood.id);
      const drop = all.filter(b => !keepIds.has(b.id));
      if (!drop.length) return;
      const t = d.transaction('backups', 'readwrite');
      drop.forEach(b => t.objectStore('backups').delete(b.id));
      await new Promise(res => { t.oncomplete = res; });
    },
    async clearAll() { const d = await db(); const t = d.transaction('backups', 'readwrite'); t.objectStore('backups').clear(); await new Promise(res => { t.oncomplete = res; }); },

    /* فولدر على ذاكرة الموبايل (لو المتصفح بيدعم اختيار فولدر) */
    folderSupported() { return typeof window.showDirectoryPicker === 'function'; },
    async pickFolder() {
      const h = await window.showDirectoryPicker({ id: 'hesasy-backups', mode: 'readwrite', startIn: 'documents' });
      await kvSet('backupDir', h);
      return h.name;
    },
    async folderInfo() { try { const h = await kvGet('backupDir'); return h ? { name: h.name, perm: await h.queryPermission({ mode: 'readwrite' }) } : null; } catch (e) { return null; } },
    async forgetFolder() { await kvDel('backupDir'); },
    async writeFolder(state, interactive) {
      const h = await kvGet('backupDir');
      if (!h) return { ok: false, why: 'no-folder' };
      let p = await h.queryPermission({ mode: 'readwrite' });
      if (p !== 'granted' && interactive) p = await h.requestPermission({ mode: 'readwrite' });
      if (p !== 'granted') return { ok: false, why: 'permission' };
      const fh = await h.getFileHandle(fileName(), { create: true });
      const w = await fh.createWritable();
      await w.write(JSON.stringify(pack(state, 'تلقائي يومي')));
      await w.close();
      const names = [];
      for await (const [name, entry] of h.entries()) if (entry.kind === 'file' && /^hesasy-backup-.*\.json$/.test(name)) names.push(name);
      names.sort().reverse();
      for (const n of names.slice(KEEP)) { try { await h.removeEntry(n); } catch (e) {} }
      return { ok: true, folder: h.name, kept: Math.min(names.length, KEEP) };
    },

    blob(state, reason) { return new Blob([JSON.stringify(pack(state, reason), null, 1)], { type: 'application/json' }); },
    download(state) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(Backup.blob(state, 'تنزيل'));
      a.download = fileName();
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    },
    /* أندرويد (Chrome) مش بيسمح بمشاركة ملفات .json — فبنبعتها .txt (الاسترجاع بيقرا الاتنين) */
    async share(state) {
      if (!navigator.share) return false;
      const data = JSON.stringify(pack(state, 'مشاركة'), null, 1);
      const json = new File([data], fileName(), { type: 'application/json' });
      const txt = new File([data], fileName().replace(/\.json$/, '.txt'), { type: 'text/plain' });
      const can = f => { try { return !navigator.canShare || navigator.canShare({ files: [f] }); } catch (e) { return false; } };
      const f = can(json) ? json : can(txt) ? txt : null;
      if (!f) return false;
      try { await navigator.share({ files: [f], title: 'نسخة احتياطية - حصصي' }); }
      catch (e) {
        if (e && e.name === 'AbortError') throw e;          // المستخدم قفل القايمة
        if (f === json && can(txt)) { await navigator.share({ files: [txt], title: 'نسخة احتياطية - حصصي' }); return true; }
        throw e;
      }
      return true;
    },
    async readFile(file) {
      const txt = (await file.text()).replace(/^\uFEFF/, '').trim();
      let j;
      try { j = JSON.parse(txt); } catch (e) { throw new Error('الملف ده مش نسخة احتياطية من التطبيق (لازم يكون ملف hesasy-backup… بامتداد .json أو .txt)'); }
      if (j && !j.app && Array.isArray(j.students)) j = { app: 'hesasy', v: 1, at: null, data: j };
      if (!j || j.app !== 'hesasy' || !j.data || !Array.isArray(j.data.students)) throw new Error('الملف ده مش نسخة احتياطية من التطبيق');
      return j;
    }
  };

  root.Store = Store; root.Security = Security; root.Backup = Backup;
})(window);
