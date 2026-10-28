/* حصصي — الطلاب: القائمة، الملف، الإضافة والتعديل، الدفع، السحب */
'use strict';

function statusChip(L) {
  const s = L.student;
  if (s.status === 'withdrawn' && L.due <= 0) return '<span class="chip gray">منسحب</span>';
  if (L.late > 0) return `<span class="chip red">متأخر ${money(L.due)}</span>`;
  if (L.current > 0) return `<span class="chip amber">عليه ${money(L.due)}</span>`;
  if (L.credit > 0) return `<span class="chip blue">ليه ${money(L.credit)}</span>`;
  return '<span class="chip green">خالص</span>';
}
const activeEnrollments = (s, d) => s.enrollments.filter(e => E.isEnrollmentActive(e, d || E.today()) || (e.startDate > (d || E.today()) && !e.endDate));

/* ---------- قائمة الطلاب ---------- */
function studentsListHTML() {
  const st = App.st, C = App.C;
  const q = (App.ui.q || '').trim();
  const f = App.ui.stuFilter || 'all';
  let list = st.students.map(s => C.ledgers.get(s.id)).filter(Boolean);
  if (q) list = list.filter(L => L.student.name.includes(q) || (L.student.phone || '').includes(q));
  if (f === 'g1' || f === 'g2' || f === 'g3') list = list.filter(L => L.student.grade === +f[1] && L.student.status !== 'withdrawn');
  else if (f === 'owe') list = list.filter(L => L.due > 0);
  else if (f === 'late') list = list.filter(L => L.late > 0);
  else if (f === 'out') list = list.filter(L => L.student.status === 'withdrawn');
  else list = list.filter(L => L.student.status !== 'withdrawn');
  list.sort((a, b) => f === 'owe' || f === 'late' ? b.due - a.due : a.student.name.localeCompare(b.student.name, 'ar'));
  if (!list.length) return `<div class="card"><div class="empty"><span class="ic">${ic('users', 28)}</span><h3>${st.students.length ? 'مفيش نتايج' : 'مفيش طلاب لسه'}</h3>${st.students.length ? '' : `<a class="btn accent" href="#/student-new">${ic('plus', 18)} أضف أول طالب</a>`}</div></div>`;
  return `<div class="small muted" style="padding:0 4px">${list.length} طالب</div><div class="card tight">${list.map(L => {
    const s = L.student;
    const subs = activeEnrollments(s).map(e => E.SUBJ[e.subjectId].short).join(' · ') || 'مفيش مواد حالية';
    return `<a class="list-row tap" href="#/student/${s.id}">
      <span class="avatar ${L.late > 0 ? 'red' : L.due > 0 ? 'amber' : s.status === 'withdrawn' ? '' : 'green'}">${esc(initial(s.name))}</span>
      <span class="grow stack" style="gap:3px"><span class="b ellipsis">${esc(s.name)}</span><span class="small muted ellipsis">${E.GRADES[s.grade]} · ${esc(subs)}</span></span>
      ${statusChip(L)}</a>`;
  }).join('')}</div>`;
}
Views.students = () => {
  const f = App.ui.stuFilter || 'all';
  const C = App.C;
  const ledgers = [...C.ledgers.values()];
  const chips = [['all', 'الكل'], ['g1', 'الأول'], ['g2', 'الثاني'], ['g3', 'الثالث'], ['owe', 'عليهم فلوس (' + ledgers.filter(L => L.due > 0).length + ')'], ['late', 'متأخرين (' + ledgers.filter(L => L.late > 0).length + ')'], ['out', 'منسحبين']];
  return `
  <header class="hero-head flat">
    <div class="topbar"><div class="stack"><h1 style="font-size:22px">الطلاب</h1><span class="sub">${App.st.students.filter(s => s.status !== 'withdrawn').length} طالب مشترك</span></div>
      <div class="head-actions">${eyeBtn()}</div></div>
    <label class="row" style="background:rgba(255,255,255,.1);border-radius:14px;padding:0 12px;gap:8px">${ic('search', 20)}
      <input id="stu-q" data-input="stuSearch" value="${esc(App.ui.q || '')}" placeholder="دوّر بالاسم أو الموبايل" style="flex:1;min-height:48px;border:0;background:transparent;color:#fff;font-size:16px;outline:none" aria-label="بحث"></label>
  </header>
  <main class="pad fab-space">
    <div class="chips">${chips.map(([k, l]) => `<button class="fchip ${f === k ? 'on' : ''}" data-act="stuFilter" data-f="${k}">${l}</button>`).join('')}</div>
    <div id="stu-list" style="display:flex;flex-direction:column;gap:8px">${studentsListHTML()}</div>
  </main>
  <a class="fab tap" href="#/student-new">${ic('plus', 20, 2.4)} طالب جديد</a>`;
};
ACT.stuSearch = el => { App.ui.q = el.value; $('#stu-list').innerHTML = studentsListHTML(); };
ACT.stuFilter = el => { App.ui.stuFilter = el.dataset.f; render(); };

/* ---------- ملف الطالب ---------- */
Views.student = id => {
  const st = App.st, s = studentById(id);
  if (!s) return `<header class="plain-head">${backBtn('#/students')}<h1>الطالب</h1></header><div class="pad"><div class="banner amber">${ic('info', 18)}<span>الطالب ده مش موجود.</span></div></div>`;
  const L = App.C.ledgers.get(id);
  const t = E.today();
  const act = activeEnrollments(s, t);
  const mt = E.monthlyTotal(st, s.grade, act.map(e => e.subjectId));
  const unpaid = L.charges.filter(c => c.due > 0);
  const term = E.termOf(st, t);
  const termPaid = term ? L.payments.filter(p => p.date >= term.start && p.date <= term.end && p.kind !== 'discount').reduce((a, p) => a + +p.amount, 0) : L.paid;
  let pres = 0, abs = 0, total = 0;
  s.enrollments.forEach(e => E.enrollmentSessions(st, e, t).forEach(o => { total++; const v = (st.attendance[o.key] || {})[s.id]; if (v === 'p') pres++; else if (v === 'a') abs++; }));
  const ens = s.enrollments.slice().sort((a, b) => (a.endDate ? 1 : 0) - (b.endDate ? 1 : 0));
  return `
  <header class="hero-head">
    <div class="topbar">
      <a class="icon-btn" href="javascript:history.back()" data-act="back" aria-label="رجوع">${ic('back')}</a>
      <div class="head-actions">${eyeBtn()}<a class="icon-btn" href="#/student-edit/${s.id}" aria-label="تعديل بيانات الطالب">${ic('edit', 20)}</a></div>
    </div>
    <div class="row" style="gap:14px"><span class="avatar lg">${esc(initial(s.name))}</span>
      <div class="stack" style="gap:6px;min-width:0"><h1 style="font-size:22px">${esc(s.name)}</h1>
        <div class="row" style="gap:6px;flex-wrap:wrap">${gradeChip(s.grade)}${mt.offer ? `<span class="chip glass">${mt.offer} · ${money(mt.total)}</span>` : act.length ? `<span class="chip glass">${act.length} ${act.length === 1 ? 'مادة' : 'مواد'} · ${money(mt.total)} شهريًا</span>` : ''}${s.status === 'withdrawn' ? '<span class="chip red">منسحب</span>' : ''}</div></div></div>
  </header>
  <main class="wrap lift">
    <section class="card big" style="display:flex;flex-direction:column;gap:14px">
      <div class="row between" style="align-items:flex-start">
        <div class="stack"><span class="sm b muted">${L.due > 0 ? 'إجمالي المطلوب منه' : L.credit > 0 ? 'ليه رصيد مقدم' : 'الحساب'}</span>
          <span class="money-big" style="color:${L.due > 0 ? 'var(--red)' : 'var(--green)'}">${L.due > 0 ? money(L.due) : L.credit > 0 ? money(L.credit) : 'خالص'}</span></div>
        ${L.late > 0 ? '<span class="chip red">عليه شهر وبدأ التاني</span>' : L.current > 0 ? '<span class="chip amber">عليه الشهر الحالي</span>' : '<span class="chip green">مفيش عليه</span>'}
      </div>
      ${unpaid.length ? `<div style="display:flex;flex-direction:column;gap:8px">${unpaid.map(c => `
        <div class="row between sm" style="padding:10px 12px;border-radius:12px;background:${c.latest ? '#F6F8FA' : '#FDF3F2'}">
          <span>${esc(E.SUBJ[c.subjectId].name)} · ${c.partial ? 'آخر دورة (' + c.held + ' حصص)' : 'دورة ' + c.cycle} <span class="muted small">من ${E.fmtShort(c.date)}</span></span><span class="b num">${money(c.due)}</span></div>`).join('')}</div>` : ''}
      <div class="grid2">
        <button class="btn" data-act="pay" data-s="${s.id}">${ic('plus', 18, 2.4)} تسجيل دفعة</button>
        ${s.phone ? `<button class="btn green" data-act="waStudent" data-s="${s.id}">${ic('chat', 18)} ولي الأمر</button>` : `<a class="btn ghost" href="#/student-edit/${s.id}">${ic('phone', 18)} أضف موبايل</a>`}
      </div>
      <button class="btn soft sm" data-act="printStudent" data-s="${s.id}">${ic('print', 16)} تقرير الطالب كامل — طباعة أو صورة</button>
    </section>

    <section style="display:flex;flex-direction:column;gap:10px">
      <div class="sec-title"><h2>المواد والدورات</h2>${act.length ? `<button class="link" data-act="withdraw" data-s="${s.id}">سحب من مادة</button>` : ''}</div>
      <div class="card tight">${ens.length ? ens.map(e => {
        const ended = !!e.endDate && e.endDate < t;
        const pos = E.cyclePosition(st, e, t);
        const cs = L.charges.filter(c => c.enrollmentId === e.id);
        const lastC = cs[cs.length - 1];
        const gid = E.currentGroupId(e);
        const notYet = e.startDate > t;
        let chip = '';
        if (ended || e.endDate) chip = `<span class="chip gray">منسحب ${E.fmtShort(e.endDate)}</span>`;
        else if (notYet) chip = `<span class="chip blue">يبدأ ${E.fmtShort(e.startDate)}</span>`;
        else if (lastC && lastC.due > 0) chip = `<span class="chip ${cs.some(c => !c.latest && c.due > 0) ? 'red' : 'amber'}">${pos.pos === 1 && pos.cycle > 1 ? 'دورة جديدة · ' : ''}عليه ${money(cs.reduce((a, c) => a + c.due, 0))}</span>`;
        else chip = '<span class="chip green">مدفوعة</span>';
        return `<div style="padding:12px 0;display:flex;flex-direction:column;gap:8px;${e.endDate ? 'opacity:.7' : ''}">
          <div class="row between" style="align-items:flex-start"><div class="stack"><span class="b">${esc(E.SUBJ[e.subjectId].name)}</span>
            <span class="small muted">${esc(E.groupLabel(st, E.groupById(st, gid)))}${lastC && lastC.bundle ? ' · نصيبها من العرض ' + money(lastC.price) : lastC ? ' · ' + money(lastC.price) : ''}</span></div>${chip}</div>
          ${!e.endDate && !notYet ? `<div class="row" style="gap:10px"><div class="cycle-dots">${[1, 2, 3, 4].map(i => `<span class="${i <= pos.pos ? 'on' : ''}"></span>`).join('')}</div><span class="small muted">الدورة ${pos.cycle} · حصة ${pos.pos} من 4</span></div>` : ''}
        </div>`;
      }).join('') : '<div class="sm muted" style="padding:14px 0">مفيش مواد</div>'}</div>
    </section>

    ${s.grade === 3 ? projectStudentSections(s) : ''}
    <section class="grid2">
      <div class="card stack" style="gap:4px"><span class="small muted">الحضور (من ${total} حصة)</span><span class="num b" style="font-size:22px">${pres + abs ? Math.round(pres / (pres + abs) * 100) + '٪' : '—'}</span><span class="small" style="color:${abs ? 'var(--red)' : 'var(--green)'};font-weight:600">${pres + abs ? 'حضر ' + pres + ' · غاب ' + abs : total ? 'لسه مفيش غياب متسجل' : 'لسه مفيش حصص'}</span></div>
      <div class="card stack" style="gap:4px"><span class="small muted">دفع ${term ? esc(term.name) : 'الكل'}</span><span class="num b" style="font-size:22px">${money(termPaid)}</span><span class="small muted">${L.payments.length ? 'آخر دفعة ' + E.fmtShort(L.payments[L.payments.length - 1].date) : 'مفيش دفعات'}</span></div>
    </section>

    <section style="display:flex;flex-direction:column;gap:10px">
      <div class="sec-title"><h2>سجل الدفع والدورات</h2><button class="link" data-act="printStudent" data-s="${s.id}">${ic('print', 16)} تقرير الطالب</button></div>
      <div class="card tight">${[...L.payments.map(p => ({ k: 'p', d: p.date, p })), ...L.charges.map(c => ({ k: 'c', d: c.date, c }))].sort((a, b) => b.d.localeCompare(a.d) || (a.k === 'p' ? -1 : 1)).map(x => x.k === 'p' ? `
        <div class="list-row"><span class="avatar green" style="width:34px;height:34px">${ic('check', 16, 2.6)}</span><span class="grow stack"><span class="sm b">${x.p.kind === 'discount' ? 'خصم / إعفاء' : 'دفعة · ' + E.payLabel(x.p)}${x.p.note ? ' · ' + esc(x.p.note) : ''}</span><span class="small muted">${E.fmtDate(x.p.date)}</span></span>
          <span class="num b" style="color:var(--green)">+${money(x.p.amount)}</span><button class="icon-btn light" style="width:36px;height:36px" data-act="delPay" data-p="${x.p.id}" aria-label="حذف الدفعة">${ic('x', 16)}</button></div>` : `
        <div class="list-row"><span class="avatar ${x.c.due > 0 ? (x.c.latest ? 'amber' : 'red') : ''}" style="width:34px;height:34px">${ic('cal', 16)}</span><span class="grow stack"><span class="sm b">${esc(E.SUBJ[x.c.subjectId].short)} · ${x.c.partial ? 'دورة ناقصة (' + x.c.held + ' حصص)' : 'دورة ' + x.c.cycle}${x.c.bundle ? ' · عرض' : ''}</span><span class="small muted">${E.fmtDate(x.c.date)}${x.c.due > 0 ? ' · باقي ' + money(x.c.due) : ' · مدفوعة'}</span></span>
          <span class="num b">${money(x.c.amount)}</span></div>`).join('') || '<div class="sm muted" style="padding:14px 0">لسه مفيش حاجة</div>'}</div>
    </section>

    ${s.phone || s.notes ? `<section class="card stack" style="gap:6px">${s.phone ? `<div class="row between"><span class="sm muted">موبايل ولي الأمر</span><a class="b num" href="tel:${esc(s.phone)}" style="text-decoration:none">${esc(s.phone)}</a></div>` : ''}${s.notes ? `<div class="sm"><span class="muted">ملاحظات: </span>${esc(s.notes)}</div>` : ''}</section>` : ''}

    <section class="card" style="display:flex;flex-direction:column;gap:10px;margin-bottom:8px">
      <div class="sm muted" style="line-height:1.7">السحب من مادة بيلغي العرض للمواد الباقية من دورتها الجاية (كل مادة ترجع ${money(st.settings.prices.single)}). المادة المسحوبة بتتحسب بعدد الحصص اللي اتعملت بس.</div>
      <div class="grid2">
        ${act.length ? `<button class="btn ghost" data-act="withdraw" data-s="${s.id}">سحب من مادة</button><button class="btn danger-ghost" data-act="withdraw" data-s="${s.id}" data-all="1">إلغاء الاشتراك</button>` : `<a class="btn ghost" href="#/student-edit/${s.id}">إعادة اشتراك</a><button class="btn danger-ghost" data-act="delStudent" data-s="${s.id}">${ic('trash', 18)} حذف نهائي</button>`}
      </div>
    </section>
  </main>`;
};

/* ---------- الدفع ---------- */
ACT.pay = el => {
  const s = studentById(el.dataset.s), L = App.C.ledgers.get(s.id);
  const sh = sheet(`<h2>تسجيل دفعة · ${esc(s.name)}</h2>
    ${L.due > 0 ? `<div class="banner amber">${ic('wallet', 18)}<span>المطلوب منه: <b>${shown() ? fmt(L.due) + ' ج' : 'مخفي'}</b>${L.late > 0 ? ` (منهم ${shown() ? fmt(L.late) : '••'} متأخر)` : ''}. الدفعة بتتخصم من الأقدم للأحدث.</span></div>` : `<div class="banner green">${ic('check', 18)}<span>مفيش عليه حاجة دلوقتي — الدفعة هتتسجل رصيد مقدم.</span></div>`}
    <div class="seg" id="pk"><button class="on" data-k="cash">دفعة فلوس</button><button data-k="discount">خصم / إعفاء</button></div>
    <div class="field" id="pm-w">طريقة الدفع<div class="grid3" id="pm">${Object.entries(E.METHODS).map(([k, l]) => `<button type="button" class="btn ${k === (localStorage.getItem('hesasy-method') || 'cash') ? '' : 'ghost'}" data-m="${k}" aria-pressed="${k === (localStorage.getItem('hesasy-method') || 'cash')}" style="min-height:52px;flex-direction:column;gap:2px;font-size:13px;padding:0 4px">${ic(k === 'cash' ? 'wallet' : k === 'instapay' ? 'bolt' : 'phone', 18)}${l}</button>`).join('')}</div></div>
    <label class="field">المبلغ<input class="input num" type="number" inputmode="numeric" id="pa" value="${shown() && L.due > 0 ? L.due : ''}" placeholder="0" style="font-size:22px;font-weight:700" autofocus></label>
    ${L.due > 0 && shown() ? `<div class="chips">${[...new Set([L.due, L.late, L.current, 250, 175].filter(v => v > 0 && v <= L.due))].map(v => `<button class="fchip" data-v="${v}">${fmt(v)}</button>`).join('')}</div>` : ''}
    <div class="grid2"><label class="field">التاريخ<input class="input" type="date" id="pd" value="${E.today()}"></label><label class="field">ملاحظة<input class="input" id="pn" placeholder="اختياري"></label></div>
    <button class="btn lg" id="pok">${ic('check', 20, 2.4)} حفظ الدفعة</button>`);
  let kind = 'cash', method = localStorage.getItem('hesasy-method') || 'cash';
  $('#pk', sh.el).onclick = e => { const b = e.target.closest('button'); if (!b) return; kind = b.dataset.k; $$('#pk button', sh.el).forEach(x => x.classList.toggle('on', x === b)); $('#pm-w', sh.el).hidden = kind === 'discount'; };
  $('#pm', sh.el).onclick = e => { const b = e.target.closest('button'); if (!b) return; method = b.dataset.m; Sound.play('tap'); $$('#pm button', sh.el).forEach(x => { const on = x === b; x.classList.toggle('ghost', !on); x.setAttribute('aria-pressed', on); }); };
  sh.el.addEventListener('click', e => { const c = e.target.closest('.fchip[data-v]'); if (c) $('#pa', sh.el).value = c.dataset.v; });
  $('#pok', sh.el).onclick = () => {
    const amount = Math.round(+$('#pa', sh.el).value);
    if (!(amount > 0)) return toast('اكتب المبلغ', { type: 'err', sound: 'err' });
    const date = $('#pd', sh.el).value || E.today(), note = $('#pn', sh.el).value.trim();
    sh.close();
    if (kind !== 'discount') localStorage.setItem('hesasy-method', method);
    const p = { id: E.uid(App.st), studentId: s.id, amount, date, kind, note }; if (kind !== 'discount') p.method = method;
    commit(st => st.payments.push(p), (kind === 'discount' ? 'اتسجل خصم ' : 'اتسجلت دفعة ') + fmt(amount) + ' ج' + (kind !== 'discount' ? ' · ' + E.METHODS[method] : ''));
    const L2 = App.C.ledgers.get(s.id);
    if (s.phone && kind === 'cash') setTimeout(() => toast('ابعت إيصال لولي الأمر؟', { type: 'warn', icon: 'chat', action: 'واتساب', ms: 6000, onAction: () => window.open(waLink(s.phone, `إيصال استلام 🧾\nالطالب: ${s.name}\nالمبلغ: ${fmt(amount)} جنيه\nطريقة الدفع: ${E.METHODS[method]}\nالتاريخ: ${E.fmtDate(date)}\n${L2.due > 0 ? 'المتبقي: ' + fmt(L2.due) + ' جنيه' : 'الحساب خالص ✅'}\n${App.st.settings.appName}`), '_blank') }), 400);
  };
};
ACT.delPay = async el => {
  if (!(await askPin('حذف دفعة', 'لازم الباسورد علشان تحذف دفعة'))) return;
  if (!(await confirmBox({ title: 'حذف الدفعة؟', text: 'الحساب هيتعاد حسابه من غيرها.', ok: 'حذف', danger: true, icon: 'trash' }))) return;
  commit(st => { st.payments = st.payments.filter(p => p.id !== el.dataset.p); }, 'الدفعة اتحذفت', { type: 'warn' });
};
ACT.waStudent = el => {
  const s = studentById(el.dataset.s), L = App.C.ledgers.get(s.id);
  const lines = L.charges.filter(c => c.due > 0).map(c => `• ${E.SUBJ[c.subjectId].name} (من ${E.fmtShort(c.date)}): ${fmt(c.due)} جنيه`);
  const msg = L.due > 0 ? `السلام عليكم ورحمة الله\nبنفكر حضرتك بمصاريف حصص الطالب ${s.name}:\n${lines.join('\n')}\nالإجمالي: ${fmt(L.due)} جنيه\nوشكرًا لحضرتك 🌷` : `السلام عليكم ورحمة الله\nحساب الطالب ${s.name} خالص ✅\nشكرًا لحضرتك 🌷`;
  window.open(waLink(s.phone, msg), '_blank');
};

/* ---------- السحب ---------- */
ACT.withdraw = el => {
  const st = App.st, s = studentById(el.dataset.s), t = E.today();
  const act = activeEnrollments(s, t);
  const all = !!el.dataset.all;
  const sh = sheet(`<h2>${all ? 'إلغاء اشتراك الطالب' : 'سحب من مادة'}</h2>
    ${all ? `<div class="banner red">${ic('info', 18)}<span>هيتسحب من كل المواد. كل مادة هتتحسب بعدد الحصص اللي اتعملت في دورتها الحالية.</span></div>` :
      `<div class="field">اختار المادة<div style="display:flex;flex-direction:column;gap:8px">${act.map((e, i) => `<label class="check-card row" style="flex-direction:row;gap:12px;cursor:pointer"><input type="radio" name="wd" value="${e.id}" ${i === 0 ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--accent)"><span class="b grow">${esc(E.SUBJ[e.subjectId].name)}</span></label>`).join('')}</div></div>`}
    <label class="field">تاريخ السحب<input class="input" type="date" id="wd-d" value="${t}"><span class="hint">الحصص اللي في التاريخ ده أو قبله بتتحسب</span></label>
    <div id="wd-prev"></div>
    <div class="grid2"><button class="btn ghost" data-close>رجوع</button><button class="btn danger" id="wd-ok">تأكيد السحب</button></div>`);
  const selected = () => all ? act.map(e => e.id) : [($('input[name=wd]:checked', sh.el) || {}).value];
  const preview = () => {
    const d = $('#wd-d', sh.el).value || t;
    const ids = selected();
    const clone = JSON.parse(JSON.stringify(s));
    clone.enrollments.forEach(e => { if (ids.includes(e.id)) e.endDate = d < e.startDate ? e.startDate : d; });
    const before = E.studentLedger(st, s, d > t ? d : t), after = E.studentLedger(st, clone, d > t ? d : t);
    const rows = ids.map(id => {
      const e = clone.enrollments.find(x => x.id === id);
      const cs = after.charges.filter(c => c.enrollmentId === id);
      const last = cs[cs.length - 1];
      const held = E.enrollmentSessions(st, e, d).length;
      const inCycle = held ? ((held - 1) % 4) + 1 : 0;
      return `<div class="row between sm" style="padding:8px 0"><span>${esc(E.SUBJ[e.subjectId].name)}: اتعمل ${inCycle} من 4 في الدورة الحالية</span><b class="num">${last && last.partial ? money(last.amount) : inCycle === 4 ? 'دورة كاملة' : money(0)}</b></div>`;
    }).join('');
    const breaks = !all && E.monthlyTotal(st, s.grade, act.map(e => e.subjectId)).offer;
    $('#wd-prev', sh.el).innerHTML = `<div class="card" style="background:var(--ground);box-shadow:none">${rows}
      ${breaks ? `<div class="banner amber" style="margin-top:6px">${ic('alert', 18)}<span>الطالب كان على <b>${breaks}</b> — العرض هيتلغي، والمواد الباقية هتتحسب ${money(st.settings.prices.single)} لكل مادة من دورتها الجاية.</span></div>` : ''}
      <div class="row between" style="margin-top:8px"><span class="sm muted">المطلوب منه بعد السحب</span><b class="num">${money(Math.max(0, after.balance))}</b></div></div>`;
  };
  sh.el.addEventListener('change', preview);
  preview();
  $('#wd-ok', sh.el).onclick = async () => {
    const d = $('#wd-d', sh.el).value || t, ids = selected();
    if (!ids[0]) return;
    sh.close();
    commit(st => {
      const ss = st.students.find(x => x.id === s.id);
      ss.enrollments.forEach(e => { if (ids.includes(e.id)) e.endDate = d < e.startDate ? e.startDate : d; });
      if (ss.enrollments.every(e => e.endDate)) ss.status = 'withdrawn';
    }, all ? 'اتلغى اشتراك الطالب' : 'اتسحب من المادة', { type: 'warn' });
  };
};
ACT.delStudent = async el => {
  const s = studentById(el.dataset.s);
  if (!(await askAdmin('حذف ' + s.name + ' نهائيًا', { text: 'كل بيانات الطالب ودفعاته وغيابه هتتمسح، ومش هتقدر ترجعها إلا من نسخة احتياطية.', danger: true, ok: 'حذف نهائي' }))) return;
  go('students');
  commit(st => {
    st.students = st.students.filter(x => x.id !== s.id);
    st.payments = st.payments.filter(p => p.studentId !== s.id);
    Object.values(st.attendance).forEach(a => delete a[s.id]);
    Object.keys(st.projectPays).forEach(k => { if (k.endsWith('|' + s.id)) delete st.projectPays[k]; });
  }, 'الطالب اتحذف', { type: 'warn' });
};

/* ---------- إضافة / تعديل طالب ---------- */
function studentForm(s) {
  const st = App.st, t = E.today();
  const edit = !!s;
  const grade = s ? s.grade : (App.ui.lastGrade || 1);
  const hasEnr = s && s.enrollments.length > 0;
  const activeBy = sid => s ? s.enrollments.find(e => e.subjectId === sid && !e.endDate) : null;
  return `
  <header class="plain-head">${backBtn()}<h1>${edit ? 'تعديل بيانات الطالب' : 'طالب جديد'}</h1></header>
  <form class="pad" id="sf" onsubmit="return false" data-id="${s ? s.id : ''}">
    <label class="field">اسم الطالب<input class="input" id="sf-name" value="${esc(s ? s.name : '')}" placeholder="الاسم الثلاثي" autocomplete="off" required></label>
    <fieldset style="border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px"><legend class="field" style="padding:0;margin-bottom:8px">الصف الدراسي</legend>
      <div class="seg" id="sf-grade">${[1, 2, 3].map(g => `<button type="button" data-g="${g}" class="${g === grade ? 'on' : ''}" ${hasEnr && g !== grade ? 'disabled' : ''}>${['', 'الأول', 'الثاني', 'الثالث'][g]}</button>`).join('')}</div>
      ${hasEnr ? '<span class="small muted">الصف مش بيتغير بعد ما الطالب يشترك في مواد</span>' : ''}</fieldset>
    ${[1, 2, 3].map(g => `<fieldset class="sf-sec" data-g="${g}" ${g !== grade ? 'hidden' : ''} style="border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px">
      <legend class="field" style="padding:0;margin-bottom:8px">المواد والمجموعات</legend>
      ${E.SUBJECTS.filter(x => x.grade === g).map(sub => {
        const e = activeBy(sub.id);
        const groups = st.groups.filter(gg => gg.subjectId === sub.id);
        const gid = e ? E.currentGroupId(e) : (groups[0] || {}).id;
        return `<div class="check-card ${e ? 'on locked' : ''}" data-sub="${sub.id}" data-locked="${e ? 1 : ''}">
          <button type="button" class="check-row" data-act="sfToggle" aria-pressed="${!!e}"><span class="box">${ic('check', 16, 3)}</span><span class="grow b">${esc(sub.name)}</span><span class="small muted">${g === 3 ? money(st.settings.prices.project) : money(st.settings.prices.single)}</span></button>
          <div class="sf-more" ${e ? '' : 'hidden'} style="display:flex;flex-direction:column;gap:8px">
            ${groups.length ? `<label class="row small muted" style="gap:10px">المجموعة<select class="input select sm grow" data-role="group" data-change="sfGroup">${groups.map(gg => `<option value="${gg.id}" ${gg.id === gid ? 'selected' : ''}>${esc(E.groupLabel(st, gg))}</option>`).join('')}</select></label>` : `<div class="banner amber" style="padding:8px 10px">${ic('alert', 16)}<span>مفيش مجموعة للمادة دي. <a href="#/groups">أضف مجموعة</a></span></div>`}
            ${groups.length ? `<label class="row small muted" style="gap:10px">أول حصة<select class="input select sm grow" data-role="start">${firstSessionOptions(gid, e ? e.startDate : null)}</select></label>
              <span class="small muted">${e ? 'دورة الـ٤ حصص بتتحسب من أول حصة. لإلغاء المادة استخدم "سحب من مادة" من ملف الطالب' : 'اختار أول حصة الطالب حضرها أو هيحضرها — الـ٤ حصص بتتحسب منها'}</span>` : ''}
          </div></div>`;
      }).join('')}</fieldset>`).join('')}
    <div class="grid2"><label class="field">موبايل ولي الأمر<input class="input num" type="tel" inputmode="tel" id="sf-phone" value="${esc(s ? s.phone || '' : '')}" placeholder="اختياري" dir="ltr" style="text-align:right"></label>
      <label class="field">ملاحظات<input class="input" id="sf-notes" value="${esc(s ? s.notes || '' : '')}" placeholder="اختياري"></label></div>
    <section class="price-card" id="sf-price"></section>
    <button type="button" class="btn accent lg block" data-act="sfSave">${ic('check', 20, 2.4)} ${edit ? 'حفظ التعديلات' : 'حفظ الطالب'}</button>
  </form>`;
}
/* اختيار أول حصة من مواعيد المجموعة الفعلية (من ٨ أسابيع فاتوا لـ ٥ أسابيع جايين) */
function firstSessionOptions(gid, selected) {
  if (!gid) return '';
  const st = App.st, t = E.today(), y = E.addDays(t, -1);
  const list = E.occurrences(st, gid, E.addDays(t, -56), E.addDays(t, 35)).filter(o => o.status === 'normal');
  let sel = selected;
  if (!sel) { const next = list.find(o => o.date >= t); sel = next ? next.date : (list.length ? list[list.length - 1].date : t); }
  const opts = list.map(o => ({ d: o.date, l: E.fmtDate(o.date) + ' · ' + E.fmtTime(o.time) + (o.date === t ? ' · النهارده' : o.date === y ? ' · امبارح' : o.date < t ? ' · فاتت' : '') + (o.type === 'makeup' ? ' (تعويضية)' : '') }));
  if (!opts.some(o => o.d === sel)) opts.push({ d: sel, l: E.fmtDate(sel) + ' (التاريخ المسجل)' });
  opts.sort((a, b) => a.d.localeCompare(b.d));
  return opts.map(o => `<option value="${o.d}" ${o.d === sel ? 'selected' : ''}>${esc(o.l)}</option>`).join('');
}
ACT.sfGroup = el => {
  const card = el.closest('.check-card'), s = $('[data-role=start]', card);
  if (s) s.innerHTML = firstSessionOptions(el.value, null);
};
Views['student-new'] = () => studentForm(null);
Views['student-edit'] = id => studentForm(studentById(id));
Views['student-new_after'] = Views['student-edit_after'] = () => {
  const f = $('#sf');
  $('#sf-grade', f).onclick = e => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    $$('#sf-grade button', f).forEach(x => x.classList.toggle('on', x === b));
    $$('.sf-sec', f).forEach(x => x.hidden = x.dataset.g !== b.dataset.g);
    App.ui.lastGrade = +b.dataset.g;
    sfPrice();
  };
  sfPrice();
};
function sfGrade() { return +($('#sf-grade button.on') || {}).dataset.g || 1; }
function sfPicked() { return $$(`.sf-sec[data-g="${sfGrade()}"] .check-card.on`).map(c => c.dataset.sub); }
function sfPrice() {
  const g = sfGrade(), picked = sfPicked();
  const m = E.monthlyTotal(App.st, g, picked);
  let explain;
  if (!picked.length) explain = 'اختار مادة واحدة على الأقل';
  else if (m.offer) explain = `${m.offer}: ${fmt(m.total)} بدل ${fmt(m.base)} · كل مادة ${fmt(m.per)} ج من العرض`;
  else if (g === 3) explain = 'مشروع التخرج ' + fmt(m.total) + ' ج في الشهر';
  else explain = picked.length + ' × ' + fmt(App.st.settings.prices.single) + ' ج · كل مادة بتتحسب لوحدها';
  $('#sf-price').innerHTML = `<div class="row between"><span class="sm" style="color:var(--on-ink-muted)">الاشتراك الشهري (كل ٤ حصص)</span>${m.offer ? `<span class="chip" style="background:var(--accent);color:var(--ink)">${m.offer}</span>` : ''}</div>
    <div class="row" style="align-items:baseline;gap:10px"><span class="money-big">${fmt(m.total)} ج</span>${m.offer ? `<span class="old">${fmt(m.base)} ج</span>` : ''}</div>
    <div class="sm" style="color:var(--on-ink-muted);line-height:1.6">${explain}</div>`;
}
ACT.sfToggle = el => {
  const card = el.closest('.check-card');
  if (card.dataset.locked) return toast('لإلغاء المادة استخدم "سحب من مادة" من ملف الطالب', { type: 'warn' });
  const on = !card.classList.contains('on');
  card.classList.toggle('on', on);
  el.setAttribute('aria-pressed', on);
  $('.sf-more', card).hidden = !on;
  Sound.play('tap');
  sfPrice();
};
ACT.sfSave = () => {
  const f = $('#sf'), id = f.dataset.id;
  const name = $('#sf-name').value.trim().replace(/\s+/g, ' ');
  if (!name) { $('#sf-name').focus(); return toast('اكتب اسم الطالب', { type: 'err', sound: 'err' }); }
  const grade = sfGrade();
  const cards = $$(`.sf-sec[data-g="${grade}"] .check-card.on`);
  if (!id && !cards.length) return toast('اختار مادة واحدة على الأقل', { type: 'err', sound: 'err' });
  for (const c of cards) if (!$('[data-role=group]', c)) return toast('مادة "' + E.SUBJ[c.dataset.sub].name + '" ملهاش مجموعة — أضف مجموعة الأول', { type: 'err', sound: 'err', ms: 4500 });
  const dup = App.st.students.find(s => s.name === name && s.id !== id);
  const t = E.today();
  const save = () => {
    let sid = id;
    commit(st => {
      let s = st.students.find(x => x.id === id);
      if (!s) { s = { id: E.uid(st), name, grade, phone: '', notes: '', created: t, status: 'active', enrollments: [] }; st.students.push(s); sid = s.id; }
      s.name = name; s.phone = $('#sf-phone').value.trim(); s.notes = $('#sf-notes').value.trim();
      if (!s.enrollments.length) s.grade = grade;
      for (const c of cards) {
        const gid = $('[data-role=group]', c).value;
        const ex = s.enrollments.find(e => e.subjectId === c.dataset.sub && !e.endDate);
        if (ex) {
          const ns = ($('[data-role=start]', c) || {}).value;
          if (ns && ns !== ex.startDate) { ex.startDate = ns; ex.groupHist[0].from = ns; ex.groupHist = ex.groupHist.filter((h, i) => i === 0 || h.from > ns); }
          if (E.currentGroupId(ex) !== gid) {
            const from = t < ex.startDate ? ex.startDate : t;
            ex.groupHist = ex.groupHist.filter(h => h.from < from);
            if (!ex.groupHist.length) ex.groupHist.push({ from: ex.startDate, groupId: gid }); else ex.groupHist.push({ from, groupId: gid });
          }
        } else {
          const start = ($('[data-role=start]', c) || {}).value || E.today();
          s.enrollments.push({ id: E.uid(st), subjectId: c.dataset.sub, groupHist: [{ from: start, groupId: gid }], startDate: start, endDate: null, registered: t });
        }
      }
      if (s.enrollments.some(e => !e.endDate)) s.status = 'active';
    }, id ? 'البيانات اتحفظت' : 'الطالب اتضاف', { noRender: true });
    go('student', sid);
  };
  if (dup && !id) confirmBox({ title: 'فيه طالب بنفس الاسم', text: 'متأكد إنه طالب تاني؟', ok: 'أيوه، احفظ', icon: 'users' }).then(ok => ok && save()); else save();
};
