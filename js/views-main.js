/* حصصي — الرئيسية، الجدول، الحصة والغياب، المجموعات */
'use strict';
const Views = window.Views = {};

/* ---------- بطاقة حصة ---------- */
function sessionState(o) {
  const st = App.st, t = E.today();
  const empty = o.status === 'normal' && E.studentsInSession(st, o).length === 0;
  if (o.status === 'cancelled') return { chip: 'gray', text: 'اتلغت', off: true };
  if (o.status === 'postponed') {
    const m = st.makeups.find(x => x.id === o.makeupId);
    return { chip: 'gray', text: m ? 'متأجلة لـ ' + E.fmtShort(m.date) : 'متأجلة', off: true };
  }
  const att = st.attendance[o.key];
  const recorded = att && Object.keys(att).length > 0;
  const mins = minutesUntil(o.date, o.time);
  if (o.date < t || (o.date === t && mins <= 0)) {
    if (empty) return { chip: 'gray', text: 'مفيش طلاب', empty: true };
    return recorded ? { chip: 'green', text: 'اتسجل الغياب', done: true } : { chip: 'amber', text: o.date === t ? 'سجّل الغياب' : 'الغياب متسجلش', need: true };
  }
  if (empty) return { chip: 'gray', text: 'مفيش طلاب لسه', empty: true };
  if (o.date === t) return { chip: mins <= 60 ? 'amber' : 'blue', text: mins < 60 ? 'بعد ' + mins + ' دقيقة' : 'بعد ' + Math.floor(mins / 60) + ' س ' + (mins % 60 ? (mins % 60) + ' د' : ''), soon: mins <= 60 };
  return { chip: 'blue', text: E.fmtShort(o.date) };
}
function sessionCard(o, opt = {}) {
  const st = App.st;
  const g = E.groupById(st, o.groupId);
  if (!g) return '';
  const sub = E.SUBJ[g.subjectId];
  const n = E.studentsInSession(st, o).length;
  const s = sessionState(o);
  const [tm, ap] = E.fmtTime(o.time).split(' ');
  const btn = s.empty ? 'فتح' : s.off ? 'تفاصيل' : s.need || s.soon ? 'افتح الغياب' : s.done ? 'عرض' : 'فتح';
  const primary = !s.off && (s.need || s.soon);
  return `<a class="session tap ${o.type === 'makeup' ? 'makeup' : ''} ${s.off ? 'off' : ''}" href="#/session/${encodeURIComponent(o.key)}">
    <div class="timebox g${sub.grade}"><span class="t">${tm}</span><span class="p">${ap === 'م' ? 'مساءً' : 'صباحًا'}</span></div>
    <div class="grow" style="display:flex;flex-direction:column;gap:6px">
      <div class="row between"><span class="b" style="font-size:16px">${esc(sub.name)}</span>${o.type === 'makeup' ? '<span class="chip blue">تعويضية</span>' : ''}</div>
      <div class="sm muted">${E.GRADES[sub.grade]}${g.name ? ' · ' + esc(g.name) : ''} · ${n} ${n > 10 || n === 0 ? 'طالب' : 'طلاب'}${opt.showDate ? ' · ' + E.fmtDate(o.date) : ''}</div>
      <div class="row between"><span class="chip ${s.chip}">${esc(s.text)}</span><span class="btn sm ${primary ? '' : 'soft'}">${btn}</span></div>
    </div></a>`;
}

/* ---------- الرئيسية ---------- */
Views.home = () => {
  const st = App.st, C = App.C, t = E.today();
  const sum = E.periodSummary(st, C, E.monthStart(t), E.monthEnd(t));
  const today = E.sessionsOnDay(st, t);
  const active = today.filter(o => o.status === 'normal' && E.studentsInSession(st, o).length);
  const ledgers = [...C.ledgers.values()];
  const late = ledgers.filter(L => L.late > 0);
  const owing = ledgers.filter(L => L.due > 0);
  const h = new Date().getHours();
  const tomorrow = E.sessionsOnDay(st, E.addDays(t, 1)).filter(o => o.status === 'normal');
  const groups = st.groups.map(g => ({ g, d: E.groupDues(st, C, g.id) })).filter(x => x.d.owed > 0).sort((a, b) => b.d.owed - a.d.owed).slice(0, 6);
  const nothing = !st.groups.length;
  const lateMsg = late.length ? `${late.length} ${late.length > 10 || late.length < 3 ? 'طالب' : 'طلاب'} عليهم شهر وبدأوا التاني` : `${owing.length} ${owing.length > 10 || owing.length < 3 ? 'طالب' : 'طلاب'} عليهم فلوس الشهر الحالي`;

  return `
  <header class="hero-head">
    <div class="topbar">
      <div class="brand">${brandIcon()}<div class="stack"><div class="brand-name">${esc(st.settings.appName)}</div><div class="sub">${E.fmtDate(t)}${E.termOf(st, t) ? ' · ' + esc(E.termOf(st, t).name) : ''}</div></div></div>
      <div class="head-actions">
        ${eyeBtn()}
        <button class="icon-btn" data-act="notifs" aria-label="التنبيهات">${(() => { const al = E.dueAlerts(st, C); const n = late.length + al.ended.length + al.third.length + today.filter(o => sessionState(o).need).length; return ic('bell', 22, 2, n ? 'ring' : '') + (n ? `<span class="badge">${n}</span>` : ''); })()}</button>
        <a class="icon-btn" href="#/settings" aria-label="الإعدادات">${ic('gear', 22)}</a>
      </div>
    </div>
    <div class="greet"><div class="sub" style="font-size:15px">${h < 12 ? 'صباح الخير' : 'مساء الخير'} يا أستاذ</div>
      <div class="big">${active.length ? 'عندك ' + active.length + (active.length === 1 ? ' حصة' : active.length === 2 ? ' حصتين' : ' حصص') + ' النهارده' : 'مفيش حصص النهارده'}</div></div>
  </header>
  <main class="wrap lift">
    <section class="card big" style="display:flex;flex-direction:column;gap:14px">
      <div class="row between"><span class="sm b muted">تحصيل شهر ${E.monthName(t)}</span><span class="chip green">${sum.pct}٪</span></div>
      <div class="row" style="align-items:baseline;gap:8px"><span class="money-big">${moneyN(sum.paid)}</span><span class="muted">من ${money(sum.due)}</span></div>
      <div class="bar"><span style="width:${sum.pct}%"></span></div>
      <div class="grid2">
        <div class="stat amber"><span class="k">متبقي الشهر ده</span><span class="v">${money(sum.remaining)}</span></div>
        <div class="stat red"><span class="k">متأخرات شهور سابقة</span><span class="v">${money(sum.prior)}</span></div>
      </div>
      ${App.st.settings.privacy.hide && !shown() ? `<button class="btn soft sm" data-act="reveal">${ic('eye', 18)} اضغط لعرض الأرصدة</button>` : ''}
    </section>

    ${owing.length ? `<a class="alert-strip tap" href="#/dues">
      <span class="ic ${late.length ? 'pulse' : ''}">${ic('alert', 20, 2.4, late.length ? 'ring' : '')}</span>
      <span class="grow stack"><span class="b">${lateMsg}</span><span class="sm" style="color:var(--on-ink-muted)">${late.length ? 'إجمالي المتأخر ' + money(late.reduce((a, L) => a + L.late, 0)) : 'اضغط لعرض التفاصيل حسب المجموعة'}</span></span>
      ${ic('chev', 20)}</a>` : ''}

    ${nothing ? `<section class="card"><div class="empty"><span class="ic">${ic('layers', 30)}</span><h3>أهلًا بيك! نبدأ منين؟</h3>
      <div class="sm">١. أضف المجموعات (المادة + اليوم + الساعة)<br>٢. أضف الطلاب ومواد كل طالب<br>والتطبيق هيحسب كل حاجة لوحده.</div>
      <a class="btn accent" href="#/groups">${ic('plus', 18)} أضف أول مجموعة</a></div></section>` : `
    <section style="display:flex;flex-direction:column;gap:10px">
      <div class="sec-title"><h2>حصص النهارده</h2><a href="#/schedule">الجدول كامل</a></div>
      ${today.length ? today.map(o => sessionCard(o)).join('') : `<div class="card sm muted" style="text-align:center">مفيش حصص النهارده${tomorrow.length ? ' · بكرة عندك ' + tomorrow.length + (tomorrow.length === 1 ? ' حصة' : ' حصص') : ''}</div>`}
    </section>
    ${today.length && tomorrow.length ? `<div class="card row" style="padding:12px 14px"><span class="chip blue">بكرة</span><span class="sm grow">${tomorrow.map(o => esc(E.SUBJ[E.groupById(st, o.groupId).subjectId].short) + ' ' + E.fmtTime(o.time)).join(' · ')}</span></div>` : ''}
    <section style="display:flex;flex-direction:column;gap:10px">
      <div class="sec-title"><h2>مجموعات عليها فلوس</h2><a href="#/dues">الكل</a></div>
      ${groups.length ? `<div class="card tight">${groups.map(({ g, d }) => {
        const sub = E.SUBJ[g.subjectId];
        const all = E.groupDues(st, C, g.id);
        return `<a class="list-row tap" href="#/dues" data-act="openDuesGroup" data-g="${g.id}" style="flex-direction:column;align-items:stretch;gap:8px">
          <span class="row between"><span class="row" style="gap:8px;min-width:0"><span class="dot g${sub.grade}"></span><span class="b ellipsis">${esc(sub.name)} · ${esc(E.groupLabel(st, g))}</span></span><span class="num b" style="color:var(--red)">${money(d.owed)}</span></span>
          <span class="row between small muted"><span>${d.late.length + d.current.length} عليهم</span><span>${d.late.length ? d.late.length + ' عليهم شهرين' : 'كله الشهر الحالي'}</span></span>
          <span class="bar thin green"><span style="width:${pct(all.paid, all.due)}%"></span></span></a>`;
      }).join('')}</div>` : `<div class="card row" style="gap:10px"><span class="avatar green">${ic('check', 20, 2.6)}</span><span class="sm">كل المجموعات خالصة — مفيش فلوس متأخرة</span></div>`}
    </section>`}
  </main>`;
};
ACT.openDuesGroup = el => { App.ui.openGroup = el.dataset.g; go('dues'); };

ACT.notifs = () => {
  const st = App.st, C = App.C, t = E.today();
  const late = [...C.ledgers.values()].filter(L => L.late > 0).sort((a, b) => b.late - a.late);
  const need = st.groups.flatMap(g => E.occurrences(st, g.id, E.addDays(t, -14), t)).filter(o => sessionState(o).need);
  const next = E.sessionsOnDay(st, t).filter(o => o.status === 'normal' && minutesUntil(o.date, o.time) > 0);
  const s = sheet(`<h2>التنبيهات</h2>
    ${dueAlertsHTML()}
    ${late.length ? `<div class="banner red">${ic('alert', 18)}<span><b>${late.length} عليهم شهر وبدأوا التاني</b><br>${late.slice(0, 6).map(L => esc(L.student.name) + ' (' + money(L.late) + ')').join('، ')}${late.length > 6 ? ' …' : ''}</span></div>` : `<div class="banner green">${ic('check', 18)}<span>مفيش طلاب متأخرين شهرين</span></div>`}
    ${need.length ? `<div class="label-sm">حصص محتاجة تسجيل غياب</div>${need.map(o => sessionCard(o, { showDate: true })).join('')}` : ''}
    ${next.length ? `<div class="label-sm">الحصص الجاية النهارده</div>${next.map(o => sessionCard(o)).join('')}` : ''}
    <div class="grid2"><a class="btn ghost" href="#/dues" data-close>التحصيل</a><button class="btn" data-close>تمام</button></div>`);
  s.el.addEventListener('click', e => { if (e.target.closest('a.session')) s.close(); });
};

/* ---------- الجدول ---------- */
Views.schedule = () => {
  const st = App.st, t = E.today();
  const ws = App.ui.week || E.weekStart(t);
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => E.addDays(ws, i));
  const sel = App.ui.schedDay;
  const occ = st.groups.flatMap(g => E.occurrences(st, g.id, ws, E.addDays(ws, 6)));
  const by = d => occ.filter(o => o.date === d).sort((a, b) => a.time.localeCompare(b.time));
  const count = occ.filter(o => o.status === 'normal').length;
  const showDays = sel && days.includes(sel) ? [sel] : days;
  return `
  <header class="plain-head static" style="flex-direction:column;align-items:stretch;gap:12px">
    <div class="row between">
      <div class="stack"><h1>جدول الحصص</h1><span class="sub">${E.fmtShort(ws)} – ${E.fmtShort(E.addDays(ws, 6))} · ${count} ${count === 1 ? 'حصة' : 'حصص'}</span></div>
      <div class="head-actions">
        <button class="icon-btn light" data-act="exportIcs" aria-label="إضافة المواعيد لتقويم الموبايل">${ic('calPlus', 20)}</button>
        <button class="icon-btn dark" data-act="printSchedule" aria-label="طباعة الجدول">${ic('print', 20)}</button>
      </div>
    </div>
    <div class="row between">
      <button class="icon-btn light" data-act="week" data-d="-7" aria-label="الأسبوع اللي فات">${ic('back', 20)}</button>
      <button class="fchip ${ws === E.weekStart(t) && !sel ? 'on' : ''}" data-act="week" data-d="0">الأسبوع ده</button>
      <button class="icon-btn light" data-act="week" data-d="7" aria-label="الأسبوع الجاي">${ic('chev', 20)}</button>
    </div>
    <div class="days">${days.map(d => `<button data-act="pickDay" data-d="${d}" class="${sel === d ? 'on' : ''} ${d === t ? 'today' : ''}" aria-pressed="${sel === d}">
      <span class="d">${E.DAY_NAMES[E.dow(d)].replace('ال', '')}</span><span class="n">${E.parse(d).getDate()}</span><span class="m ${by(d).some(o => o.status === 'normal') ? 'has' : ''}"></span></button>`).join('')}</div>
    <div class="legend"><span><i style="background:var(--g1)"></i>الصف الأول</span><span><i style="background:var(--g2)"></i>الصف الثاني</span><span><i style="background:var(--g3)"></i>الصف الثالث</span></div>
  </header>
  <main class="pad">
    <a class="btn ghost" href="#/groups">${ic('layers', 18)} إدارة المجموعات والمواعيد</a>
    ${!st.groups.length ? `<div class="card"><div class="empty"><span class="ic">${ic('cal', 30)}</span><h3>مفيش مجموعات لسه</h3><span class="sm">أضف مجموعة لكل مادة وحدد يومها وساعتها، والحصص هتظهر هنا كل أسبوع لوحدها.</span><a class="btn accent" href="#/groups">أضف مجموعة</a></div></div>` :
      showDays.map(d => {
        const list = by(d);
        if (!list.length && !sel) return '';
        return `<section style="display:flex;flex-direction:column;gap:8px"><h2 class="label-sm" style="font-size:14px">${E.fmtDate(d)}${d === t ? ' · النهارده' : ''}${!E.isActiveDay(st, d) ? ' · إجازة' : ''}</h2>
          ${list.length ? list.map(o => sessionCard(o)).join('') : '<div class="card sm muted">مفيش حصص في اليوم ده</div>'}</section>`;
      }).join('') || '<div class="card sm muted" style="text-align:center">مفيش حصص الأسبوع ده</div>'}
  </main>`;
};
ACT.week = el => { const d = +el.dataset.d; App.ui.schedDay = null; App.ui.week = d === 0 ? E.weekStart(E.today()) : E.addDays(App.ui.week || E.weekStart(E.today()), d); render(); };
ACT.pickDay = el => { App.ui.schedDay = App.ui.schedDay === el.dataset.d ? null : el.dataset.d; render(); };
ACT.exportIcs = () => {
  if (!App.st.groups.length) return toast('أضف مجموعات الأول', { type: 'warn' });
  const blob = new Blob([E.icsFor(App.st, App.st.settings.reminders.before)], { type: 'text/calendar' });
  const f = new File([blob], 'hesasy-schedule.ics', { type: 'text/calendar' });
  const s = sheet(`<h2>تذكير الحصص من تقويم الموبايل</h2>
    <div class="banner blue">${ic('info', 18)}<span>هنعمل ملف فيه مواعيد كل المجموعات بتتكرر كل أسبوع، مع تنبيه قبل كل حصة بـ ${App.st.settings.reminders.before} دقيقة. افتحه واختار "إضافة للتقويم" — والتذكير هيوصلك حتى لو التطبيق مقفول.</span></div>
    <div class="banner amber">${ic('alert', 18)}<span>لو غيّرت مواعيد المجموعات بعدين، امسح المواعيد القديمة من التقويم وصدّر الملف من جديد.</span></div>
    <div class="grid2"><button class="btn ghost" id="ics-dl">${ic('download', 18)} تنزيل</button><button class="btn" id="ics-sh">${ic('share', 18)} فتح / مشاركة</button></div>`);
  $('#ics-dl', s.el).onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hesasy-schedule.ics'; a.click(); s.close(); };
  $('#ics-sh', s.el).onclick = async () => { try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f] }); else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'hesasy-schedule.ics'; a.click(); } s.close(); } catch (e) {} };
};

/* ---------- الحصة وتسجيل الغياب ---------- */
Views.session = key => {
  const st = App.st;
  const o = E.sessionByKey(st, key);
  if (!o) return `<header class="plain-head">${backBtn('#/schedule')}<h1>الحصة</h1></header><div class="pad"><div class="banner amber">${ic('info', 18)}<span>الحصة دي مش موجودة (ممكن المعاد اتغير).</span></div></div>`;
  const g = E.groupById(st, o.groupId), sub = E.SUBJ[g.subjectId];
  const list = E.studentsInSession(st, o);
  const att = st.attendance[key] || {};
  const p = list.filter(x => att[x.student.id] === 'p').length;
  const a = list.filter(x => att[x.student.id] === 'a').length;
  const off = o.status !== 'normal';
  const mk = o.status === 'postponed' ? st.makeups.find(m => m.id === o.makeupId) : null;
  const future = o.date > E.today();
  return `
  <header class="hero-head flat">
    <div class="row">
      <a class="icon-btn" href="javascript:history.back()" data-act="back" aria-label="رجوع">${ic('back')}</a>
      <div class="stack grow"><h1 style="font-size:20px">${esc(sub.name)}${o.type === 'makeup' ? ' <span class="chip blue" style="vertical-align:middle">تعويضية</span>' : ''}</h1>
        <span class="sub">${E.GRADES[sub.grade]}${g.name ? ' · ' + esc(g.name) : ''} · ${E.fmtDate(o.date)} · ${E.fmtTime(o.time)}</span></div>
      ${eyeBtn()}
    </div>
    ${off ? '' : `<div class="grid3">
      <div class="stat glass"><span class="v" style="color:#6EE7A8">${p}</span><span class="k">حاضر</span></div>
      <div class="stat glass"><span class="v" style="color:#FFA3A3">${a}</span><span class="k">غائب</span></div>
      <div class="stat glass"><span class="v">${list.length}</span><span class="k">في المجموعة</span></div></div>`}
  </header>
  ${off ? `<main class="pad">
    <div class="banner ${o.status === 'cancelled' ? 'red' : 'blue'}">${ic(o.status === 'cancelled' ? 'xCircle' : 'clock', 18)}<span>
      ${o.status === 'cancelled' ? '<b>الحصة دي اتلغت</b> ومش محسوبة على الطلاب، والدورة بتمتد أسبوع.' : `<b>الحصة دي اتأجلت</b>${mk ? ' لـ ' + E.fmtDate(mk.date) + ' الساعة ' + E.fmtTime(mk.time) : ''}. مش محسوبة، والحصة التعويضية هي اللي بتتحسب.`}
      ${o.reason ? '<br>السبب: ' + esc(o.reason) : ''}</span></div>
    ${mk ? `<a class="btn ghost" href="#/session/${encodeURIComponent('m:' + mk.id)}">${ic('cal', 18)} افتح الحصة التعويضية</a>` : ''}
    <button class="btn" data-act="restoreSession" data-k="${esc(key)}">${ic('undo', 18)} رجّع الحصة لمعادها الأصلي</button>
  </main>` : `
  <div class="pad" style="padding-bottom:0;gap:10px">
    ${o.type === 'makeup' ? `<div class="banner blue">${ic('info', 18)}<span>حصة تعويضية عن حصة ${E.fmtDate(o.originDate)}</span></div>` : ''}
    ${future ? `<div class="banner amber">${ic('clock', 18)}<span>الحصة دي لسه مجاتش — تقدر تأجلها أو تلغيها من دلوقتي.</span></div>` : ''}
    <div class="row between"><span class="row small muted" style="gap:6px">${ic('info', 16)} الحصة بتتحسب حضر أو غاب</span>
      ${list.length ? `<button class="btn sm ghost" data-act="allPresent" data-k="${esc(key)}">الكل حاضر</button>` : ''}</div>
  </div>
  <ul style="list-style:none;margin:0;padding:12px 16px;display:flex;flex-direction:column;gap:8px">
    ${list.length ? list.map(({ student: s, enrollment: e }) => {
      const v = att[s.id];
      const pos = E.cyclePosition(st, e, o.date);
      const L = App.C.ledgers.get(s.id);
      return `<li class="att-row ${v === 'a' ? 'abs' : ''}">
        <a href="#/student/${s.id}" class="avatar ${v === 'a' ? 'red' : ''}" style="text-decoration:none" aria-label="ملف ${esc(s.name)}">${esc(initial(s.name))}</a>
        <div class="grow stack" style="gap:3px"><span class="b ellipsis">${esc(s.name)}</span>
          <span class="small muted">حصة ${pos.pos || 1} من 4${pos.pos === 1 && pos.cycle > 1 ? ' · شهر جديد' : pos.pos === 4 ? ' · آخر حصة' : ''}${L && L.due > 0 ? ` · <b style="color:${L.late ? 'var(--red)' : 'var(--accent-text)'}">عليه ${money(L.due)}</b>` : ''}</span></div>
        <div class="toggle2" role="group" aria-label="حضور ${esc(s.name)}">
          <button class="p ${v === 'p' ? 'on' : ''}" aria-pressed="${v === 'p'}" data-act="att" data-k="${esc(key)}" data-s="${s.id}" data-v="p">حاضر</button>
          <button class="a ${v === 'a' ? 'on' : ''}" aria-pressed="${v === 'a'}" data-act="att" data-k="${esc(key)}" data-s="${s.id}" data-v="a">غائب</button></div></li>`;
    }).join('') : `<li class="card"><div class="empty"><span class="ic">${ic('users', 28)}</span><h3>مفيش طلاب في المجموعة دي</h3><a class="btn sm accent" href="#/student-new">أضف طالب</a></div></li>`}
  </ul>
  <div class="bottom-bar">
    <div class="grid2">
      ${o.type === 'makeup' ? `<button class="btn danger-ghost" data-act="cancelMakeup" data-k="${esc(key)}" style="grid-column:span 2">${ic('xCircle', 18)} إلغاء الحصة التعويضية</button>` : `
      <button class="btn ghost" data-act="postpone" data-k="${esc(key)}">${ic('clock', 18)} تأجيل الحصة</button>
      <button class="btn danger-ghost" data-act="cancelSession" data-k="${esc(key)}">${ic('xCircle', 18)} إلغاء الحصة</button>`}
    </div>
    ${list.length ? `<div class="row small muted" style="justify-content:center;gap:6px">${ic('check', 14)} الغياب بيتحفظ أول ما تدوس</div>` : ''}
  </div>`}`;
};
ACT.att = el => {
  const { k, s, v } = el.dataset;
  Sound.play('tap');
  commit(st => { st.attendance[k] = st.attendance[k] || {}; if (st.attendance[k][s] === v) delete st.attendance[k][s]; else st.attendance[k][s] = v; });
};
ACT.allPresent = el => {
  const k = el.dataset.k, o = E.sessionByKey(App.st, k);
  commit(st => { st.attendance[k] = st.attendance[k] || {}; E.studentsInSession(st, o).forEach(x => { if (!st.attendance[k][x.student.id]) st.attendance[k][x.student.id] = 'p'; }); }, 'اتسجل الكل حاضر (ما عدا اللي متعلم غائب)');
};
ACT.postpone = el => {
  const k = el.dataset.k, o = E.sessionByKey(App.st, k);
  const g = E.groupById(App.st, o.groupId);
  const s = sheet(`<h2>تأجيل الحصة لمعاد تاني</h2>
    <div class="banner green">${ic('check', 18)}<span>الحصة دي مش هتتحسب على الطلاب. هتتعمل حصة تعويضية <b>مرة واحدة</b> في المعاد اللي هتختاره، وتظهر في الجدول وتتحسب مكانها.</span></div>
    <div class="grid2"><label class="field">المعاد البديل<input class="input" type="date" id="pp-d" value="${E.addDays(o.date, 1)}" min="${o.date}"></label>
      <label class="field">الساعة<input class="input" type="time" id="pp-t" value="${o.time}"></label></div>
    <label class="field">السبب (اختياري)<input class="input" id="pp-r" placeholder="ظرف طارئ…"></label>
    <div class="grid2"><button class="btn ghost" data-close>رجوع</button><button class="btn" id="pp-ok">تأكيد التأجيل</button></div>`);
  $('#pp-ok', s.el).onclick = () => {
    const d = $('#pp-d', s.el).value, t = $('#pp-t', s.el).value, r = $('#pp-r', s.el).value.trim();
    if (!d || !t) return toast('اختار التاريخ والساعة', { type: 'err', sound: 'err' });
    s.close();
    commit(st => {
      const id = E.uid(st);
      st.makeups.push({ id, groupId: g.id, date: d, time: t, originDate: o.date, reason: r });
      st.overrides[k] = { status: 'postponed', makeupId: id, reason: r };
    }, 'الحصة اتأجلت لـ ' + E.fmtDate(d) + ' ' + E.fmtTime(t));
  };
};
ACT.cancelSession = el => {
  const k = el.dataset.k;
  const s = sheet(`<h2>إلغاء الحصة</h2>
    <div class="banner red">${ic('info', 18)}<span>الحصة مش هتتحسب على أي طالب، ودورة الـ٤ حصص هتمتد أسبوع لوحدها.</span></div>
    <label class="field">السبب (اختياري)<input class="input" id="cs-r" placeholder="ظرف طارئ…"></label>
    <div class="grid2"><button class="btn ghost" data-close>رجوع</button><button class="btn danger" id="cs-ok">تأكيد الإلغاء</button></div>`);
  $('#cs-ok', s.el).onclick = () => { const r = $('#cs-r', s.el).value.trim(); s.close(); commit(st => { st.overrides[k] = { status: 'cancelled', reason: r }; }, 'الحصة اتلغت ومش هتتحسب', { type: 'warn' }); };
};
ACT.restoreSession = async el => {
  const k = el.dataset.k;
  if (!(await confirmBox({ title: 'ترجيع الحصة؟', text: 'الحصة هترجع تتحسب في معادها الأصلي، ولو ليها حصة تعويضية هتتمسح.', ok: 'رجّعها', icon: 'undo' }))) return;
  commit(st => {
    const ov = st.overrides[k];
    if (ov && ov.makeupId) { st.makeups = st.makeups.filter(m => m.id !== ov.makeupId); delete st.attendance['m:' + ov.makeupId]; }
    delete st.overrides[k];
  }, 'الحصة رجعت لمعادها');
};
ACT.cancelMakeup = async el => {
  const k = el.dataset.k, id = k.slice(2);
  if (!(await confirmBox({ title: 'إلغاء الحصة التعويضية؟', text: 'الحصة التعويضية هتتمسح، والحصة الأصلية هتفضل ملغية ومش محسوبة.', ok: 'إلغاء التعويضية', danger: true, icon: 'xCircle' }))) return;
  commit(st => {
    const m = st.makeups.find(x => x.id === id);
    if (m) { const ok = m.groupId + '@' + m.originDate; if (st.overrides[ok]) st.overrides[ok] = { status: 'cancelled', reason: st.overrides[ok].reason }; }
    st.makeups = st.makeups.filter(x => x.id !== id); delete st.attendance[k];
  }, 'الحصة التعويضية اتلغت', { type: 'warn' });
  go('schedule');
};

/* ---------- المجموعات ---------- */
Views.groups = () => {
  const st = App.st;
  const count = gid => st.students.filter(s => s.enrollments.some(e => E.currentGroupId(e) === gid && !e.endDate)).length;
  return `
  <header class="plain-head">${backBtn()}<h1>المجموعات والمواعيد</h1></header>
  <main class="pad">
    <div class="banner blue">${ic('info', 18)}<span>المجموعة = مادة + يوم + ساعة. كل أسبوع الحصة بتتولد لوحدها في معادها. لو المادة ليها أكتر من مجموعة، اعمل لكل واحدة مجموعة.</span></div>
    ${[1, 2, 3].map(gr => {
      const gs = st.groups.filter(g => E.SUBJ[g.subjectId].grade === gr);
      return `<section style="display:flex;flex-direction:column;gap:8px"><div class="row" style="gap:8px">${gradeChip(gr)}<span class="small muted">${gs.length} مجموعة</span></div>
        ${gs.length ? `<div class="card tight">${gs.sort((a, b) => a.subjectId.localeCompare(b.subjectId)).map(g => `
          <button class="list-row tap" data-act="editGroup" data-g="${g.id}">
            <span class="dot g${gr}"></span>
            <span class="grow stack"><span class="b">${esc(E.SUBJ[g.subjectId].name)}${g.name ? ' · ' + esc(g.name) : ''}</span><span class="small muted">${E.DAY_NAMES[E.currentSchedule(g).day]} · ${E.fmtTime(E.currentSchedule(g).time)} · ${count(g.id)} طالب</span></span>
            ${ic('edit', 18)}</button>`).join('')}</div>` : `<div class="card small muted">مفيش مجموعات للصف ده</div>`}</section>`;
    }).join('')}
    <button class="btn accent lg" data-act="editGroup">${ic('plus', 20)} مجموعة جديدة</button>
  </main>`;
};
ACT.editGroup = el => {
  const st = App.st;
  const g = el.dataset.g ? E.groupById(st, el.dataset.g) : null;
  const cur = g ? E.currentSchedule(g) : { day: 6, time: '16:00' };
  const used = g && st.students.some(s => s.enrollments.some(e => (e.groupHist || []).some(h => h.groupId === g.id)));
  const s = sheet(`<h2>${g ? 'تعديل المجموعة' : 'مجموعة جديدة'}</h2>
    <label class="field">المادة<select class="input select" id="gf-s" ${used ? 'disabled' : ''}>${[1, 2, 3].map(gr => `<optgroup label="${E.GRADES[gr]}">${E.SUBJECTS.filter(x => x.grade === gr).map(x => `<option value="${x.id}" ${g && g.subjectId === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}</select>
      ${used ? '<span class="hint">المادة مش بتتغير لأن فيه طلاب مسجلين في المجموعة</span>' : ''}</label>
    <label class="field">اسم مميز (اختياري)<input class="input" id="gf-n" value="${esc(g ? g.name : '')}" placeholder="مثلاً: مجموعة أ"></label>
    <div class="grid2">
      <label class="field">اليوم<select class="input select" id="gf-d">${E.WEEK.map(d => `<option value="${d}" ${cur.day === d ? 'selected' : ''}>${E.DAY_NAMES[d]}</option>`).join('')}</select></label>
      <label class="field">الساعة<input class="input" type="time" id="gf-t" value="${cur.time}"></label>
    </div>
    ${g ? `<label class="field" id="gf-from-w" hidden>المعاد الجديد يبدأ من<input class="input" type="date" id="gf-from" value="${E.today()}"><span class="hint">الحصص اللي قبل التاريخ ده هتفضل محسوبة على المعاد القديم</span></label>` : ''}
    <div class="grid2">${g ? `<button class="btn danger-ghost" id="gf-del">${ic('trash', 18)} حذف</button>` : '<button class="btn ghost" data-close>رجوع</button>'}<button class="btn" id="gf-ok">حفظ</button></div>`);
  const changed = () => g && (+$('#gf-d', s.el).value !== cur.day || $('#gf-t', s.el).value !== cur.time);
  ['#gf-d', '#gf-t'].forEach(q => $(q, s.el).addEventListener('change', () => { const w = $('#gf-from-w', s.el); if (w) w.hidden = !changed(); }));
  $('#gf-ok', s.el).onclick = () => {
    const subjectId = $('#gf-s', s.el).value, name = $('#gf-n', s.el).value.trim(), day = +$('#gf-d', s.el).value, time = $('#gf-t', s.el).value;
    if (!time) return toast('حدد الساعة', { type: 'err', sound: 'err' });
    s.close();
    commit(st => {
      if (!g) {
        st.groups.push({ id: E.uid(st), subjectId, name, schedule: [{ from: '2000-01-01', day, time }] });
      } else {
        const gg = E.groupById(st, g.id);
        gg.name = name; if (!used) gg.subjectId = subjectId;
        if (changed()) {
          const from = $('#gf-from', s.el) ? $('#gf-from', s.el).value || E.today() : E.today();
          gg.schedule = gg.schedule.filter(v => v.from < from);
          if (!gg.schedule.length) gg.schedule.push({ from: '2000-01-01', day, time }); else gg.schedule.push({ from, day, time });
        }
      }
    }, g ? 'المجموعة اتعدلت' : 'المجموعة اتضافت');
  };
  if (g) $('#gf-del', s.el).onclick = async () => {
    if (used) return toast('مينفعش تحذف مجموعة فيها طلاب — انقلهم لمجموعة تانية الأول', { type: 'err', sound: 'err', ms: 4500 });
    s.close();
    if (await confirmBox({ title: 'حذف المجموعة؟', ok: 'حذف', danger: true, icon: 'trash' })) commit(st => { st.groups = st.groups.filter(x => x.id !== g.id); }, 'المجموعة اتحذفت', { type: 'warn' });
  };
};
