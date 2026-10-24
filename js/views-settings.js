/* حصصي — الإعدادات والنسخ الاحتياطي والتصفير */
'use strict';

Views.settings = () => {
  const st = App.st, S = st.settings, sec = App.sec || {};
  const P = S.prices, R = S.reminders;
  const folder = App.ui.folderInfo;
  const notif = 'Notification' in window ? Notification.permission : 'unsupported';
  const sw = (id, on, label, hint) => `<div class="set-row"><span class="stack"><span class="b">${label}</span>${hint ? `<span class="small muted">${hint}</span>` : ''}</span><button class="switch" role="switch" aria-checked="${!!on}" aria-label="${label}" data-act="${id}"></button></div>`;
  return `
  <header class="plain-head">${backBtn('#/home')}<h1>الإعدادات</h1></header>
  <main class="pad" style="gap:18px">
    <section style="display:flex;flex-direction:column;gap:8px"><h2 class="label-sm">شكل التطبيق</h2>
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div class="row" style="gap:14px">${brandIcon(64)}
          <label class="field grow">اسم التطبيق<input class="input" id="set-name" value="${esc(S.appName)}" maxlength="24" data-change="setName"></label></div>
        <div class="field">الأيقونة<div class="icon-grid">${APP_ICONS.map(n => `<button data-act="setIcon" data-n="${n}" class="${!S.iconData && S.iconId === n ? 'on' : ''}" aria-label="أيقونة ${n}">${ic(n, 22)}</button>`).join('')}</div>
          <label class="btn ghost sm" style="border-style:dashed;cursor:pointer">${ic('image', 18)} صورة من الموبايل<input type="file" accept="image/*" data-change="setIconImg" hidden></label></div>
        <div class="row between"><span class="b">اللون الأساسي</span><div class="swatches">${ACCENTS.map(c => `<button data-act="setAccent" data-c="${c}" class="${S.accent === c ? 'on' : ''}" style="background:${c}" aria-label="لون ${c}"></button>`).join('')}</div></div>
        <div class="banner blue">${ic('info', 18)}<span>الاسم والأيقونة بيتغيروا جوه التطبيق على طول. علشان يتغيروا على الشاشة الرئيسية للموبايل، امسح الاختصار القديم وثبّت التطبيق تاني.</span></div>
      </div></section>

    <section style="display:flex;flex-direction:column;gap:8px"><h2 class="label-sm">الأسعار والعروض</h2>
      <div class="card tight">${[['single', 'سعر المادة الواحدة', 'الصف الأول والثاني'], ['g1Bundle', 'عرض الصف الأول', 'المادتين مع بعض'], ['g2Bundle', 'عرض الصف الثاني', 'الأربع مواد مع بعض'], ['project', 'مشروع التخرج', 'الصف الثالث · في الشهر']].map(([k, n, h]) => `
        <label class="set-row"><span class="stack"><span class="b">${n}</span><span class="small muted">${h}</span></span>
          <span class="row" style="gap:6px"><input class="input sm num" type="number" inputmode="numeric" value="${P[k]}" data-change="setPrice" data-k="${k}" style="width:84px;text-align:center;font-weight:700"><span class="sm muted">ج</span></span></label>`).join('')}</div>
      <div class="small muted" style="padding:0 4px">تغيير السعر بيأثر على كل الحسابات (القديمة والجديدة).</div></section>

    <section style="display:flex;flex-direction:column;gap:8px"><h2 class="label-sm">السنة الدراسية والإجازات</h2>
      <div class="card" style="display:flex;flex-direction:column;gap:12px">
        ${(S.terms || []).map(t => `<div class="stack" style="gap:6px"><span class="b">${esc(t.name)}</span><div class="grid2">
          <label class="field small muted" style="font-weight:600">من<input class="input sm" type="date" value="${t.start}" data-change="setTerm" data-t="${t.id}" data-f="start"></label>
          <label class="field small muted" style="font-weight:600">إلى<input class="input sm" type="date" value="${t.end}" data-change="setTerm" data-t="${t.id}" data-f="end"></label></div></div>`).join('')}
        <div class="small muted">مفيش حصص بتتولد خارج الترمين.</div>
        <div class="stack" style="gap:8px"><span class="b">الإجازات</span>
          ${(S.holidays || []).length ? S.holidays.map((h, i) => `<div class="row between sm" style="background:var(--ground);border-radius:12px;padding:8px 12px"><span>${esc(h.name || 'إجازة')} · ${E.fmtShort(h.from)}${h.to && h.to !== h.from ? ' ← ' + E.fmtShort(h.to) : ''}</span><button class="icon-btn light" style="width:34px;height:34px" data-act="delHoliday" data-i="${i}" aria-label="حذف الإجازة">${ic('x', 16)}</button></div>`).join('') : '<span class="small muted">مفيش إجازات</span>'}
          <button class="btn sm ghost" data-act="addHoliday">${ic('plus', 16)} أضف إجازة</button></div>
      </div></section>

    <section style="display:flex;flex-direction:column;gap:8px"><h2 class="label-sm">التنبيهات</h2>
      <div class="card tight">
        <label class="set-row"><span class="stack"><span class="b">تذكير قبل الحصة</span><span class="small muted">صوت وتنبيه والتطبيق مفتوح</span></span>
          <select class="input select sm" style="width:120px" data-change="setBefore">${[10, 15, 30, 45, 60, 90].map(m => `<option value="${m}" ${R.before === m ? 'selected' : ''}>قبلها ${m} د</option>`).join('')}</select></label>
        ${sw('tDaily', R.daily, 'ملخص اليوم', 'أول ما تفتح التطبيق كل يوم')}
        ${sw('tOverdue', R.overdue, 'تنبيه المتأخرات', 'صوت وحركة لما يكون فيه طلاب متأخرين')}
        ${sw('tSound', R.sound, 'الأصوات', 'أصوات التنبيهات والتأكيد')}
        <div class="set-row"><span class="stack"><span class="b">إشعارات الموبايل</span><span class="small muted">${notif === 'granted' ? 'مفعّلة' : notif === 'denied' ? 'مقفولة من إعدادات المتصفح' : notif === 'unsupported' ? 'مش مدعومة على الجهاز ده' : 'اسمح للتطبيق يبعت إشعارات'}</span></span>
          ${notif === 'default' ? '<button class="btn sm" data-act="askNotif">تفعيل</button>' : notif === 'granted' ? '<span class="chip green">مفعّلة</span>' : ''}</div>
        <div class="set-row"><span class="stack"><span class="b">تجربة الصوت</span></span><div class="row" style="gap:6px"><button class="btn sm soft" data-act="testSound" data-k="chime">حصة</button><button class="btn sm soft" data-act="testSound" data-k="alert">متأخرات</button></div></div>
        <div class="set-row"><span class="stack"><span class="b">مواعيد الحصص في تقويم الموبايل</span><span class="small muted">تذكير مضمون حتى والتطبيق مقفول</span></span><button class="btn sm ghost" data-act="exportIcs">${ic('calPlus', 16)} تصدير</button></div>
      </div></section>

    <section style="display:flex;flex-direction:column;gap:8px"><h2 class="label-sm">الحماية والخصوصية</h2>
      <div class="card tight">
        ${sw('tHide', S.privacy.hide, 'إخفاء الأرصدة', 'الفلوس بتظهر •••• ولازم الباسورد أو البصمة علشان تظهر')}
        ${sw('tLock', sec.lock, 'قفل التطبيق عند الفتح', 'بالباسورد أو البصمة')}
        ${App.ui.bioAvail ? sw('tBio', !!sec.bio, 'الفتح بالبصمة', 'بصمة أو قفل شاشة الموبايل') : `<div class="set-row"><span class="stack"><span class="b">الفتح بالبصمة</span><span class="small muted">الجهاز أو المتصفح مش بيدعم البصمة هنا</span></span></div>`}
        <div class="set-row"><span class="b">تغيير باسورد التطبيق</span><button class="btn sm ghost" data-act="changePin">${ic('key', 16)} تغيير</button></div>
        <div class="set-row"><span class="stack"><span class="b">تغيير باسورد الأدمن</span><span class="small muted">للتصفير واسترجاع النسخ والحذف النهائي</span></span><button class="btn sm ghost" data-act="changeAdmin">${ic('shield', 16)} تغيير</button></div>
      </div></section>

    <section style="display:flex;flex-direction:column;gap:8px"><h2 class="label-sm">النسخ الاحتياطي</h2>
      <div class="card" style="display:flex;flex-direction:column;gap:12px">
        <div class="banner green">${ic('check', 18)}<span>بيتعمل نسخة تلقائي كل يوم أول ما تفتح التطبيق، وبيتحفظ <b>آخر ${Backup.KEEP} نسخ بس</b> والأقدم بيتمسح لوحده.<br>آخر نسخة: <b>${S.backup.lastAuto ? E.fmtDate(S.backup.lastAuto) : 'لسه'}</b></span></div>
        ${Backup.folderSupported() ? `<div class="stack" style="gap:8px"><span class="b">فولدر على ذاكرة الموبايل</span>
          ${folder ? `<div class="row between sm" style="background:var(--ground);border-radius:12px;padding:10px 12px"><span class="row" style="gap:8px">${ic('folder', 18)} ${esc(folder.name)}</span><span class="chip ${folder.perm === 'granted' ? 'green' : 'amber'}">${folder.perm === 'granted' ? 'شغال' : 'محتاج إذن'}</span></div>
            <div class="small muted">آخر نسخة في الفولدر: ${S.backup.lastFolder ? E.fmtDate(S.backup.lastFolder) : 'لسه'} · بيحتفظ بآخر ${Backup.KEEP} ملفات</div>
            <div class="grid2"><button class="btn sm" data-act="folderNow">${ic('refresh', 16)} انسخ دلوقتي</button><button class="btn sm ghost" data-act="pickFolder">تغيير الفولدر</button></div>` :
            `<button class="btn" data-act="pickFolder">${ic('folder', 18)} اختار فولدر للنسخ اليومي</button>`}</div>` :
          `<div class="banner amber">${ic('info', 18)}<span>المتصفح ده مش بيسمح للتطبيق يكتب في فولدر لوحده. علشان كده كل يوم هيظهرلك زرار <b>"حفظ نسخة اليوم"</b> بضغطة واحدة بتنزل الملف في Downloads.</span></div>`}
        <div class="grid2"><button class="btn sm ghost" data-act="dlBackup">${ic('download', 16)} تنزيل نسخة</button><button class="btn sm ghost" data-act="shareBackup">${ic('share', 16)} مشاركة (درايف/واتساب)</button></div>
        <a class="btn sm soft" href="#/backups">${ic('layers', 16)} النسخ المحفوظة واسترجاعها</a>
      </div></section>

    <section style="display:flex;flex-direction:column;gap:8px"><h2 class="label-sm" style="color:var(--red)">منطقة الخطر</h2>
      <div class="card" style="display:flex;flex-direction:column;gap:10px;border:1px solid #F3C4C0">
        <div class="sm muted" style="line-height:1.7">تصفير البرنامج بيمسح كل الطلاب والمجموعات والدفعات والغياب علشان تبدأ من جديد. محتاج باسورد الأدمن وجملة تأكيد، وبيتعمل نسخة احتياطية قبلها.</div>
        <button class="btn danger" data-act="resetApp">${ic('trash', 18)} تصفير البرنامج بالكامل</button>
      </div></section>

    <div class="row between small muted" style="padding:0 4px 8px"><span>${esc(S.appName)} · إصدار ${App.version}</span><button class="btn sm soft" data-act="lockNow">${ic('lock', 16)} قفل الآن</button></div>
  </main>`;
};
Views.settings_after = async () => {
  const info = Backup.folderSupported() ? await Backup.folderInfo() : null;
  const bio = await Security.bioAvailable();
  if (JSON.stringify(info) !== JSON.stringify(App.ui.folderInfo) || bio !== App.ui.bioAvail) { App.ui.folderInfo = info; App.ui.bioAvail = bio; render(); }
};

ACT.setName = el => { const v = el.value.trim(); if (!v) return; commit(st => { st.settings.appName = v; }, 'الاسم اتغير'); applyIdentity(); };
ACT.setIcon = el => { commit(st => { st.settings.iconId = el.dataset.n; st.settings.iconData = null; }, null); applyIdentity(); };
ACT.setAccent = el => { commit(st => { st.settings.accent = el.dataset.c; }, null); applyIdentity(); };
ACT.setIconImg = el => {
  const f = el.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d'); const s = Math.min(img.width, img.height);
    x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 512, 512);
    const data = c.toDataURL('image/png');
    commit(st => { st.settings.iconData = data; }, 'الأيقونة اتغيرت'); applyIdentity();
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(f);
};
ACT.setPrice = el => { const v = Math.round(+el.value); if (!(v >= 0)) return; commit(st => { st.settings.prices[el.dataset.k] = v; }, 'السعر اتعدل'); };
ACT.setTerm = el => { if (!el.value) return; commit(st => { st.settings.terms.find(t => t.id === el.dataset.t)[el.dataset.f] = el.value; }, 'التاريخ اتعدل'); };
ACT.addHoliday = () => {
  const s = sheet(`<h2>إضافة إجازة</h2><label class="field">الاسم<input class="input" id="h-n" placeholder="مثلاً: إجازة نص السنة" autofocus></label>
    <div class="grid2"><label class="field">من<input class="input" type="date" id="h-f" value="${E.today()}"></label><label class="field">إلى<input class="input" type="date" id="h-t" value="${E.today()}"></label></div>
    <div class="banner blue">${ic('info', 18)}<span>الحصص في الأيام دي مش هتتولد ومش هتتحسب.</span></div>
    <div class="grid2"><button class="btn ghost" data-close>رجوع</button><button class="btn" id="h-ok">إضافة</button></div>`);
  $('#h-ok', s.el).onclick = () => { const from = $('#h-f', s.el).value, to = $('#h-t', s.el).value || from; if (!from) return; s.close(); commit(st => st.settings.holidays.push({ name: $('#h-n', s.el).value.trim(), from, to: to < from ? from : to }), 'الإجازة اتضافت'); };
};
ACT.delHoliday = el => commit(st => st.settings.holidays.splice(+el.dataset.i, 1), 'الإجازة اتشالت', { type: 'warn' });
ACT.setBefore = el => commit(st => { st.settings.reminders.before = +el.value; }, 'اتحفظ');
ACT.tDaily = () => commit(st => { st.settings.reminders.daily = !st.settings.reminders.daily; });
ACT.tOverdue = () => commit(st => { st.settings.reminders.overdue = !st.settings.reminders.overdue; });
ACT.tSound = () => commit(st => { st.settings.reminders.sound = !st.settings.reminders.sound; });
ACT.testSound = el => Sound.play(el.dataset.k, true);
ACT.askNotif = async () => { try { const p = await Notification.requestPermission(); if (p === 'granted') toast('الإشعارات اتفعلت'); } catch (e) {} render(); };
ACT.tHide = async () => {
  if (App.st.settings.privacy.hide && !(await askPin('إلغاء إخفاء الأرصدة'))) return;
  commit(st => { st.settings.privacy.hide = !st.settings.privacy.hide; }, App.st.settings.privacy.hide ? 'الأرصدة هتظهر علطول' : 'الأرصدة اتخفت');
};
ACT.tLock = async () => {
  if (!(await askPin('تأكيد'))) return;
  App.sec.lock = !App.sec.lock; await Security.set(App.sec); render();
  toast(App.sec.lock ? 'القفل اتفعل' : 'القفل اتلغى', { type: App.sec.lock ? 'ok' : 'warn' });
};
ACT.tBio = async () => {
  if (App.sec.bio) { await Security.bioRemove(); App.sec = await Security.get(); render(); return toast('الفتح بالبصمة اتلغى', { type: 'warn' }); }
  if (!(await askPin('تفعيل البصمة'))) return;
  try { await Security.bioRegister(App.st.settings.appName); App.sec = await Security.get(); render(); toast('البصمة اتفعلت', { sound: 'ok' }); }
  catch (e) { toast('مقدرناش نفعّل البصمة: ' + (e.name === 'NotAllowedError' ? 'اتلغى' : e.message), { type: 'err', sound: 'err', ms: 4500 }); }
};
ACT.changePin = async () => {
  if (!(await askPin('الباسورد الحالي'))) return;
  const pin = await newPinFlow('الباسورد الجديد');
  if (pin) { await Security.setPin(pin); App.sec = await Security.get(); toast('الباسورد اتغير', { sound: 'ok' }); }
};
ACT.changeAdmin = async () => {
  if (!(await askAdmin('تغيير باسورد الأدمن', { ok: 'التالي' }))) return;
  const s = sheet(`<h2>باسورد الأدمن الجديد</h2>
    <label class="field">الباسورد الجديد<input class="input" type="password" id="na1" autofocus></label>
    <label class="field">تأكيد الباسورد<input class="input" type="password" id="na2"></label>
    <div class="err" id="na-e" style="color:var(--red);font-weight:600;min-height:20px"></div>
    <button class="btn lg" id="na-ok">حفظ</button>`, { center: true });
  $('#na-ok', s.el).onclick = async () => {
    const a = $('#na1', s.el).value, b = $('#na2', s.el).value;
    if (a.length < 4) return $('#na-e', s.el).textContent = '٤ حروف أو أرقام على الأقل';
    if (a !== b) return $('#na-e', s.el).textContent = 'الباسورد مش متطابق';
    await Security.setAdmin(a); s.close(); toast('باسورد الأدمن اتغير', { sound: 'ok' });
  };
};
ACT.lockNow = () => lockApp();

/* ---------- النسخ الاحتياطي ---------- */
ACT.pickFolder = async () => {
  try { const n = await Backup.pickFolder(); const r = await Backup.writeFolder(App.st, true); if (r.ok) App.st.settings.backup.lastFolder = E.today(); Store.save(App.st); App.ui.folderInfo = null; render(); toast('النسخ اليومي هيتحفظ في فولدر ' + esc(n)); }
  catch (e) { if (e.name !== 'AbortError') toast('مقدرناش نوصل للفولدر: ' + e.message, { type: 'err' }); }
};
ACT.folderNow = async () => {
  try { const r = await Backup.writeFolder(App.st, true); if (r.ok) { App.st.settings.backup.lastFolder = E.today(); Store.save(App.st); App.ui.folderInfo = null; render(); toast('النسخة اتحفظت في ' + esc(r.folder)); } else toast('محتاج تسمح للتطبيق بالفولدر', { type: 'warn' }); }
  catch (e) { toast('حصلت مشكلة: ' + e.message, { type: 'err' }); }
};
ACT.dlBackup = () => { Backup.download(App.st); commit(st => { st.settings.backup.lastDownload = E.today(); }, 'النسخة نزلت في Downloads', { noRender: true }); };
ACT.shareBackup = async () => { try { if (!(await Backup.share(App.st))) { Backup.download(App.st); toast('المشاركة مش مدعومة — النسخة نزلت بدلها'); } } catch (e) {} };

Views.backups = () => `
  <header class="plain-head">${backBtn('#/settings')}<h1>النسخ الاحتياطية</h1></header>
  <main class="pad">
    <div class="banner blue">${ic('info', 18)}<span>دي النسخ اللي جوه التطبيق (آخر ${Backup.KEEP}). الاسترجاع بيرجّع كل البيانات زي ما كانت وقت النسخة، ومحتاج باسورد الأدمن.</span></div>
    <div id="bk-list" class="card tight"><div class="sm muted" style="padding:14px 0">بيحمّل…</div></div>
    <button class="btn" data-act="backupNow">${ic('refresh', 18)} اعمل نسخة دلوقتي</button>
    <label class="btn ghost" style="cursor:pointer">${ic('upload', 18)} استرجاع من ملف<input type="file" accept=".json,application/json" data-change="restoreFile" hidden></label>
  </main>`;
Views.backups_after = async () => {
  const list = await Backup.list();
  const el = $('#bk-list'); if (!el) return;
  el.innerHTML = list.length ? list.map(b => `<div class="list-row"><span class="avatar">${ic('layers', 18)}</span><span class="grow stack"><span class="b">${E.fmtDate(b.at.slice(0, 10))} · ${new Date(b.at).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}</span><span class="small muted">${esc(b.reason)} · ${b.students} طالب</span></span><button class="btn sm ghost" data-act="restoreInternal" data-id="${b.id}">استرجاع</button></div>`).join('') : '<div class="sm muted" style="padding:14px 0">مفيش نسخ لسه</div>';
};
ACT.backupNow = async () => { await Backup.add(App.st, 'يدوي'); toast('اتعملت نسخة'); render(); };
async function restoreData(data, label) {
  if (!(await askAdmin('استرجاع ' + label, { text: 'كل البيانات الحالية هتتبدل بالنسخة دي. هنعمل نسخة من الحالي قبلها احتياطي.', ok: 'استرجاع' }))) return;
  await Backup.add(App.st, 'قبل الاسترجاع');
  App.st = migrate(data);
  recompute(); Store.save(App.st); await Store.flush();
  applyIdentity(); go('home'); render();
  toast('البيانات رجعت', { sound: 'ok' });
}
ACT.restoreInternal = async el => { const b = await Backup.get(+el.dataset.id); if (b) restoreData(b.data, 'نسخة ' + E.fmtShort(b.at.slice(0, 10))); };
ACT.restoreFile = async el => {
  const f = el.files[0]; el.value = ''; if (!f) return;
  try { const j = await Backup.readFile(f); restoreData(j.data, 'ملف ' + f.name); }
  catch (e) { toast(e.message || 'الملف مش سليم', { type: 'err', sound: 'err' }); }
};

/* ---------- التصفير ---------- */
const RESET_PHRASE = 'امسح كل حاجة';
ACT.resetApp = async () => {
  const r = await askAdmin('تصفير البرنامج بالكامل', {
    text: 'كل الطلاب والمجموعات والدفعات والغياب ومستلزمات المشروع هيتمسحوا. النسخة الاحتياطية الداخلية الأخيرة هتفضل موجودة إلا لو اخترت تمسحها.',
    phrase: RESET_PHRASE, danger: true, ok: 'تصفير',
    extra: `<label class="row sm" style="gap:10px;cursor:pointer"><input type="checkbox" data-extra="wipeBackups" style="width:20px;height:20px;accent-color:var(--red)"> امسح النسخ الاحتياطية الداخلية كمان</label>
      <label class="row sm" style="gap:10px;cursor:pointer"><input type="checkbox" data-extra="wipeSecurity" style="width:20px;height:20px;accent-color:var(--red)"> امسح الباسوردات والبصمة (هتعملهم من جديد)</label>`
  });
  if (!r) return;
  await Backup.add(App.st, 'قبل التصفير');
  if (r.wipeBackups) await Backup.clearAll();
  const keep = App.st.settings;
  App.st = E.defaultState();
  App.st.settings.appName = keep.appName; App.st.settings.iconId = keep.iconId; App.st.settings.iconData = keep.iconData; App.st.settings.accent = keep.accent; App.st.settings.prices = keep.prices;
  App.st.settings.backup.lastAuto = r.wipeBackups ? null : E.today();
  App.ui = {};
  recompute(); Store.save(App.st); await Store.flush();
  if (r.wipeSecurity) { await Security.set({ pin: null, admin: null, bio: null, lock: true }); location.hash = '#/home'; location.reload(); return; }
  go('home'); render();
  toast('البرنامج اتصفّر — ابدأ من جديد', { sound: 'ok', ms: 4000 });
};
