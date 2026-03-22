// ══════════════════════════════════════════════════════════════
//  NovaTEch BD — Replacement System (গ্যারান্টি/রিপ্লেসমেন্ট)
//  features.js এর মতো আলাদা ফাইল — app.js এ হাত নেই
//  Worker + Manager + Admin সবাই ব্যবহার করতে পারবে
// ══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── app.js ready হওয়ার জন্য অপেক্ষা ──
  function waitForApp(cb, tries = 0) {
    if (window._db && window.CU && window.CR) { cb(); return; }
    if (tries > 100) return;
    setTimeout(() => waitForApp(cb, tries + 1), 300);
  }

  const $ = id => document.getElementById(id);
  const toast = (m, e) => window.showToast && window.showToast(m, e);
  const today = () => new Date().toISOString().split('T')[0];
  const bn = n => '৳' + Math.round(n || 0).toLocaleString('bn-BD');
  const DB = () => window._db;
  const fbRef = (path) => window._ref(DB(), path);
  const fbPush = (path, data) => window._push(fbRef(path), data);
  const fbUpdate = (path, data) => window._update(fbRef(path), data);
  const fbGet = (path) => window._get(fbRef(path));
  const fbOnValue = (path, cb) => window._onValue(fbRef(path), cb);

  let allReplacements = {};

  // ══════════════════════════════════════════════
  //  CSS INJECT
  // ══════════════════════════════════════════════
  function injectCSS() {
    if ($('rpl-css')) return;
    const s = document.createElement('style');
    s.id = 'rpl-css';
    s.textContent = `
/* ── Replacement Page ── */
#page-replace { padding: 0; }

.rpl-wrap { padding: 12px; display: flex; flex-direction: column; gap: 12px; }

/* Form card */
.rpl-form {
  background: var(--card, #1a2236);
  border: 1px solid var(--border, rgba(99,179,237,.12));
  border-radius: 14px;
  padding: 14px;
}
.rpl-form-title {
  font-size: 13px; font-weight: 700; color: var(--text, #f1f5f9);
  margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
}

/* Input rows */
.rpl-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.rpl-row-1 { margin-bottom: 8px; }
.rpl-label {
  font-size: 10px; font-weight: 600; color: var(--muted, #64748b);
  margin-bottom: 4px; text-transform: uppercase; letter-spacing: .3px;
}
.rpl-input, .rpl-select {
  width: 100%; padding: 9px 11px;
  background: var(--surface, #111827);
  border: 1px solid var(--border, rgba(99,179,237,.12));
  border-radius: 9px; color: var(--text, #f1f5f9);
  font-size: 13px; font-family: 'Hind Siliguri', sans-serif;
  outline: none; transition: border-color .2s;
}
.rpl-input:focus, .rpl-select:focus {
  border-color: rgba(59,130,246,.5);
}

/* Difference display */
.rpl-diff {
  padding: 10px 12px;
  border-radius: 10px;
  margin: 8px 0;
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: space-between;
}
.rpl-diff.positive {
  background: rgba(239,68,68,.1);
  border: 1px solid rgba(239,68,68,.2);
  color: #ef4444;
}
.rpl-diff.negative {
  background: rgba(16,185,129,.1);
  border: 1px solid rgba(16,185,129,.2);
  color: #10b981;
}
.rpl-diff.zero {
  background: rgba(99,179,237,.08);
  border: 1px solid rgba(99,179,237,.15);
  color: var(--muted, #64748b);
}

/* Save button */
.rpl-btn {
  width: 100%; padding: 12px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none; border-radius: 10px;
  color: white; font-size: 13px; font-weight: 700;
  cursor: pointer; font-family: 'Hind Siliguri', sans-serif;
  margin-top: 4px; transition: opacity .15s;
}
.rpl-btn:active { opacity: .85; }

/* List */
.rpl-list-title {
  font-size: 12px; font-weight: 700; color: var(--muted, #64748b);
  text-transform: uppercase; letter-spacing: .5px;
  display: flex; align-items: center; justify-content: space-between;
}

.rpl-item {
  background: var(--card, #1a2236);
  border: 1px solid var(--border, rgba(99,179,237,.1));
  border-radius: 12px; padding: 12px;
  margin-bottom: 8px;
  animation: rplIn .3s ease both;
}
@keyframes rplIn {
  from { opacity:0; transform:translateY(8px); }
  to { opacity:1; transform:translateY(0); }
}

.rpl-item-top {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 8px;
  margin-bottom: 8px;
}
.rpl-item-info { flex: 1; min-width: 0; }
.rpl-item-shop {
  font-size: 13px; font-weight: 700; color: var(--text, #f1f5f9);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rpl-item-worker {
  font-size: 10px; color: var(--muted, #64748b); margin-top: 2px;
}
.rpl-item-date {
  font-size: 10px; color: var(--muted, #64748b); flex-shrink: 0;
}

.rpl-item-prods {
  display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
  margin-bottom: 8px;
}
.rpl-prod-box {
  background: var(--surface, #111827);
  border-radius: 8px; padding: 8px;
}
.rpl-prod-lbl {
  font-size: 9px; font-weight: 700; color: var(--muted, #64748b);
  text-transform: uppercase; margin-bottom: 3px;
}
.rpl-prod-name { font-size: 11px; font-weight: 600; color: var(--text, #f1f5f9); }
.rpl-prod-qty  { font-size: 10px; color: var(--muted, #64748b); }
.rpl-prod-price { font-size: 12px; font-weight: 700; margin-top: 2px; }

.rpl-item-bottom {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid rgba(99,179,237,.06);
}
.rpl-status-badge {
  font-size: 10px; font-weight: 700;
  padding: 3px 9px; border-radius: 20px;
}
.rpl-status-badge.pending {
  background: rgba(245,158,11,.12);
  color: #f59e0b;
  border: 1px solid rgba(245,158,11,.25);
}
.rpl-status-badge.verified {
  background: rgba(16,185,129,.12);
  color: #10b981;
  border: 1px solid rgba(16,185,129,.25);
}

.rpl-diff-badge {
  font-size: 11px; font-weight: 700;
}

.rpl-verify-btn {
  font-size: 11px; font-weight: 600; padding: 4px 10px;
  border-radius: 7px; cursor: pointer;
  border: 1px solid rgba(16,185,129,.3);
  background: rgba(16,185,129,.12);
  color: #10b981;
  font-family: 'Hind Siliguri', sans-serif;
}

.rpl-empty {
  text-align: center; padding: 30px; color: var(--muted, #64748b);
  font-size: 13px;
}

/* Filter tabs */
.rpl-filters {
  display: flex; gap: 4px;
  background: var(--surface, #111827);
  border: 1px solid var(--border, rgba(99,179,237,.1));
  padding: 4px; border-radius: 10px;
}
.rpl-filter {
  flex: 1; padding: 5px; text-align: center;
  border-radius: 7px; font-size: 11px; font-weight: 600;
  cursor: pointer; color: var(--muted, #64748b);
  border: none; background: none;
  font-family: 'Hind Siliguri', sans-serif; transition: all .15s;
}
.rpl-filter.on {
  background: rgba(59,130,246,.18);
  color: #60a5fa;
  box-shadow: inset 0 0 0 1px rgba(59,130,246,.3);
}
    `;
    document.head.appendChild(s);
  }

  // ══════════════════════════════════════════════
  //  PAGE HTML — index.html এ inject করি
  // ══════════════════════════════════════════════
  function injectPage() {
    if ($('page-replace')) return; // already exists

    const appScreen = document.getElementById('appScreen');
    if (!appScreen) return;

    const page = document.createElement('div');
    page.className = 'page';
    page.id = 'page-replace';
    page.style.display = 'none';
    page.innerHTML = `
<div class="rpl-wrap">

  <!-- FORM -->
  <div class="rpl-form">
    <div class="rpl-form-title">🔄 নতুন রিপ্লেসমেন্ট এন্ট্রি</div>

    <!-- দোকান + তারিখ -->
    <div class="rpl-row">
      <div>
        <div class="rpl-label">দোকান / কাস্টমার</div>
        <select class="rpl-select" id="rplShop" onchange="window.rplShopChange()">
          <option value="">-- কাস্টমার বেছে নিন --</option>
        </select>
      </div>
      <div>
        <div class="rpl-label">তারিখ</div>
        <input type="date" class="rpl-input" id="rplDate">
      </div>
    </div>

    <!-- কর্মী (manager/admin দেখবে) -->
    <div class="rpl-row-1" id="rplWorkerRow">
      <div class="rpl-label">কর্মী</div>
      <select class="rpl-select" id="rplWorker">
        <option value="">-- কর্মী বেছে নিন --</option>
      </select>
    </div>

    <!-- ফেরত মাল (কাস্টমার দিলো) -->
    <div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:10px;padding:10px;margin-bottom:8px;">
      <div style="font-size:11px;font-weight:700;color:#ef4444;margin-bottom:8px;">📥 ফেরত মাল (কাস্টমার দিলো)</div>
      <div class="rpl-row">
        <div>
          <div class="rpl-label">পণ্যের নাম</div>
          <select class="rpl-select" id="rplRetProd" onchange="window.rplCalcDiff()">
            <option value="">-- পণ্য --</option>
          </select>
        </div>
        <div>
          <div class="rpl-label">পরিমাণ (পিস)</div>
          <input type="number" class="rpl-input" id="rplRetQty" min="1" value="1" oninput="window.rplCalcDiff()">
        </div>
      </div>
      <div>
        <div class="rpl-label">একক দাম (৳)</div>
        <input type="number" class="rpl-input" id="rplRetPrice" min="0" placeholder="০" oninput="window.rplCalcDiff()">
      </div>
    </div>

    <!-- দেওয়া মাল (কর্মী দিলো) -->
    <div style="background:rgba(16,185,129,.06);border:1px solid rgba(16,185,129,.15);border-radius:10px;padding:10px;margin-bottom:8px;">
      <div style="font-size:11px;font-weight:700;color:#10b981;margin-bottom:8px;">📤 দেওয়া মাল (কর্মী দিলো)</div>
      <div class="rpl-row">
        <div>
          <div class="rpl-label">পণ্যের নাম</div>
          <select class="rpl-select" id="rplGivProd" onchange="window.rplCalcDiff()">
            <option value="">-- পণ্য --</option>
          </select>
        </div>
        <div>
          <div class="rpl-label">পরিমাণ (পিস)</div>
          <input type="number" class="rpl-input" id="rplGivQty" min="1" value="1" oninput="window.rplCalcDiff()">
        </div>
      </div>
      <div>
        <div class="rpl-label">একক দাম (৳)</div>
        <input type="number" class="rpl-input" id="rplGivPrice" min="0" placeholder="০" oninput="window.rplCalcDiff()">
      </div>
    </div>

    <!-- দামের পার্থক্য -->
    <div id="rplDiffBox" class="rpl-diff zero" style="display:none">
      <span id="rplDiffLabel">পার্থক্য হিসাব</span>
      <span id="rplDiffVal">৳০</span>
    </div>

    <!-- পার্থক্য মেটানোর উপায় (পার্থক্য থাকলেই দেখাবে) -->
    <div id="rplSettleBox" style="display:none;margin-bottom:8px;">
      <div class="rpl-label" style="margin-bottom:6px;">পার্থক্য কীভাবে মেটাবেন?</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <label style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:var(--surface,#111827);border:1px solid var(--border,rgba(99,179,237,.12));border-radius:9px;cursor:pointer;">
          <input type="radio" name="rplSettle" value="due" checked onchange="window.rplSettleChange(this)">
          <span style="font-size:12px;font-weight:600;color:var(--text)">🏦 বাকি হিসেবে রাখো — পরে মিটাবে</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:var(--surface,#111827);border:1px solid var(--border,rgba(99,179,237,.12));border-radius:9px;cursor:pointer;">
          <input type="radio" name="rplSettle" value="cash" onchange="window.rplSettleChange(this)">
          <span style="font-size:12px;font-weight:600;color:var(--text)">💵 নগদে মিটিয়েছি — এখনই শেষ</span>
        </label>
        <label style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:var(--surface,#111827);border:1px solid var(--border,rgba(99,179,237,.12));border-radius:9px;cursor:pointer;">
          <input type="radio" name="rplSettle" value="goods" onchange="window.rplSettleChange(this)">
          <span style="font-size:12px;font-weight:600;color:var(--text)">📦 অন্য মাল দিয়ে মিটিয়েছি</span>
        </label>
      </div>

      <!-- অন্য মাল দিলে extra field -->
      <div id="rplGoodsSettleBox" style="display:none;margin-top:8px;background:rgba(139,92,246,.06);border:1px solid rgba(139,92,246,.2);border-radius:10px;padding:10px;">
        <div style="font-size:11px;font-weight:700;color:#8b5cf6;margin-bottom:8px;">📦 অতিরিক্ত মালের বিবরণ</div>
        <div class="rpl-row">
          <div>
            <div class="rpl-label">পণ্য</div>
            <select class="rpl-select" id="rplExtraProd">
              <option value="">-- পণ্য --</option>
            </select>
          </div>
          <div>
            <div class="rpl-label">পরিমাণ</div>
            <input type="number" class="rpl-input" id="rplExtraQty" min="1" value="1">
          </div>
        </div>
      </div>
    </div>

    <!-- নোট -->
    <div class="rpl-row-1">
      <div class="rpl-label">নোট (ঐচ্ছিক)</div>
      <input type="text" class="rpl-input" id="rplNote" placeholder="কারণ বা বিবরণ...">
    </div>

    <button class="rpl-btn" onclick="window.rplSave()">✅ রিপ্লেসমেন্ট সংরক্ষণ</button>
  </div>

  <!-- FILTER -->
  <div class="rpl-filters">
    <button class="rpl-filter on" onclick="window.rplFilter('all',this)">সব</button>
    <button class="rpl-filter" onclick="window.rplFilter('pending',this)">অপেক্ষায়</button>
    <button class="rpl-filter" onclick="window.rplFilter('verified',this)">যাচাই হয়েছে</button>
  </div>

  <!-- LIST -->
  <div>
    <div class="rpl-list-title">
      <span>📋 রিপ্লেসমেন্ট তালিকা</span>
      <span id="rplCount" style="font-size:11px;color:var(--muted)"></span>
    </div>
    <div id="rplList" style="margin-top:10px"></div>
  </div>

</div>
    `;

    // appScreen এর শেষে যোগ করি
    appScreen.appendChild(page);
  }

  // ══════════════════════════════════════════════
  //  NAV MENU তে যোগ করি
  // ══════════════════════════════════════════════
  function addToNav() {
    // showPage hook — রিপ্লেস পেজ handle করি
    const _origSP = window.showPage;
    window.showPage = function (id, isBack) {
      if (typeof _origSP === 'function') _origSP(id, isBack);
      if (id === 'replace') {
        const pg = $('page-replace');
        if (pg) {
          pg.style.display = 'block';
          loadSelects();
          renderList('all');
        }
      }
    };

    // Drawer menu তে 📦 স্টক ও খরচ গ্রুপে যোগ করি
    const _origBuildNav = window.buildNav;
    window.buildNav = function () {
      if (typeof _origBuildNav === 'function') _origBuildNav();
      // drawer এ রিপ্লেস লিংক inject করি
      injectNavLink();
    };
  }

  function injectNavLink() {
    // drawer list এ স্টক এর পরে রিপ্লেস যোগ করি
    const drawerEl = document.querySelector('#drawerMenu .drawer-list, .drawer-body, #drawerList');
    if (!drawerEl) return;
    if (document.getElementById('rpl-nav-btn')) return; // already added

    const btn = document.createElement('button');
    btn.id = 'rpl-nav-btn';
    btn.className = 'drawer-item';
    btn.style.cssText = 'display:flex;align-items:center;gap:10px;width:100%;padding:11px 16px;background:none;border:none;color:var(--text);font-family:inherit;font-size:13px;cursor:pointer;text-align:left;';
    btn.innerHTML = `<span style="font-size:18px">🔄</span><span style="font-weight:600">রিপ্লেসমেন্ট</span>`;
    btn.onclick = () => {
      window.navTo('replace');
      if (window.closeDrawer) window.closeDrawer();
    };
    drawerEl.appendChild(btn);
  }

  // ══════════════════════════════════════════════
  //  SELECTS LOAD
  // ══════════════════════════════════════════════
  function loadSelects() {
    const custs = window.allCustomers || {};
    const prods = window.allProducts || {};
    const users = window.allUsers || {};

    // দোকান
    const shopSel = $('rplShop');
    if (shopSel) {
      shopSel.innerHTML = '<option value="">-- কাস্টমার বেছে নিন --</option>' +
        Object.entries(custs).map(([id, c]) =>
          `<option value="${id}" data-name="${c.shop||c.name||''}">${c.shop || c.name}</option>`
        ).join('');
    }

    // পণ্য
    const prodOpts = '<option value="">-- পণ্য --</option>' +
      Object.entries(prods).map(([id, p]) =>
        `<option value="${id}" data-price="${p.sellPrice||p.price||0}">${p.name}</option>`
      ).join('');
    [$('rplRetProd'), $('rplGivProd')].forEach(s => { if (s) s.innerHTML = prodOpts; });

    // কর্মী
    const workerSel = $('rplWorker');
    const workerRow = $('rplWorkerRow');
    if (window.CR === 'worker') {
      if (workerRow) workerRow.style.display = 'none';
    } else {
      if (workerRow) workerRow.style.display = 'block';
      if (workerSel) {
        workerSel.innerHTML = '<option value="">-- কর্মী বেছে নিন --</option>' +
          Object.entries(users)
            .filter(([, u]) => u.role === 'worker' || u.role === 'manager')
            .map(([id, u]) => `<option value="${id}">${u.name}</option>`).join('');
      }
    }

    // তারিখ
    const dateSel = $('rplDate');
    if (dateSel && !dateSel.value) dateSel.value = today();
  }

  // ══════════════════════════════════════════════
  //  CALC DIFF
  // ══════════════════════════════════════════════
  window.rplCalcDiff = function () {
    const retPrice = parseFloat($('rplRetPrice')?.value || 0);
    const retQty   = parseInt($('rplRetQty')?.value || 1);
    const givPrice = parseFloat($('rplGivPrice')?.value || 0);
    const givQty   = parseInt($('rplGivQty')?.value || 1);

    const retTotal = retPrice * retQty;
    const givTotal = givPrice * givQty;
    const diff = givTotal - retTotal;

    const box    = $('rplDiffBox');
    const lbl    = $('rplDiffLabel');
    const val    = $('rplDiffVal');
    const settle = $('rplSettleBox');

    if (!box) return;

    if (retPrice === 0 && givPrice === 0) {
      box.style.display = 'none';
      if (settle) settle.style.display = 'none';
      return;
    }

    box.style.display = 'flex';

    if (diff > 0) {
      box.className = 'rpl-diff positive';
      lbl.textContent = `দোকান ${bn(diff)} বেশি পাবে`;
      val.textContent = `+${bn(diff)}`;
      if (settle) settle.style.display = 'block';
    } else if (diff < 0) {
      box.className = 'rpl-diff negative';
      lbl.textContent = `দোকান ${bn(Math.abs(diff))} কম পাবে`;
      val.textContent = `${bn(diff)}`;
      if (settle) settle.style.display = 'block';
    } else {
      box.className = 'rpl-diff zero';
      lbl.textContent = 'সমান — কোনো পার্থক্য নেই';
      val.textContent = '৳০';
      if (settle) settle.style.display = 'none';
    }
  };

  window.rplSettleChange = function (radio) {
    const goodsBox = $('rplGoodsSettleBox');
    if (goodsBox) goodsBox.style.display = radio.value === 'goods' ? 'block' : 'none';
    // extra prod select populate
    if (radio.value === 'goods') {
      const prods = window.allProducts || {};
      const sel = $('rplExtraProd');
      if (sel) {
        sel.innerHTML = '<option value="">-- পণ্য --</option>' +
          Object.entries(prods).map(([id, p]) =>
            `<option value="${id}">${p.name}</option>`
          ).join('');
      }
    }
  };

  // ══════════════════════════════════════════════
  //  SAVE
  // ══════════════════════════════════════════════
  window.rplSave = async function () {
    const shopId   = $('rplShop')?.value;
    const date     = $('rplDate')?.value;
    const retProdId = $('rplRetProd')?.value;
    const givProdId = $('rplGivProd')?.value;
    const retQty   = parseInt($('rplRetQty')?.value || 0);
    const givQty   = parseInt($('rplGivQty')?.value || 0);
    const retPrice = parseFloat($('rplRetPrice')?.value || 0);
    const givPrice = parseFloat($('rplGivPrice')?.value || 0);

    if (!shopId)    { toast('দোকান বেছে নিন!', true); return; }
    if (!date)      { toast('তারিখ দিন!', true); return; }
    if (!retProdId) { toast('ফেরত পণ্য বেছে নিন!', true); return; }
    if (!givProdId) { toast('দেওয়া পণ্য বেছে নিন!', true); return; }
    if (retQty < 1) { toast('ফেরত পরিমাণ দিন!', true); return; }
    if (givQty < 1) { toast('দেওয়া পরিমাণ দিন!', true); return; }

    const custs = window.allCustomers || {};
    const prods = window.allProducts  || {};
    const users = window.allUsers     || {};

    const shopName = custs[shopId]?.shop || custs[shopId]?.name || '—';
    const retProd  = prods[retProdId]?.name || '—';
    const givProd  = prods[givProdId]?.name || '—';

    // কর্মী
    let uid, workerName;
    if (window.CR === 'worker') {
      uid = window.CU?.uid;
      workerName = window.CN;
    } else {
      uid = $('rplWorker')?.value;
      workerName = uid ? (users[uid]?.name || '—') : window.CN;
    }

    const retTotal  = retPrice * retQty;
    const givTotal  = givPrice * givQty;
    const diff      = givTotal - retTotal;

    // settlement method
    const settleMethod = diff !== 0
      ? (document.querySelector('input[name="rplSettle"]:checked')?.value || 'due')
      : 'equal';

    // অতিরিক্ত মাল (goods settlement)
    let extraProdId = '', extraProd = '', extraQty = 0;
    if (settleMethod === 'goods') {
      extraProdId = $('rplExtraProd')?.value || '';
      extraQty    = parseInt($('rplExtraQty')?.value || 0);
      extraProd   = extraProdId ? (prods[extraProdId]?.name || '') : '';
      if (!extraProdId || !extraQty) {
        toast('অতিরিক্ত মালের তথ্য দিন!', true); return;
      }
    }

    const data = {
      date, shopId, shopName,
      uid, workerName,
      retProdId, retProd, retQty, retPrice, retTotal,
      givProdId, givProd, givQty, givPrice, givTotal,
      diff,
      settleMethod,   // 'due' | 'cash' | 'goods' | 'equal'
      extraProdId, extraProd, extraQty,
      note: $('rplNote')?.value.trim() || '',
      status: 'pending',
      addedBy: window.CU?.uid,
      addedByName: window.CN,
      ts: Date.now(),
    };

    try {
      toast('সংরক্ষণ হচ্ছে...');
      await fbPush('replacements', data);

      // Settlement অনুযায়ী বাকি আপডেট
      const sales = window.allSales || {};
      const shopSales = Object.entries(sales)
        .filter(([, s]) => s.shopId === shopId)
        .sort((a, b) => (b[1].ts||0) - (a[1].ts||0));

      if (settleMethod === 'due' && diff !== 0 && shopSales.length > 0) {
        // বাকিতে যোগ/বিয়োগ
        const [latestId, latestSale] = shopSales[0];
        const newDue = Math.max(0, (latestSale.due || 0) + diff);
        await fbUpdate(`sales/${latestId}`, { due: newDue });
        const msg = diff > 0
          ? `${bn(diff)} বাকি যোগ হয়েছে`
          : `${bn(Math.abs(diff))} বাকি কমেছে`;
        toast(`✅ সংরক্ষিত — ${msg}`);

      } else if (settleMethod === 'cash') {
        toast('✅ সংরক্ষিত — নগদে মিটিয়ে দেওয়া হয়েছে');

      } else if (settleMethod === 'goods') {
        toast(`✅ সংরক্ষিত — ${extraProd} (${extraQty} পিস) দিয়ে মিটিয়েছেন`);

      } else {
        toast('✅ রিপ্লেসমেন্ট সংরক্ষিত — সমান মাল');
      }

      // Notification
      if (window.CR === 'worker' && window.sendNotificationToRole) {
        window.sendNotificationToRole('manager',
          '🔄 নতুন রিপ্লেসমেন্ট',
          `${window.CN} — ${shopName}: ${retProd} → ${givProd}`,
          'replace'
        );
      }

      // Form reset
      ['rplShop','rplRetProd','rplGivProd','rplWorker','rplExtraProd'].forEach(id => {
        const el = $(id); if (el) el.value = '';
      });
      ['rplRetQty','rplGivQty','rplExtraQty'].forEach(id => {
        const el = $(id); if (el) el.value = '1';
      });
      ['rplRetPrice','rplGivPrice','rplNote'].forEach(id => {
        const el = $(id); if (el) el.value = '';
      });
      const box = $('rplDiffBox');    if (box) box.style.display = 'none';
      const sb  = $('rplSettleBox'); if (sb)  sb.style.display  = 'none';
      // reset radio
      const firstRadio = document.querySelector('input[name="rplSettle"]');
      if (firstRadio) firstRadio.checked = true;

      renderList(_currentFilter);

    } catch (e) {
      toast('সংরক্ষণ ব্যর্থ: ' + e.message, true);
    }
  };

  // ══════════════════════════════════════════════
  //  RENDER LIST
  // ══════════════════════════════════════════════
  let _currentFilter = 'all';

  window.rplFilter = function (f, btn) {
    _currentFilter = f;
    document.querySelectorAll('.rpl-filter').forEach(b => b.classList.remove('on'));
    if (btn) btn.classList.add('on');
    renderList(f);
  };

  function renderList(filter) {
    const el = $('rplList');
    if (!el) return;

    let items = Object.entries(allReplacements)
      .map(([id, r]) => ({ ...r, _id: id }))
      .sort((a, b) => (b.ts||0) - (a.ts||0));

    // worker শুধু নিজেরটা দেখবে
    if (window.CR === 'worker') {
      items = items.filter(r => r.uid === window.CU?.uid);
    }

    // filter
    if (filter === 'pending')  items = items.filter(r => r.status === 'pending');
    if (filter === 'verified') items = items.filter(r => r.status === 'verified');

    const cnt = $('rplCount');
    if (cnt) cnt.textContent = `মোট ${items.length}টি`;

    if (!items.length) {
      el.innerHTML = `<div class="rpl-empty">📭 কোনো রিপ্লেসমেন্ট নেই</div>`;
      return;
    }

    el.innerHTML = items.map(r => {
      const settleLabel = {
        'due':   '🏦 বাকিতে',
        'cash':  '💵 নগদে মিটেছে',
        'goods': `📦 মালে মিটেছে${r.extraProd ? ' ('+r.extraProd+')' : ''}`,
        'equal': '⚖️ সমান',
      }[r.settleMethod] || '—';

      const canVerify = (window.CR === 'admin' || window.CR === 'manager') && r.status === 'pending';

      return `<div class="rpl-item">
        <div class="rpl-item-top">
          <div class="rpl-item-info">
            <div class="rpl-item-shop">🏪 ${r.shopName}</div>
            <div class="rpl-item-worker">👷 ${r.workerName}</div>
          </div>
          <div class="rpl-item-date">${r.date}</div>
        </div>

        <div class="rpl-item-prods">
          <div class="rpl-prod-box" style="border:1px solid rgba(239,68,68,.2)">
            <div class="rpl-prod-lbl" style="color:#ef4444">📥 ফেরত পেলাম</div>
            <div class="rpl-prod-name">${r.retProd}</div>
            <div class="rpl-prod-qty">${r.retQty} পিস</div>
            <div class="rpl-prod-price" style="color:#ef4444">${bn(r.retTotal)}</div>
          </div>
          <div class="rpl-prod-box" style="border:1px solid rgba(16,185,129,.2)">
            <div class="rpl-prod-lbl" style="color:#10b981">📤 দিলাম</div>
            <div class="rpl-prod-name">${r.givProd}</div>
            <div class="rpl-prod-qty">${r.givQty} পিস</div>
            <div class="rpl-prod-price" style="color:#10b981">${bn(r.givTotal)}</div>
          </div>
        </div>

        ${r.note ? `<div style="font-size:11px;color:var(--muted);margin-bottom:8px;font-style:italic;">📝 ${r.note}</div>` : ''}

        <div class="rpl-item-bottom">
          <span class="rpl-status-badge ${r.status}">${r.status === 'verified' ? '✅ যাচাই হয়েছে' : '⏳ অপেক্ষায়'}</span>
          <div style="text-align:center">
            <div class="rpl-diff-badge" style="color:${diffColor}">${diffText}</div>
            <div style="font-size:9px;color:var(--muted);margin-top:1px">${settleLabel}</div>
          </div>
          ${canVerify ? `<button class="rpl-verify-btn" onclick="window.rplVerify('${r._id}')">✓ যাচাই</button>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  // ══════════════════════════════════════════════
  //  VERIFY
  // ══════════════════════════════════════════════
  window.rplVerify = async function (id) {
    try {
      await fbUpdate(`replacements/${id}`, {
        status: 'verified',
        verifiedBy: window.CU?.uid,
        verifiedByName: window.CN,
        verifiedAt: Date.now(),
      });
      toast('✅ যাচাই সম্পন্ন');
      renderList(_currentFilter);
    } catch (e) {
      toast('যাচাই ব্যর্থ', true);
    }
  };

  // ══════════════════════════════════════════════
  //  FIREBASE LISTENER
  // ══════════════════════════════════════════════
  function startListener() {
    fbOnValue('replacements', snap => {
      allReplacements = snap.val() || {};
      // page open থাকলে re-render
      const pg = $('page-replace');
      if (pg && pg.style.display !== 'none') {
        renderList(_currentFilter);
      }
    });
  }

  // ══════════════════════════════════════════════
  //  INIT
  // ══════════════════════════════════════════════
  waitForApp(() => {
    injectCSS();
    injectPage();
    addToNav();
    startListener();

    // navTo support
    const _origNavTo = window.navTo;
    window.navTo = function (page, sub) {
      if (page === 'replace') {
        window.showPage('replace');
        return;
      }
      if (typeof _origNavTo === 'function') _origNavTo(page, sub);
    };

    console.log('✅ Replacement System loaded');
  });

})();
