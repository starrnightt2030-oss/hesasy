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

/* ---------- الرئيسية: لوحة "اعمل إيه النهارده" ---------- */
const plural = (n, one, two, many) => n === 1 ? one : n === 2 ? two : n + ' ' + (n > 10 ? one : many);
function ringSVG(p, size, stroke, color, track) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, p)) / 100);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="ring-svg" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}
function todayTasks() {
  const st = App.st, C = App.C, t = E.today();
  const M = App.miss || { sessions: [], count: 0 }, EV = App.ev || { finished: [], started: [] };
  const al = E.dueAlerts(st, C);
  const ledgers = [...C.ledgers.values()];
  const late = ledgers.filter(L => L.late > 0);
  const part = ledgers.filter(L => L.partPaid && L.due > 0);
  const next = E.sessionsOnDay(st, t).filter(o => o.status === 'normal' && E.studentsInSession(st, o).length && minutesUntil(o.date, o.time) > -45)[0];
  const T = [];
  if (next) {
    const g = E.groupById(st, next.groupId), sub = E.SUBJ[g.subjectId], m = minutesUntil(next.date, next.time);
    T.push({ tone: m <= 60 ? 'amber' : 'blue', icon: 'clock', href: '#/session/' + encodeURIComponent(next.key), title: (m > 0 ? 'الحصة الجاية: ' : 'شغالة دلوقتي: ') + sub.name,
      sub: E.fmtTime(next.time) + ' · ' + E.GRADES[sub.grade] + ' · ' + E.studentsInSession(st, next).length + ' طالب', cta: m > 0 ? (m < 60 ? 'بعد ' + m + ' د' : 'افتح') : 'الغياب' });
  }
  if (M.count) T.push({ tone: 'red', icon: 'check', href: '#/missing', title: M.count + ' غياب متسجلش', sub: 'في ' + plural(M.sessions.length, 'حصة', 'حصتين', 'حصص') + ' فاتت — سجّلهم قبل ما تنسى', cta: 'سجّل' });
  if (late.length) T.push({ tone: 'red', icon: 'wallet', href: '#/students', act: 'stuLate', title: plural(late.length, 'طالب', 'طالبين', 'طلاب') + ' عليهم شهر وبدأوا التاني', sub: 'متأخر ' + money(late.reduce((a, L) => a + L.late, 0)), cta: 'تابع' });
  if (al.ended.length) T.push({ tone: 'amber', icon: 'alert', href: '#/dues', title: plural(al.ended.length, 'طالب', 'طالبين', 'طلاب') + ' خلصوا الشهر ومدفعوش', sub: money(al.ended.reduce((a, r) => a + r.amount, 0)) + ' مستني التحصيل', cta: 'التحصيل' });
  if (part.length) T.push({ tone: 'amber', icon: 'layers', href: '#/students', act: 'stuPart', title: plural(part.length, 'طالب', 'طالبين', 'طلاب') + ' دفعوا جزء', sub: 'باقي عليهم ' + money(part.reduce((a, L) => a + L.due, 0)), cta: 'عرض' });
  const fin = new Set(EV.finished.map(x => x.student.id)).size, stt = new Set(EV.started.map(x => x.student.id)).size;
  if (fin || stt) T.push({ tone: 'violet', icon: 'refresh', href: '#/months', title: stt ? plural(stt, 'طالب', 'طالبين', 'طلاب') + ' بدأوا شهر جديد النهارده' : plural(fin, 'طالب', 'طالبين', 'طلاب') + ' خلصوا شهرهم', sub: stt && fin ? 'و' + fin + ' خلصوا شهرهم والحصة الجاية شهر جديد' : 'الحصة الجاية بيبدأ حساب شهر جديد', cta: 'عرض' });
  return T;
}
ACT.stuLate = () => { App.ui.stuFilter = 'late'; go('students'); };
ACT.stuPart = () => { App.ui.stuFilter = 'part'; go('students'); };
Views.home = () => {
  const st = App.st, C = App.C, t = E.today();
  const sum = E.periodSummary(st, C, E.monthStart(t), E.monthEnd(t));
  const today = E.sessionsOnDay(st, t);
  const active = today.filter(o => o.status === 'normal' && E.studentsInSession(st, o).length);
  const ledgers = [...C.ledgers.values()];
  const owing = ledgers.filter(L => L.due > 0);
  const h = new Date().getHours();
  const tomorrow = E.sessionsOnDay(st, E.addDays(t, 1)).filter(o => o.status === 'normal');
  const groups = st.groups.map(g => ({ g, d: E.groupDues(st, C, g.id) })).filter(x => x.d.owed > 0).sort((a, b) => b.d.owed - a.d.owed).slice(0, 5);
  const nothing = !st.groups.length;
  const M = App.miss || { count: 0 };
  const tasks = nothing ? [] : todayTasks();
  const doneToday = active.filter(o => minutesUntil(o.date, o.time) <= 0).length;
  const al = E.dueAlerts(st, C);
  const nBell = ledgers.filter(L => L.late > 0).length + al.ended.length + al.third.length + (App.miss ? App.miss.sessions.length : 0) + (App.ev ? App.ev.started.length : 0);
  const term = E.termOf(st, t);

  return `
  <header class="hero-head home">
    <div class="topbar">
      <div class="brand">${brandIcon()}<div class="stack"><div class="brand-name">${esc(st.settings.appName)}</div><div class="sub">${E.fmtDate(t)}${term ? ' · ' + esc(term.name) : ''}</div></div></div>
      <div class="head-actions">
        ${eyeBtn()}
        <button class="icon-btn" data-act="notifs" aria-label="التنبيهات">${ic('bell', 22, 2, nBell ? 'ring' : '')}${nBell ? `<span class="badge">${nBell}</span>` : ''}</button>
        <a class="icon-btn" href="#/settings" aria-label="الإعدادات">${ic('gear', 22)}</a>
      </div>
    </div>
    <div class="greet"><div class="hello">${h < 12 ? 'صباح الخير' : 'مساء الخير'} يا أستاذ</div>
      <div class="big">${active.length ? 'عندك ' + plural(active.length, 'حصة', 'حصتين', 'حصص') + ' النهارده' : 'مفيش حصص النهارده'}</div></div>
    ${nothing ? '' : `<div class="today-strip">
      <a class="ts" href="#/schedule"><span class="ts-ic">${ic('cal', 18)}</span><span class="stack"><b class="num">${doneToday}/${active.length}</b><span>حصص النهارده</span></span></a>
      <a class="ts ${M.count ? 'hot' : ''}" href="#/missing"><span class="ts-ic">${ic('check', 18, 2.4)}</span><span class="stack"><b class="num">${M.count}</b><span>غياب ناقص</span></span></a>
      <a class="ts" href="#/dues"><span class="ts-ic">${ic('users', 18)}</span><span class="stack"><b class="num">${owing.length}</b><span>عليهم فلوس</span></span></a>
    </div>`}
  </header>
  <main class="wrap lift">
    <section class="money-card">
      <div class="mc-ring">${ringSVG(sum.pct, 92, 10, 'var(--green)', 'var(--line-2)')}<span class="mc-pct num">${sum.pct}<small>٪</small></span></div>
      <div class="grow stack" style="gap:4px;min-width:0">
        <span class="mc-k">تحصيل شهر ${E.monthName(t)}</span>
        <span class="money-big">${moneyN(sum.paid)}<small> ج</small></span>
        <span class="small muted">من ${money(sum.due)} مستحق الشهر ده</span>
      </div>
      <div class="mc-stats">
        <div><span class="dotx amber"></span><span class="k">متبقي الشهر</span><b class="num">${money(sum.remaining)}</b></div>
        <div><span class="dotx red"></span><span class="k">متأخرات قديمة</span><b class="num">${money(sum.prior)}</b></div>
        <div><span class="dotx green"></span><span class="k">اتقبض الشهر</span><b class="num">${money(sum.cash)}</b></div>
      </div>
      ${App.st.settings.privacy.hide && !shown() ? `<button class="btn soft sm block" data-act="reveal">${ic('eye', 18)} اضغط لعرض الأرصدة</button>` : ''}
    </section>

    ${nothing ? '' : `<nav class="quick" aria-label="اختصارات">
      <a class="qa tap" href="#/student-new"><span class="qa-ic blue">${ic('user', 22)}</span><span>طالب جديد</span></a>
      <button class="qa tap" data-act="quickPay"><span class="qa-ic green">${ic('wallet', 22)}</span><span>تسجيل دفعة</span></button>
      <a class="qa tap" href="#/groups"><span class="qa-ic violet">${ic('layers', 22)}</span><span>المجموعات</span></a>
      <button class="qa tap" data-act="report" data-r="late"><span class="qa-ic amber">${ic('print', 22)}</span><span>كشف المستحقات</span></button>
    </nav>`}

    ${nothing ? `<section class="card"><div class="empty"><span class="ic">${ic('layers', 30)}</span><h3>أهلًا بيك! نبدأ منين؟</h3>
      <div class="sm">١. أضف المجموعات (المادة + اليوم + الساعة)<br>٢. أضف الطلاب ومواد كل طالب<br>والتطبيق هيحسب كل حاجة لوحده.</div>
      <a class="btn accent" href="#/groups">${ic('plus', 18)} أضف أول مجموعة</a></div></section>` : `
    <section class="sec">
      <div class="sec-title"><h2>اعمل إيه النهارده</h2>${tasks.length ? `<span class="count-pill">${tasks.length}</span>` : ''}</div>
      ${tasks.length ? `<div class="tasks">${tasks.map(x => `<a class="task tap ${x.tone}" href="${x.href}" ${x.act ? `data-act="${x.act}"` : ''}>
        <span class="task-ic">${ic(x.icon, 20, 2.2)}</span>
        <span class="grow stack" style="gap:1px;min-width:0"><span class="b ellipsis">${esc(x.title)}</span><span class="small muted ellipsis">${x.sub}</span></span>
        <span class="task-cta">${esc(x.cta)}</span></a>`).join('')}</div>`
        : `<div class="card all-good"><span class="task-ic green">${ic('check', 20, 2.6)}</span><span class="grow stack"><span class="b">كله تمام</span><span class="small muted">الغياب متسجل ومفيش متأخرات محتاجة متابعة</span></span></div>`}
    </section>

    <section class="sec">
      <div class="sec-title"><h2>حصص النهارده</h2><a href="#/schedule">الجدول ${ic('chev', 14)}</a></div>
      ${today.length ? today.map(o => sessionCard(o)).join('') : `<div class="card sm muted" style="text-align:center">مفيش حصص النهارده${tomorrow.length ? ' · بكرة عندك ' + plural(tomorrow.length, 'حصة', 'حصتين', 'حصص') : ''}</div>`}
      ${today.length && tomorrow.length ? `<div class="tomorrow"><span class="chip blue">بكرة</span><span class="sm grow">${tomorrow.map(o => esc(E.SUBJ[E.groupById(st, o.groupId).subjectId].short) + ' ' + E.fmtTime(o.time)).join(' · ')}</span></div>` : ''}
    </section>

    ${homeGroupsHTML()}

    <section class="sec">
      <div class="sec-title"><h2>مجموعات عليها فلوس</h2><a href="#/dues">التحصيل ${ic('chev', 14)}</a></div>
      ${groups.length ? `<div class="card tight">${groups.map(({ g, d }) => {
        const sub = E.SUBJ[g.subjectId];
        const all = E.groupDues(st, C, g.id);
        return `<a class="list-row tap" href="#/dues" data-act="openDuesGroup" data-g="${g.id}" style="flex-direction:column;align-items:stretch;gap:8px">
          <span class="row between"><span class="row" style="gap:10px;min-width:0"><span class="sub-ic g${sub.grade}">${ic(sub.grade === 3 ? 'box' : sub.grade === 2 ? 'plug' : 'book', 16)}</span><span class="b ellipsis">${esc(sub.name)} · ${esc(E.groupLabel(st, g))}</span></span><span class="num b" style="color:var(--red)">${money(d.owed)}</span></span>
          <span class="row between small muted"><span>${d.late.length + d.current.length} عليهم</span><span>${d.late.length ? d.late.length + ' متأخرين شهر' : 'كله الشهر الحالي'}</span></span>
          <span class="bar thin green"><span style="width:${pct(all.paid, all.due)}%"></span></span></a>`;
      }).join('')}</div>` : `<div class="card all-good"><span class="task-ic green">${ic('check', 20, 2.6)}</span><span class="sm">كل المجموعات خالصة — مفيش فلوس متأخرة</span></div>`}
    </section>`}
  </main>`;
};
/* تسجيل دفعة سريع من الرئيسية: دوّر على الطالب واختاره */
ACT.quickPay = () => {
  const st = App.st, C = App.C;
  const all = st.students.filter(s => s.status !== 'withdrawn' || (C.ledgers.get(s.id) || {}).due > 0)
    .map(s => C.ledgers.get(s.id)).filter(Boolean).sort((a, b) => b.due - a.due || a.student.name.localeCompare(b.student.name, 'ar'));
  const row = L => `<button class="list-row tap" data-pick="${L.student.id}"><span class="avatar ${L.late > 0 ? 'red' : L.due > 0 ? 'amber' : 'green'}">${esc(initial(L.student.name))}</span>
    <span class="grow stack" style="gap:2px;min-width:0"><span class="b ellipsis">${esc(L.student.name)}</span><span class="small muted ellipsis">${E.GRADES[L.student.grade]}</span></span>${statusChip(L)}</button>`;
  const s = sheet(`<h2>تسجيل دفعة</h2>
    <label class="search-box">${ic('search', 20)}<input id="qp-q" placeholder="اكتب اسم الطالب" autofocus></label>
    <div class="card tight" id="qp-list" style="box-shadow:none;border:1px solid var(--line);max-height:55vh;overflow:auto">${all.map(row).join('') || '<div class="sm muted" style="padding:14px 0">مفيش طلاب</div>'}</div>`);
  $('#qp-q', s.el).oninput = e => { const q = e.target.value.trim(); $('#qp-list', s.el).innerHTML = all.filter(L => !q || L.student.name.includes(q) || (L.student.phone || '').includes(q)).map(row).join('') || '<div class="sm muted" style="padding:14px 0">مفيش نتايج</div>'; };
  s.el.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) { s.close(); ACT.pay({ dataset: { s: b.dataset.pick } }); } });
};
ACT.openDuesGroup = el => { App.ui.openGroup = el.dataset.g; go('dues'); };

ACT.notifs = () => {
  const st = App.st, C = App.C, t = E.today();
  const late = [...C.ledgers.values()].filter(L => L.late > 0).sort((a, b) => b.late - a.late);
  const need = st.groups.flatMap(g => E.occurrences(st, g.id, E.addDays(t, -14), t)).filter(o => sessionState(o).need);
  const next = E.sessionsOnDay(st, t).filter(o => o.status === 'normal' && minutesUntil(o.date, o.time) > 0);
  const s = sheet(`<h2>التنبيهات</h2>
    ${followupHTML()}
    ${dueAlertsHTML()}
    ${late.length ? `<div class="banner red">${ic('alert', 18)}<span><b>${late.length} عليهم شهر وبدأوا التاني</b><br>${late.slice(0, 6).map(L => esc(L.student.name) + ' (' + money(L.late) + ')').join('، ')}${late.length > 6 ? ' …' : ''}</span></div>` : `<div class="banner green">${ic('check', 18)}<span>مفيش طلاب متأخرين شهرين</span></div>`}
    ${(() => { const ready = st.groups.map(g => ({ g, c: freshCycle(g.id) })).filter(x => x.c); return ready.length ? `<div class="label-sm">ملخصات شهور خلصت (٤ حصص)</div><div class="card tight">${ready.map(({ g, c }) => `<button class="list-row tap" data-act="openGroupCycle" data-g="${g.id}" data-n="${c.n}" data-close><span class="dot g${E.SUBJ[g.subjectId].grade}"></span><span class="grow stack"><span class="b">${esc(E.SUBJ[g.subjectId].name)} · ${esc(E.groupLabel(st, g))}</span><span class="small muted">الشهر ${c.n} خلص ${E.fmtShort(c.to)} · اعرض الحضور والغياب</span></span>${ic('chev', 18)}</button>`).join('')}</div>` : ''; })()}
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
    <a class="btn ghost" href="#/groups">${ic('layers', 18)} المجموعات — الشهور والفلوس والمواعيد</a>
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
  const link = off ? {} : linkedSessions(o, list);
  // رقم حصة كل طالب في شهره، وأكتر رقم متكرر بين زمايله (علشان اللي ورا أو قدام يبان)
  const posMap = new Map(list.map(({ student: s, enrollment: e }) => [s.id, E.cyclePosition(st, e, o.date, true)]));
  const modeN = (() => { const c = new Map(); posMap.forEach(p => c.set(p.n, (c.get(p.n) || 0) + 1)); let best = 0, bn = 0; c.forEach((v, k) => { if (v > best || (v === best && k > bn)) { best = v; bn = k; } }); return bn; })();
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
    ${(() => { const c = E.groupCycles(st, g.id, E.today(), nowHM()).find(x => x.complete && x.sessions[x.sessions.length - 1].key === key); return c ? `<a class="banner green tap" href="#/group/${g.id}" data-act="openGroupCycle" data-g="${g.id}" data-n="${c.n}" style="text-decoration:none">${ic('check', 18)}<span><b>دي آخر حصة في الشهر ${c.n} للمجموعة.</b> افتح ملخص الشهر بالحضور والغياب لكل طالب ←</span></a>` : ''; })()}
    ${future ? `<div class="banner amber">${ic('clock', 18)}<span>الحصة دي لسه مجاتش — تقدر تأجلها أو تلغيها من دلوقتي.</span></div>` : ''}
    ${o.date < E.today() ? `<div class="banner ${list.some(x => !att[x.student.id]) ? 'red' : 'blue'}">${ic(list.some(x => !att[x.student.id]) ? 'alert' : 'lock', 18)}<span>حصة يوم فات${list.some(x => !att[x.student.id]) ? ` — <b>${list.filter(x => !att[x.student.id]).length} طالب متسجلش غيابهم</b>` : ''}. أي تعديل في غياب متسجل هيطلب تأكيد ويتسجل في سجل التعديلات.</span></div>` : ''}
    ${link.next ? `<button class="link-card tap" data-act="copyAtt" data-from="${esc(key)}" data-to="${esc(link.next.o.key)}" ${Object.keys(att).length ? '' : 'disabled'}>
      <span class="lc-ic">${ic('layers', 20)}</span><span class="grow stack" style="gap:2px"><span class="b">طبّق الغياب ده على ${esc(E.SUBJ[E.groupById(st, link.next.o.groupId).subjectId].name)}</span>
      <span class="small">الساعة ${E.fmtTime(link.next.o.time)} · ${link.next.common} طالب نفس الطلاب${link.next.recorded ? ` · متسجل فيها ${link.next.recorded}` : ''}${Object.keys(att).length ? '' : ' · سجّل الأول هنا'}</span></span>${ic('chev', 18)}</button>` : ''}
    ${link.prev && link.prev.marked && link.prev.missingHere ? `<button class="link-card tap alt" data-act="copyAtt" data-from="${esc(link.prev.o.key)}" data-to="${esc(key)}">
      <span class="lc-ic">${ic('undo', 20)}</span><span class="grow stack" style="gap:2px"><span class="b">انسخ الغياب من ${esc(E.SUBJ[E.groupById(st, link.prev.o.groupId).subjectId].name)}</span>
      <span class="small">الحصة اللي قبلها (${E.fmtTime(link.prev.o.time)}) · ${link.prev.missingHere} طالب لسه متسجلوش هنا</span></span>${ic('chev', 18)}</button>` : ''}
    <div class="row between"><span class="row small muted" style="gap:6px">${ic('info', 16)} الحصة بتتحسب حضر أو غاب</span>
      ${list.length ? `<button class="btn sm ghost" data-act="allPresent" data-k="${esc(key)}">الكل حاضر</button>` : ''}</div>
  </div>
  <ul style="list-style:none;margin:0;padding:12px 16px;display:flex;flex-direction:column;gap:8px">
    ${list.length ? list.map(({ student: s, enrollment: e }) => {
      const v = att[s.id];
      const pos = posMap.get(s.id);
      const L = App.C.ledgers.get(s.id);
      const lag = modeN && list.length > 2 ? pos.n - modeN : 0;
      return `<li class="att-row cy${(Math.max(1, pos.cycle) - 1) % 4} ${v === 'a' ? 'abs' : ''}">
        <a href="#/student/${s.id}" class="avatar ${v === 'a' ? 'red' : ''}" style="text-decoration:none" aria-label="ملف ${esc(s.name)}">${esc(initial(s.name))}</a>
        <div class="grow stack" style="gap:3px"><span class="b ellipsis">${esc(s.name)}</span>
          <span class="small muted"><span class="cy-tag">ش${pos.cycle}</span> حصة ${pos.pos || 1} من 4${pos.pos === 1 && pos.cycle > 1 ? ' · <b class="cy-new">شهر جديد</b>' : pos.pos === 4 ? ' · آخر حصة' : ''}${lag ? ` · <b style="color:${lag < 0 ? 'var(--red)' : 'var(--blue-text)'}">${lag < 0 ? 'ورا زمايله بـ' : 'قدام زمايله بـ'} ${Math.abs(lag) === 1 ? 'حصة' : Math.abs(lag) === 2 ? 'حصتين' : Math.abs(lag) + ' حصص'}</b>` : ''}${L && L.due > 0 ? ` · <b style="color:${L.late ? 'var(--red)' : 'var(--accent-text)'}">${L.partPaid ? 'باقي' : 'عليه'} ${money(L.due)}</b>` : ''}</span></div>
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
/* الحصة اللي بعدها / قبلها في نفس اليوم لنفس الطلاب (زي مادتين ورا بعض يوم الأحد) */
function linkedSessions(o, list) {
  const st = App.st;
  const ids = new Set(list.map(x => x.student.id));
  const att = st.attendance[o.key] || {};
  const day = E.sessionsOnDay(st, o.date).filter(x => x.status === 'normal' && x.key !== o.key);
  const info = x => {
    const other = E.studentsInSession(st, x).map(y => y.student.id);
    const common = other.filter(id => ids.has(id));
    const xa = st.attendance[x.key] || {};
    return { o: x, common: common.length, recorded: common.filter(id => xa[id]).length, marked: common.filter(id => xa[id]).length, missingHere: common.filter(id => xa[id] && !att[id]).length };
  };
  const after = day.filter(x => x.time > o.time || (x.time === o.time && x.key > o.key)).map(info).filter(x => x.common);
  const before = day.filter(x => x.time < o.time || (x.time === o.time && x.key < o.key)).map(info).filter(x => x.common);
  return { next: after[0] || null, prev: before[before.length - 1] || null };
}
ACT.copyAtt = async el => {
  const st = App.st, from = el.dataset.from, to = el.dataset.to;
  const so = E.sessionByKey(st, from), so2 = E.sessionByKey(st, to);
  if (!so || !so2) return;
  const src = st.attendance[from] || {}, cur = st.attendance[to] || {};
  const tgt = E.studentsInSession(st, so2).map(x => x.student.id);
  const ids = tgt.filter(id => src[id]);
  if (!ids.length) return toast('مفيش غياب متسجل للطلاب دول في الحصة الأولى', { type: 'warn' });
  const conflicts = ids.filter(id => cur[id] && cur[id] !== src[id]);
  let overwrite = false;
  if (conflicts.length) overwrite = await confirmBox({ title: 'فيه طلاب متسجلين بشكل مختلف', icon: 'alert', ok: 'اكتب فوقهم', cancel: 'سيبهم زي ما هما',
    text: `${conflicts.slice(0, 4).map(id => '<b>' + esc((studentById(id) || {}).name || '') + '</b>').join('، ')}${conflicts.length > 4 ? ' و' + (conflicts.length - 4) + ' كمان' : ''} متسجلين في الحصة التانية بشكل مختلف. تكتب فوقهم ولا تسيبهم؟` });
  const past = so2.date < E.today();
  const sub = E.SUBJ[E.groupById(st, so2.groupId).subjectId];
  const extra = tgt.filter(id => !src[id] && !cur[id]).length;
  let n = 0;
  commit(S => {
    S.attendance[to] = S.attendance[to] || {};
    ids.forEach(id => {
      const old = S.attendance[to][id];
      if (old && !overwrite) return;
      if (old === src[id]) return;
      S.attendance[to][id] = src[id]; n++;
      if (past && old && typeof logAtt === 'function') logAtt(S, to, id, old, src[id]);
    });
  }, null);
  toast(`اتسجل غياب ${n} طالب في ${esc(sub.name)}${extra ? ` · ${extra} طالب فاضلين تسجلهم هناك` : ''}`, { sound: 'ok', action: 'افتحها', ms: 6000, onAction: () => go('session', to) });
};
ACT.openGroupCycle = el => { App.ui.grpId = el.dataset.g; App.ui.grpCycle = +el.dataset.n; App.ui.grpSel = null; go('group', el.dataset.g); };
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
/* قائمة المجموعات وصفحة المجموعة في views-groups.js */
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
  $('#gf-ok', s.el).onclick = async () => {
    const subjectId = $('#gf-s', s.el).value, name = $('#gf-n', s.el).value.trim(), day = +$('#gf-d', s.el).value, time = $('#gf-t', s.el).value;
    if (!time) return toast('حدد الساعة', { type: 'err', sound: 'err' });
    // حماية: تغيير المعاد من تاريخ فات ممكن يخفي غياب متسجل في حصص قديمة
    if (g && changed()) {
      const from = $('#gf-from', s.el) ? $('#gf-from', s.el).value || E.today() : E.today();
      let sched = g.schedule.filter(v => v.from < from);
      sched = sched.length ? sched.concat({ from, day, time }) : [{ from: '2000-01-01', day, time }];
      const tmp = Object.assign({}, st, { groups: st.groups.map(x => x.id === g.id ? Object.assign({}, x, { schedule: sched }) : x) });
      const lost = Object.keys(st.attendance).filter(k => k.startsWith(g.id + '@') && Object.keys(st.attendance[k] || {}).length)
        .map(k => k.split('@')[1]).filter(d => !E.occurrences(tmp, g.id, d, d).some(o => o.date === d));
      if (lost.length) {
        s.close();
        const ok = await confirmBox({ title: 'غياب متسجل هيختفي!', danger: true, icon: 'alert', ok: 'أيوه، غيّر المعاد',
          text: `تغيير المعاد من <b>${E.fmtDate(from)}</b> هيخلي <b>${lost.length} ${lost.length === 1 ? 'حصة' : 'حصص'}</b> متسجل غيابها (${lost.slice(0, 3).map(E.fmtShort).join('، ')}${lost.length > 3 ? '…' : ''}) متبقاش محسوبة، وعدد حصص الطلاب هيتغير. الأفضل تخلي التغيير يبدأ من النهارده أو من بعد آخر حصة.` });
        if (!ok) return;
        await Backup.add(st, 'قبل تغيير معاد مجموعة').catch(() => {});
      }
    }
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
    if (await confirmBox({ title: 'حذف المجموعة؟', ok: 'حذف', danger: true, icon: 'trash' })) { commit(st => { st.groups = st.groups.filter(x => x.id !== g.id); }, 'المجموعة اتحذفت', { type: 'warn' }); if (route().name === 'group') go('groups'); }
  };
};
