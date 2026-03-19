// ════════════════════════════════════════════════════════════════════
//  NovaTEch BD — features.js  (সত্যিকার কাজ করে)
//  ✅ Selfie Attendance  ✅ Task Management
//  ✅ Team Chat          ✅ Order Management
//
//  কীভাবে কাজ করে:
//  — app.js লোড হওয়ার পরে এই ফাইল চলে
//  — app.js এর সব global variable (db, ref, push, CU, CR, CN…) ব্যবহার করে
//  — Firebase এ নতুন collections লেখে: tasks / chats / orders
//  — Selfie Attendance বিদ্যমান 'attendance' collection এই লেখে
// ════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── app.js রেডি হওয়ার জন্য অপেক্ষা করি
  function waitForApp(cb) {
    if (window._db && window.CU && window.CR) { cb(); return; }
    setTimeout(() => waitForApp(cb), 400);
  }

  // ── শর্টকাট
  const $ = id => document.getElementById(id);
  const toast = (m, e) => window.showToast && window.showToast(m, e);
  const today = () => new Date().toISOString().split('T')[0];
  const bn = n => '৳' + Math.round(n || 0).toLocaleString('bn-BD');

  // ── Firebase helpers (app.js এ expose করা functions)
  const DB      = () => window._db;
  const fbRef   = (db, path) => window._ref(db, path);
  const fbPush  = (r, d)     => window._push(r, d);
  const fbSet   = (r, d)     => window._set(r, d);
  const fbUpdate= (r, d)     => window._update(r, d);
  const fbOnValue=(r, cb)    => window._onValue(r, cb);

  // ── State
  let allTasks  = {};
  let allChats  = {};
  let allOrders = {};
  let currentChatRoom = 'general';

  // ════════════════════════════════════════════════════════════
  //  CSS — নতুন পেজগুলোর জন্য
  // ════════════════════════════════════════════════════════════
  const style = document.createElement('style');
  style.textContent = `
    .ft-card{background:var(--card);border-radius:14px;padding:13px;border:1px solid var(--border);margin-bottom:9px}
    .ft-card.ft-live{border-color:var(--green)}
    .ft-card.ft-overdue{border-color:var(--red)}
    .ft-card.ft-gold{border-color:var(--accent);background:linear-gradient(135deg,rgba(245,158,11,.04),var(--card))}
    .ft-row{display:flex;align-items:center;gap:8px}
    .ft-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;font-size:11px}
    .ft-tags span{background:var(--surface);padding:2px 8px;border-radius:5px;border:1px solid var(--border);color:var(--muted)}
    .ft-btns{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
    .ft-btn{padding:7px 12px;border-radius:8px;border:1px solid;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;transition:.15s}
    .ft-btn:active{opacity:.8}
    .ft-btn-g{background:rgba(16,185,129,.13);border-color:var(--green);color:var(--green)}
    .ft-btn-b{background:rgba(59,130,246,.13);border-color:var(--blue);color:var(--blue)}
    .ft-btn-r{background:rgba(239,68,68,.13);border-color:var(--red);color:var(--red)}
    .ft-btn-a{background:rgba(245,158,11,.13);border-color:var(--accent);color:var(--accent)}
    .ft-btn-w{background:var(--surface);border-color:var(--border);color:var(--text)}
    .ft-full{width:100%;padding:11px;background:var(--accent);border:none;color:#1a1200;border-radius:10px;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px}
    .ft-empty{text-align:center;padding:32px 16px;color:var(--muted);font-size:13px;line-height:2.2}
    .ft-badge{display:none;position:absolute;top:-7px;right:-7px;background:var(--red);color:#fff;border-radius:50%;width:19px;height:19px;font-size:10px;align-items:center;justify-content:center;font-weight:700}
    .ft-badge.show{display:flex}
    /* ══ CHAT SYSTEM v2 ══ */
    .chat-screen{display:flex;flex-direction:column;height:100%;background:var(--bg);}
    /* Conversation List */
    .conv-list{flex:1;overflow-y:auto;padding:8px 0;}
    .conv-item{display:flex;align-items:center;gap:11px;padding:11px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .12s;position:relative;}
    .conv-item:active,.conv-item.active{background:rgba(245,166,35,.06);}
    .conv-avatar{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;flex-shrink:0;position:relative;}
    .conv-av-group{background:linear-gradient(135deg,#3b82f6,#8b5cf6);}
    .conv-av-dm{background:linear-gradient(135deg,var(--accent),#d97706);}
    .conv-av-public{background:linear-gradient(135deg,#22c55e,#16a34a);}
    .conv-online{position:absolute;bottom:1px;right:1px;width:11px;height:11px;border-radius:50%;background:#22c55e;border:2px solid var(--bg);}
    .conv-info{flex:1;min-width:0;}
    .conv-name{font-size:14px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .conv-preview{font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;}
    .conv-meta{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;}
    .conv-time{font-size:10px;color:var(--muted);}
    .conv-badge{background:var(--red);color:#fff;border-radius:50%;min-width:18px;height:18px;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;}
    /* Chat Room */
    .chat-room-wrap{display:flex;flex-direction:column;height:100%;}
    .chat-room-header{display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--surface);border-bottom:1px solid var(--border);}
    .chat-back-btn{background:none;border:none;color:var(--accent);font-size:20px;cursor:pointer;padding:2px 6px 2px 0;}
    .chat-room-av{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;}
    .chat-room-title{font-size:14px;font-weight:700;color:#fff;}
    .chat-room-sub{font-size:11px;color:var(--muted);}
    .chat-msgs{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:2px;}
    .chat-bubble-me{align-self:flex-end;background:linear-gradient(135deg,var(--accent),#d97706);color:#1a1200;padding:9px 13px;border-radius:14px 14px 2px 14px;font-size:13px;max-width:78%;margin-bottom:6px;line-height:1.5;word-break:break-word;}
    .chat-bubble-other{align-self:flex-start;background:var(--card);border:1px solid var(--border);color:var(--text);padding:9px 13px;border-radius:2px 14px 14px 14px;font-size:13px;max-width:78%;margin-bottom:6px;line-height:1.5;word-break:break-word;}
    .chat-meta-me{font-size:10px;color:rgba(26,18,0,.55);margin-top:2px;text-align:right;}
    .chat-meta-other{font-size:10px;color:var(--muted);margin-top:2px;}
    .chat-input-row{display:flex;gap:8px;padding:10px 12px;background:var(--surface);border-top:1px solid var(--border);flex-shrink:0;}
    .chat-input{flex:1;background:var(--card);border:1px solid var(--border);border-radius:22px;padding:9px 15px;color:var(--text);font-family:inherit;font-size:13px;outline:none;}
    .chat-input:focus{border-color:var(--accent);}
    .chat-send{width:40px;height:40px;background:linear-gradient(135deg,var(--accent),#d97706);border:none;border-radius:50%;color:#1a1200;font-size:17px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
    /* Group create modal */
    .gc-member{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);}
    .gc-check{width:20px;height:20px;border-radius:6px;border:2px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all .15s;}
    .gc-check.checked{background:var(--accent);border-color:var(--accent);color:#1a1200;}
    /* Order item list */
    .order-item-row{display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--surface);border-radius:8px;margin-bottom:5px;font-size:12px;border:1px solid var(--border)}
    /* Prio badge */
    .prio-high{color:var(--red);border-color:var(--red)}
    .prio-med{color:var(--accent);border-color:var(--accent)}
    .prio-low{color:var(--green);border-color:var(--green)}
  `;
  document.head.appendChild(style);

  // ════════════════════════════════════════════════════════════
  //  HTML — নতুন পেজ ও মডাল inject করি
  // ════════════════════════════════════════════════════════════
  function injectHTML() {
    const app = document.getElementById('appScreen');
    if (!app) return;

    // ── 1. Selfie Attendance page (বিদ্যমান att পেজ এর মধ্যে বাটন যোগ)
    const workerAttForm = document.getElementById('workerAttForm');
    if (workerAttForm && !document.getElementById('selfieAttBtns')) {
      const selfieDiv = document.createElement('div');
      selfieDiv.id = 'selfieAttBtns';
      selfieDiv.style.cssText = 'margin-top:10px';
      selfieDiv.innerHTML = `
        <div style="background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.25);border-radius:10px;padding:10px;margin-bottom:8px;font-size:12px;color:var(--blue)">
          📸 সেলফি চেক-ইন — GPS লোকেশন + ছবি সহ, নিশ্চিত প্রমাণ
        </div>
        <div class="g2">
          <button class="btn" style="background:rgba(16,185,129,.13);border:1px solid var(--green);color:var(--green);font-family:inherit;font-size:12px"
            onclick="ftSelfieAtt('in')">📸 সেলফি চেক-ইন</button>
          <button class="btn" style="background:rgba(239,68,68,.13);border:1px solid var(--red);color:var(--red);font-family:inherit;font-size:12px"
            onclick="ftSelfieAtt('out')">📸 সেলফি চেক-আউট</button>
        </div>`;
      workerAttForm.appendChild(selfieDiv);
    }

    // ── 2. Task page
    if (!document.getElementById('page-tasks')) {
      const taskPage = document.createElement('div');
      taskPage.className = 'page';
      taskPage.id = 'page-tasks';
      taskPage.innerHTML = `
        <div style="margin-top:12px" id="taskCreateWrap">
          <div class="form-card">
            <div class="sec" style="margin-top:0">📋 নতুন টাস্ক</div>
            <div class="fr"><label>টাস্কের বিবরণ *</label>
              <input id="ft_taskTitle" placeholder="কী করতে হবে…" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-family:inherit;font-size:13px;outline:none">
            </div>
            <div class="g2">
              <div class="fr"><label>কর্মী *</label>
                <select id="ft_taskWorker" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-family:inherit;font-size:13px;outline:none">
                  <option value="">-- বেছে নিন --</option>
                </select>
              </div>
              <div class="fr"><label>শেষ তারিখ</label>
                <input type="date" id="ft_taskDeadline" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-family:inherit;font-size:13px;outline:none">
              </div>
            </div>
            <div class="g2">
              <div class="fr"><label>অগ্রাধিকার</label>
                <select id="ft_taskPriority" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-family:inherit;font-size:13px;outline:none">
                  <option value="high">🔴 জরুরি</option>
                  <option value="medium" selected>🟡 মধ্যম</option>
                  <option value="low">🟢 সাধারণ</option>
                </select>
              </div>
              <div class="fr"><label>ধরন</label>
                <select id="ft_taskType" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-family:inherit;font-size:13px;outline:none">
                  <option value="visit">🏪 ভিজিট</option>
                  <option value="sale">🛍 বিক্রয়</option>
                  <option value="collection">💰 কালেকশন</option>
                  <option value="survey">📋 সার্ভে</option>
                  <option value="other">📌 অন্যান্য</option>
                </select>
              </div>
            </div>
            <div class="fr"><label>নোট</label>
              <textarea id="ft_taskNote" rows="2" placeholder="অতিরিক্ত নির্দেশনা…"
                style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-family:inherit;font-size:13px;outline:none;resize:none"></textarea>
            </div>
            <button class="btn btn-acc" onclick="ftCreateTask()">✅ টাস্ক দিন</button>
          </div>
        </div>
        <div class="sec" id="ft_myTaskSec">আমার টাস্ক</div>
        <div id="ft_myTaskList"></div>
        <div class="sec" id="ft_teamTaskSec" style="display:none">টিমের টাস্ক</div>
        <div id="ft_teamTaskList"></div>
        <div class="bsp"></div>`;
      app.appendChild(taskPage);
    }

    // ── 3. Chat page (v2 — ব্যক্তিগত, গ্রুপ, সাধারণ)
    if (!document.getElementById('page-chat')) {
      const chatPage = document.createElement('div');
      chatPage.className = 'page';
      chatPage.id = 'page-chat';
      chatPage.style.padding = '0';
      chatPage.innerHTML = `
        <!-- Conversation List View -->
        <div id="ft_convListView" class="chat-screen">
          <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px 8px;border-bottom:1px solid var(--border);">
            <div style="font-size:16px;font-weight:700;color:#fff">💬 চ্যাট</div>
            <div style="display:flex;gap:8px;">
              <button onclick="ftOpenGroupCreate()" style="background:rgba(99,102,241,.15);border:1px solid #6366f1;color:#a5b4fc;border-radius:8px;padding:6px 12px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;">+ গ্রুপ</button>
            </div>
          </div>
          <div class="conv-list" id="ft_convList">
            <div style="text-align:center;padding:30px;color:var(--muted);font-size:13px">লোড হচ্ছে...</div>
          </div>
        </div>

        <!-- Chat Room View -->
        <div id="ft_chatRoomView" class="chat-room-wrap" style="display:none;">
          <div class="chat-room-header">
            <button class="chat-back-btn" onclick="ftBackToConvList()">‹</button>
            <div class="chat-room-av" id="ft_roomAvatar">💬</div>
            <div style="flex:1;min-width:0;">
              <div class="chat-room-title" id="ft_roomTitle">চ্যাট</div>
              <div class="chat-room-sub" id="ft_roomSub"></div>
            </div>
            <button onclick="ftRoomInfo()" style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;">ℹ</button>
          </div>
          <div class="chat-msgs" id="ft_chatMsgs"></div>
          <div class="chat-input-row">
            <button onclick="ftSendFile()" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer;padding:0 4px;">📎</button>
            <input class="chat-input" id="ft_chatInput" placeholder="বার্তা লিখুন…"
              onkeypress="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();ftSendMsg()}">
            <button class="chat-send" onclick="ftSendMsg()">➤</button>
          </div>
        </div>

        <!-- Group Create Modal -->
        <div class="mo" id="ft_groupCreateMo">
          <div class="mbox">
            <button class="mc" onclick="closeMo('ft_groupCreateMo')">✕</button>
            <h3>👥 নতুন গ্রুপ তৈরি</h3>
            <div class="fr">
              <label>গ্রুপের নাম</label>
              <input id="ft_groupName" class="inp" placeholder="যেমন: বরিশাল টিম" style="margin:0">
            </div>
            <div class="fr" style="margin-top:10px">
              <label>আইকন</label>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;" id="ft_emojiPicker">
                ${['👥','🏪','💼','🚀','⚡','🌟','🎯','🔥','💬','🏆'].map(e=>`<button onclick="ftPickEmoji('${e}',this)" style="font-size:22px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;">${e}</button>`).join('')}
              </div>
            </div>
            <div style="margin-top:12px;font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">সদস্য বেছে নিন</div>
            <div id="ft_groupMemberList" style="max-height:220px;overflow-y:auto;"></div>
            <button class="btn btn-acc" style="margin-top:14px;" onclick="ftCreateGroup()">✅ গ্রুপ তৈরি করুন</button>
          </div>
        </div>`;
      app.appendChild(chatPage);
    }

    // ── 4. Order page
    if (!document.getElementById('page-order')) {
      const orderPage = document.createElement('div');
      orderPage.className = 'page';
      orderPage.id = 'page-order';
      orderPage.innerHTML = `
        <div style="margin-top:12px">
          <div class="form-card">
            <div class="sec" style="margin-top:0">🛒 নতুন অর্ডার</div>
            <div class="fr"><label>দোকান *</label>
              <select id="ft_ordShop" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-family:inherit;font-size:13px;outline:none">
                <option value="">-- দোকান --</option>
              </select>
            </div>
            <div style="background:var(--surface);border-radius:10px;padding:10px;border:1px solid var(--border);margin-bottom:10px">
              <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px">পণ্য যোগ করুন</div>
              <div class="g2" style="margin-bottom:8px">
                <select id="ft_ordProd" style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:inherit;font-size:12px;outline:none">
                  <option value="">-- পণ্য --</option>
                </select>
                <div style="display:flex;gap:5px">
                  <input type="number" id="ft_ordQty" placeholder="পরিমাণ" min="1" value="1"
                    style="width:100%;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:8px 10px;color:var(--text);font-family:inherit;font-size:12px;outline:none">
                  <button class="ft-btn ft-btn-a" onclick="ftAddOrderItem()" style="flex-shrink:0">+</button>
                </div>
              </div>
              <div id="ft_ordItems" style="min-height:30px"></div>
              <div id="ft_ordTotal" style="text-align:right;font-weight:700;font-size:13px;color:var(--accent);margin-top:5px"></div>
            </div>
            <div class="fr"><label>নোট</label>
              <input id="ft_ordNote" placeholder="বিশেষ নির্দেশনা…"
                style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:9px;padding:9px 11px;color:var(--text);font-family:inherit;font-size:13px;outline:none">
            </div>
            <button class="btn btn-acc" onclick="ftPlaceOrder()">✅ অর্ডার পাঠান</button>
          </div>
          <div class="sec">অর্ডার তালিকা</div>
          <div class="df">
            <button class="fb active" id="ft_ord_all"   onclick="ftOrdFilter('all',this)">সব</button>
            <button class="fb"        id="ft_ord_pend"  onclick="ftOrdFilter('pending',this)">⏳ অপেক্ষায়</button>
            <button class="fb"        id="ft_ord_appr"  onclick="ftOrdFilter('approved',this)">✅ অনুমোদিত</button>
            <button class="fb"        id="ft_ord_del"   onclick="ftOrdFilter('delivered',this)">🚚 ডেলিভারি</button>
          </div>
          <div id="ft_ordList"></div>
        </div>
        <div class="bsp"></div>`;
      app.appendChild(orderPage);
    }

    // ── Modals
    if (!document.getElementById('ft_selfiePreviewMo')) {
      const modals = document.createElement('div');
      modals.innerHTML = `
        <!-- Selfie preview modal -->
        <div class="mo" id="ft_selfiePreviewMo">
          <div class="mbox">
            <button class="mc" onclick="closeMo('ft_selfiePreviewMo')">✕</button>
            <h3 id="ft_selfieTitle">📸 সেলফি চেক-ইন</h3>
            <div id="ft_selfieInfo" style="font-size:12px;color:var(--muted);margin-bottom:12px"></div>
            <img id="ft_selfieImg" src="" style="width:100%;border-radius:10px;margin-bottom:12px;display:none">
            <div id="ft_selfieStatus" style="text-align:center;padding:14px;font-size:13px"></div>
            <button class="btn btn-acc" id="ft_selfieConfirmBtn" onclick="ftConfirmSelfie()" style="display:none">✅ নিশ্চিত করুন</button>
          </div>
        </div>

        <!-- Task proof modal -->
        <div class="mo" id="ft_proofMo">
          <div class="mbox">
            <button class="mc" onclick="closeMo('ft_proofMo')">✕</button>
            <h3>📸 টাস্ক সম্পন্নের প্রমাণ</h3>
            <div class="info-box">ছবি তুলে প্রমাণ দিন — টাস্ক স্বয়ংক্রিয়ভাবে সম্পন্ন হবে।</div>
            <img id="ft_proofImg" src="" style="width:100%;border-radius:10px;margin-bottom:12px;display:none">
            <div class="g2">
              <button class="btn" style="background:rgba(59,130,246,.13);border:1px solid var(--blue);color:var(--blue);font-family:inherit"
                onclick="ftPickProofPhoto()">📷 ছবি তুলুন</button>
              <button class="btn btn-acc" id="ft_proofSubmitBtn" onclick="ftSubmitProof()" style="display:none">✅ জমা দিন</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modals);
    }
  }

  // ════════════════════════════════════════════════════════════
  //  NAV — নতুন ট্যাব যোগ করি
  // ════════════════════════════════════════════════════════════
  function patchNav() {
    const origBuildNav = window.buildNav;
    if (!origBuildNav || window._ftNavPatched) return;
    window._ftNavPatched = true;
    window.buildNav = function () {
      origBuildNav.call(this);
      const nav = document.getElementById('mainNav');
      if (!nav) return;
      const CR = window.CR;

      // Insert after existing tabs — Tasks, Chat, Order
      const taskBtn = `<button class="nav-btn" data-page="tasks" onclick="showPage('tasks')">📋 টাস্ক</button>`;
      const chatBtn = `<button class="nav-btn" data-page="chat"  onclick="showPage('chat')">💬 চ্যাট</button>`;
      const ordBtn  = `<button class="nav-btn" data-page="order" onclick="showPage('order')">🛒 অর্ডার</button>`;

      // Add after dashboard
      const dashBtn = nav.querySelector('[data-page="dash"]');
      if (dashBtn) {
        if (!nav.querySelector('[data-page="tasks"]')) dashBtn.insertAdjacentHTML('afterend', taskBtn);
        if (!nav.querySelector('[data-page="chat"]'))  dashBtn.insertAdjacentHTML('afterend', chatBtn);
        if (!nav.querySelector('[data-page="order"]')) dashBtn.insertAdjacentHTML('afterend', ordBtn);
      }

      // Hide management room tab for workers
      const mgmt = document.getElementById('ftMgmtRoomBtn');
      if (mgmt) mgmt.style.display = CR === 'worker' ? 'none' : '';
      // Hide task create form for workers (they only see assigned tasks)
      const tcw = document.getElementById('taskCreateWrap');
      if (tcw) tcw.style.display = CR === 'worker' ? 'none' : '';
    };
  }

  function patchShowPage() {
    // app.js এ showPage এখন tasks/chat/order handle করে
    // এখানে শুধু global function expose করি
    window.ftRenderTasks = ftRenderTasks;
    window.ftRenderConvList = ftRenderConvList;
    window.ftRenderOrders = ftRenderOrders;
    window.ftLoadOrderSelects = ftLoadOrderSelects;
    window.ftLoadWorkerSelects = ftLoadWorkerSelects;
    console.log('✅ features.js functions exposed to window');
  }

  // ════════════════════════════════════════════════════════════
  //  1. SELFIE ATTENDANCE
  // ════════════════════════════════════════════════════════════
  let _selfieFile = null, _selfieType = 'in', _selfieGPS = null;

  window.ftSelfieAtt = async function (type) {
    _selfieType = type;
    _selfieFile = null;
    _selfieGPS  = null;

    // GPS আগে নিই
    toast('📍 GPS খুঁজছে…');
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 12000, enableHighAccuracy: true })
      );
      _selfieGPS = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: Math.round(pos.coords.accuracy) };
    } catch (e) {
      toast('⚠️ GPS পাওয়া যায়নি — তবুও চেক-ইন হবে');
    }

    // Camera open
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user'; // সামনের ক্যামেরা
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      _selfieFile = file;

      // Preview
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = $('ft_selfieImg');
        if (img) { img.src = ev.target.result; img.style.display = 'block'; }
      };
      reader.readAsDataURL(file);

      // Info
      const now = new Date();
      const sal = (window.allSalaries || {})[window.CU?.uid] || {};
      const [sh, sm] = (sal.shiftStart || '10:00').split(':').map(Number);
      const cutoff = new Date(); cutoff.setHours(sh, sm, 0, 0);
      const isLate = type === 'in' && now > cutoff;

      const info = $('ft_selfieInfo');
      if (info) info.innerHTML = `
        🕐 সময়: <b>${now.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</b>
        ${_selfieGPS ? ` · 📍 GPS: ${_selfieGPS.lat.toFixed(4)}, ${_selfieGPS.lng.toFixed(4)} (±${_selfieGPS.acc}m)` : ' · 📍 GPS: পাওয়া যায়নি'}
        ${isLate ? '<br><span style="color:var(--red)">⚠️ দেরিতে উপস্থিত</span>' : ''}`;

      const title = $('ft_selfieTitle');
      if (title) title.textContent = type === 'in' ? '📸 সেলফি চেক-ইন' : '📸 সেলফি চেক-আউট';

      const confirmBtn = $('ft_selfieConfirmBtn');
      if (confirmBtn) confirmBtn.style.display = 'block';

      const status = $('ft_selfieStatus');
      if (status) status.innerHTML = '';

      // Show modal
      if (window.openMo) window.openMo('ft_selfiePreviewMo');
      else { const mo = $('ft_selfiePreviewMo'); if (mo) mo.classList.add('open'); }
    };
    input.click();
  };

  window.ftConfirmSelfie = async function () {
    if (!_selfieFile) return;
    const btn = $('ft_selfieConfirmBtn');
    const status = $('ft_selfieStatus');
    if (btn) btn.style.display = 'none';
    if (status) status.innerHTML = '<div style="color:var(--muted)">📤 আপলোড হচ্ছে…</div>';

    // Upload selfie to Firebase Storage
    let photoUrl = null;
    try {
      photoUrl = await window.uploadImageToFirebase(_selfieFile, 'selfies_' + _selfieType);
    } catch (e) { toast('আপলোড সমস্যা — চেক-ইন তবুও হবে'); }

    const now = new Date();
    const sal  = (window.allSalaries || {})[window.CU?.uid] || {};
    const [sh, sm] = (sal.shiftStart || '10:00').split(':').map(Number);
    const cutoff = new Date(); cutoff.setHours(sh, sm, 0, 0);
    const isLate = _selfieType === 'in' && now > cutoff;
    const db = DB(); if (!db) return;

    if (_selfieType === 'in') {
      await fbPush(fbRef(db, 'attendance'), {
        uid: window.CU.uid,
        name: window.CN,
        date: today(),
        checkIn: now.toISOString(),
        checkOut: null,
        isLate,
        selfieInUrl: photoUrl,
        lat: _selfieGPS?.lat || null,
        lng: _selfieGPS?.lng || null,
        gpsAccuracy: _selfieGPS?.acc || null,
        geoVerified: !!_selfieGPS,
        ts: Date.now()
      });
      if (status) status.innerHTML = `<div style="color:var(--green);font-size:15px;font-weight:700">${isLate ? '⚠️ দেরিতে' : '✅'} চেক-ইন সম্পন্ন!</div>`;
      toast(isLate ? '⚠️ সেলফি চেক-ইন (দেরিতে)' : '✅ সেলফি চেক-ইন সম্পন্ন!');
    } else {
      // Find today's record
      const existing = Object.entries(window.allAttendance || {})
        .find(([, a]) => a.uid === window.CU.uid && a.date === today() && a.checkIn && !a.checkOut);
      if (existing) {
        await fbUpdate(fbRef(db, 'attendance/' + existing[0]), {
          checkOut: now.toISOString(),
          selfieOutUrl: photoUrl,
          checkOutLat: _selfieGPS?.lat || null,
          checkOutLng: _selfieGPS?.lng || null
        });
        if (status) status.innerHTML = `<div style="color:var(--green);font-size:15px;font-weight:700">✅ চেক-আউট সম্পন্ন!</div>`;
        toast('✅ সেলফি চেক-আউট সম্পন্ন!');
      } else {
        if (status) status.innerHTML = `<div style="color:var(--red)">আগে চেক-ইন করুন!</div>`;
        toast('আগে চেক-ইন করুন!', true);
      }
    }
    setTimeout(() => { if (window.closeMo) window.closeMo('ft_selfiePreviewMo'); else { const mo = $('ft_selfiePreviewMo'); if (mo) mo.classList.remove('open'); } }, 1800);
  };

  // ════════════════════════════════════════════════════════════
  //  2. TASK MANAGEMENT
  // ════════════════════════════════════════════════════════════
  window.ftCreateTask = async function () {
    const title    = $('ft_taskTitle')?.value.trim();
    const workerUid = $('ft_taskWorker')?.value;
    const deadline = $('ft_taskDeadline')?.value;
    const priority = $('ft_taskPriority')?.value || 'medium';
    const type_    = $('ft_taskType')?.value || 'visit';
    const note     = $('ft_taskNote')?.value.trim();

    if (!title)    { toast('টাস্কের বিবরণ দিন!', true); return; }
    if (!workerUid){ toast('কর্মী বেছে নিন!', true); return; }

    const db = DB(); if (!db) return;
    const workerName = (window.allUsers || {})[workerUid]?.name || '';
    await fbPush(fbRef(db, 'tasks'), {
      title, note, workerUid, workerName, deadline, priority, type: type_,
      status: 'pending',
      createdBy: window.CU.uid,
      createdByName: window.CN,
      ts: Date.now(),
      date: today()
    });

    $('ft_taskTitle').value = '';
    if ($('ft_taskNote')) $('ft_taskNote').value = '';
    // ✅ কর্মীকে notify করি
    if(window.sendNotificationTo)
      window.sendNotificationTo(workerUid, '📋 নতুন টাস্ক',
        `"${title}" — ${priority==='high'?'🔴 জরুরি':priority==='medium'?'🟡 মধ্যম':'🟢 সাধারণ'}${deadline?' · শেষ: '+deadline:''}`, 'tasks');
    toast('✅ টাস্ক দেওয়া হয়েছে!');
  };

  window.ftUpdateTask = async function (taskId, status) {
    const db = DB(); if (!db) return;
    const task = (allTasks||{})[taskId];
    await fbUpdate(fbRef(db, 'tasks/' + taskId), {
      status, updatedAt: Date.now(), updatedBy: window.CU.uid
    });
    const labels = { done:'✅ সম্পন্ন!', in_progress:'🔄 শুরু হয়েছে', cancelled:'❌ বাতিল' };
    toast(labels[status] || 'আপডেট');
    // ✅ Notification
    if(window.sendNotificationTo && task){
      const title = labels[status] ? '📋 টাস্ক আপডেট' : '📋 টাস্ক';
      const body = `"${task.title}" — ${labels[status]||status}`;
      // কর্মী করলে Manager-কে জানাই
      if(window.CR==='worker' && task.createdBy && task.createdBy!==window.CU?.uid)
        window.sendNotificationTo(task.createdBy, title, body, 'tasks');
      // Manager করলে কর্মীকে জানাই
      if(window.CR!=='worker' && task.workerUid && task.workerUid!==window.CU?.uid)
        window.sendNotificationTo(task.workerUid, title, body, 'tasks');
    }
  };

  // Task proof
  let _proofTaskId = null, _proofFile = null;
  window.ftOpenProof = function (taskId) {
    _proofTaskId = taskId;
    _proofFile = null;
    const img = $('ft_proofImg'); if (img) { img.src = ''; img.style.display = 'none'; }
    const btn = $('ft_proofSubmitBtn'); if (btn) btn.style.display = 'none';
    if (window.openMo) window.openMo('ft_proofMo');
    else { const mo = $('ft_proofMo'); if (mo) mo.classList.add('open'); }
  };

  window.ftPickProofPhoto = function () {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      _proofFile = file;
      const reader = new FileReader();
      reader.onload = ev => {
        const img = $('ft_proofImg'); if (img) { img.src = ev.target.result; img.style.display = 'block'; }
      };
      reader.readAsDataURL(file);
      const btn = $('ft_proofSubmitBtn'); if (btn) btn.style.display = 'block';
    };
    input.click();
  };

  window.ftSubmitProof = async function () {
    if (!_proofTaskId || !_proofFile) return;
    toast('আপলোড হচ্ছে…');
    let url = null;
    try { url = await window.uploadImageToFirebase(_proofFile, 'task_proofs'); } catch {}
    const db = DB(); if (!db) return;
    await fbUpdate(fbRef(db, 'tasks/' + _proofTaskId), {
      status: 'done',
      proofUrl: url,
      completedAt: Date.now(),
      completedBy: window.CU.uid
    });
    if (window.closeMo) window.closeMo('ft_proofMo');
    else { const mo = $('ft_proofMo'); if (mo) mo.classList.remove('open'); }
    toast('✅ প্রমাণ সহ টাস্ক সম্পন্ন!');
  };

  function ftRenderTasks() {
    const myEl   = $('ft_myTaskList');
    const teamEl = $('ft_teamTaskList');
    const teamSec = $('ft_teamTaskSec');
    if (!myEl) return;

    const CR_ = window.CR;
    const uid_ = window.CU?.uid;
    const tasks = Object.entries(allTasks);

    const myTasks   = tasks.filter(([, t]) => t.workerUid === uid_);
    const teamTasks = CR_ !== 'worker'
      ? tasks.filter(([, t]) => t.workerUid !== uid_)
      : [];

    const prioClass = { high: 'prio-high', medium: 'prio-med', low: 'prio-low' };
    const prioLabel = { high: '🔴 জরুরি', medium: '🟡 মধ্যম', low: '🟢 সাধারণ' };
    const statusIcon = { pending: '⏳', in_progress: '🔄', done: '✅', cancelled: '❌' };

    const card = ([id, t]) => {
      const over = t.deadline && t.deadline < today() && t.status !== 'done' && t.status !== 'cancelled';
      const isMyTask = t.workerUid === uid_;
      return `
      <div class="ft-card${over ? ' ft-overdue' : t.status === 'done' ? '' : ''}">
        <div class="ft-row">
          <span style="font-size:17px">${statusIcon[t.status] || '⏳'}</span>
          <div style="flex:1;margin-left:7px">
            <div style="font-weight:700;font-size:13px">${t.title}</div>
            ${t.note ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">${t.note}</div>` : ''}
          </div>
          <span style="font-size:10px;padding:2px 7px;border-radius:5px;border:1px solid;${prioClass[t.priority] || ''}">${prioLabel[t.priority] || ''}</span>
        </div>
        <div class="ft-tags">
          <span>👤 ${t.workerName}</span>
          ${t.deadline ? `<span ${over ? 'style="color:var(--red)"' : ''}>📅 ${t.deadline}${over ? ' ⚠️ অতিক্রান্ত' : ''}</span>` : ''}
          <span>🏷️ ${t.type}</span>
          <span>👤 দিয়েছেন: ${t.createdByName}</span>
        </div>
        ${t.proofUrl ? `<img src="${t.proofUrl}" style="width:100%;border-radius:8px;margin-top:8px;max-height:120px;object-fit:cover;cursor:pointer" onclick="window.open('${t.proofUrl}','_blank')" loading="lazy">` : ''}
        ${isMyTask && t.status !== 'done' && t.status !== 'cancelled' ? `
        <div class="ft-btns">
          ${t.status === 'pending' ? `<button class="ft-btn ft-btn-b" onclick="ftUpdateTask('${id}','in_progress')">🔄 শুরু করুন</button>` : ''}
          <button class="ft-btn ft-btn-g" onclick="ftOpenProof('${id}')">📸 প্রমাণ দিন</button>
          <button class="ft-btn ft-btn-w" onclick="ftUpdateTask('${id}','done')">✅ সম্পন্ন</button>
        </div>` : ''}
        ${!isMyTask && CR_ !== 'worker' && t.status !== 'cancelled' ? `
        <div class="ft-btns">
          <button class="ft-btn ft-btn-r" onclick="ftUpdateTask('${id}','cancelled')">❌ বাতিল</button>
        </div>` : ''}
      </div>`;
    };

    myEl.innerHTML = myTasks.length
      ? myTasks.map(card).join('')
      : `<div class="ft-empty">📋<br>আপনার জন্য কোনো টাস্ক নেই</div>`;

    if (teamEl && teamSec) {
      teamSec.style.display = CR_ !== 'worker' ? '' : 'none';
      teamEl.innerHTML = teamTasks.length
        ? teamTasks.map(card).join('')
        : (CR_ !== 'worker' ? `<div class="ft-empty">টিমের কোনো টাস্ক নেই</div>` : '');
    }
  }

  function ftLoadWorkerSelects() {
    const sel = $('ft_taskWorker'); if (!sel) return;
    const workers = Object.entries(window.allUsers || {})
      .filter(([, u]) => u.role === 'worker' || u.role === 'manager');
    sel.innerHTML = '<option value="">-- কর্মী বেছে নিন --</option>' +
      workers.map(([wuid, u]) => `<option value="${wuid}">${u.name} (${u.role === 'worker' ? 'কর্মী' : 'ম্যানেজার'})</option>`).join('');
  }

  // ════════════════════════════════════════════════════════════
  //  3. TEAM CHAT
  // ════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════
  //  CHAT SYSTEM v2
  //  ✅ সাধারণ চ্যাট (সবাই একসাথে)
  //  ✅ ব্যক্তিগত চ্যাট (DM)
  //  ✅ গ্রুপ চ্যাট (কাস্টম)
  //  ✅ FCM Push Notification
  // ════════════════════════════════════════════════════════════

  let _currentRoom   = null; // { id, type, name, icon }
  let _allGroups     = {};   // Firebase groups
  let _chatUnreads   = {};   // { roomId: count }
  let _selectedEmoji = '👥';
  let _gcSelectedMembers = new Set();

  // ── কনভার্সেশন লিস্ট রেন্ডার
  function ftRenderConvList() {
    const el = $('ft_convList'); if (!el) return;
    const myUid = window.CU?.uid;
    const users = window.allUsers || {};

    // ✅ FIX: allUsers লোড না হলে retry করি
    if (!myUid || Object.keys(users).length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);font-size:13px">⏳ লোড হচ্ছে...</div>';
      setTimeout(ftRenderConvList, 800);
      return;
    }

    const rooms = [];

    // ১. সাধারণ চ্যাট (সবাই)
    rooms.push({
      id: 'general', type: 'public', icon: '🌐', name: 'সাধারণ চ্যাট',
      sub: Object.keys(users).length + ' জন', av: 'conv-av-public', photo: null
    });

    // ২. ম্যানেজমেন্ট (admin/manager only)
    if (window.CR !== 'worker') {
      rooms.push({
        id: 'management', type: 'public', icon: '👔', name: 'ম্যানেজমেন্ট',
        sub: 'Admin ও Manager', av: 'conv-av-group', photo: null
      });
    }

    // ৩. গ্রুপগুলো (যেখানে আমি আছি)
    Object.entries(_allGroups).forEach(([gid, g]) => {
      if (!g.members || !g.members[myUid]) return;
      rooms.push({
        id: 'group_' + gid, type: 'group', icon: g.icon || '👥',
        name: g.name, sub: Object.keys(g.members).length + ' জন সদস্য',
        av: 'conv-av-group', photo: null
      });
    });

    // ৪. DM — অন্য সব ব্যবহারকারী (ছবি সহ)
    Object.entries(users).forEach(([uid, u]) => {
      if (uid === myUid) return;
      const dmId = [myUid, uid].sort().join('_');
      rooms.push({
        id: 'dm_' + dmId, type: 'dm',
        icon: (u.name||'?')[0].toUpperCase(),
        name: u.name || u.email,
        sub: u.role === 'worker' ? '👷 কর্মী' : u.role === 'manager' ? '🧑‍💼 ম্যানেজার' : '👑 অ্যাডমিন',
        av: 'conv-av-dm', targetUid: uid, targetName: u.name,
        photo: u.photoURL || null
      });
    });

    el.innerHTML = rooms.map(r => {
      const msgs   = Object.values(allChats[r.id] || {});
      const last   = msgs.sort((a,b)=>b.ts-a.ts)[0];
      const unread = _chatUnreads[r.id] || 0;
      const preview = last
        ? (last.text || (last.imageUrl ? '📷 ছবি' : last.fileUrl ? `📎 ${last.fileName||'ফাইল'}` : ''))
        : '<span style="opacity:.5">কথোপকথন শুরু করুন</span>';
      const time = last ? new Date(last.ts).toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'}) : '';
      const isOnline = r.type==='dm' && r.targetUid && window._onlineUsers?.[r.targetUid];

      // ✅ Avatar — ছবি থাকলে দেখাও, না থাকলে অক্ষর
      const avatarInner = r.photo
        ? `<img src="${r.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none';this.nextSibling.style.display='flex'"><span style="display:none;width:100%;height:100%;align-items:center;justify-content:center;font-size:18px;font-weight:700;">${r.icon}</span>`
        : `<span style="font-size:${r.type==='dm'?'18px':'22px'};font-weight:700;">${r.icon}</span>`;

      const rJson = JSON.stringify({
        id: r.id, type: r.type, icon: r.icon, name: r.name,
        sub: r.sub, av: r.av, targetUid: r.targetUid||'', targetName: r.targetName||''
      }).replace(/"/g,'&quot;');

      return `<div class="conv-item" onclick="ftOpenRoom('${rJson.replace(/'/g,"\'")}')">
        <div class="conv-avatar ${r.av}" style="position:relative;overflow:hidden;">
          ${avatarInner}
          ${isOnline ? '<div class="conv-online"></div>' : ''}
        </div>
        <div class="conv-info">
          <div class="conv-name">${r.name}</div>
          <div class="conv-preview" style="font-size:12px;color:var(--muted);">${preview}</div>
          <div style="font-size:10px;color:var(--muted);margin-top:1px;">${r.sub}</div>
        </div>
        <div class="conv-meta">
          <div class="conv-time">${time}</div>
          ${unread > 0 ? `<div class="conv-badge">${unread > 9 ? '9+' : unread}</div>` : ''}
        </div>
      </div>
      ${r.type==='dm' && r.targetUid ? `
      <button onclick="event.stopPropagation();ftShowDMProfile('${r.targetUid}')"
        style="position:absolute;right:8px;top:8px;background:none;border:none;color:var(--muted);font-size:14px;cursor:pointer;opacity:.6;padding:4px;" title="প্রোফাইল দেখুন">👤</button>` : ''}`;
        </div>
      </div>`;
    }).join('');
  }

  // ── রুম খোলা
  window.ftOpenRoom = function(r) {
    if (typeof r === 'string') {
      try { r = JSON.parse(r.replace(/&quot;/g,'"')); }
      catch(e) { try { r = JSON.parse(decodeURIComponent(r)); } catch(e2) { console.warn('Room parse error',e2); return; } }
    }
    _currentRoom = r;
    _chatUnreads[r.id] = 0;

    // Header আপডেট
    const av = $('ft_roomAvatar');
    if (av) {
      if (r.type === 'dm') {
        const u = (window.allUsers||{})[r.targetUid];
        if (u?.photoURL) {
          av.innerHTML = `<img src="${u.photoURL}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" onerror="this.outerHTML='👤'">`;
        } else {
          av.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#3b82f6);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;">${(r.name||'?')[0]}</div>`;
        }
        // ইনফো বাটনে প্রোফাইল দেখানো
        const infoBtn = document.querySelector('#ft_chatRoomView button[onclick="ftRoomInfo()"]');
        if (infoBtn) infoBtn.onclick = () => ftShowDMProfile(r.targetUid);
      } else {
        av.textContent = r.icon;
      }
    }
    const title = $('ft_roomTitle'); if(title) title.textContent = r.name;
    const sub = $('ft_roomSub');
    if (sub) sub.textContent = r.sub || '';

    // View switch
    $('ft_convListView').style.display = 'none';
    $('ft_chatRoomView').style.display = 'flex';

    ftRenderChatRoom();
    setTimeout(() => {
      const msgs = $('ft_chatMsgs');
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }, 100);
  };

  // ── List-এ ফিরে যাওয়া
  window.ftBackToConvList = function() {
    $('ft_convListView').style.display = 'flex';
    $('ft_chatRoomView').style.display = 'none';
    _currentRoom = null;
    ftRenderConvList();
  };

  // ── চ্যাট রুম রেন্ডার
  function ftRenderChatRoom() {
    const el = $('ft_chatMsgs'); if (!el || !_currentRoom) return;
    const msgs = Object.values(allChats[_currentRoom.id] || {})
      .sort((a,b) => a.ts - b.ts).slice(-80);

    if (!msgs.length) {
      el.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:13px;">
        ${_currentRoom.icon}<br><br>কথোপকথন শুরু করুন
      </div>`;
      return;
    }

    let prevDate = '';
    el.innerHTML = msgs.map(m => {
      const isMe = m.uid === window.CU?.uid;
      const time = new Date(m.ts).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(m.ts).toLocaleDateString('bn-BD', { day:'numeric', month:'short' });
      const dateSep = dateStr !== prevDate
        ? `<div style="text-align:center;margin:10px 0;"><span style="background:var(--s2,var(--surface));font-size:11px;color:var(--muted);padding:4px 12px;border-radius:100px;border:1px solid var(--border);">${dateStr}</span></div>`
        : '';
      prevDate = dateStr;

      const bubble = `
        ${m.text ? `<div style="white-space:pre-wrap">${m.text}</div>` : ''}
        ${m.imageUrl ? `<img src="${m.imageUrl}" style="width:100%;border-radius:8px;margin-top:6px;cursor:pointer;max-height:180px;object-fit:cover" onclick="window.open('${m.imageUrl}','_blank')" loading="lazy">` : ''}
        ${m.fileUrl ? `<a href="${m.fileUrl}" target="_blank" style="color:inherit;font-size:11px;display:block;margin-top:4px;">📎 ${m.fileName||'ফাইল'}</a>` : ''}`;

      const tick = m.read ? '✓✓' : '✓';
      if (isMe) return `${dateSep}<div style="display:flex;flex-direction:column;align-items:flex-end;margin-bottom:2px;">
        <div class="chat-bubble-me">${bubble}</div>
        <div class="chat-meta-me">${time} <span style="opacity:.6">${tick}</span></div>
      </div>`;

      const av = `<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#3b82f6);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;">${(m.name||'?')[0]}</div>`;
      return `${dateSep}<div style="display:flex;gap:7px;align-items:flex-end;margin-bottom:2px;">
        ${av}
        <div>
          <div style="font-size:10px;color:var(--muted);margin-bottom:2px;">${m.name} <span style="font-size:9px;background:var(--surface);padding:1px 5px;border-radius:4px;">${m.role==='admin'?'অ্যাডমিন':m.role==='manager'?'ম্যানেজার':'কর্মী'}</span></div>
          <div class="chat-bubble-other">${bubble}</div>
          <div class="chat-meta-other">${time}</div>
        </div>
      </div>`;
    }).join('');

    el.scrollTop = el.scrollHeight;
  }

  // ── মেসেজ পাঠানো
  window.ftSendMsg = async function () {
    const input = $('ft_chatInput'); if (!input || !_currentRoom) return;
    const text = input.value.trim(); if (!text) return;
    input.value = '';
    const db = DB(); if (!db) return;

    const msgData = {
      text, uid: window.CU.uid,
      name: window.CN, role: window.CR, ts: Date.now()
    };
    await fbPush(fbRef(db, 'chats/' + _currentRoom.id), msgData);

    // ✅ Push Notification পাঠাই (অন্যদের)
    ftSendChatNotification(_currentRoom, text);
  };

  // ── ফাইল পাঠানো
  window.ftSendFile = function () {
    if (!_currentRoom) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf,.doc,.docx,.xlsx';
    input.onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      toast('আপলোড হচ্ছে…');
      const isImg = file.type.startsWith('image/');
      let url = null;
      try { url = await window.uploadImageToFirebase(file, 'chat_files'); } catch {}
      if (!url) { toast('আপলোড ব্যর্থ!', true); return; }
      const db = DB(); if (!db) return;
      const msgData = {
        text: '', uid: window.CU.uid, name: window.CN, role: window.CR,
        [isImg ? 'imageUrl' : 'fileUrl']: url, fileName: file.name, ts: Date.now()
      };
      await fbPush(fbRef(db, 'chats/' + _currentRoom.id), msgData);
      ftSendChatNotification(_currentRoom, isImg ? '📷 ছবি পাঠিয়েছেন' : `📎 ${file.name}`);
    };
    input.click();
  };

  // ── FCM চ্যাট Notification
  async function ftSendChatNotification(room, text) {
    try {
      const db = DB(); if (!db) return;
      const myUid = window.CU?.uid;
      // যাদের notify করব তাদের uid বের করি
      let targetUids = [];
      if (room.type === 'dm') {
        // DM: শুধু অপর ব্যক্তি
        const parts = room.id.replace('dm_','').split('_');
        targetUids = parts.filter(u => u !== myUid);
      } else if (room.type === 'group') {
        // Group: সব সদস্য (নিজে বাদে)
        const gid = room.id.replace('group_','');
        const grp = _allGroups[gid];
        if (grp?.members) targetUids = Object.keys(grp.members).filter(u => u !== myUid);
      } else {
        // Public: সব user (নিজে বাদে)
        targetUids = Object.keys(window.allUsers || {}).filter(u => u !== myUid);
      }

      // প্রতিজনকে notification queue-এ রাখি
      for (const uid of targetUids.slice(0, 30)) {
        const tokenSnap = await (async()=>{
          try{
            const {get,ref} = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
            return get(ref(db,'fcmTokens/'+uid));
          }catch{return null;}
        })();
        const token = tokenSnap?.val()?.token;
        if (!token) continue;
        await fbPush(fbRef(db,'notificationQueue'),{
          to: token, uid,
          title: `${window.CN} — ${room.name}`,
          body: text.length > 60 ? text.slice(0,60)+'…' : text,
          data: { page: 'chat', roomId: room.id },
          ts: Date.now()
        });
      }
    } catch(e) { console.warn('Chat notification error:', e.message); }
  }

  // ── রুম ইনফো
  window.ftRoomInfo = function() {
    if (!_currentRoom) return;
    if (_currentRoom.type === 'dm') {
      ftShowDMProfile(_currentRoom.targetUid);
    } else if (_currentRoom.type === 'group') {
      const gid = _currentRoom.id.replace('group_','');
      const grp = _allGroups[gid];
      if (!grp) return;
      const members = Object.keys(grp.members||{}).map(uid=>(window.allUsers||{})[uid]?.name||uid).join(', ');
      toast(`👥 ${grp.name}: ${members}`);
    }
  };

  // ✅ DM প্রোফাইল — ছবি ও সব ডিটেইলস
  window.ftShowDMProfile = function(uid) {
    const u = (window.allUsers||{})[uid]; if (!u) return;
    const now = new Date();
    const mSales = Object.values(window.allSales||{}).filter(s => {
      const d = new Date(s.date);
      return s.uid===uid && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    });
    const totalSale = mSales.reduce((a,s)=>a+(s.total||0),0);
    const sal = (window.allSalaries||{})[uid];
    const mAtt = Object.values(window.allAttendance||{}).filter(a => {
      const d = new Date(a.date);
      return a.uid===uid && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
    });
    const docs = Array.isArray(u.documents) ? u.documents : (u.documents ? Object.values(u.documents) : []);

    // Modal তৈরি
    let mo = document.getElementById('ft_dmProfileMo');
    if (!mo) {
      mo = document.createElement('div');
      mo.id = 'ft_dmProfileMo';
      mo.className = 'mo';
      document.body.appendChild(mo);
    }
    mo.innerHTML = `
      <div class="mbox">
        <button class="mc" onclick="this.closest('.mo').classList.remove('open')">✕</button>

        <!-- প্রোফাইল হেডার -->
        <div style="text-align:center;padding:16px 0 12px;">
          <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#3b82f6);display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 10px;overflow:hidden;border:3px solid var(--accent);">
            ${u.photoURL
              ? `<img src="${u.photoURL}" style="width:80px;height:80px;object-fit:cover;" onerror="this.outerHTML='👤'">`
              : `<span style="font-size:28px;font-weight:700;">${(u.name||'?')[0]}</span>`}
          </div>
          <div style="font-size:18px;font-weight:700;color:#fff;">${u.name||'–'}</div>
          <span class="role-badge role-${u.role}" style="margin-top:5px;display:inline-block;">
            ${u.role==='admin'?'👑 অ্যাডমিন':u.role==='manager'?'🧑‍💼 ম্যানেজার':'👷 কর্মী'}
          </span>
          <div style="font-size:11px;color:${u.status==='active'?'var(--green)':'var(--red)'};margin-top:6px;">
            ● ${u.status==='active'?'সক্রিয়':'নিষ্ক্রিয়'}
          </div>
        </div>

        <!-- যোগাযোগ -->
        <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
          <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">📞 যোগাযোগ</div>
          <div style="font-size:13px;margin-bottom:5px;">📧 ${u.email||'–'}</div>
          <div style="font-size:13px;margin-bottom:5px;">📱 ${u.phone||'–'}</div>
          <div style="font-size:13px;margin-bottom:5px;">💬 WA: ${u.waNum||'–'}</div>
          <div style="font-size:13px;">🏠 ${u.address||'–'}</div>
        </div>

        <!-- এই মাসের পারফরম্যান্স -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
          <div style="background:rgba(74,158,255,.1);border:1px solid var(--blue);border-radius:10px;padding:10px;text-align:center;">
            <div style="font-size:16px;font-weight:700;color:var(--blue);">${mSales.length}</div>
            <div style="font-size:10px;color:var(--muted);">বিক্রয়</div>
          </div>
          <div style="background:rgba(46,204,138,.1);border:1px solid var(--green);border-radius:10px;padding:10px;text-align:center;">
            <div style="font-size:16px;font-weight:700;color:var(--green);">${mAtt.length}</div>
            <div style="font-size:10px;color:var(--muted);">উপস্থিতি</div>
          </div>
          <div style="background:rgba(245,166,35,.1);border:1px solid var(--accent);border-radius:10px;padding:10px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:var(--accent);">${sal?Math.round(totalSale/(sal.monthlyTarget||1)*100)+'%':'–'}</div>
            <div style="font-size:10px;color:var(--muted);">টার্গেট</div>
          </div>
        </div>

        <!-- ডকুমেন্টস -->
        ${docs.length > 0 ? `
        <div style="background:var(--card);border-radius:12px;padding:13px;border:1px solid var(--border);margin-bottom:10px;">
          <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px;">📁 ডকুমেন্টস</div>
          ${docs.map(d=>`
            <a href="${d.url}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface);border-radius:8px;margin-bottom:5px;text-decoration:none;color:var(--text);border:1px solid var(--border);">
              <span>📄</span>
              <div style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${d.name||'ফাইল'}</div>
              <span style="font-size:10px;color:var(--blue);">→</span>
            </a>`).join('')}
        </div>` : ''}

        <!-- Message বাটন -->
        <button onclick="ftOpenRoom({id:'dm_${[window.CU?.uid,uid].sort().join('_')}',type:'dm',icon:'${(u.name||'?')[0]}',name:'${u.name||''}',sub:'',av:'conv-av-dm',targetUid:'${uid}',targetName:'${u.name||''}'});this.closest('.mo').classList.remove('open')"
          style="width:100%;padding:13px;background:linear-gradient(135deg,var(--accent),#d97706);border:none;border-radius:12px;color:#1a1200;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;">
          💬 মেসেজ করুন
        </button>
      </div>`;
    mo.classList.add('open');
  };

  // ── গ্রুপ তৈরির UI
  window.ftOpenGroupCreate = function() {
    _gcSelectedMembers = new Set();
    _selectedEmoji = '👥';
    const list = $('ft_groupMemberList'); if (!list) return;
    const users = Object.entries(window.allUsers||{}).filter(([uid])=>uid!==window.CU?.uid);
    list.innerHTML = users.map(([uid,u])=>`
      <div class="gc-member">
        <div class="gc-check" id="gc_${uid}" onclick="ftToggleGCMember('${uid}',this)">✓</div>
        <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#3b82f6);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">${(u.name||'?')[0]}</div>
        <div>
          <div style="font-size:13px;font-weight:600;">${u.name}</div>
          <div style="font-size:11px;color:var(--muted);">${u.role==='admin'?'অ্যাডমিন':u.role==='manager'?'ম্যানেজার':'কর্মী'}</div>
        </div>
      </div>`).join('');
    // emoji picker reset
    document.querySelectorAll('#ft_emojiPicker button').forEach(b=>b.style.background='var(--surface)');
    if(window.openMo) openMo('ft_groupCreateMo');
  };

  window.ftToggleGCMember = function(uid, el) {
    if (_gcSelectedMembers.has(uid)) { _gcSelectedMembers.delete(uid); el.classList.remove('checked'); }
    else { _gcSelectedMembers.add(uid); el.classList.add('checked'); }
  };

  window.ftPickEmoji = function(e, btn) {
    _selectedEmoji = e;
    document.querySelectorAll('#ft_emojiPicker button').forEach(b=>b.style.background='var(--surface)');
    btn.style.background='rgba(245,166,35,.25)';
  };

  window.ftCreateGroup = async function() {
    const name = $('ft_groupName')?.value?.trim();
    if (!name) { toast('গ্রুপের নাম দিন!', true); return; }
    if (_gcSelectedMembers.size === 0) { toast('কমপক্ষে ১ জন সদস্য বেছে নিন!', true); return; }
    const db = DB(); if (!db) return;

    const members = { [window.CU.uid]: true };
    _gcSelectedMembers.forEach(uid => { members[uid] = true; });

    await fbPush(fbRef(db, 'chatGroups'), {
      name, icon: _selectedEmoji, members,
      createdBy: window.CU.uid, createdByName: window.CN,
      ts: Date.now()
    });
    if(window.closeMo) closeMo('ft_groupCreateMo');
    toast(`✅ "${name}" গ্রুপ তৈরি হয়েছে`);
    if ($('ft_groupName')) $('ft_groupName').value = '';
  };

  // ── পুরনো compat (features.js nav patch-এর জন্য)
  window.ftSwitchRoom = function(room) { ftOpenRoom({id:room,type:'public',icon:'💬',name:room,sub:''}); };

  // ════════════════════════════════════════════════════════════
  //  4. ORDER MANAGEMENT
  // ════════════════════════════════════════════════════════════
  let _orderItems = [];
  let _ordFilter = 'all';

  function ftLoadOrderSelects() {
    const shopSel = $('ft_ordShop');
    if (shopSel) {
      shopSel.innerHTML = '<option value="">-- দোকান --</option>' +
        Object.values(window.allCustomers || {})
          .map(c => `<option value="${c.id || ''}">${c.name}${c.owner ? ' — ' + c.owner : ''}</option>`).join('');
    }
    const prodSel = $('ft_ordProd');
    if (prodSel) {
      prodSel.innerHTML = '<option value="">-- পণ্য --</option>' +
        Object.entries(window.allProducts || {})
          .map(([pid, p]) => `<option value="${pid}">${p.name} — ${bn(p.sellPrice)}</option>`).join('');
    }
  }

  window.ftAddOrderItem = function () {
    const prodId = $('ft_ordProd')?.value;
    const qty    = parseInt($('ft_ordQty')?.value) || 1;
    const prod   = (window.allProducts || {})[prodId];
    if (!prod) { toast('পণ্য বেছে নিন!', true); return; }
    _orderItems.push({ prodId, name: prod.name, qty, price: prod.sellPrice, total: qty * prod.sellPrice });
    if ($('ft_ordQty')) $('ft_ordQty').value = '1';
    ftRenderOrderItems();
  };

  function ftRenderOrderItems() {
    const el = $('ft_ordItems'); const totEl = $('ft_ordTotal');
    if (!el) return;
    el.innerHTML = _orderItems.length
      ? _orderItems.map((it, i) => `
        <div class="order-item-row">
          <span>${it.name}</span>
          <span>${it.qty} পিস × ${bn(it.price)}</span>
          <span style="color:var(--accent);font-weight:700">${bn(it.total)}</span>
          <button onclick="_orderItems.splice(${i},1);ftRenderOrderItems()"
            style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:0 4px">✕</button>
        </div>`).join('')
      : '<div style="color:var(--muted);font-size:12px;text-align:center;padding:8px">পণ্য যোগ করুন</div>';
    if (totEl) {
      const t = _orderItems.reduce((a, i) => a + i.total, 0);
      totEl.textContent = t > 0 ? 'মোট: ' + bn(t) : '';
    }
  }

  window.ftPlaceOrder = async function () {
    const shopId   = $('ft_ordShop')?.value;
    const note_    = $('ft_ordNote')?.value.trim();
    if (!shopId)          { toast('দোকান বেছে নিন!', true); return; }
    if (!_orderItems.length) { toast('কমপক্ষে ১টি পণ্য দিন!', true); return; }

    const shopName = (window.allCustomers || {})[shopId]?.name || '';
    const total = _orderItems.reduce((a, i) => a + i.total, 0);
    const db = DB(); if (!db) return;

    await fbPush(fbRef(db, 'orders'), {
      shopId, shopName, note: note_,
      items: _orderItems,
      total,
      uid: window.CU.uid,
      workerName: window.CN,
      status: 'pending',
      date: today(),
      ts: Date.now()
    });

    _orderItems = [];
    ftRenderOrderItems();
    if ($('ft_ordNote')) $('ft_ordNote').value = '';
    // ✅ Manager/Admin-কে notify করি
    if(window.sendNotificationToRole)
      window.sendNotificationToRole('manager','🛒 নতুন অর্ডার',
        `${window.CN}: ${shopName} — ৳${Math.round(total).toLocaleString('bn-BD')}`,'order');
    toast('✅ অর্ডার পাঠানো হয়েছে!');
    ftRenderOrders('all');
  };

  window.ftOrdFilter = function (f, btn) {
    _ordFilter = f;
    document.querySelectorAll('#page-order .fb').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    ftRenderOrders(f);
  };

  window.ftUpdateOrder = async function (ordId, status) {
    const db = DB(); if (!db) return;
    const order = (allOrders||{})[ordId];
    await fbUpdate(fbRef(db, 'orders/' + ordId), { status, updatedAt: Date.now(), updatedBy: window.CN });
    const labels = { approved:'✅ অর্ডার অনুমোদিত', delivered:'🚚 ডেলিভারি সম্পন্ন', cancelled:'❌ অর্ডার বাতিল' };
    toast(labels[status]);
    // ✅ অর্ডারদাতা কর্মীকে notify করি
    if(window.sendNotificationTo && order?.uid && order.uid !== window.CU?.uid)
      window.sendNotificationTo(order.uid, labels[status]||'অর্ডার আপডেট',
        `${order.shopName} — ৳${Math.round(order.total||0).toLocaleString('bn-BD')}`,'order');
    ftRenderOrders(_ordFilter);
  };

  function ftRenderOrders(filter) {
    const el = $('ft_ordList'); if (!el) return;
    const CR_  = window.CR;
    const uid_ = window.CU?.uid;

    let orders = Object.entries(allOrders || {});
    // Workers see only their own orders
    if (CR_ === 'worker') orders = orders.filter(([, o]) => o.uid === uid_);
    if (filter && filter !== 'all') orders = orders.filter(([, o]) => o.status === filter);
    orders = orders.sort((a, b) => b[1].ts - a[1].ts);

    const statusStyle = {
      pending:   { color: 'var(--accent)', label: '⏳ অপেক্ষায়' },
      approved:  { color: 'var(--blue)',   label: '✅ অনুমোদিত' },
      delivered: { color: 'var(--green)',  label: '🚚 ডেলিভারি' },
      cancelled: { color: 'var(--red)',    label: '❌ বাতিল' }
    };

    el.innerHTML = orders.length ? orders.map(([id, o]) => {
      const ss = statusStyle[o.status] || statusStyle.pending;
      return `
      <div class="ft-card">
        <div class="ft-row">
          <div style="flex:1">
            <div style="font-weight:700;font-size:13px">🛒 ${o.shopName}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">📅 ${o.date} · 👤 ${o.workerName}</div>
          </div>
          <span style="font-size:11px;padding:3px 9px;border-radius:7px;border:1px solid ${ss.color};color:${ss.color}">${ss.label}</span>
        </div>
        <div style="margin:8px 0;font-size:12px">
          ${(o.items || []).map(it => `
          <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)">
            <span>${it.name}</span>
            <span>${it.qty} পিস = <b style="color:var(--accent)">${bn(it.total)}</b></span>
          </div>`).join('')}
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:700;font-size:13px">
            <span>মোট</span><span style="color:var(--accent)">${bn(o.total)}</span>
          </div>
        </div>
        ${o.note ? `<div style="font-size:12px;color:var(--muted);margin-bottom:8px">📝 ${o.note}</div>` : ''}
        ${CR_ !== 'worker' && o.status === 'pending' ? `
        <div class="ft-btns">
          <button class="ft-btn ft-btn-g" onclick="ftUpdateOrder('${id}','approved')">✅ অনুমোদন</button>
          <button class="ft-btn ft-btn-b" onclick="ftUpdateOrder('${id}','delivered')">🚚 ডেলিভারি</button>
          <button class="ft-btn ft-btn-r" onclick="ftUpdateOrder('${id}','cancelled')">❌ বাতিল</button>
        </div>` : ''}
        ${CR_ !== 'worker' && o.status === 'approved' ? `
        <div class="ft-btns">
          <button class="ft-btn ft-btn-g" onclick="ftUpdateOrder('${id}','delivered')">🚚 ডেলিভারি সম্পন্ন</button>
        </div>` : ''}
      </div>`;
    }).join('') : `<div class="ft-empty">🛒<br>কোনো অর্ডার নেই</div>`;
  }

  // ════════════════════════════════════════════════════════════
  //  FIREBASE LISTENERS — app.js এর db ব্যবহার করি
  // ════════════════════════════════════════════════════════════
  function startListeners() {
    const db = DB(); if (!db) return;

    fbOnValue(fbRef(db, 'tasks'), snap => {
      allTasks = snap.val() || {};
      if (document.querySelector('#page-tasks.active')) ftRenderTasks();
    });

    fbOnValue(fbRef(db, 'chats'), snap => {
      allChats = snap.val() || {};
      // unread count আপডেট
      if (_currentRoom) {
        ftRenderChatRoom();
      } else if (document.querySelector('#page-chat.active')) {
        ftRenderConvList();
      }
      // notification badge
      ftUpdateChatBadge();
    });

    // ✅ Groups listener
    fbOnValue(fbRef(db, 'chatGroups'), snap => {
      _allGroups = snap.val() || {};
      if (document.querySelector('#page-chat.active') && !_currentRoom) ftRenderConvList();
    });

    // ✅ Online presence
    const myUid = window.CU?.uid;
    if (myUid) {
      fbSet(fbRef(db, 'presence/' + myUid), { online: true, name: window.CN, ts: Date.now() });
      fbOnValue(fbRef(db, 'presence'), snap => {
        window._onlineUsers = {};
        const data = snap.val() || {};
        Object.entries(data).forEach(([uid,d]) => {
          if (d.online && (Date.now()-d.ts) < 120000) window._onlineUsers[uid] = true;
        });
      });
    }

    fbOnValue(fbRef(db, 'orders'), snap => {
      allOrders = snap.val() || {};
      if (document.querySelector('#page-order.active')) ftRenderOrders(_ordFilter);
    });
  }

  // ════════════════════════════════════════════════════════════
  //  INIT — app.js রেডি হলে চলি
  // ════════════════════════════════════════════════════════════

  // ── Chat badge update
  function ftUpdateChatBadge() {
    const myUid = window.CU?.uid;
    if (!myUid) return;
    let totalUnread = 0;
    Object.entries(allChats).forEach(([roomId, msgs]) => {
      const msgList = Object.values(msgs||{});
      const unread = msgList.filter(m => m.uid !== myUid && !m.read && m.ts > (window._lastChatVisit?.[roomId]||0)).length;
      _chatUnreads[roomId] = unread;
      totalUnread += unread;
    });
    // bottom nav dot
    const dot = document.getElementById('bnavDot');
    if (dot) { dot.style.display = totalUnread > 0 ? 'block' : 'none'; dot.textContent = totalUnread > 9 ? '9+' : totalUnread; }
  }

  waitForApp(() => {
    injectHTML();
    patchNav();
    patchShowPage();

    // buildNav একবার আবার call করি নতুন বাটন দেখাতে
    setTimeout(() => {
      if (window.buildNav) window.buildNav();
      startListeners();
      // ✅ pages inject হওয়ার পর আবার expose করি
      window.ftRenderTasks = ftRenderTasks;
      window.ftRenderConvList = ftRenderConvList;
      window.ftRenderOrders = ftRenderOrders;
      window.ftLoadOrderSelects = ftLoadOrderSelects;
      window.ftLoadWorkerSelects = ftLoadWorkerSelects;
      console.log('✅ features.js fully ready');
      toast('✨ নতুন ফিচার সক্রিয়!');
    }, 300);
  });

})();
