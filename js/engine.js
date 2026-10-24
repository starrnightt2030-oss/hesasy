/* حصصي — محرك الحسابات
 * دوال نقية بدون واجهة: توليد الحصص، الدورات، الأسعار والعروض، السحب،
 * توزيع المدفوعات (الأقدم أولًا) والتقارير. يشتغل في المتصفح وفي node للاختبار. */
(function (root) {
  'use strict';

  const SUBJECTS = [
    { id: 'g1a', grade: 1, name: 'خامات', short: 'خامات' },
    { id: 'g1b', grade: 1, name: 'أساسيات هندسة كهربية', short: 'أساسيات' },
    { id: 'g2a', grade: 2, name: 'تحكم آلي', short: 'تحكم' },
    { id: 'g2b', grade: 2, name: 'مقايسات كهربية', short: 'مقايسات' },
    { id: 'g2c', grade: 2, name: 'تركيبات كهربية', short: 'تركيبات' },
    { id: 'g2d', grade: 2, name: 'آلات كهربية', short: 'آلات' },
    { id: 'g3a', grade: 3, name: 'مشروع التخرج', short: 'المشروع' }
  ];
  const SUBJ = Object.fromEntries(SUBJECTS.map(s => [s.id, s]));
  const GRADES = { 1: 'الصف الأول', 2: 'الصف الثاني', 3: 'الصف الثالث' };
  // ترتيب الأسبوع المصري: السبت أولًا. القيم = getDay()
  const WEEK = [6, 0, 1, 2, 3, 4, 5];
  const DAY_NAMES = { 6: 'السبت', 0: 'الأحد', 1: 'الاثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة' };
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  /* ---------- التواريخ (نصوص YYYY-MM-DD بالتوقيت المحلي) ---------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const dow = s => parse(s).getDay();
  const today = () => iso(new Date());
  const monthKey = s => s.slice(0, 7);
  const monthStart = s => s.slice(0, 7) + '-01';
  const monthEnd = s => { const d = parse(monthStart(s)); d.setMonth(d.getMonth() + 1); d.setDate(0); return iso(d); };
  const addMonths = (s, n) => { const d = parse(monthStart(s)); d.setMonth(d.getMonth() + n); return iso(d); };
  const monthName = s => MONTHS[parse(s).getMonth()];
  const monthLabel = s => monthName(s) + ' ' + parse(s).getFullYear();
  const weekStart = s => { const off = (dow(s) - 6 + 7) % 7; return addDays(s, -off); }; // السبت
  const fmtDate = s => { const d = parse(s); return DAY_NAMES[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; };
  const fmtShort = s => { const d = parse(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; };
  const fmtTime = t => {
    if (!t) return '';
    let [h, m] = t.split(':').map(Number);
    const pm = h >= 12; h = h % 12 || 12;
    return h + ':' + pad(m) + (pm ? ' م' : ' ص');
  };

  /* ---------- الحالة الافتراضية ---------- */
  function defaultState() {
    const y = new Date().getFullYear();
    const m = new Date().getMonth();
    const sy = m >= 7 ? y : y - 1; // السنة الدراسية تبدأ سبتمبر
    return {
      v: 1,
      seq: 1,
      settings: {
        appName: 'حصصي',
        iconId: 'bolt',
        iconData: null,
        accent: '#E8962E',
        prices: { single: 250, g1Bundle: 400, g2Bundle: 700, project: 400 },
        terms: [
          { id: 't1', name: 'الترم الأول', start: sy + '-09-01', end: (sy + 1) + '-01-31' },
          { id: 't2', name: 'الترم الثاني', start: (sy + 1) + '-02-01', end: (sy + 1) + '-06-15' }
        ],
        holidays: [],
        reminders: { before: 30, daily: true, overdue: true, sound: true },
        privacy: { hide: true },
        backup: { lastAuto: null, lastFolder: null, lastDownload: null }
      },
      groups: [],
      students: [],
      overrides: {},
      makeups: [],
      attendance: {},
      payments: [],
      projectItems: [],
      projectPays: {}
    };
  }

  const uid = st => (st.seq = (st.seq || 1) + 1, Date.now().toString(36) + st.seq.toString(36));

  /* ---------- أيام الدراسة ---------- */
  function isActiveDay(st, d) {
    const terms = st.settings.terms || [];
    if (terms.length && !terms.some(t => t.start && t.end && d >= t.start && d <= t.end)) return false;
    return !(st.settings.holidays || []).some(h => d >= h.from && d <= (h.to || h.from));
  }
  function termOf(st, d) {
    return (st.settings.terms || []).find(t => d >= t.start && d <= t.end) || null;
  }

  /* ---------- المجموعات ومواعيدها ----------
   * group.schedule = [{from, day, time}] — تاريخ تغيير المعاد محفوظ علشان الحسابات القديمة متتغيرش */
  const groupById = (st, id) => st.groups.find(g => g.id === id);
  function groupScheduleAt(g, d) {
    const v = (g.schedule || []).filter(x => x.from <= d).sort((a, b) => a.from.localeCompare(b.from));
    return v.length ? v[v.length - 1] : (g.schedule || [])[0];
  }
  function currentSchedule(g) { return groupScheduleAt(g, today()); }
  function groupLabel(st, g) {
    if (!g) return 'مجموعة محذوفة';
    const s = currentSchedule(g) || {};
    return (g.name ? g.name + ' · ' : '') + DAY_NAMES[s.day] + ' ' + fmtTime(s.time);
  }

  /* كل حصص المجموعة في فترة (عادية + تعويضية) مع حالتها */
  function occurrences(st, gid, from, to) {
    const g = groupById(st, gid);
    if (!g || from > to) return [];
    const out = [];
    const vers = (g.schedule || []).slice().sort((a, b) => a.from.localeCompare(b.from));
    vers.forEach((v, i) => {
      const vFrom = i === 0 ? from : (v.from > from ? v.from : from);
      const vTo = i < vers.length - 1 ? (addDays(vers[i + 1].from, -1) < to ? addDays(vers[i + 1].from, -1) : to) : to;
      if (i > 0 && v.from > to) return;
      if (vFrom > vTo) return;
      let d = addDays(vFrom, (v.day - dow(vFrom) + 7) % 7);
      for (; d <= vTo; d = addDays(d, 7)) {
        if (g.created && d < g.created) continue;
        if (!isActiveDay(st, d)) continue;
        const key = gid + '@' + d;
        const ov = st.overrides[key] || {};
        out.push({ key, groupId: gid, date: d, time: v.time, type: 'regular', status: ov.status || 'normal', reason: ov.reason || '', makeupId: ov.makeupId || null });
      }
    });
    for (const m of st.makeups) {
      if (m.groupId === gid && m.date >= from && m.date <= to) {
        out.push({ key: 'm:' + m.id, groupId: gid, date: m.date, time: m.time, type: 'makeup', status: 'normal', originDate: m.originDate, makeupId: m.id, reason: m.reason || '' });
      }
    }
    out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    return out;
  }

  function sessionByKey(st, key) {
    if (key.startsWith('m:')) {
      const m = st.makeups.find(x => 'm:' + x.id === key);
      return m ? { key, groupId: m.groupId, date: m.date, time: m.time, type: 'makeup', status: 'normal', originDate: m.originDate, makeupId: m.id } : null;
    }
    const [gid, date] = key.split('@');
    return occurrences(st, gid, date, date).find(o => o.key === key) || null;
  }

  /* ---------- الاشتراكات ----------
   * enrollment = {id, subjectId, groupHist:[{from, groupId}], startDate, endDate|null} */
  const groupOfEnrollment = (e, d) => {
    const h = (e.groupHist || []).filter(x => x.from <= d).sort((a, b) => a.from.localeCompare(b.from));
    return h.length ? h[h.length - 1].groupId : (e.groupHist && e.groupHist[0] ? e.groupHist[0].groupId : null);
  };
  const currentGroupId = e => groupOfEnrollment(e, '9999-12-31');
  const isEnrollmentActive = (e, d) => e.startDate <= d && (!e.endDate || e.endDate >= d);

  /* الحصص المحسوبة على الطالب في المادة لحد تاريخ معين (العادية والتعويضية، من غير الملغية والمؤجلة) */
  function enrollmentSessions(st, e, upTo) {
    const end = e.endDate && e.endDate < upTo ? e.endDate : upTo;
    if (e.startDate > end) return [];
    const hist = (e.groupHist || []).slice().sort((a, b) => a.from.localeCompare(b.from));
    let out = [];
    hist.forEach((h, i) => {
      const from = i === 0 ? e.startDate : (h.from > e.startDate ? h.from : e.startDate);
      const to = i < hist.length - 1 ? addDays(hist[i + 1].from, -1) : end;
      const realTo = to < end ? to : end;
      if (from <= realTo) out = out.concat(occurrences(st, h.groupId, from, realTo));
    });
    return out.filter(o => o.status === 'normal');
  }

  /* ---------- الأسعار والعروض ---------- */
  function priceFor(st, student, e, D) {
    const P = st.settings.prices;
    const subj = SUBJ[e.subjectId];
    if (!subj) return { price: P.single, bundle: false };
    if (subj.grade === 3) return { price: P.project, bundle: false };
    const active = new Set(
      student.enrollments
        .filter(x => x.id === e.id || (SUBJ[x.subjectId] && SUBJ[x.subjectId].grade === subj.grade && x.startDate <= D && (!x.endDate || x.endDate > D)))
        .map(x => x.subjectId)
    );
    if (subj.grade === 1 && active.has('g1a') && active.has('g1b')) return { price: P.g1Bundle / 2, bundle: true };
    if (subj.grade === 2 && ['g2a', 'g2b', 'g2c', 'g2d'].every(id => active.has(id))) return { price: P.g2Bundle / 4, bundle: true };
    return { price: P.single, bundle: false };
  }

  /* الشهر الحالي للطالب في الغرض المعروض (عرض الشاشة) */
  function monthlyTotal(st, grade, subjectIds) {
    const P = st.settings.prices;
    const n = subjectIds.length;
    if (!n) return { total: 0, base: 0, offer: null };
    if (grade === 3) return { total: P.project * n, base: P.project * n, offer: null };
    const base = n * P.single;
    if (grade === 1 && n === 2) return { total: P.g1Bundle, base, offer: 'عرض المادتين', per: P.g1Bundle / 2 };
    if (grade === 2 && n === 4) return { total: P.g2Bundle, base, offer: 'عرض الأربع مواد', per: P.g2Bundle / 4 };
    return { total: base, base, offer: null, per: P.single };
  }

  /* ---------- الدورات (الشهور) والمستحقات ---------- */
  function enrollmentCharges(st, s, e, asOf) {
    if (e.startDate > asOf) return [];
    const ses = enrollmentSessions(st, e, asOf);
    const n = ses.length;
    const ended = !!e.endDate && e.endDate <= asOf;
    const cycles = Math.max(1, Math.ceil(n / 4));
    const out = [];
    for (let k = 1; k <= cycles; k++) {
      const start = k === 1 ? e.startDate : ses[4 * (k - 1)].date;
      const { price, bundle } = priceFor(st, s, e, start);
      const held = Math.max(0, Math.min(4, n - 4 * (k - 1)));
      let amount = price, partial = false;
      if (ended && k === cycles && held < 4) { amount = Math.round(price * held / 4); partial = true; }
      if (partial && amount <= 0) continue;
      out.push({
        id: e.id + '#' + k, studentId: s.id, enrollmentId: e.id, subjectId: e.subjectId,
        groupId: groupOfEnrollment(e, start), cycle: k, date: start, amount, price, held,
        latest: k === cycles && !ended, partial, bundle, ended
      });
    }
    return out;
  }

  function studentLedger(st, s, asOf) {
    asOf = asOf || today();
    const charges = s.enrollments
      .flatMap(e => enrollmentCharges(st, s, e, asOf))
      .sort((a, b) => a.date.localeCompare(b.date) || a.cycle - b.cycle || a.subjectId.localeCompare(b.subjectId));
    const pays = st.payments.filter(p => p.studentId === s.id).sort((a, b) => a.date.localeCompare(b.date));
    const paidSum = pays.reduce((t, p) => t + (+p.amount || 0), 0);
    let pool = paidSum;
    for (const c of charges) { c.paid = Math.min(c.amount, pool); pool -= c.paid; c.due = c.amount - c.paid; }
    const total = charges.reduce((t, c) => t + c.amount, 0);
    const late = charges.filter(c => !c.latest).reduce((t, c) => t + c.due, 0);
    const current = charges.filter(c => c.latest).reduce((t, c) => t + c.due, 0);
    const balance = total - paidSum;
    let status = 'clear';
    if (late > 0) status = 'late'; else if (current > 0) status = 'current'; else if (balance < 0) status = 'credit';
    return { student: s, charges, payments: pays, total, paid: paidSum, balance, due: Math.max(0, balance), credit: Math.max(0, -balance), late, current, status };
  }

  /* موقع الطالب في الدورة عند حصة معينة: "حصة 3 من 4" */
  function cyclePosition(st, e, date) {
    const ses = enrollmentSessions(st, e, date);
    const n = ses.length;
    if (!n) return { cycle: 1, pos: 0, n: 0 };
    return { cycle: Math.ceil(n / 4), pos: ((n - 1) % 4) + 1, n };
  }

  /* ---------- حساب شامل (يتعمل مرة واحدة بعد أي تعديل) ---------- */
  function computeAll(st, asOf) {
    asOf = asOf || today();
    const ledgers = new Map();
    const charges = [];
    for (const s of st.students) {
      const L = studentLedger(st, s, asOf);
      ledgers.set(s.id, L);
      charges.push(...L.charges);
    }
    return { asOf, ledgers, charges };
  }

  function periodSummary(st, C, from, to) {
    const inP = C.charges.filter(c => c.date >= from && c.date <= to);
    const due = inP.reduce((t, c) => t + c.amount, 0);
    const paid = inP.reduce((t, c) => t + c.paid, 0);
    const prior = C.charges.filter(c => c.date < from).reduce((t, c) => t + c.due, 0);
    const cash = st.payments.filter(p => p.date >= from && p.date <= to && p.kind !== 'discount').reduce((t, p) => t + (+p.amount || 0), 0);
    const discount = st.payments.filter(p => p.date >= from && p.date <= to && p.kind === 'discount').reduce((t, p) => t + (+p.amount || 0), 0);
    return { due, paid, remaining: due - paid, prior, cash, discount, pct: due ? Math.round(paid / due * 100) : 100 };
  }

  /* مستحقات كل مجموعة: مين عليه في الشهر الحالي ومين عليه شهر وبدأ التاني */
  function groupDues(st, C, gid, from, to) {
    const rows = new Map();
    let due = 0, paid = 0;
    for (const c of C.charges) {
      if (c.groupId !== gid) continue;
      const inPeriod = !from || (c.date >= from && c.date <= to);
      if (inPeriod) { due += c.amount; paid += c.paid; }
      if (c.due <= 0) continue;
      if (from && c.date > to) continue;
      const r = rows.get(c.studentId) || { studentId: c.studentId, late: 0, current: 0, items: [] };
      if (c.latest) r.current += c.due; else r.late += c.due;
      r.items.push(c);
      rows.set(c.studentId, r);
    }
    const list = [...rows.values()].map(r => ({ ...r, total: r.late + r.current }));
    return {
      due, paid, remaining: due - paid,
      late: list.filter(r => r.late > 0).sort((a, b) => b.total - a.total),
      current: list.filter(r => r.late === 0 && r.current > 0).sort((a, b) => b.total - a.total),
      owed: list.reduce((t, r) => t + r.total, 0)
    };
  }

  function studentsInSession(st, sess) {
    const res = [];
    for (const s of st.students) {
      for (const e of s.enrollments) {
        if (groupOfEnrollment(e, sess.date) === sess.groupId && isEnrollmentActive(e, sess.date)) { res.push({ student: s, enrollment: e }); break; }
      }
    }
    return res.sort((a, b) => a.student.name.localeCompare(b.student.name, 'ar'));
  }

  function sessionsOnDay(st, d) {
    return st.groups.flatMap(g => occurrences(st, g.id, d, d)).sort((a, b) => a.time.localeCompare(b.time));
  }

  /* ---------- مشروع التخرج ---------- */
  function projectStudents(st, item) {
    const ids = item.groupIds && item.groupIds.length ? item.groupIds : st.groups.filter(g => SUBJ[g.subjectId] && SUBJ[g.subjectId].grade === 3).map(g => g.id);
    const out = [];
    const d = today();
    for (const s of st.students) {
      if (s.grade !== 3) continue;
      const e = s.enrollments.find(x => x.subjectId === 'g3a' && (!x.endDate || x.endDate >= (item.created || d)));
      if (!e) continue;
      const gid = currentGroupId(e);
      if (!ids.includes(gid)) continue;
      const pay = st.projectPays[item.id + '|' + s.id];
      const paid = pay ? +pay.amount || 0 : 0;
      out.push({ student: s, groupId: gid, paid, done: paid >= item.price, date: pay ? pay.date : null });
    }
    return out.sort((a, b) => a.student.name.localeCompare(b.student.name, 'ar'));
  }

  /* ---------- ملف التقويم (.ics) لتذكير الحصص من تقويم الموبايل ---------- */
  function icsFor(st, before) {
    const byday = { 6: 'SA', 0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR' };
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Hesasy//AR', 'CALSCALE:GREGORIAN'];
    const t = today();
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const alarm = ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:تذكير بالحصة', 'TRIGGER:-PT' + (before || 30) + 'M', 'END:VALARM'];
    const terms = st.settings.terms || [];
    const lastEnd = terms.map(x => x.end).sort().pop();
    for (const g of st.groups) {
      const s = currentSchedule(g);
      if (!s) continue;
      const first = addDays(t, (s.day - dow(t) + 7) % 7);
      const dt = first.replace(/-/g, '') + 'T' + s.time.replace(':', '') + '00';
      const [h, m] = s.time.split(':').map(Number);
      const endT = pad((h + 1) % 24) + pad(m) + '00';
      lines.push('BEGIN:VEVENT', 'UID:' + g.id + '@hesasy', 'DTSTAMP:' + stamp, 'DTSTART:' + dt, 'DTEND:' + first.replace(/-/g, '') + 'T' + endT,
        'RRULE:FREQ=WEEKLY;BYDAY=' + byday[s.day] + (lastEnd ? ';UNTIL=' + lastEnd.replace(/-/g, '') + 'T235959' : ''),
        'SUMMARY:' + SUBJ[g.subjectId].name + ' — ' + GRADES[SUBJ[g.subjectId].grade] + (g.name ? ' (' + g.name + ')' : ''), ...alarm, 'END:VEVENT');
    }
    for (const m of st.makeups) {
      if (m.date < t) continue;
      const g = groupById(st, m.groupId);
      if (!g) continue;
      const [h, mi] = m.time.split(':').map(Number);
      lines.push('BEGIN:VEVENT', 'UID:mk' + m.id + '@hesasy', 'DTSTAMP:' + stamp, 'DTSTART:' + m.date.replace(/-/g, '') + 'T' + m.time.replace(':', '') + '00',
        'DTEND:' + m.date.replace(/-/g, '') + 'T' + pad((h + 1) % 24) + pad(mi) + '00', 'SUMMARY:حصة تعويضية — ' + SUBJ[g.subjectId].name, ...alarm, 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  const E = {
    SUBJECTS, SUBJ, GRADES, WEEK, DAY_NAMES, MONTHS,
    iso, parse, addDays, dow, today, monthKey, monthStart, monthEnd, addMonths, monthName, monthLabel, weekStart, fmtDate, fmtShort, fmtTime,
    defaultState, uid, isActiveDay, termOf, groupById, groupScheduleAt, currentSchedule, groupLabel, occurrences, sessionByKey,
    groupOfEnrollment, currentGroupId, isEnrollmentActive, enrollmentSessions, priceFor, monthlyTotal, enrollmentCharges, studentLedger,
    cyclePosition, computeAll, periodSummary, groupDues, studentsInSession, sessionsOnDay, projectStudents, icsFor
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = E; else root.Engine = E;
})(typeof window !== 'undefined' ? window : globalThis);
