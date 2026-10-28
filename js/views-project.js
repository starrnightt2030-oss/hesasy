/* حصصي — مشروع التخرج: تقييم الأسئلة، الغياب والخصم، وتقارير الطالب والمستحقات */
'use strict';

const g3Groups = () => App.st.groups.filter(g => g.subjectId === 'g3a');
const gShort = g => g ? (g.name || (E.DAY_NAMES[E.currentSchedule(g).day] + ' ' + E.fmtTime(E.currentSchedule(g).time))) : '—';
/* الأرقام السالبة جوه نص عربي: علامة السالب تفضل على الشمال (−15 مش 15−) */
const neg = v => `<bdi dir="ltr">−${v}</bdi>`;
const num = n => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
const MARK = { p: ['p', '✓', 'حضر'], a: ['a', '✗', 'غاب'], none: ['o', '–', 'متسجلش'], future: ['f', '', 'لسه'] };
const dotsHTML = items => `<span class="adots">${[0, 1, 2, 3].map(i => { const x = items[i]; const m = x ? MARK[x.mark] : MARK.future; return `<span class="ad ${m[0]}" title="${x ? E.fmtShort(x.date) + ' · ' + m[2] : ''}">${m[1]}</span>`; }).join('')}</span>`;
const dedChip = c => c.abs === 0 ? '<span class="chip green">مفيش غياب</span>' : c.forgiven ? `<span class="chip blue">${c.complete ? 'سماح' : 'سماح لحد دلوقتي'}</span>` : `<span class="chip red">${neg(c.deduction)} درجة</span>`;

/* ---------- تابات مشروع التخرج ---------- */
const _supplies = Views.project;
function projTabs() {
  const t = App.ui.projTab || 'supplies';
  return `<div class="seg dark" role="tablist" style="margin-top:2px">${[['supplies', 'المستلزمات'], ['questions', 'تقييم الأسئلة'], ['absence', 'الغياب والخصم']].map(([k, l]) => `<button role="tab" aria-selected="${t === k}" class="${t === k ? 'on' : ''}" data-act="projTab" data-t="${k}">${l}</button>`).join('')}</div>`;
}
ACT.projTab = el => { App.ui.projTab = el.dataset.t; render(); };
function groupChips() {
  const gs = g3Groups(); if (gs.length < 2) return '';
  const cur = App.ui.projGroup || '';
  return `<div class="chips">${[['', 'كل المجموعات'], ...gs.map(g => [g.id, gShort(g)])].map(([k, l]) => `<button class="fchip ${cur === k ? 'on' : ''}" data-act="projGroup" data-g="${k}">${esc(l)}</button>`).join('')}</div>`;
}
ACT.projGroup = el => { App.ui.projGroup = el.dataset.g || ''; render(); };
const inGroup = gid => !App.ui.projGroup || App.ui.projGroup === gid;
function projHeader(title, stats, printAct) {
  const g3 = g3Groups();
  const n3 = App.st.students.filter(s => s.grade === 3 && s.status !== 'withdrawn').length;
  return `<header class="hero-head flat green">
    <div class="topbar"><div class="stack"><h1 style="font-size:22px">${title}</h1><span class="sub" style="color:#BFE3CF">الصف الثالث · ${n3} طالب في ${g3.length} ${g3.length === 1 ? 'مجموعة' : 'مجموعات'}</span></div>
      <div class="head-actions">${printAct ? `<button class="icon-btn" data-act="report" data-r="${printAct}" aria-label="طباعة">${ic('print', 20)}</button>` : ''}</div></div>
    ${projTabs()}
    <div class="grid3">${stats.map(([k, v, c]) => `<div class="stat glass" style="text-align:right"><span class="k" style="color:#BFE3CF">${k}</span><span class="v" style="${c ? 'color:' + c : ''}">${v}</span></div>`).join('')}</div>
  </header>`;
}
Views.project = () => {
  const t = App.ui.projTab || 'supplies';
  if (t === 'questions') return questionsView();
  if (t === 'absence') return absenceView();
  return _supplies().replace('<h1 style="font-size:22px">مستلزمات مشروع التخرج</h1>', '<h1 style="font-size:22px">مشروع التخرج</h1>').replace('</header>', projTabs() + '</header>');
};
const noG3 = () => `<div class="card"><div class="empty"><span class="ic" style="background:var(--green-soft);color:var(--green)">${ic('box', 28)}</span><h3>مفيش مجموعات مشروع تخرج</h3><span class="sm">أضف مجموعة لمادة "مشروع التخرج" وطلاب الصف الثالث الأول.</span><a class="btn accent" href="#/groups">أضف مجموعة</a></div></div>`;

/* ---------- تقييم الأسئلة ---------- */
function questionStats(q) {
  const roster = E.projectRoster(App.st, q.groupIds, q.created);
  const rows = roster.map(x => ({ ...x, res: E.questionResult(App.st, q, App.st.qgrades[q.id + '|' + x.student.id]) }));
  const done = rows.filter(r => r.res);
  return { rows, done: done.length, late: done.filter(r => r.res.late > 0).length, avg: done.length ? done.reduce((a, r) => a + r.res.final, 0) / done.length : 0 };
}
function questionsView() {
  const st = App.st, R = E.projRules(st), t = E.today();
  if (!g3Groups().length) return projHeader('مشروع التخرج', [['أسئلة', 0], ['متوسط', '—'], ['متأخر', 0]]) + `<main class="pad">${noG3()}</main>`;
  const qs = (st.questions || []).filter(q => !App.ui.projGroup || !q.groupIds.length || q.groupIds.includes(App.ui.projGroup))
    .sort((a, b) => (b.due || '').localeCompare(a.due || ''));
  const all = qs.map(q => ({ q, s: questionStats(q) }));
  const graded = all.reduce((a, x) => a + x.s.done, 0);
  const avg = graded ? all.reduce((a, x) => a + x.s.avg * x.s.done, 0) / graded : 0;
  const late = all.reduce((a, x) => a + x.s.late, 0);
  const open = App.ui.openQ;
  return projHeader('مشروع التخرج', [['أسئلة', qs.length], ['متوسط الدرجات', graded ? num(avg) + ' / ' + R.maxQ : '—', '#8EF0BC'], ['تسليم متأخر', late, '#FFC98A']], 'projQ') + `
  <main class="pad fab-space">
    ${groupChips()}
    <div class="banner blue">${ic('info', 18)}<span>في الميعاد أو قبله: الدرجة كاملة · متأخر لحد ${R.lateDays} أيام: يتخصم ${R.lateWeek}٪ من الدرجة · أكتر من كده: يتخصم ${R.lateAfter}٪. تاريخ التسليم = يوم ما تسجل الدرجة.</span></div>
    ${all.length ? all.map(({ q, s }) => {
      const isOpen = open === q.id;
      const overdue = q.due && q.due < t && s.done < s.rows.length;
      const rows = s.rows.filter(r => inGroup(r.groupId));
      return `<section class="card flush" style="${isOpen ? 'border:2px solid var(--green);box-shadow:var(--shadow)' : ''}">
        <button class="tap" data-act="toggleQ" data-q="${q.id}" aria-expanded="${isOpen}" style="all:unset;box-sizing:border-box;width:100%;padding:16px;display:flex;flex-direction:column;gap:10px;cursor:pointer">
          <span class="row"><span class="avatar" style="border-radius:14px;width:44px;height:44px;background:var(--green-soft);color:var(--green)">${ic('pen', 20)}</span>
            <span class="grow stack"><span class="b">${esc(q.name)}</span><span class="small muted">ميعاد التسليم ${q.due ? E.fmtDate(q.due) : '—'}${q.groupIds.length ? ' · ' + q.groupIds.map(id => esc(gShort(E.groupById(st, id)))).join('، ') : ''}</span></span>
            <span class="stack" style="align-items:flex-end"><span class="sm b" style="color:${s.done === s.rows.length && s.rows.length ? 'var(--green)' : 'var(--accent-text)'}">${s.done} / ${s.rows.length}</span>${s.done ? `<span class="small muted">متوسط ${num(s.avg)}</span>` : ''}</span></span>
          ${overdue ? `<span class="chip red" style="align-self:flex-start">فات الميعاد · ${s.rows.length - s.done} لسه مسلموش</span>` : ''}
          <span class="bar thin green"><span style="width:${pct(s.done, s.rows.length)}%"></span></span>
        </button>
        ${isOpen ? `${rows.map(r => {
          const x = r.res;
          let line, cls = '';
          if (!x) { const d = q.due ? E.diffDays(q.due, t) : 0; line = d > 0 ? `لسه مسلمش · متأخر ${d} يوم` : 'لسه مسلمش'; cls = d > 0 ? 'color:var(--red)' : ''; }
          else if (!x.late) line = 'سلّم ' + E.fmtShort(x.date) + ' · في الميعاد';
          else { line = `سلّم ${E.fmtShort(x.date)} · متأخر ${x.late} يوم · ${neg(x.pct + '٪')}`; cls = 'color:var(--accent-text)'; }
          return `<button class="tap" data-act="gradeQ" data-q="${q.id}" data-s="${r.student.id}" style="all:unset;box-sizing:border-box;width:100%;padding:10px 16px;display:flex;align-items:center;gap:12px;border-top:1px solid #F1F3F6;cursor:pointer">
            <span class="avatar ${x ? (x.late ? 'amber' : 'green') : 'red'}" style="width:36px;height:36px">${x ? ic(x.late ? 'clock' : 'check', 16, 2.6) : ic('x', 16, 2.6)}</span>
            <span class="grow stack" style="min-width:0"><span class="b ellipsis">${esc(r.student.name)}</span><span class="small" style="${cls || 'color:var(--muted)'}">${line}</span></span>
            ${x ? `<span class="stack" style="align-items:flex-end"><span class="num b" style="font-size:18px">${num(x.final)}<span class="small muted"> / ${x.max}</span></span>${x.pct ? `<span class="small muted" style="text-decoration:line-through">${num(x.raw)}</span>` : ''}</span>` : `<span class="btn sm">قيّم</span>`}
          </button>`;
        }).join('') || '<div class="sm muted" style="padding:14px 16px">مفيش طلاب في المجموعة دي</div>'}
        <div class="grid2" style="padding:12px 16px 16px;border-top:1px solid var(--line-2)"><button class="btn sm ghost" data-act="editQ" data-q="${q.id}">${ic('edit', 16)} تعديل السؤال</button><button class="btn sm" data-act="report" data-r="projQ" data-q="${q.id}">${ic('print', 16)} تقرير</button></div>` : ''}
      </section>`;
    }).join('') : `<div class="card"><div class="empty"><span class="ic" style="background:var(--green-soft);color:var(--green)">${ic('pen', 28)}</span><h3>مفيش أسئلة لسه</h3><span class="sm">أضف سؤال باسمه وميعاد تسليمه، وبعدين قيّم كل طالب من ${R.maxQ}.</span></div></div>`}
  </main>
  <button class="fab tap" data-act="editQ">${ic('plus', 20, 2.4)} سؤال جديد</button>`;
}
ACT.toggleQ = el => { App.ui.openQ = App.ui.openQ === el.dataset.q ? null : el.dataset.q; render(); };
ACT.editQ = el => {
  const st = App.st, q = el.dataset.q ? st.questions.find(x => x.id === el.dataset.q) : null, gs = g3Groups();
  const s = sheet(`<h2>${q ? 'تعديل السؤال' : 'سؤال جديد'}</h2>
    <label class="field">اسم السؤال<input class="input" id="q-n" value="${esc(q ? q.name : '')}" placeholder="مثلاً: السؤال الأول — رسم الدائرة" autofocus></label>
    <label class="field">ميعاد التسليم<input class="input" type="date" id="q-d" value="${q ? q.due || '' : E.addDays(E.today(), 7)}"><span class="hint">التسليم في اليوم ده أو قبله = الدرجة كاملة</span></label>
    ${gs.length > 1 ? `<div class="field">على مين؟<div style="display:flex;flex-direction:column;gap:6px">${gs.map(g => `<label class="row check-card" style="flex-direction:row;padding:10px 12px;cursor:pointer"><input type="checkbox" value="${g.id}" ${!q || !q.groupIds.length || q.groupIds.includes(g.id) ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--green)"><span class="grow">${esc(E.groupLabel(st, g))}</span></label>`).join('')}</div></div>` : ''}
    <div class="grid2">${q ? `<button class="btn danger-ghost" id="q-del">${ic('trash', 18)} حذف</button>` : '<button class="btn ghost" data-close>رجوع</button>'}<button class="btn" id="q-ok">حفظ</button></div>`);
  $('#q-ok', s.el).onclick = () => {
    const name = $('#q-n', s.el).value.trim(), due = $('#q-d', s.el).value;
    if (!name || !due) return toast('اكتب اسم السؤال وميعاد التسليم', { type: 'err', sound: 'err' });
    const ids = gs.length > 1 ? $$('input[type=checkbox]:checked', s.el).map(x => x.value) : [];
    if (gs.length > 1 && !ids.length) return toast('اختار مجموعة واحدة على الأقل', { type: 'err', sound: 'err' });
    const groupIds = ids.length === gs.length ? [] : ids;
    s.close();
    commit(st => {
      if (q) Object.assign(st.questions.find(x => x.id === q.id), { name, due, groupIds });
      else { const id = E.uid(st); st.questions.push({ id, name, due, groupIds, max: E.projRules(st).maxQ, created: E.today() }); App.ui.openQ = id; }
    }, q ? 'السؤال اتعدل' : 'السؤال اتضاف');
  };
  if (q) $('#q-del', s.el).onclick = async () => {
    s.close();
    const n = Object.keys(st.qgrades).filter(k => k.startsWith(q.id + '|')).length;
    if (!(await confirmBox({ title: 'حذف السؤال؟', text: n ? `${n} درجة متسجلة للسؤال ده هتتمسح.` : '', ok: 'حذف', danger: true, icon: 'trash' }))) return;
    commit(st => { st.questions = st.questions.filter(x => x.id !== q.id); Object.keys(st.qgrades).forEach(k => { if (k.startsWith(q.id + '|')) delete st.qgrades[k]; }); }, 'السؤال اتحذف', { type: 'warn' });
  };
};
ACT.gradeQ = el => {
  const st = App.st, q = st.questions.find(x => x.id === el.dataset.q), stu = studentById(el.dataset.s);
  const key = q.id + '|' + stu.id, rec = st.qgrades[key], R = E.projRules(st), max = +q.max || R.maxQ;
  const s = sheet(`<h2>${esc(stu.name)}</h2>
    <div class="sm muted" style="margin-top:-8px">${esc(q.name)} · الميعاد ${E.fmtDate(q.due)}</div>
    <label class="field">الدرجة من ${max}<input class="input num" type="number" inputmode="decimal" step="0.25" min="0" max="${max}" id="g-r" value="${rec ? rec.raw : ''}" placeholder="0" style="font-size:24px;font-weight:700" autofocus></label>
    <div class="chips">${[max, max - 1, max - 2, max - 3, max - 4, max / 2].filter((v, i, a) => v >= 0 && a.indexOf(v) === i).map(v => `<button class="fchip" data-v="${v}">${num(v)}</button>`).join('')}</div>
    <label class="field">تاريخ التسليم<input class="input" type="date" id="g-d" value="${rec ? rec.date : E.today()}"><span class="hint">بيتسجل النهارده تلقائي — غيّره بس لو الطالب سلّم في يوم تاني</span></label>
    <div id="g-prev"></div>
    <div class="grid2">${rec ? '<button class="btn danger-ghost" id="g-del">إلغاء التسليم</button>' : '<button class="btn ghost" data-close>رجوع</button>'}<button class="btn" id="g-ok">${ic('check', 18, 2.4)} حفظ الدرجة</button></div>`);
  const prev = () => {
    const raw = $('#g-r', s.el).value, d = $('#g-d', s.el).value || E.today();
    if (raw === '') { $('#g-prev', s.el).innerHTML = ''; return; }
    const x = E.questionResult(st, q, { raw: +raw, date: d });
    $('#g-prev', s.el).innerHTML = !x.late
      ? `<div class="banner green">${ic('check', 18)}<span>في الميعاد — الدرجة كاملة: <b>${num(x.final)} من ${x.max}</b></span></div>`
      : `<div class="banner amber">${ic('clock', 18)}<span>متأخر <b>${x.late} يوم</b> — يتخصم ${x.pct}٪ (${neg(num(x.minus))})<br>الدرجة النهائية: <b>${num(x.final)} من ${x.max}</b></span></div>`;
  };
  s.el.addEventListener('input', prev); s.el.addEventListener('change', prev);
  s.el.addEventListener('click', e => { const c = e.target.closest('.fchip[data-v]'); if (c) { $('#g-r', s.el).value = c.dataset.v; prev(); } });
  prev();
  $('#g-ok', s.el).onclick = () => {
    const raw = $('#g-r', s.el).value;
    if (raw === '' || +raw < 0 || +raw > max) return toast(`اكتب درجة من 0 لـ ${max}`, { type: 'err', sound: 'err' });
    const d = $('#g-d', s.el).value || E.today();
    s.close();
    const x = E.questionResult(st, q, { raw: +raw, date: d });
    commit(st => { st.qgrades[key] = { raw: +raw, date: d }; }, `${esc(stu.name)}: ${num(x.final)} من ${x.max}${x.late ? ' (متأخر ' + x.late + ' يوم)' : ''}`);
  };
  if (rec) $('#g-del', s.el).onclick = async () => {
    s.close();
    if (await confirmBox({ title: 'إلغاء تسليم السؤال؟', text: 'الدرجة هتتمسح والطالب هيرجع "لسه مسلمش".', ok: 'إلغاء التسليم', danger: true, icon: 'undo' }))
      commit(st => { delete st.qgrades[key]; }, 'التسليم اتلغى', { type: 'warn' });
  };
};

/* ---------- الغياب والخصم ---------- */
function absenceView() {
  const st = App.st, R = E.projRules(st);
  if (!g3Groups().length) return projHeader('مشروع التخرج', [['خصم الشهر', 0], ['عليهم خصم', 0], ['سماح', 0]]) + `<main class="pad">${noG3()}</main>`;
  const roster = E.projectRoster(st, [], '0000').filter(r => inGroup(r.groupId) && r.student.status !== 'withdrawn');
  const rows = roster.map(r => { const cy = E.projectCycles(st, r.student); return { ...r, cy, cur: cy[cy.length - 1], total: cy.reduce((a, c) => a + c.deduction, 0) }; });
  const curDed = rows.reduce((a, r) => a + (r.cur ? r.cur.deduction : 0), 0);
  const withDed = rows.filter(r => r.cur && r.cur.deduction > 0).length;
  const forgiven = rows.filter(r => r.cur && r.cur.forgiven).length;
  return projHeader('مشروع التخرج', [['خصم الشهر الحالي', curDed, '#FFC98A'], ['عليهم خصم', withDed, '#FFA3A3'], ['سماح', forgiven, '#8EF0BC']], 'projAtt') + `
  <main class="pad">
    ${groupChips()}
    <div class="banner blue">${ic('info', 18)}<span>كل ٤ حصص = شهر. الغياب الأول ${neg(R.steps[0])}، التاني ${neg(R.steps[1])}، التالت ${neg(R.steps[2])}، الرابع ${neg(R.steps[3])}. ${R.forgive ? 'لو غاب <b>مرة واحدة بس</b> في الشهر بيتسامح ومفيش خصم.' : ''}</span></div>
    <div class="legend" style="padding:0 4px"><span><span class="ad p">✓</span> حضر</span><span><span class="ad a">✗</span> غاب</span><span><span class="ad o">–</span> متسجلش</span><span><span class="ad f"></span> لسه</span></div>
    ${rows.length ? `<div class="card tight">${rows.map(r => `<a class="list-row tap" href="#/student/${r.student.id}" style="flex-wrap:wrap">
      <span class="avatar ${r.cur && r.cur.deduction ? 'red' : 'green'}">${esc(initial(r.student.name))}</span>
      <span class="grow stack" style="gap:4px;min-width:0"><span class="b ellipsis">${esc(r.student.name)}</span>
        <span class="row small muted" style="gap:8px;flex-wrap:wrap">${r.cur ? dotsHTML(r.cur.items) + `<span>شهر ${r.cur.n}</span>` : '<span>لسه مبدأش</span>'}</span></span>
      <span class="stack" style="align-items:flex-end;gap:4px">${r.cur ? dedChip(r.cur) : ''}${r.total ? `<span class="small" style="color:var(--red);font-weight:600">الإجمالي ${neg(r.total)}</span>` : ''}</span></a>`).join('')}</div>`
      : '<div class="card sm muted">مفيش طلاب في المجموعة دي</div>'}
    <button class="btn ghost" data-act="report" data-r="projAtt">${ic('print', 18)} تقرير الخصومات لكل الشهور</button>
  </main>`;
}

/* ---------- أقسام ملف الطالب ---------- */
window.projectStudentSections = s => {
  const st = App.st;
  const cy = E.projectCycles(st, s);
  const qs = E.studentQuestions(st, s);
  const total = cy.reduce((a, c) => a + c.deduction, 0);
  const R = E.projRules(st);
  const done = qs.filter(x => x.res);
  return `
    <section style="display:flex;flex-direction:column;gap:10px">
      <div class="sec-title"><h2>الغياب والخصم</h2>${total ? `<span class="chip red">إجمالي ${neg(total)}</span>` : cy.length ? '<span class="chip green">مفيش خصم</span>' : ''}</div>
      <div class="card tight">${cy.length ? cy.slice().reverse().map(c => `<div style="padding:12px 0;display:flex;flex-direction:column;gap:8px">
        <div class="row between"><span class="stack"><span class="b">الشهر ${c.n}${c.complete ? '' : ' · الحالي'}</span><span class="small muted">${E.fmtShort(c.from)}${c.items.length > 1 ? ' ← ' + E.fmtShort(c.items[c.items.length - 1].date) : ''}</span></span>${dedChip(c)}</div>
        <div class="row" style="gap:6px;flex-wrap:wrap">${c.items.map(x => `<span class="adate ${MARK[x.mark][0]}">${E.fmtShort(x.date)} ${MARK[x.mark][1]}</span>`).join('')}</div>
        ${c.abs ? `<span class="small muted">غاب ${c.abs} ${c.abs === 1 ? 'مرة' : 'مرات'}${c.forgiven ? ' — مرة واحدة فبيتسامح' : ' — الخصم: ' + c.items.filter(x => x.mark === 'a').map((x, i) => neg(R.steps[Math.min(i, 3)])).join(' ')}</span>` : ''}
      </div>`).join('') : '<div class="sm muted" style="padding:14px 0">لسه مفيش حصص</div>'}</div>
    </section>
    <section style="display:flex;flex-direction:column;gap:10px">
      <div class="sec-title"><h2>تقييم أسئلة المشروع</h2>${done.length ? `<span class="chip blue">${num(done.reduce((a, x) => a + x.res.final, 0))} من ${done.reduce((a, x) => a + x.res.max, 0)}</span>` : ''}</div>
      <div class="card tight">${qs.length ? qs.map(({ q, res: x }) => `<button class="list-row tap" data-act="gradeQ" data-q="${q.id}" data-s="${s.id}">
        <span class="avatar ${x ? (x.late ? 'amber' : 'green') : 'red'}" style="width:34px;height:34px">${ic(x ? (x.late ? 'clock' : 'check') : 'x', 16, 2.6)}</span>
        <span class="grow stack"><span class="sm b">${esc(q.name)}</span><span class="small muted">${x ? 'سلّم ' + E.fmtShort(x.date) + (x.late ? ` · متأخر ${x.late} يوم ${neg(x.pct + '٪')}` : ' · في الميعاد') : 'لسه مسلمش · الميعاد ' + E.fmtShort(q.due)}</span></span>
        ${x ? `<span class="num b">${num(x.final)}<span class="small muted"> / ${x.max}</span></span>` : '<span class="btn sm">قيّم</span>'}</button>`).join('') : '<div class="sm muted" style="padding:14px 0">مفيش أسئلة لسه — أضفها من تاب المشروع</div>'}</div>
    </section>`;
};

/* ---------- تذكيرات التحصيل ---------- */
window.dueAlertsHTML = () => {
  const al = E.dueAlerts(App.st, App.C);
  const block = (rows, kind) => {
    if (!rows.length) return '';
    const open = App.ui.openAlert === kind;
    const ended = kind === 'ended';
    return `<section class="card flush" style="border:2px solid ${ended ? '#F3C4C0' : '#F6D9AE'}">
      <button class="tap" data-act="toggleAlert" data-k="${kind}" aria-expanded="${open}" style="all:unset;box-sizing:border-box;width:100%;padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;background:${ended ? '#FFF8F7' : '#FFFAF2'}">
        <span class="alarm-ic ${ended ? '' : 'amber'}" style="width:42px;height:42px;border-radius:14px;align-self:center;animation-duration:2.4s">${ic(ended ? 'alert' : 'bell', 20)}</span>
        <span class="grow stack"><span class="b">${ended ? 'خلصوا الشهر ولسه مدفعوش' : 'وصلوا الحصة التالتة ولسه مدفعوش'} (${rows.length})</span><span class="small muted">إجمالي ${money(rows.reduce((a, r) => a + r.amount, 0))}</span></span>${ic(open ? 'chevUp' : 'chevDown', 18)}</button>
      ${open ? rows.map(r => { const s = r.L.student; return `<div class="row" style="padding:10px 16px;gap:12px;border-top:1px solid var(--line-2)">
        <a class="avatar ${ended ? 'red' : 'amber'}" href="#/student/${s.id}" style="text-decoration:none;width:38px;height:38px">${esc(initial(s.name))}</a>
        <a class="grow stack" href="#/student/${s.id}" style="text-decoration:none;color:inherit;min-width:0"><span class="b ellipsis">${esc(s.name)}</span><span class="small muted ellipsis">${E.GRADES[s.grade]} · ${r.subjects.map(id => E.SUBJ[id].short).join('، ')} · ${ended ? 'خلص ٤ حصص' : 'حصة ٣ من ٤'}</span></a>
        <span class="num b" style="color:${ended ? 'var(--red)' : 'var(--accent-text)'}">${money(r.amount)}</span>
        ${s.phone ? `<button class="icon-btn light" style="width:38px;height:38px;background:var(--green-soft);color:var(--green-text)" data-act="waStudent" data-s="${s.id}" aria-label="تذكير ولي الأمر">${ic('chat', 18)}</button>` : ''}</div>`; }).join('') : ''}
    </section>`;
  };
  return block(al.ended, 'ended') + block(al.third, 'third');
};
ACT.toggleAlert = el => { App.ui.openAlert = App.ui.openAlert === el.dataset.k ? null : el.dataset.k; render(); };

/* ---------- التقارير ---------- */
const mkR = m => `<span class="mk ${MARK[m][0]}">${MARK[m][1]}</span>`;
function attendanceRows(st, s) {
  return s.enrollments.map(e => {
    const ses = E.enrollmentSessions(st, e, E.today());
    const marks = ses.map(o => ({ o, v: (st.attendance[o.key] || {})[s.id] }));
    return { e, marks, p: marks.filter(x => x.v === 'p').length, a: marks.filter(x => x.v === 'a').length };
  });
}
Print.student = o => {
  const st = App.st, s = studentById(o.s), L = E.studentLedger(st, s);
  const att = attendanceRows(st, s);
  const P = att.reduce((a, r) => a + r.p, 0), A = att.reduce((a, r) => a + r.a, 0), N = att.reduce((a, r) => a + r.marks.length, 0);
  let html = `<div class="boxes"><div>إجمالي المستحق<b>${f0(L.total)} ج</b></div><div class="g">إجمالي المدفوع<b class="green">${f0(L.paid)} ج</b></div>
      <div class="${L.due ? 'r' : 'g'}">${L.due ? 'المتبقي عليه' : L.credit ? 'رصيد له' : 'الحساب'}<b class="${L.due ? 'red' : 'green'}">${L.due ? f0(L.due) + ' ج' : L.credit ? f0(L.credit) + ' ج' : 'خالص'}</b></div>
      <div class="a">الحضور<b>${P} / ${N}</b></div></div>
    ${L.late ? `<div class="note"><b class="red">عليه شهر وبدأ التاني:</b> متأخر ${f0(L.late)} ج${L.current ? ' + الشهر الحالي ' + f0(L.current) + ' ج' : ''}</div>` : ''}
    <h2>المواد والاشتراك</h2><table><thead><tr><th>المادة</th><th>المجموعة</th><th>بدأ من</th><th class="c">حضر</th><th class="c">غاب</th><th>الحالة</th></tr></thead><tbody>
      ${att.map(r => `<tr>${td(esc(E.SUBJ[r.e.subjectId].name))}${td(esc(E.groupLabel(st, E.groupById(st, E.currentGroupId(r.e)))))}${td(E.fmtShort(r.e.startDate), 'n')}${td(r.p, 'c green')}${td(r.a, 'c ' + (r.a ? 'red' : ''))}${td(r.e.endDate ? '<span class="tag x">انسحب ' + E.fmtShort(r.e.endDate) + '</span>' : '<span class="tag g">مشترك</span>')}</tr>`).join('')}</tbody></table>
    <h2>الشهور والمستحقات (كل ٤ حصص)</h2><table><thead><tr><th>بداية الشهر</th><th>المادة</th><th>الشهر</th><th>المبلغ</th><th>المدفوع</th><th>الباقي</th></tr></thead><tbody>
      ${L.charges.map(c => `<tr>${td(E.fmtShort(c.date), 'n')}${td(esc(E.SUBJ[c.subjectId].name))}${td(c.partial ? 'ناقص (' + c.held + ' حصص)' : c.cycle + (c.bundle ? ' · عرض' : ''))}${td(f0(c.amount), 'n')}${td(f0(c.paid), 'n green')}${td(f0(c.due), 'n ' + (c.due ? 'red' : ''))}</tr>`).join('') || '<tr><td colspan="6">مفيش</td></tr>'}</tbody>
      <tfoot><tr>${td('الإجمالي')}${td('')}${td('')}${td(f0(L.total), 'n')}${td(f0(L.charges.reduce((a, c) => a + c.paid, 0)), 'n')}${td(f0(L.charges.reduce((a, c) => a + c.due, 0)), 'n')}</tr></tfoot></table>
    <h2>الدفعات</h2><table><thead><tr><th>التاريخ</th><th>طريقة الدفع</th><th>ملاحظة</th><th>المبلغ</th></tr></thead><tbody>
      ${L.payments.map(p => `<tr>${td(E.fmtDate(p.date))}${td(E.payLabel(p))}${td(esc(p.note || ''))}${td(f0(p.amount) + ' ج', 'n')}</tr>`).join('') || '<tr><td colspan="4">مفيش دفعات</td></tr>'}</tbody>
      ${L.payments.length ? `<tfoot><tr>${td('الإجمالي')}${td('')}${td('')}${td(f0(L.paid) + ' ج', 'n')}</tr></tfoot>` : ''}</table>
    <h2>سجل الحضور والغياب</h2>
    ${att.map(r => `<h3>${esc(E.SUBJ[r.e.subjectId].name)} — حضر ${r.p} · غاب ${r.a}${r.marks.length - r.p - r.a ? ' · متسجلش ' + (r.marks.length - r.p - r.a) : ''}</h3>
      <table><tbody>${(() => { const rows = []; for (let i = 0; i < r.marks.length; i += 4) rows.push(r.marks.slice(i, i + 4)); return rows.map((ch, k) => `<tr>${td('<b>الشهر ' + (k + 1) + '</b>')}${[0, 1, 2, 3].map(j => ch[j] ? td(`${mkR(ch[j].v === 'p' ? 'p' : ch[j].v === 'a' ? 'a' : 'none')} <span class="n muted">${E.fmtShort(ch[j].o.date)}</span>`) : td('')).join('')}</tr>`).join(''); })() || '<tr><td>لسه مفيش حصص</td></tr>'}</tbody></table>`).join('')}`;
  if (s.grade === 3) {
    const cy = E.projectCycles(st, s), qs = E.studentQuestions(st, s), tot = cy.reduce((a, c) => a + c.deduction, 0);
    html += `<h2>مشروع التخرج — خصم الغياب</h2><table><thead><tr><th>الشهر</th><th>الحصص</th><th class="c">غاب</th><th>الخصم</th></tr></thead><tbody>
      ${cy.map(c => `<tr>${td('الشهر ' + c.n + (c.complete ? '' : ' (جاري)'))}${td(c.items.map(x => mkR(x.mark)).join(' '))}${td(c.abs, 'c')}${td(c.forgiven ? '<span class="tag b">سماح</span>' : c.deduction ? '<span class="red">' + neg(c.deduction) + '</span>' : '—')}</tr>`).join('') || '<tr><td colspan="4">مفيش</td></tr>'}</tbody>
      <tfoot><tr>${td('إجمالي الخصم')}${td('')}${td('')}${td(tot ? neg(tot) : '0', 'n')}</tr></tfoot></table>
      <h2>مشروع التخرج — تقييم الأسئلة</h2><table><thead><tr><th>السؤال</th><th>الميعاد</th><th>اتسلّم</th><th>التأخير</th><th class="c">الدرجة</th><th class="c">بعد الخصم</th></tr></thead><tbody>
      ${qs.map(({ q, res: x }) => `<tr>${td(esc(q.name))}${td(E.fmtShort(q.due), 'n')}${td(x ? E.fmtShort(x.date) : '<span class="tag r">لسه</span>', 'n')}${td(x ? (x.late ? `<span class="amber">${x.late} يوم ${neg(x.pct + '٪')}</span>` : '<span class="green">في الميعاد</span>') : '')}${td(x ? num(x.raw) + ' / ' + x.max : '', 'c n')}${td(x ? '<b>' + num(x.final) + '</b>' : '', 'c n')}</tr>`).join('') || '<tr><td colspan="6">مفيش أسئلة</td></tr>'}</tbody>
      ${qs.some(x => x.res) ? `<tfoot><tr>${td('الإجمالي')}${td('')}${td('')}${td('')}${td(num(qs.reduce((a, x) => a + (x.res ? x.res.raw : 0), 0)), 'c n')}${td(num(qs.reduce((a, x) => a + (x.res ? x.res.final : 0), 0)) + ' / ' + qs.reduce((a, x) => a + (x.res ? x.res.max : 0), 0), 'c n')}</tr></tfoot>` : ''}</table>`;
  }
  html += `<div class="sign"><span>توقيع ولي الأمر</span><span>توقيع المدرس</span></div>`;
  doPrint('تقرير الطالب: ' + s.name, E.GRADES[s.grade] + (s.phone ? ' · ولي الأمر ' + s.phone : '') + (s.status === 'withdrawn' ? ' · منسحب' : ''), html);
};
Print.late = () => {
  const st = App.st, C = App.C, al = E.dueAlerts(st, C);
  const all = [...C.ledgers.values()].filter(L => L.due > 0);
  const endedIds = new Set(al.ended.map(r => r.L.student.id)), thirdIds = new Set(al.third.map(r => r.L.student.id));
  const cat = L => L.late > 0 ? 0 : endedIds.has(L.student.id) ? 1 : thirdIds.has(L.student.id) ? 2 : 3;
  const names = ['عليهم شهر وبدأوا التاني', 'خلصوا الشهر ولسه مدفعوش', 'وصلوا الحصة التالتة', 'عليهم الشهر الحالي'];
  const tags = ['r', 'r', 'a', 'b'];
  const T = all.reduce((a, L) => a + L.due, 0);
  const groups = [0, 1, 2, 3].map(k => all.filter(L => cat(L) === k).sort((a, b) => b.due - a.due));
  doPrint('كشف المستحقات', all.length + ' طالب عليهم فلوس · ' + E.fmtDate(E.today()),
    `<div class="boxes"><div class="r">إجمالي المستحقات<b class="red">${f0(T)} ج</b></div>${groups.map((g, k) => g.length ? `<div class="${tags[k] === 'r' ? 'r' : tags[k] === 'a' ? 'a' : ''}">${names[k]}<b>${g.length} · ${f0(g.reduce((a, L) => a + L.due, 0))} ج</b></div>` : '').join('')}</div>
    ${groups.map((g, k) => g.length ? `<h2>${names[k]} (${g.length})</h2><table><thead><tr><th>#</th><th>الطالب</th><th>الصف</th><th>المواد</th><th>متأخر</th><th>الحالي</th><th>الإجمالي</th><th>موبايل ولي الأمر</th></tr></thead><tbody>
      ${g.map((L, i) => `<tr>${td(i + 1, 'c')}${td('<b>' + esc(L.student.name) + '</b>')}${td(E.GRADES[L.student.grade])}${td(esc([...new Set(L.charges.filter(c => c.due > 0).map(c => E.SUBJ[c.subjectId].short))].join('، ')))}${td(f0(L.late), 'n ' + (L.late ? 'red' : 'muted'))}${td(f0(L.current), 'n')}${td('<b>' + f0(L.due) + '</b>', 'n red')}${td(esc(L.student.phone || '—'), 'n')}</tr>`).join('')}</tbody>
      <tfoot><tr>${td('')}${td('الإجمالي')}${td('')}${td('')}${td(f0(g.reduce((a, L) => a + L.late, 0)), 'n')}${td(f0(g.reduce((a, L) => a + L.current, 0)), 'n')}${td(f0(g.reduce((a, L) => a + L.due, 0)), 'n')}${td('')}</tr></tfoot></table>` : '').join('') || '<div class="note">مفيش طلاب عليهم فلوس 🎉</div>'}`);
};
Print.projAtt = o => {
  const st = App.st, R = E.projRules(st);
  const gs = o.g ? [E.groupById(st, o.g)] : g3Groups();
  doPrint('مشروع التخرج — الغياب والخصومات', (o.g ? E.groupLabel(st, gs[0]) : 'كل المجموعات') + ' · كل الشهور',
    `<div class="note">كل ٤ حصص = شهر · الغياب الأول ${neg(R.steps[0])}، التاني ${neg(R.steps[1])}، التالت ${neg(R.steps[2])}، الرابع ${neg(R.steps[3])}${R.forgive ? ' · غياب مرة واحدة في الشهر = سماح' : ''}</div>` +
    gs.map(g => {
      const rows = E.projectRoster(st, [g.id], '0000').map(r => ({ s: r.student, cy: E.projectCycles(st, r.student) }));
      const M = Math.max(1, ...rows.map(r => r.cy.length));
      const tot = rows.reduce((a, r) => a + r.cy.reduce((b, c) => b + c.deduction, 0), 0);
      return `<h2>${esc(E.groupLabel(st, g))} — ${rows.length} طالب</h2><table><thead><tr><th>#</th><th>الطالب</th>${Array.from({ length: M }, (_, i) => `<th class="c">الشهر ${i + 1}</th>`).join('')}<th class="c">إجمالي الغياب</th><th class="c">إجمالي الخصم</th></tr></thead><tbody>
        ${rows.map((r, i) => { const t = r.cy.reduce((a, c) => a + c.deduction, 0); return `<tr>${td(i + 1, 'c')}${td('<b>' + esc(r.s.name) + '</b>')}${Array.from({ length: M }, (_, k) => { const c = r.cy[k]; return td(!c ? '' : `<span class="muted">غ ${c.abs}</span> · ${c.forgiven ? '<span class="tag b">سماح</span>' : c.deduction ? '<span class="red">' + neg(c.deduction) + '</span>' : '0'}`, 'c'); }).join('')}${td(r.cy.reduce((a, c) => a + c.abs, 0), 'c n')}${td(t ? '<b class="red">' + neg(t) + '</b>' : '0', 'c n')}</tr>`; }).join('') || '<tr><td colspan="9">مفيش طلاب</td></tr>'}</tbody>
        <tfoot><tr>${td('')}${td('الإجمالي')}${Array.from({ length: M }, (_, k) => td(rows.reduce((a, r) => a + (r.cy[k] ? r.cy[k].deduction : 0), 0) ? neg(rows.reduce((a, r) => a + (r.cy[k] ? r.cy[k].deduction : 0), 0)) : '0', 'c n')).join('')}${td(rows.reduce((a, r) => a + r.cy.reduce((b, c) => b + c.abs, 0), 0), 'c n')}${td(tot ? neg(tot) : '0', 'c n')}</tr></tfoot></table>`;
    }).join(''));
};
Print.projQ = o => {
  const st = App.st;
  const gs = o.g ? [E.groupById(st, o.g)] : g3Groups();
  const qsAll = (st.questions || []).filter(q => !o.q || q.id === o.q).sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  doPrint('مشروع التخرج — تقييم الأسئلة', (o.g ? E.groupLabel(st, gs[0]) : 'كل المجموعات') + (o.q ? ' · ' + (qsAll[0] || {}).name : ' · كل الأسئلة'),
    `<div class="note">الدرجة بعد خصم التأخير · في الميعاد كاملة · متأخر لحد ${E.projRules(st).lateDays} أيام ${neg(E.projRules(st).lateWeek + '٪')} · بعد كده ${neg(E.projRules(st).lateAfter + '٪')} · ✗ = لسه مسلمش</div>` +
    gs.map(g => {
      const qs = qsAll.filter(q => !q.groupIds.length || q.groupIds.includes(g.id));
      const roster = E.projectRoster(st, [g.id], '0000');
      if (!qs.length) return `<h2>${esc(E.groupLabel(st, g))}</h2><div class="note">مفيش أسئلة للمجموعة دي</div>`;
      const cell = (q, s) => { const x = E.questionResult(st, q, st.qgrades[q.id + '|' + s.id]); return x ? `<b>${num(x.final)}</b>${x.late ? `<br><span class="amber" style="font-size:7.5pt">متأخر ${x.late}ي</span>` : ''}` : '<span class="red">✗</span>'; };
      return `<h2>${esc(E.groupLabel(st, g))} — ${roster.length} طالب</h2><table><thead><tr><th>#</th><th>الطالب</th>${qs.map(q => `<th class="c" style="white-space:normal">${esc(q.name)}<br><span style="font-weight:400;font-size:7.5pt">${E.fmtShort(q.due)}</span></th>`).join('')}<th class="c">المجموع</th></tr></thead><tbody>
        ${roster.map((r, i) => { const xs = qs.map(q => E.questionResult(st, q, st.qgrades[q.id + '|' + r.student.id])).filter(Boolean); return `<tr>${td(i + 1, 'c')}${td('<b>' + esc(r.student.name) + '</b>')}${qs.map(q => td(cell(q, r.student), 'c n')).join('')}${td(`<b>${num(xs.reduce((a, x) => a + x.final, 0))}</b> / ${qs.length * E.projRules(st).maxQ}`, 'c n')}</tr>`; }).join('') || '<tr><td colspan="9">مفيش طلاب</td></tr>'}</tbody></table>`;
    }).join(''));
};
