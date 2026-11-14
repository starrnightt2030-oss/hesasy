/* حصصي — المتابعة: الغياب الناقص، بداية ونهاية الشهور، تأكيد تعديل الأيام اللي فاتت، وسجل التعديلات */
'use strict';

/* ---------- كارت المتابعة في الرئيسية ---------- */
window.followupHTML = () => {
  const st = App.st;
  if (!st.groups.length) return '';
  const M = App.miss || { sessions: [], count: 0 }, EV = App.ev || { finished: [], started: [] };
  const tiles = [];
  if (M.count) tiles.push(`<a class="fu tap red" href="#/missing"><span class="fu-ic">${ic('check', 20, 2.4)}</span><span class="fu-n num">${M.count}</span><span class="fu-t">غياب متسجلش</span><span class="fu-s">في ${M.sessions.length} ${M.sessions.length === 1 ? 'حصة' : 'حصص'}</span></a>`);
  if (EV.finished.length) tiles.push(`<a class="fu tap amber" href="#/months"><span class="fu-ic">${ic('cal', 20)}</span><span class="fu-n num">${new Set(EV.finished.map(x => x.student.id)).size}</span><span class="fu-t">خلصوا شهرهم</span><span class="fu-s">الحصة الجاية شهر جديد</span></a>`);
  if (EV.started.length) tiles.push(`<a class="fu tap blue" href="#/months"><span class="fu-ic">${ic('refresh', 20)}</span><span class="fu-n num">${new Set(EV.started.map(x => x.student.id)).size}</span><span class="fu-t">بدأوا شهر جديد</span><span class="fu-s">النهارده</span></a>`);
  if (!tiles.length) return `<div class="card row" style="gap:10px;padding:12px 14px"><span class="avatar green" style="width:36px;height:36px">${ic('check', 18, 2.6)}</span><span class="sm grow">الغياب متسجل لكل الحصص اللي فاتت</span></div>`;
  return `<section style="display:flex;flex-direction:column;gap:10px"><div class="sec-title"><h2>محتاج متابعة</h2></div><div class="fu-grid">${tiles.join('')}</div></section>`;
};

/* ---------- صفحة الغياب الناقص ---------- */
Views.missing = () => {
  const st = App.st, M = App.miss || { sessions: [] }, t = E.today();
  const byDay = new Map();
  M.sessions.forEach(r => { const d = r.o.date; if (!byDay.has(d)) byDay.set(d, []); byDay.get(d).push(r); });
  return `
  <header class="plain-head">${backBtn('#/home')}<div class="stack grow" style="min-width:0"><h1>الغياب اللي متسجلش</h1><span class="sub">${M.count ? M.count + ' طالب في ' + M.sessions.length + ' حصة' : 'كله متسجل'}</span></div></header>
  <main class="pad">
    <div class="banner blue">${ic('info', 18)}<span>دي الحصص اللي اتعملت (من تاريخ أول حصة لكل طالب) ولسه فيها طلاب من غير حضور أو غياب. افتح الحصة وسجّل — والحصة بتتحسب على الطالب في الحالتين.</span></div>
    ${M.sessions.length ? [...byDay.entries()].map(([d, rows]) => `<section style="display:flex;flex-direction:column;gap:8px">
      <h2 class="label-sm" style="font-size:14px">${E.fmtDate(d)}${d === t ? ' · النهارده' : E.diffDays(d, t) === 1 ? ' · امبارح' : ' · من ' + E.diffDays(d, t) + ' يوم'}</h2>
      ${rows.map(({ o, students }) => {
        const g = E.groupById(st, o.groupId), sub = E.SUBJ[g.subjectId];
        const all = E.studentsInSession(st, o).length;
        return `<a class="card tap" href="#/session/${encodeURIComponent(o.key)}" style="display:flex;flex-direction:column;gap:8px;text-decoration:none;color:inherit">
          <span class="row"><span class="timebox g${sub.grade}" style="width:58px;padding:4px 0"><span class="t" style="font-size:15px">${E.fmtTime(o.time).split(' ')[0]}</span><span class="p">${E.fmtTime(o.time).split(' ')[1] === 'م' ? 'مساءً' : 'صباحًا'}</span></span>
            <span class="grow stack"><span class="b">${esc(sub.name)}${o.type === 'makeup' ? ' <span class="chip blue">تعويضية</span>' : ''}</span><span class="small muted">${esc(E.groupLabel(st, g))}</span></span>
            <span class="chip red">${students.length} من ${all}</span></span>
          <span class="small muted" style="line-height:1.7">${students.map(s => esc(s.name)).join('، ')}</span>
          <span class="btn sm" style="align-self:flex-start">سجّل الغياب</span></a>`;
      }).join('')}</section>`).join('') : `<div class="card"><div class="empty"><span class="ic" style="background:var(--green-soft);color:var(--green)">${ic('check', 30, 2.4)}</span><h3>كل الغياب متسجل</h3><span class="sm">مفيش حصص فاتت ناقصها حضور أو غياب.</span></div></div>`}
  </main>`;
};

/* ---------- صفحة بداية ونهاية الشهور ---------- */
Views.months = () => {
  const st = App.st, EV = App.ev || { finished: [], started: [] };
  const row = (x, kind) => {
    const L = App.C.ledgers.get(x.student.id);
    const price = (L.charges.filter(c => c.enrollmentId === x.enrollment.id).pop() || {}).price;
    return `<a class="list-row tap" href="#/student/${x.student.id}">
      <span class="avatar ${kind === 'f' ? 'amber' : ''}">${esc(initial(x.student.name))}</span>
      <span class="grow stack" style="gap:2px;min-width:0"><span class="b ellipsis">${esc(x.student.name)}</span>
        <span class="small muted ellipsis">${esc(E.SUBJ[x.subjectId].name)} · ${esc(E.groupLabel(st, E.groupById(st, x.groupId)))}</span>
        <span class="small" style="color:${kind === 'f' ? 'var(--accent-text)' : 'var(--blue-text)'};font-weight:600">${kind === 'f' ? `خلص الشهر ${x.month} (${x.n} حصة)${x.next ? ' · الشهر ' + x.nextMonth + ' يبدأ ' + E.fmtDate(x.next) : ''}` : `بدأ الشهر ${x.month} النهارده`}</span></span>
      ${L && L.due > 0 ? `<span class="chip ${L.late ? 'red' : 'amber'}">عليه ${money(L.due)}</span>` : price ? `<span class="chip green">خالص</span>` : ''}</a>`;
  };
  return `
  <header class="plain-head">${backBtn('#/home')}<h1>الشهور الجديدة</h1></header>
  <main class="pad">
    <div class="banner blue">${ic('info', 18)}<span>كل طالب شهره بيبدأ من أول حصة ليه، وبعد ٤ حصص محسوبة (حضر أو غاب) الحصة اللي بعدها بتبدأ شهر جديد وبينزل حسابه. الحصص الملغية والمؤجلة مش بتتحسب.</span></div>
    ${EV.started.length ? `<section style="display:flex;flex-direction:column;gap:8px"><h2 class="label-sm" style="font-size:14px">بدأوا شهر جديد النهارده (${EV.started.length})</h2><div class="card tight">${EV.started.map(x => row(x, 's')).join('')}</div></section>` : ''}
    ${EV.finished.length ? `<section style="display:flex;flex-direction:column;gap:8px"><h2 class="label-sm" style="font-size:14px">خلصوا شهرهم — الحصة الجاية شهر جديد (${EV.finished.length})</h2><div class="card tight">${EV.finished.sort((a, b) => (a.next || '9').localeCompare(b.next || '9')).map(x => row(x, 'f')).join('')}</div></section>` : ''}
    ${!EV.started.length && !EV.finished.length ? `<div class="card"><div class="empty"><span class="ic">${ic('cal', 28)}</span><h3>مفيش شهور بتخلص دلوقتي</h3></div></div>` : ''}
  </main>`;
};

/* ---------- تأكيد تعديل غياب يوم فات + سجل التعديلات ---------- */
const MARK_NAME = { p: 'حاضر', a: 'غائب' };
function logAtt(st, key, sid, from, to) {
  st.attLog = st.attLog || [];
  st.attLog.unshift({ at: new Date().toISOString(), key, sid, from: from || null, to: to || null });
  if (st.attLog.length > 500) st.attLog.length = 500;
}
ACT.att = async el => {
  const { k, s, v } = el.dataset;
  const st = App.st, o = E.sessionByKey(st, k);
  const cur = (st.attendance[k] || {})[s];
  const next = cur === v ? null : v;
  const past = o && o.date < E.today();
  // تعديل (أو مسح) غياب متسجل في يوم فات → لازم تأكيد
  if (past && cur) {
    const stu = studentById(s);
    const ok = await confirmBox({
      title: 'تعديل غياب يوم فات',
      text: `<b>${esc(stu ? stu.name : '')}</b> — حصة ${E.fmtDate(o.date)}<br>${next ? `هيتغير من <b>${MARK_NAME[cur]}</b> لـ <b>${MARK_NAME[next]}</b>` : `هيتمسح التسجيل (<b>${MARK_NAME[cur]}</b>) ويرجع "متسجلش"`}`,
      ok: 'أيوه، عدّل', icon: 'edit'
    });
    if (!ok) return;
  }
  Sound.play('tap');
  commit(S => {
    S.attendance[k] = S.attendance[k] || {};
    if (next) S.attendance[k][s] = next; else delete S.attendance[k][s];
    if (past && cur) logAtt(S, k, s, cur, next);
  }, past && cur ? 'الغياب اتعدل' : null);
};
Views.attlog = () => {
  const st = App.st, log = st.attLog || [];
  return `
  <header class="plain-head">${backBtn('#/settings')}<h1>سجل تعديلات الغياب</h1></header>
  <main class="pad">
    <div class="banner blue">${ic('info', 18)}<span>أي تعديل في غياب حصة يوم فات بيتسجل هنا بتاريخه.</span></div>
    ${log.length ? `<div class="card tight">${log.map(x => {
      const o = E.sessionByKey(st, x.key), s = studentById(x.sid), g = o && E.groupById(st, o.groupId);
      const d = new Date(x.at);
      return `<a class="list-row" href="#/session/${encodeURIComponent(x.key)}" style="text-decoration:none;color:inherit">
        <span class="avatar" style="width:36px;height:36px">${ic('edit', 16)}</span>
        <span class="grow stack" style="gap:2px;min-width:0"><span class="b ellipsis">${esc(s ? s.name : 'طالب محذوف')}</span>
          <span class="small muted ellipsis">${g ? esc(E.SUBJ[g.subjectId].short) + ' · حصة ' + E.fmtShort(o.date) : ''}</span>
          <span class="small">${MARK_NAME[x.from] || 'متسجلش'} ← <b>${MARK_NAME[x.to] || 'متسجلش'}</b></span></span>
        <span class="small muted" style="text-align:left">${E.fmtShort(E.iso(d))}<br>${d.toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit' })}</span></a>`;
    }).join('')}</div>` : '<div class="card sm muted">مفيش تعديلات لسه</div>'}
  </main>`;
};

/* ---------- الحضور والغياب في ملف الطالب: كل حصصه، وتسجيل/تعديل من نفس المكان ---------- */
window.studentAttHTML = s => {
  const st = App.st, t = E.today();
  const ens = s.enrollments.filter(e => e.startDate <= t);
  if (!ens.length) return '';
  const all = ens.map(e => {
    const ses = E.enrollmentSessions(st, e, t);          // الحصص اللي معادها جه بس
    return { e, list: ses.map((o, i) => ({ o, i, v: (st.attendance[o.key] || {})[s.id] || null })) };
  });
  const P = all.reduce((a, x) => a + x.list.filter(r => r.v === 'p').length, 0);
  const A = all.reduce((a, x) => a + x.list.filter(r => r.v === 'a').length, 0);
  const N = all.reduce((a, x) => a + x.list.filter(r => !r.v).length, 0);
  const subF = App.ui.stAttSub && all.some(x => x.e.id === App.ui.stAttSub) ? App.ui.stAttSub : (all.length > 1 ? '' : all[0].e.id);
  const N0 = all.reduce((a, x) => a + x.list.filter(r => !r.v).length, 0);
  const onlyMissing = !!App.ui.stAttMiss && N0 > 0;   // لو مفيش ناقص يرجع يعرض الكل
  const showAll = App.ui.stAttAll === s.id;
  const rows = all.filter(x => !subF || x.e.id === subF);
  const body = rows.map(({ e, list }) => {
    let L = list.slice().reverse();
    if (onlyMissing) L = L.filter(r => !r.v);
    const months = [];
    L.forEach(r => { const m = Math.floor(r.i / 4) + 1; let g = months.find(x => x.m === m); if (!g) months.push(g = { m, rows: [] }); g.rows.push(r); });
    const vis = showAll || onlyMissing ? months : months.slice(0, 2);
    if (!vis.length) return '';
    return `${rows.length > 1 || all.length > 1 ? `<div class="label-sm" style="padding:10px 0 2px">${esc(E.SUBJ[e.subjectId].name)}</div>` : ''}
      ${vis.map(g => `<div class="att-m"><span>شهره ${g.m}</span></div>${g.rows.map(({ o, i, v }) => {
        const gr = E.groupById(st, o.groupId);
        const moved = (e.groupHist || []).length > 1;
        return `<div class="att-line ${v ? '' : 'miss'}">
          <span class="stack grow" style="gap:1px;min-width:0"><span class="b sm">${E.fmtDate(o.date)}${o.type === 'makeup' ? ' <span class="chip blue">تعويضية</span>' : ''}</span>
            <span class="small muted ellipsis">حصة ${(i % 4) + 1} من 4${moved && gr ? ' · ' + esc(gr.name || E.DAY_NAMES[E.currentSchedule(gr).day]) : ''}${v ? '' : ' · <b style="color:var(--red)">متسجلش</b>'}</span></span>
          <div class="toggle2" role="group" aria-label="حضور ${E.fmtShort(o.date)}">
            <button class="p ${v === 'p' ? 'on' : ''}" aria-pressed="${v === 'p'}" data-act="att" data-k="${esc(o.key)}" data-s="${s.id}" data-v="p">حاضر</button>
            <button class="a ${v === 'a' ? 'on' : ''}" aria-pressed="${v === 'a'}" data-act="att" data-k="${esc(o.key)}" data-s="${s.id}" data-v="a">غائب</button></div>
        </div>`;
      }).join('')}`).join('')}
      ${!showAll && !onlyMissing && months.length > 2 ? `<button class="btn sm soft block" style="margin:8px 0" data-act="stAttAll" data-s="${s.id}">عرض كل الحصص (${list.length})</button>` : ''}`;
  }).join('');
  return `<section id="st-att" style="display:flex;flex-direction:column;gap:10px">
    <div class="sec-title"><h2>الحضور والغياب</h2></div>
    <div class="grid3">
      <div class="stat green" style="text-align:center"><span class="v">${P}</span><span class="k">حضر</span></div>
      <div class="stat red" style="text-align:center"><span class="v">${A}</span><span class="k">غاب</span></div>
      <div class="stat ${N ? 'amber' : 'green'}" style="text-align:center"><span class="v">${N}</span><span class="k">متسجلش</span></div>
    </div>
    ${N ? `<div class="banner red">${ic('alert', 18)}<span><b>${N} حصة متسجلش فيها حضور أو غياب.</b> سجّلها من هنا على طول — الحصة بتتحسب عليه في الحالتين.</span></div>` : ''}
    <div class="chips">
      ${all.length > 1 ? [['', 'كل المواد'], ...all.map(x => [x.e.id, E.SUBJ[x.e.subjectId].short])].map(([k, l]) => `<button class="fchip ${subF === k ? 'on' : ''}" data-act="stAttSub" data-e="${k}">${esc(l)}</button>`).join('') : ''}
      ${N ? `<button class="fchip ${onlyMissing ? 'on' : ''}" data-act="stAttMiss" style="${onlyMissing ? '' : 'border-color:#F3C4C0;color:var(--red)'}">متسجلش بس (${N})</button>` : ''}
    </div>
    <div class="card tight">${body || '<div class="sm muted" style="padding:14px 0">لسه مفيش حصص اتعملت</div>'}</div>
    <div class="small muted" style="padding:0 4px">${ic('info', 13)} تعديل حضور أو غياب متسجل في يوم فات بيطلب تأكيد وبيتسجل في سجل التعديلات.</div>
  </section>`;
};
ACT.stAttSub = el => { App.ui.stAttSub = el.dataset.e; render(); };
ACT.stAttMiss = () => { App.ui.stAttMiss = !App.ui.stAttMiss; render(); };
ACT.stAttAll = el => { App.ui.stAttAll = el.dataset.s; render(); };
