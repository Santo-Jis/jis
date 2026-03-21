// ═══════════════════════════════════════════════════════════
//  COMPLETE LEDGER — সকল লেনদেনের বিস্তারিত ইতিহাস
// ═══════════════════════════════════════════════════════════
let _ledgerPeriod = 'month';
let _ledgerType   = 'all';

window.setLedgerPeriod = (p) => {
  _ledgerPeriod = p;
  document.querySelectorAll('[id^="lp-"]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('lp-' + p);
  if (btn) btn.classList.add('active');

  const now = new Date();
  const fromEl = document.getElementById('ledgerFrom');
  const toEl   = document.getElementById('ledgerTo');
  const fmt    = d => d.toISOString().split('T')[0];

  if (p === 'today') {
    if (fromEl) fromEl.value = fmt(now);
    if (toEl)   toEl.value   = fmt(now);
  } else if (p === 'week') {
    // ✅ গত ৭ দিন — Sunday-based নয়
    const start = new Date(now); start.setDate(now.getDate() - 6);
    if (fromEl) fromEl.value = fmt(start);
    if (toEl)   toEl.value   = fmt(now);
  } else if (p === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (fromEl) fromEl.value = fmt(start);
    if (toEl)   toEl.value   = fmt(now);
  } else {
    // ✅ 'all' — তারিখ খালি রাখি
    if (fromEl) fromEl.value = '';
    if (toEl)   toEl.value   = '';
  }
  window.renderLedger();
};

window.setLedgerType = (t) => {
  _ledgerType = t;
  document.querySelectorAll('[id^="lt-"]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('lt-' + t);
  if (btn) btn.classList.add('active');
  window.renderLedger();
};

window.renderLedger = () => {
  if (window.CR !== 'admin' && window.CR !== 'manager') return;
  const listEl    = document.getElementById('ledgerList');
  const summaryEl = document.getElementById('ledgerSummary');
  if (!listEl) return;

  // ✅ Admin-এর জন্য worker filter দেখাই ও populate করি
  const workerFilterWrap = document.getElementById('ledgerWorkerFilterWrap');
  const workerFilterSel  = document.getElementById('ledgerWorkerFilter');
  if (window.CR === 'admin' && workerFilterWrap) {
    workerFilterWrap.style.display = 'block';
    if (workerFilterSel && workerFilterSel.options.length <= 1) {
      const workers = Object.entries(window.allUsers||{})
        .filter(([,u]) => u.role==='worker'||u.role==='manager')
        .sort((a,b) => a[1].name.localeCompare(b[1].name));
      workers.forEach(([uid,u]) => {
        const opt = document.createElement('option');
        opt.value = uid;
        opt.textContent = u.name + ' (' + (u.role==='worker'?'কর্মী':'ম্যানেজার') + ')';
        workerFilterSel.appendChild(opt);
      });
    }
  }
  const selectedWorker = workerFilterSel?.value || '';

  const fromVal = document.getElementById('ledgerFrom')?.value || '';
  const toVal   = document.getElementById('ledgerTo')?.value   || '';

  const inRange = (dateStr) => {
    if (!fromVal && !toVal) return true;
    if (fromVal && dateStr < fromVal) return false;
    if (toVal   && dateStr > toVal)   return false;
    return true;
  };

  // ── সব transaction একসাথে জড়ো করি ──
  let transactions = [];

  // 1. বিক্রয়
  if (_ledgerType === 'all' || _ledgerType === 'sales') {
    Object.entries(window.allSales || {}).forEach(([id, s]) => {
      if (!inRange(s.date || '')) return;
      // ✅ কর্মী ফিল্টার
      if (selectedWorker && s.uid !== selectedWorker) return;
      transactions.push({
        id, type: 'sale',
        icon: '🛍️', color: 'var(--blue)',
        title: s.shop || '-',
        sub1: `${s.product || ''} × ${s.qty || 1} পিস`,
        sub2: `কর্মী: ${s.workerName || '-'} · OTP: ${s.otpConfirmed ? '✅' : '⏭️'}`,
        amount: s.total || 0,
        cash: (s.total || 0) - (s.due || 0),
        due: s.due || 0,
        discount: s.disc || 0,
        profit: s.profit || 0,
        date: s.date || '',
        ts: s.ts || 0,
        extra: s.due > 0 ? `বাকি: ৳${Math.round(s.due).toLocaleString('bn-BD')}` : 'নগদ পরিশোধ ✅',
        extraColor: s.due > 0 ? 'var(--red)' : 'var(--green)',
        rawData: s,
      });
    });
  }

  // 2. পেমেন্ট (বাকি আদায়)
  if (_ledgerType === 'all' || _ledgerType === 'payments') {
    Object.entries(window.allPaymentLogs || {}).forEach(([id, p]) => {
      if (!inRange(p.date || '')) return;
      transactions.push({
        id, type: 'payment',
        icon: '💵', color: 'var(--green)',
        title: p.shop || '-',
        sub1: `বাকি আদায়`,
        sub2: `${p.collectedBy || '-'} কর্তৃক`,
        amount: p.amount || 0,
        cash: p.amount || 0,
        due: 0,
        date: p.date || '',
        ts: p.ts || 0,
        extra: `আদায়কারী: ${p.collectedBy || '-'}`,
        extraColor: 'var(--green)',
        rawData: p,
      });
    });
  }

  // 3. খরচ
  if (_ledgerType === 'all' || _ledgerType === 'expenses') {
    Object.entries(window.allExpenses || {}).forEach(([id, e]) => {
      if (!inRange(e.date || '')) return;
      // ✅ কর্মী ফিল্টার
      if (selectedWorker && e.uid !== selectedWorker) return;
      transactions.push({
        id, type: 'expense',
        icon: '💸', color: 'var(--red)',
        title: e.type || 'খরচ',
        sub1: e.note || '',
        sub2: `কর্মী: ${e.workerName || '-'}`,
        amount: e.amount || 0,
        cash: e.amount || 0,
        due: 0,
        date: e.date || '',
        ts: e.ts || 0,
        extra: e.status === 'pending' ? '⏳ অনুমোদন বাকি' : '✅ অনুমোদিত',
        extraColor: e.status === 'pending' ? 'var(--accent)' : 'var(--green)',
        rawData: e,
      });
    });
  }

  // 4. বেতন
  if (_ledgerType === 'all' || _ledgerType === 'salary') {
    Object.entries(window.allSalaries || {}).forEach(([id, s]) => {
      const sDate = s.month ? s.month + '-01' : (s.date || '');
      if (!inRange(sDate)) return;
      transactions.push({
        id, type: 'salary',
        icon: '💰', color: 'var(--purple)',
        title: s.name || s.workerName || '-',
        sub1: `মূল বেতন: ৳${Math.round(s.baseSalary || s.salary || 0).toLocaleString('bn-BD')}`,
        sub2: `কমিশন: ৳${Math.round(s.commission || 0).toLocaleString('bn-BD')}`,
        amount: (s.baseSalary || s.salary || 0) + (s.commission || 0),
        cash: (s.baseSalary || s.salary || 0) + (s.commission || 0),
        due: 0,
        date: sDate,
        ts: s.ts || 0,
        extra: `মাস: ${s.month || '-'}`,
        extraColor: 'var(--purple)',
        rawData: s,
      });
    });
  }

  // ── sort by time ──
  transactions.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  // ── Summary calculate ──
  const totalSale    = transactions.filter(t => t.type === 'sale').reduce((a, t) => a + t.amount, 0);
  // নগদ আদায় = sale এর নগদ অংশ (due বাদ দিয়ে)
  const totalCashSale= transactions.filter(t => t.type === 'sale').reduce((a, t) => a + t.cash, 0);
  // বাকি আদায় = paymentLogs থেকে
  const totalPayment = transactions.filter(t => t.type === 'payment').reduce((a, t) => a + t.amount, 0);
  // মোট নগদ আদায় = sale cash + due payments
  const totalCash    = totalCashSale + totalPayment;
  // মোট বাকি = sale এর due (এখনো বাকি)
  const totalDue     = transactions.filter(t => t.type === 'sale').reduce((a, t) => a + t.due, 0);
  const totalExp     = transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
  const totalSalary  = transactions.filter(t => t.type === 'salary').reduce((a, t) => a + t.amount, 0);
  const totalProfit  = window.CR==='admin' ? transactions.filter(t => t.type === 'sale').reduce((a, t) => a + (t.profit || 0), 0) : 0;

  if (summaryEl) {
    summaryEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div style="background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted)">মোট বিক্রয়</div>
          <div style="font-size:16px;font-weight:800;color:var(--blue);font-family:'Sora',sans-serif">৳window.${Math.round(totalSale).toLocaleString('bn-BD')}</div>
        </div>
        <div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.2);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted)">নগদ আদায়</div>
          <div style="font-size:16px;font-weight:800;color:var(--green);font-family:'Sora',sans-serif">৳window.${Math.round(totalCash).toLocaleString('bn-BD')}</div>
          window.${totalPayment > 0 ? `<div style="font-size:9px;color:var(--muted)">(বাকি আদায় ৳${Math.round(totalPayment).toLocaleString('bn-BD')} সহ)</div>` : ''}
        </div>
        <div style="background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.2);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted)">মোট বাকি</div>
          <div style="font-size:16px;font-weight:800;color:var(--purple);font-family:'Sora',sans-serif">৳window.${Math.round(totalDue).toLocaleString('bn-BD')}</div>
        </div>
        <div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted)">মোট খরচ</div>
          <div style="font-size:16px;font-weight:800;color:var(--red);font-family:'Sora',sans-serif">৳window.${Math.round(totalExp).toLocaleString('bn-BD')}</div>
        </div>
        <div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted)">মোট বেতন</div>
          <div style="font-size:16px;font-weight:800;color:var(--accent);font-family:'Sora',sans-serif">৳window.${Math.round(totalSalary).toLocaleString('bn-BD')}</div>
        </div>
        window.${window.CR==='admin' ? `<div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:12px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--muted)">নিট লাভ</div>
          <div style="font-size:16px;font-weight:800;color:var(--green);font-family:'Sora',sans-serif">৳window.${Math.round(totalProfit - totalExp - totalSalary).toLocaleString('bn-BD')}</div>
        </div>` : ''}
      </div>
      <div style="text-align:right;font-size:11px;color:var(--muted);margin-top:6px">মোট window.${transactions.length}টি লেনদেন</div>`;
  }

  if (!transactions.length) {
    listEl.innerHTML = '<div class="empty"><div class="ic">📒</div><p>এই সময়ে কোনো লেনদেন নেই</p></div>';
    return;
  }

  // ── Transaction list render ──
  listEl.innerHTML = transactions.map(t => {
    const timeStr = t.ts ? new Date(t.ts).toLocaleString('bn-BD', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    }) : t.date;

    return `<div style="background:var(--card);border-radius:var(--r);padding:13px 14px;border:1px solid var(--border-l);margin-bottom:8px;border-left:3px solid ${t.color}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="font-size:16px">window.${t.icon}</span>
            <span style="font-size:13px;font-weight:700;color:var(--text)">window.${t.title}</span>
          </div>
          window.${t.sub1 ? `<div style="font-size:11px;color:var(--muted)">${t.sub1}</div>` : ''}
          window.${t.sub2 ? `<div style="font-size:11px;color:var(--muted)">${t.sub2}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:5px;flex-wrap:wrap">
            <span style="font-size:10px;color:${t.extraColor};background:${t.extraColor}15;padding:2px 7px;border-radius:10px">window.${t.extra}</span>
            window.${t.type === 'sale' && t.discount > 0 ? `<span style="font-size:10px;color:var(--muted)">ডিসকাউন্ট ${t.discount}%</span>` : ''}
            window.${t.type === 'sale' ? `<span style="font-size:10px;color:var(--blue)">নগদ ৳${Math.round(t.cash).toLocaleString('bn-BD')}</span>` : ''}
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:10px">
          <div style="font-size:16px;font-weight:800;color:${t.color};font-family:'Sora',sans-serif">
            window.${t.type === 'expense' || t.type === 'salary' ? '-' : '+'}৳window.${Math.round(t.amount).toLocaleString('bn-BD')}
          </div>
          <div style="font-size:10px;color:var(--muted);margin-top:3px">window.${timeStr}</div>
          <div style="font-size:9px;color:var(--muted)">window.${t.date}</div>
        </div>
      </div>
    </div>`;
  }).join('');
};

window.ledgerExportPDF = () => {
  const w = window.open('', '_blank');
  const fromVal = document.getElementById('ledgerFrom')?.value || 'শুরু';
  const toVal   = document.getElementById('ledgerTo')?.value   || 'এখন';
  const content = document.getElementById('ledgerList')?.innerHTML || '';
  const summary = document.getElementById('ledgerSummary')?.innerHTML || '';
  w.document.write(`<html><head><meta charset="UTF-8">
    <title>NovaTEch BD লেজার</title>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body{font-family:'Hind Siliguri',Arial,sans-serif;padding:20px;color:#0f172a;max-width:800px;margin:0 auto}
      h1{color:#1e3a8a;border-bottom:3px solid #1e3a8a;padding-bottom:8px}
      .sub{color:#64748b;font-size:13px;margin-bottom:16px}
      @media print{button{display:none!important}}
    </style></head><body>
    <h1>📒 NovaTEch BD — সম্পূর্ণ লেজার</h1>
    <div class="sub">সময়কাল: window.${fromVal} থেকে window.${toVal} | তৈরি: window.${new Date().toLocaleString('bn-BD')}</div>
    window.${summary}
    <br>window.${content}
    <br><button onclick="window.print()" style="padding:12px 24px;background:#1e3a8a;color:#fff;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit">🖨️ Print / PDF সেভ করুন</button>
    </body></html>`);
  w.document.close();
};

window.ledgerExportExcel = () => {
  const fromVal = document.getElementById('ledgerFrom')?.value || '';
  const toVal   = document.getElementById('ledgerTo')?.value   || '';

  const inRange = (dateStr) => {
    if (!fromVal && !toVal) return true;
    if (fromVal && dateStr < fromVal) return false;
    if (toVal   && dateStr > toVal)   return false;
    return true;
  };

  let csv = '\uFEFF'; // Bengali BOM
  csv += `NovaTEch BD লেজার — ${fromVal || 'শুরু'} থেকে ${toVal || 'এখন'}\n\n`;

  // বিক্রয়
  csv += '--- বিক্রয় তালিকা ---\n';
  // ✅ Admin হলে লাভ কলাম, না হলে নেই
  csv += window.CR==='admin'
    ? 'তারিখ,সময়,দোকান,পণ্য,পরিমাণ,মূল্য,ডিসকাউন্ট%,মোট,নগদ,বাকি,লাভ,কর্মী,OTP\n'
    : 'তারিখ,সময়,দোকান,পণ্য,পরিমাণ,মূল্য,ডিসকাউন্ট%,মোট,নগদ,বাকি,কর্মী,OTP\n';
  const selectedW = document.getElementById('ledgerWorkerFilter')?.value || '';
  Object.values(window.allSales || {})
    .filter(s => inRange(s.date || '') && (!selectedW || s.uid===selectedW))
    .sort((a,b)=>(b.ts||0)-(a.ts||0))
    .forEach(s => {
      const time = s.ts ? new Date(s.ts).toLocaleTimeString('bn-BD') : '';
      const cash = (s.total||0) - (s.due||0);
      if(window.CR==='admin'){
        csv += `${s.date||''},${time},${s.shop||''},${s.product||''},${s.qty||1},${s.sellPrice||0},${s.disc||0},${Math.round(s.total||0)},${Math.round(cash)},${Math.round(s.due||0)},${Math.round(s.profit||0)},${s.workerName||''},${s.otpConfirmed?'হ্যাঁ':'না'}\n`;
      } else {
        csv += `${s.date||''},${time},${s.shop||''},${s.product||''},${s.qty||1},${s.sellPrice||0},${s.disc||0},${Math.round(s.total||0)},${Math.round(cash)},${Math.round(s.due||0)},${s.workerName||''},${s.otpConfirmed?'হ্যাঁ':'না'}\n`;
      }
    });

  // পেমেন্ট লগ
  csv += '\n--- বাকি আদায় ---\n';
  csv += 'তারিখ,সময়,দোকান,পরিমাণ,আদায়কারী\n';
  Object.values(window.allPaymentLogs || {}).filter(p => inRange(p.date || '')).forEach(p => {
    const time = p.ts ? new Date(p.ts).toLocaleTimeString('bn-BD') : '';
    csv += `${p.date||''},${time},${p.shop||''},${Math.round(p.amount||0)},${p.collectedBy||''}\n`;
  });

  // খরচ
  csv += '\n--- খরচ তালিকা ---\n';
  csv += 'তারিখ,সময়,ধরন,পরিমাণ,নোট,কর্মী,স্ট্যাটাস\n';
  Object.values(window.allExpenses || {}).filter(e => inRange(e.date || '')).forEach(e => {
    const time = e.ts ? new Date(e.ts).toLocaleTimeString('bn-BD') : '';
    csv += `${e.date||''},${time},${e.type||''},${Math.round(e.amount||0)},${(e.note||'').replace(/,/g,'')},${e.workerName||''},${e.status||''}\n`;
  });

  // বেতন
  csv += '\n--- বেতন ও কমিশন ---\n';
  csv += 'মাস,নাম,মূল বেতন,কমিশন,মোট,লেট কাউন্ট\n';
  Object.values(window.allSalaries || {}).forEach(s => {
    const total = (s.baseSalary||s.salary||0) + (s.commission||0);
    csv += `${s.month||''},${s.name||s.workerName||''},${Math.round(s.baseSalary||s.salary||0)},${Math.round(s.commission||0)},${Math.round(total)},${s.lateCount||0}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `NovaTEch_Ledger_${fromVal||'all'}_${toVal||'now'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  window.showToast('✅ Excel ফাইল download হচ্ছে');
};

// ✅ Salary Slip Generator
window.generateSalarySlip = function() {
  const sal = window.allSalaries[window.CU?.uid]; if(!sal) { window.showToast('বেতন তথ্য নেই!',true); return; }
  const now = new Date();
  const monthName = now.toLocaleString('bn-BD',{month:'long',year:'numeric'});
  const curMonth = now.getMonth(), curYear = now.getFullYear();
  const mySales = (window._sc.byUid[window.CU.uid]||[]).filter(s=>{
    const d=new Date(s.date);return d.getMonth()===curMonth&&d.getFullYear()===curYear;
  });
  const totalSale = mySales.reduce((a,b)=>a+(b.total||0),0);
  const comm = Math.round(Object.values(buildDailyCommMap(mySales)).reduce((a,v)=>a+calcCommission(v,window.allCommConfig||getDefaultSlabs()),0));
  const attList = Object.values(window.allAttendance).filter(a=>{
    const d=new Date(a.date);return a.uid===window.CU.uid&&d.getMonth()===curMonth&&d.getFullYear()===curYear;
  });
  const attDays = attList.length;
  const lateDays = attList.filter(a=>a.isLate).length;
  const allowTotal = Math.round(Object.values(window.allAllowances||{}).filter(a=>a.uid===window.CU.uid).reduce((a,b)=>a+(b.amount||0),0));
  const workDays = 26;
  const earnedBasic = Math.round((sal.basic||0)/workDays*attDays);
  const netPay = earnedBasic + comm + allowTotal;

  const ic = document.getElementById('invoiceContent'); if(!ic) return;
  window._currentInvoiceSaleId = null;
  ic.innerHTML=`
  <div style="font-family:'Hind Siliguri',Arial,sans-serif;padding:16px;color:#1a202c;max-width:400px;">
    <div style="background:linear-gradient(135deg,#065f46,#059669);color:#fff;padding:16px;border-radius:10px;margin-bottom:14px;">
      <div style="font-size:18px;font-weight:800;">📒 NovaTEch BD</div>
      <div style="font-size:11px;opacity:.75;margin-top:2px;">বেতন রশিদ (Salary Slip)</div>
      <div style="margin-top:8px;font-size:13px;opacity:.9;">window.${monthName}</div>
    </div>
    <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;">
        <div><div style="font-size:10px;color:#64748b;">কর্মীর নাম</div><div style="font-weight:700;font-size:14px;">window.${window.CN}</div></div>
        <div style="text-align:right;"><div style="font-size:10px;color:#64748b;">শিফট</div><div style="font-weight:600;font-size:12px;">window.${sal.shiftStart||'10:00'} – window.${sal.shiftEnd||'17:50'}</div></div>
      </div>
    </div>
    <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:12px;">
      <div style="font-size:10px;color:#64748b;font-weight:700;margin-bottom:6px;">📅 উপস্থিতি ও বিক্রয়</div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;"><span style="color:#64748b;">উপস্থিতি</span><span style="font-weight:600;">window.${attDays} দিন</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;"><span style="color:#64748b;">দেরিতে আসা</span><span style="color:${lateDays>0?'#ef4444':'#059669'};font-weight:600;">window.${lateDays} বার</span></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;"><span style="color:#64748b;">মাসের বিক্রয়</span><span style="font-weight:600;">window.${window.bn(totalSale)}</span></div>
    </div>
    <div style="border:1.5px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:12px;">
      <div style="background:#1E3A8A;color:#fff;padding:8px 12px;font-size:11px;font-weight:700;">💰 বেতন হিসাব</div>
      <div style="padding:10px 12px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#64748b;">মূল বেতন (window.${attDays}/window.${workDays} দিন)</span><span style="font-weight:600;">window.${window.bn(earnedBasic)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#64748b;">কমিশন</span><span style="font-weight:600;color:#d97706;">window.${window.bn(comm)}</span></div>
        window.${allowTotal>0?`<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#64748b;">ভাতা</span><span style="font-weight:600;color:#0891b2;">${bn(allowTotal)}</span></div>`:''}
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;padding:8px 0;color:#059669;border-top:2px solid #e2e8f0;margin-top:4px;"><span>নেট বেতন</span><span>window.${window.bn(netPay)}</span></div>
      </div>
    </div>
    <div style="margin-bottom:12px;display:flex;gap:8px;">
      <button onclick="printInvoice()" style="flex:1;padding:9px;background:rgba(59,130,246,.12);border:1px solid var(--blue);border-radius:8px;color:#1E3A8A;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">🖨️ প্রিন্ট</button>
      <button onclick="shareSalaryWA(${earnedBasic},${comm},${allowTotal},${netPay},${attDays},'${monthName}')" style="flex:1;padding:9px;background:rgba(37,211,102,.12);border:1px solid #25d366;border-radius:8px;color:#25d366;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;">📲 WhatsApp</button>
    </div>
    <div style="text-align:center;font-size:10px;color:#94a3b8;padding-top:8px;border-top:1px dashed #e2e8f0;">
      আমাদের সাথে যুক্ত হবার জন্য আপনাকে ধন্যবাদ<br>NovaTEch BD
    </div>
  </div>`;
  const h3=document.querySelector('#invoiceMo h3');
  if(h3) h3.textContent='🧾 বেতন রশিদ';
  openMo('invoiceMo');
};

window.shareSalaryWA = function(basic,comm,allow,net,att,month) {
  const line='━━━━━━━━━━━━━━━━━━━━';
  const msg=`📒 *NovaTEch BD*\n_বেতন রশিদ — ${month}_\n${line}\n👤 *${window.CN}*\n${line}\n💵 *মূল বেতন:* ${bn(basic)}\n🏆 *কমিশন:* ${bn(comm)}${allow>0?'\n🎁 *ভাতা:* '+bn(allow):''}\n📅 *উপস্থিতি:* ${att} দিন\n${line}\n💰 *নেট বেতন: ${bn(net)}*\n${line}\n_আমাদের সাথে যুক্ত হবার জন্য আপনাকে ধন্যবাদ_\n_NovaTEch BD_`;
  window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
};
