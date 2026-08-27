(function(){
  "use strict";

  const state = {
    cfg:null,
    currentIncident:null,
    currentTickets:[],
    formSeanceId:"",
    actorKey:"va_incident_actor_v1",
    requestedViewOpened:false,
    selectedIncidentTicketIds:new Set(),
    currentOrders:[],
    currentRefundRequests:[],
    currentRefundRequestTickets:[],
    currentOrderContext:null,
    refundDraftSelectedIds:new Set(),
    refundFocusTicketId:"",
    cancelOrderQuery:""
  };

  function cfg(){
    if(!state.cfg) throw new Error("VASeanceOps не ініціалізовано");
    return state.cfg;
  }

  function esc(value){
    return String(value ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function money(v){
    return `${Number(v || 0).toLocaleString("uk-UA",{minimumFractionDigits:0,maximumFractionDigits:2})} грн`;
  }

  function dateTimeHuman(date,time){
    return [date || "—",String(time || "").slice(0,5)].filter(Boolean).join(" • ");
  }

  function seanceTitle(s){ return s?.show || s?.title || s?.name || s?.id || "Без назви"; }
  function venueLabel(s){ return cfg().venueLabel ? cfg().venueLabel(s?.venue_id || s?.hall || "") : (s?.venue_id || s?.hall || "—"); }
  function getSeances(){ return typeof cfg().getSeances === "function" ? (cfg().getSeances() || []) : []; }

  function actorValue(){ return localStorage.getItem(state.actorKey) || ""; }
  function rememberActor(value){ const x=String(value||"").trim(); if(x) localStorage.setItem(state.actorKey,x); }

  async function apiJson(path,options={}){
    const c=cfg();
    const res=await fetch(`${c.supabaseUrl}/rest/v1/${path}`,{
      ...options,
      headers:{
        apikey:c.supabaseKey,
        Authorization:`Bearer ${c.supabaseKey}`,
        "Content-Type":"application/json",
        ...(options.headers||{})
      },
      cache:options.cache||"no-store"
    });
    const text=await res.text();
    let data=null;
    try{data=text?JSON.parse(text):null;}catch{data=text;}
    if(!res.ok){
      const msg=data?.message||data?.hint||data?.details||data?.error||text||`HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  async function rpc(name,payload){
    return apiJson(`rpc/${name}`,{method:"POST",body:JSON.stringify(payload||{})});
  }

  function mount(){
    if(document.getElementById("va-postpone-modal")) return;
    document.body.insertAdjacentHTML("beforeend",`
      <div id="va-postpone-modal" class="va-seance-modal hidden">
        <div class="va-seance-modal-content">
          <div class="va-seance-modal-head"><h3>📅 Перенесення сеансу</h3><button class="va-seance-modal-close" onclick="VASeanceOps.closePostpone()">✕</button></div>
          <div id="vaPostponeInfo" class="va-incident-info"></div>
          <div class="va-incident-form-grid">
            <div class="field"><label>Нова дата</label><input id="vaPostNewDate" type="date"></div>
            <div class="field"><label>Новий час</label><input id="vaPostNewTime" type="time"></div>
            <div class="field wide"><label>Причина перенесення *</label><input id="vaPostReason" placeholder="Причина"></div>
            <div class="field"><label>Підстава / документ</label><input id="vaPostDocument" placeholder="Наказ, розпорядження, лист — якщо є"></div>
            <div class="field"><label>Відповідальний *</label><input id="vaPostActor" placeholder="ПІБ / посада"></div>
            <div class="field wide"><label>Примітка</label><textarea id="vaPostNote" placeholder="Додатковий коментар"></textarea></div>
            <label class="va-incident-check wide"><input id="vaPostInterrupted" type="checkbox"><span><b>Захід уже почався і був перерваний.</b><br>VA відокремить уже погашені квитки як такі, що можуть потребувати компенсаційного проходу. Непогашені квитки залишаться дійсними на нову дату.</span></label>
          </div>
          <div class="va-incident-actions"><button class="btn orange" onclick="VASeanceOps.submitPostpone()">Підтвердити перенесення</button><button class="btn ghost" onclick="VASeanceOps.closePostpone()">Закрити</button></div>
        </div>
      </div>
      <div id="va-cancel-modal" class="va-seance-modal hidden">
        <div class="va-seance-modal-content">
          <div class="va-seance-modal-head"><h3>⛔ Скасування сеансу</h3><button class="va-seance-modal-close" onclick="VASeanceOps.closeCancel()">✕</button></div>
          <div id="vaCancelInfo" class="va-incident-info"></div>
          <div class="va-incident-banner bad"><b>Скасування припиняє продаж і звичайний прохід за непогашеними квитками.</b> Грошове повернення цією кнопкою не виконується. VA зафіксує реєстр квитків і відкриє контроль їх подальшої обробки.</div>
          <div class="va-incident-form-grid">
            <div class="field wide"><label>Причина скасування *</label><input id="vaCancelReason" placeholder="Причина"></div>
            <div class="field"><label>Підстава / документ</label><input id="vaCancelDocument" placeholder="Наказ, розпорядження, лист — якщо є"></div>
            <div class="field"><label>Відповідальний *</label><input id="vaCancelActor" placeholder="ПІБ / посада"></div>
            <div class="field wide"><label>Примітка</label><textarea id="vaCancelNote" placeholder="Додатковий коментар"></textarea></div>
          </div>
          <div class="va-incident-actions"><button class="btn red" onclick="VASeanceOps.submitCancel()">Підтвердити скасування</button><button class="btn ghost" onclick="VASeanceOps.closeCancel()">Закрити</button></div>
        </div>
      </div>
      <div id="va-incident-modal" class="va-seance-modal hidden">
        <div class="va-seance-modal-content">
          <div class="va-seance-modal-head"><h3 id="vaIncidentTitle">Обробка сеансу</h3><button class="va-seance-modal-close" onclick="VASeanceOps.closeIncident()">✕</button></div>
          <div id="vaIncidentBody"></div>
        </div>
      </div>`);
  }

  function show(id){document.getElementById(id)?.classList.remove("hidden");}
  function hide(id){document.getElementById(id)?.classList.add("hidden");}
  function closePostpone(){hide("va-postpone-modal");}
  function closeCancel(){hide("va-cancel-modal");}
  function closeIncident(){
    hide("va-incident-modal");
    state.currentIncident=null;
    state.currentTickets=[];
    state.currentOrders=[];
    state.currentRefundRequests=[];
    state.currentRefundRequestTickets=[];
    state.currentOrderContext=null;
    state.selectedIncidentTicketIds.clear();
    state.refundDraftSelectedIds.clear();
    state.refundFocusTicketId="";
    state.cancelOrderQuery="";
  }

  async function loadSeanceById(id){
    const local=getSeances().find(s=>String(s.id)===String(id));
    if(local) return local;
    const rows=await apiJson(`seances?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
    return Array.isArray(rows)&&rows.length?rows[0]:null;
  }

  async function loadTicketPreview(id){
    try{
      // У live VA public.tickets не має колонки status.
      // Для прев'ю скасування беремо фактичний реєстр tickets, а погашення визначаємо по checked_in_at.
      const rows=await apiJson(`tickets?seance_id=eq.${encodeURIComponent(id)}&select=id,price,channel,checked_in_at`);
      const active=Array.isArray(rows)?rows:[];
      return {count:active.length,amount:active.reduce((sum,t)=>sum+Number(t.price||0),0),checked:active.filter(t=>!!t.checked_in_at).length};
    }catch(e){console.warn("ticket preview error",e);return{count:0,amount:0,checked:0};}
  }

  async function reload(seanceId){
    if(typeof cfg().reloadSeances==="function") await cfg().reloadSeances();
    if(seanceId && typeof cfg().selectSeance==="function") cfg().selectSeance(seanceId);
  }

  async function openPostpone(seanceId){
    try{
      mount();
      const id=seanceId || (typeof cfg().getSelectedSeanceId==="function"?cfg().getSelectedSeanceId():"");
      if(!id){alert("Оберіть сеанс.");return;}
      const s=await loadSeanceById(id); if(!s) throw new Error("Сеанс не знайдено");
      const p=await loadTicketPreview(id);
      state.formSeanceId=id;
      document.getElementById("vaPostponeInfo").innerHTML=`<b>${esc(seanceTitle(s))}</b><br>${esc(dateTimeHuman(s.date,s.time))} • ${esc(venueLabel(s))}<br><br>На зараз у реєстрі: <b>${p.count}</b> квитків • ${money(p.amount)}. Погашено до цього моменту: <b>${p.checked}</b>.`;
      document.getElementById("vaPostNewDate").value=s.date||"";
      document.getElementById("vaPostNewTime").value=String(s.time||"").slice(0,5);
      document.getElementById("vaPostReason").value="";
      document.getElementById("vaPostDocument").value="";
      document.getElementById("vaPostActor").value=actorValue();
      document.getElementById("vaPostNote").value="";
      document.getElementById("vaPostInterrupted").checked=p.checked>0;
      show("va-postpone-modal");
    }catch(e){alert("Не вдалося відкрити перенесення:\n"+e.message);}
  }

  async function submitPostpone(){
    const id=state.formSeanceId;
    const newDate=document.getElementById("vaPostNewDate").value;
    const newTime=document.getElementById("vaPostNewTime").value;
    const reason=document.getElementById("vaPostReason").value.trim();
    const documentRef=document.getElementById("vaPostDocument").value.trim();
    const actor=document.getElementById("vaPostActor").value.trim();
    const note=document.getElementById("vaPostNote").value.trim();
    const interrupted=document.getElementById("vaPostInterrupted").checked;
    if(!newDate||!newTime||!reason||!actor){alert("Вкажіть нову дату, час, причину перенесення та відповідального.");return;}
    rememberActor(actor);
    const warning=interrupted
      ?"Захід позначено як перерваний після початку. Погашені квитки будуть виділені для окремого рішення про компенсацію. Продовжити?"
      :"Квитки залишаться дійсними на нову дату. Компенсація та повернення автоматично не створюються. Продовжити?";
    if(!confirm(warning))return;
    try{
      const result=await rpc("va_postpone_seance_incident",{p_seance_id:id,p_new_date:newDate,p_new_time:newTime,p_reason:reason,p_document_ref:documentRef||null,p_actor:actor||null,p_note:note||null,p_interrupted_after_start:interrupted});
      closePostpone();
      await reload(id);
      alert(`Перенесення зафіксовано. Реєстр: ${result?.snapshot?.tickets ?? "—"} квитків.`);
      await openIncident(id,"postponed",result?.incident_id||null);
    }catch(e){console.error(e);alert("Помилка перенесення:\n"+e.message);}
  }

  async function openCancel(seanceId){
    try{
      mount();
      const id=seanceId || (typeof cfg().getSelectedSeanceId==="function"?cfg().getSelectedSeanceId():"");
      if(!id){alert("Оберіть сеанс.");return;}
      const s=await loadSeanceById(id); if(!s) throw new Error("Сеанс не знайдено");
      const p=await loadTicketPreview(id);
      state.formSeanceId=id;
      document.getElementById("vaCancelInfo").innerHTML=`<b>${esc(seanceTitle(s))}</b><br>${esc(dateTimeHuman(s.date,s.time))} • ${esc(venueLabel(s))}<br><br>На момент відкриття форми: <b>${p.count}</b> чинних квитків • ${money(p.amount)}. Уже погашено: <b>${p.checked}</b>. Остаточний snapshot буде зроблено сервером у момент підтвердження.`;
      document.getElementById("vaCancelReason").value="";
      document.getElementById("vaCancelDocument").value="";
      document.getElementById("vaCancelActor").value=actorValue();
      document.getElementById("vaCancelNote").value="";
      show("va-cancel-modal");
    }catch(e){alert("Не вдалося відкрити скасування:\n"+e.message);}
  }

  async function submitCancel(){
    const id=state.formSeanceId;
    const reason=document.getElementById("vaCancelReason").value.trim();
    const documentRef=document.getElementById("vaCancelDocument").value.trim();
    const actor=document.getElementById("vaCancelActor").value.trim();
    const note=document.getElementById("vaCancelNote").value.trim();
    if(!reason||!actor){alert("Вкажіть причину скасування та відповідального.");return;}
    rememberActor(actor);
    if(!confirm("СКАСУВАТИ СЕАНС?\n\nПродаж буде припинено, непогашені квитки стануть недійсними для звичайного проходу, а VA створить реєстр подальшої обробки. Гроші автоматично НЕ повертаються."))return;
    try{
      const result=await rpc("va_cancel_seance_incident",{p_seance_id:id,p_reason:reason,p_document_ref:documentRef||null,p_actor:actor||null,p_note:note||null});
      closeCancel();
      await reload(id);
      alert(`Скасування зафіксовано. Реєстр: ${result?.snapshot?.tickets ?? "—"} квитків.`);
      await openIncident(id,"cancelled",result?.incident_id||null);
    }catch(e){console.error(e);alert("Помилка скасування:\n"+e.message);}
  }

  function resolutionLabel(kind){return({valid_new_date:"Дійсний на нову дату",compensation_eligible:"Може потребувати компенсації",interruption_compensation:"Компенсаційний прохід",repertoire_replacement:"Репертуарна заміна",refund_due:"Повернення VA",operator_refund:"Повернення оператором",no_money:"Без грошового повернення",review_required:"Потрібне рішення",other:"Інше рішення"})[kind]||kind||"—";}
  function resolutionStatusLabel(status){return({pending:"Очікує",contact_received:"Звернення отримано",processing:"В роботі",completed:"Завершено",not_required:"Не потрібно"})[status]||status||"—";}

  async function openIncident(seanceId,type,explicitId=null){
    try{
      mount();
      let inc=null;
      if(explicitId){const rows=await apiJson(`va_seance_incidents?id=eq.${encodeURIComponent(explicitId)}&select=*`);inc=Array.isArray(rows)?rows[0]:null;}
      if(!inc){const rows=await apiJson(`va_seance_incidents?seance_id=eq.${encodeURIComponent(seanceId)}&incident_type=eq.${encodeURIComponent(type)}&select=*&order=occurred_at.desc&limit=1`);inc=Array.isArray(rows)?rows[0]:null;}
      if(!inc){alert("Для цього сеансу немає інцидентного реєстру. Нові перенесення та скасування оформлюйте через Квитковий відділ.");return;}
      state.currentIncident=inc;
      state.selectedIncidentTicketIds.clear();
      const rows=await apiJson(`va_incident_tickets?incident_id=eq.${encodeURIComponent(inc.id)}&select=*&order=seat_label.asc,created_at.asc`);
      state.currentTickets=Array.isArray(rows)?rows:[];
      if(inc.incident_type==="cancelled"){
        const [orders,requests,requestTickets]=await Promise.all([
          apiJson(`orders?seance_id=eq.${encodeURIComponent(inc.seance_id)}&select=*`).catch(()=>[]),
          apiJson(`va_refund_requests?incident_id=eq.${encodeURIComponent(inc.id)}&select=*&order=created_at.desc`).catch(e=>{throw new Error("Спочатку виконайте SQL V1.7 (реєстр заяв на повернення). "+e.message);}),
          apiJson(`va_refund_request_tickets?incident_id=eq.${encodeURIComponent(inc.id)}&select=*`).catch(()=>[])
        ]);
        state.currentOrders=Array.isArray(orders)?orders:[];
        state.currentRefundRequests=Array.isArray(requests)?requests:[];
        state.currentRefundRequestTickets=Array.isArray(requestTickets)?requestTickets:[];
      }else{
        state.currentOrders=[];
        state.currentRefundRequests=[];
        state.currentRefundRequestTickets=[];
      }
      renderIncident();
      show("va-incident-modal");
    }catch(e){console.error(e);alert("Не вдалося відкрити реєстр:\n"+e.message);}
  }

  function injectRefundStyles(){
    if(document.getElementById("va-refund-order-styles")) return;
    const style=document.createElement("style");
    style.id="va-refund-order-styles";
    style.textContent=`
      .va-refund-search-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0}
      .va-refund-search-box{padding:14px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(255,255,255,.035)}
      .va-refund-search-box label{display:block;font-weight:800;margin-bottom:8px}
      .va-refund-search-row{display:flex;gap:8px}.va-refund-search-row input{flex:1}
      .va-refund-order-list{display:grid;gap:10px;margin-top:12px}
      .va-refund-order-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:14px 16px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(255,255,255,.035)}
      .va-refund-order-card h4{margin:0 0 6px;font-size:18px}.va-refund-order-meta{color:#cbd5e1;font-size:13px;line-height:1.5}.va-refund-order-progress{margin-top:7px;font-size:13px;font-weight:800;color:#f5b400}
      .va-refund-back{margin-bottom:12px}.va-refund-section{padding:14px 16px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(255,255,255,.035);margin:12px 0}.va-refund-section h4{margin:0 0 10px;font-size:18px}
      .va-refund-kv{display:grid;grid-template-columns:180px 1fr;gap:6px 14px;font-size:14px;line-height:1.45}.va-refund-kv .k{color:#aebbd0}.va-refund-kv .v{font-weight:700;overflow-wrap:anywhere}
      .va-refund-request-card{padding:12px 14px;border:1px solid rgba(255,255,255,.12);border-radius:14px;margin:8px 0;background:rgba(15,23,42,.45)}
      .va-refund-request-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.va-refund-request-no{font-weight:900;font-size:16px}.va-refund-badge{padding:5px 9px;border-radius:999px;font-size:12px;font-weight:900;background:#475569}.va-refund-badge.ok{background:#166534}.va-refund-badge.warn{background:#92400e}
      .va-refund-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.va-refund-form-grid .wide{grid-column:1/-1}.va-refund-check{display:flex;gap:9px;align-items:flex-start;padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.025)}.va-refund-check input{width:auto;min-height:auto;margin-top:3px}
      .va-refund-price-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.va-refund-price-row{padding:10px 12px;border:1px solid rgba(255,255,255,.12);border-radius:12px}.va-refund-price-row b{display:block;margin-bottom:6px}.va-refund-price-row select{width:100%}
      .va-refund-summary{font-size:18px;font-weight:900;margin:12px 0;color:#2ecc71}.va-refund-ticket-detail{margin-top:10px}.va-refund-ticket-line{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07)}.va-refund-ticket-line:last-child{border-bottom:0}.va-refund-ticket-line input{width:18px;height:18px;min-height:auto}
      .va-refund-muted{color:#94a3b8;font-size:12px}.va-refund-danger{color:#fca5a5}.va-refund-ok{color:#86efac}
      @media(max-width:900px){.va-refund-search-grid,.va-refund-form-grid,.va-refund-price-grid{grid-template-columns:1fr}.va-refund-form-grid .wide{grid-column:auto}.va-refund-kv{grid-template-columns:1fr}.va-refund-order-card{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function orderIdOf(r){return String(r?.order_id||"").trim();}
  function orderRow(id){return state.currentOrders.find(o=>String(o.order_id||o.id||"")===String(id))||null;}
  function requestMappings(requestId){return state.currentRefundRequestTickets.filter(x=>String(x.request_id)===String(requestId)&&x.active!==false);}
  function ticketRequest(ticketId){
    const map=state.currentRefundRequestTickets.find(x=>String(x.incident_ticket_id)===String(ticketId)&&x.active!==false);
    if(!map)return null;
    return state.currentRefundRequests.find(r=>String(r.id)===String(map.request_id))||null;
  }
  function isClosedRow(r){return ["completed","not_required"].includes(String(r?.resolution_status||""));}
  function isOperatorRow(r){return r?.source_kind==="operator"||r?.resolution_kind==="operator_refund";}

  function cancelOrderGroups(){
    const map=new Map();
    for(const r of state.currentTickets){
      const oid=orderIdOf(r);
      const key=oid||`__NOORDER__:${r.id}`;
      if(!map.has(key))map.set(key,{key,orderId:oid,rows:[]});
      map.get(key).rows.push(r);
    }
    return Array.from(map.values()).map(g=>{
      const o=g.orderId?orderRow(g.orderId):null;
      const first=g.rows[0]||{};
      const total=g.rows.length;
      const amount=g.rows.reduce((s,r)=>s+Number(r.price||0),0);
      const completed=g.rows.filter(isClosedRow).length;
      const completedAmount=g.rows.filter(r=>r.resolution_status==="completed").reduce((s,r)=>s+Number(r.resolution_amount||r.price||0),0);
      const processing=g.rows.filter(r=>r.resolution_status==="processing").length;
      const requests=state.currentRefundRequests.filter(r=>String(r.order_id)===String(g.orderId)&&r.status!=="cancelled");
      return {...g,o,first,total,amount,completed,completedAmount,processing,requests,
        buyer:o?.buyer_name||first.buyer_name||"—",
        email:o?.buyer_email||first.buyer_email||"",
        phone:o?.buyer_phone||first.buyer_phone||"",
        channel:o?.channel||first.channel||first.source_kind||"—"};
    }).sort((a,b)=>String(a.orderId||a.key).localeCompare(String(b.orderId||b.key),"uk"));
  }

  function renderIncident(){
    injectRefundStyles();
    const inc=state.currentIncident,rows=state.currentTickets;if(!inc)return;
    const seance=getSeances().find(s=>String(s.id)===String(inc.seance_id));
    const total=rows.length,amount=rows.reduce((s,r)=>s+Number(r.price||0),0),isCancel=inc.incident_type==="cancelled";
    document.getElementById("vaIncidentTitle").textContent=isCancel?"⛔ Обробка скасування":"📅 Обробка перенесення";

    if(isCancel){
      const completed=rows.filter(r=>r.resolution_status==="completed");
      const completedAmount=completed.reduce((s,r)=>s+Number(r.resolution_amount||r.price||0),0);
      const pending=rows.filter(r=>!["completed","not_required"].includes(r.resolution_status));
      const pendingAmount=pending.reduce((s,r)=>s+Number(r.resolution_amount||r.price||0),0);
      const requestsOpen=state.currentRefundRequests.filter(r=>["registered","processing"].includes(r.status)).length;
      const incidentCompleted=String(inc.operational_status||"").toLowerCase()==="completed";
      const incidentActions=incidentCompleted
        ? `<button class="btn ghost" onclick="VASeanceOps.refreshIncident()">Оновити</button><span style="display:inline-flex;align-items:center;padding:0 8px;font-weight:800;color:#2ecc71;">✅ Обробку завершено</span>`
        : `<button class="btn ghost" onclick="VASeanceOps.refreshIncident()">Оновити</button>${pending.length===0?`<button class="btn green" onclick="VASeanceOps.completeIncident()">Завершити обробку</button>`:`<span style="display:inline-flex;align-items:center;padding:0 8px;font-weight:800;color:#f5b400;">Залишилось: ${pending.length}</span>`}`;
      document.getElementById("vaIncidentBody").innerHTML=`
        <div class="va-incident-info"><b>${esc(seance?seanceTitle(seance):inc.seance_id)}</b><br>Скасовано: ${esc(String(inc.occurred_at||""))}<br>Причина: ${esc(inc.reason||"—")}${inc.document_ref?`<br>Підстава скасування: ${esc(inc.document_ref)}`:""}<br>Стан обробки: <b>${esc(inc.operational_status||"open")}</b></div>
        <div class="va-incident-banner bad"><b>Повернення оформлюється за ордером.</b> Підстава — заява заявника та перевірка документа, що посвідчує особу. Пошук за номером квитка лише знаходить його ордер. Фактичні гроші ця сторінка не переказує.</div>
        <div class="va-incident-stats">
          <div class="va-incident-stat"><span>Зафіксовано</span><strong>${total}</strong><br>${money(amount)}</div>
          <div class="va-incident-stat"><span>Повернено / закрито</span><strong>${completed.length}</strong><br>${money(completedAmount)}</div>
          <div class="va-incident-stat"><span>Залишилось</span><strong>${pending.length}</strong><br>${money(pendingAmount)}</div>
          <div class="va-incident-stat"><span>Заяв у роботі</span><strong>${requestsOpen}</strong></div>
          <div class="va-incident-stat"><span>Ордерів</span><strong>${cancelOrderGroups().filter(g=>g.orderId).length}</strong></div>
        </div>
        <div class="va-incident-actions">${incidentActions}</div>
        <div class="va-refund-search-grid">
          <div class="va-refund-search-box">
            <label>1. Ордери скасованого сеансу</label>
            <div class="va-refund-search-row"><input id="vaRefundOrderSearch" autocomplete="off" spellcheck="false" placeholder="Фільтр: № ордера, ПІБ, телефон або email"><button class="btn ghost" onclick="VASeanceOps.applyCancelOrderSearch()">Знайти</button><button class="btn ghost" onclick="VASeanceOps.clearCancelOrderSearch()">Усі</button></div>
            <div class="va-refund-muted" style="margin-top:7px">Список ордерів показано нижче автоматично. Пошук лише звужує список.</div>
          </div>
          <div class="va-refund-search-box">
            <label>2. Пошук за квитком / QR</label>
            <div class="va-refund-search-row"><input id="vaRefundTicketSearch" placeholder="Номер квитка, QR / token, місце"><button class="btn blue" onclick="VASeanceOps.findRefundTicket()">Знайти ордер</button></div>
          </div>
        </div>
        <div id="vaCancelOrderListHost"></div>`;
      renderCancelOrderList();
      return;
    }

    const valid=rows.filter(r=>r.resolution_kind==="valid_new_date").length;
    const eligible=rows.filter(r=>r.resolution_kind==="compensation_eligible").length;
    const comp=rows.filter(r=>r.resolution_kind==="interruption_compensation");
    const repl=rows.filter(r=>r.resolution_kind==="repertoire_replacement");
    const banner=inc.interrupted_after_start?`<div class="va-incident-banner warn"><b>Перенесення після переривання.</b> Непогашені квитки залишаються дійсними на нову дату. Погашені виділені окремо; компенсаційні права створюються лише після рішення адміністрації.</div>`:`<div class="va-incident-banner ok"><b>Звичайне перенесення.</b> Квитки залишаються дійсними на нову дату. Для конкретного звернення можна оформити одноразову репертуарну заміну — тоді вихідний квиток більше не працюватиме на перенесений сеанс.</div>`;
    const special=inc.interrupted_after_start&&eligible>0?`<button class="btn orange" onclick="VASeanceOps.createInterruptionCompensation('${inc.id}')">Створити компенсацію по погашених (${eligible})</button>`:"";
    document.getElementById("vaIncidentBody").innerHTML=`<div class="va-incident-info"><b>${esc(seance?seanceTitle(seance):inc.seance_id)}</b><br>Було: ${esc(dateTimeHuman(inc.old_date,inc.old_time))} → Стало: ${esc(dateTimeHuman(inc.new_date,inc.new_time))}<br>Причина: ${esc(inc.reason||"—")}${inc.document_ref?`<br>Підстава: ${esc(inc.document_ref)}`:""}<br>Стан обробки: <b>${esc(inc.operational_status||"open")}</b></div>${banner}<div class="va-incident-stats"><div class="va-incident-stat"><span>На момент перенесення</span><strong>${total}</strong><br>${money(amount)}</div><div class="va-incident-stat"><span>Дійсні на нову дату</span><strong>${valid}</strong></div><div class="va-incident-stat"><span>Потребують рішення</span><strong>${eligible}</strong></div><div class="va-incident-stat"><span>Компенсація</span><strong>${comp.filter(r=>r.resolution_status==="completed").length}/${comp.length}</strong></div><div class="va-incident-stat"><span>Репертуарна заміна</span><strong>${repl.filter(r=>r.resolution_status==="completed").length}/${repl.length}</strong></div></div><div class="va-incident-actions">${special}<button class="btn ghost" onclick="VASeanceOps.refreshIncident()">Оновити</button><button class="btn green" onclick="VASeanceOps.completeIncident()">Завершити обробку</button></div><div class="va-incident-toolbar"><input id="vaIncidentSearch" placeholder="Фільтр: квиток, замовлення, канал, місце, ПІБ, email" oninput="VASeanceOps.renderIncidentTable()"><select id="vaIncidentStatusFilter" onchange="VASeanceOps.renderIncidentTable()"><option value="all">Усі стани</option><option value="pending">Очікує</option><option value="contact_received">Звернення отримано</option><option value="processing">В роботі</option><option value="completed">Завершено</option><option value="not_required">Не потрібно</option></select></div><div id="vaIncidentTableHost"></div>`;
    renderIncidentTable();
  }

  function renderCancelOrderList(){
    const host=document.getElementById("vaCancelOrderListHost");if(!host)return;
    const q=String(state.cancelOrderQuery||"").trim().toLowerCase();
    const all=cancelOrderGroups();
    const groups=all.filter(g=>{
      if(!q)return true;
      return [g.orderId,g.buyer,g.email,g.phone,g.channel].join(" ").toLowerCase().includes(q);
    });
    const title=q
      ? `<div class="va-incident-info" style="margin-top:12px"><b>Знайдено ордерів: ${groups.length}</b> з ${all.length}. Фільтр: ${esc(state.cancelOrderQuery)}</div>`
      : `<div class="va-incident-info" style="margin-top:12px"><b>Ордери цього скасованого сеансу: ${all.length}</b><br>Оберіть потрібний ордер зі списку або скористайтеся пошуком.</div>`;
    const list=groups.length?groups.map(g=>{
      const pending=g.total-g.completed;
      const reqInWork=g.requests.filter(r=>["registered","processing"].includes(r.status)).length;
      const noOrder=!g.orderId;
      return `<div class="va-refund-order-card"><div><h4>${noOrder?`⚠️ Квиток без ордера`:`Ордер ${esc(g.orderId)}`}</h4><div class="va-refund-order-meta">Платник / покупець: <b>${esc(g.buyer)}</b>${g.phone?` · ${esc(g.phone)}`:""}${g.email?` · ${esc(g.email)}`:""}<br>Канал: ${esc(g.channel)} · Квитків: <b>${g.total}</b> · ${money(g.amount)} · Заяв: ${g.requests.length}</div><div class="va-refund-order-progress">Закрито: ${g.completed}/${g.total}${reqInWork?` · заяв у роботі: ${reqInWork}`:""}${pending?` · залишилось: ${pending}`:" · завершено"}</div></div><div>${noOrder?`<span class="va-refund-danger">Стандартне повернення неможливе без ордера</span>`:`<button class="btn blue" onclick="VASeanceOps.openRefundOrder('${esc(g.orderId)}')">Відкрити</button>`}</div></div>`;
    }).join(""):`<div class="va-incident-info">За цим фільтром ордерів не знайдено. Натисніть «Усі», щоб повернути повний список.</div>`;
    host.innerHTML=`${title}<div class="va-refund-order-list">${list}</div>`;
  }

  function applyCancelOrderSearch(){
    state.cancelOrderQuery=String(document.getElementById("vaRefundOrderSearch")?.value||"").trim();
    renderCancelOrderList();
  }

  function clearCancelOrderSearch(){
    state.cancelOrderQuery="";
    const input=document.getElementById("vaRefundOrderSearch");if(input)input.value="";
    renderCancelOrderList();
  }

  function findRefundTicket(){
    const raw=String(document.getElementById("vaRefundTicketSearch")?.value||"").trim();
    if(!raw)return alert("Введіть номер квитка, QR / token або місце.");
    const q=raw.toLowerCase();
    let r=state.currentTickets.find(x=>[x.ticket_number,x.external_ticket_id,x.token,x.ticket_id,x.seat_label].some(v=>String(v||"").trim().toLowerCase()===q));
    if(!r)r=state.currentTickets.find(x=>[x.ticket_number,x.external_ticket_id,x.token,x.ticket_id,x.seat_label].join(" ").toLowerCase().includes(q));
    if(!r)return alert("Квиток у реєстрі цього скасованого сеансу не знайдено.");
    const oid=orderIdOf(r);
    if(!oid)return alert("Квиток знайдено, але у нього немає order_id. Стандартний возврат по ордеру для нього неможливий; потрібне службове рішення.");
    openRefundOrder(oid,String(r.id));
  }

  function paymentSummary(order,payments){
    const channel=String(order?.channel||"").toLowerCase();
    if(channel.includes("cash"))return "Каса · повернення за касовим документом";
    const p=(payments||[]).find(x=>String(x?.status||"").toLowerCase()==="success")||(payments||[])[0]||null;
    if(!p)return channel?`${channel} · дані платежу не знайдено`:"Дані вихідного платежу не знайдено";
    const raw=(p&&typeof p.raw==="object"&&p.raw)||{};
    const mask=raw.sender_card_mask2||raw.sender_card_mask||raw.card_mask||raw.masked_card||"";
    const tx=raw.payment_id||raw.transaction_id||raw.acq_id||raw.liqpay_order_id||p.id||"";
    const method=raw.paytype||raw.payment_method||raw.type||"LiqPay";
    return `${method}${mask?` · ${mask}`:""}${tx?` · ID ${tx}`:""}`;
  }

  async function openRefundOrder(orderId,focusTicketId=""){
    try{
      const oid=String(orderId||"").trim();if(!oid)return;
      state.refundDraftSelectedIds.clear();
      state.refundFocusTicketId=String(focusTicketId||"");
      const local=orderRow(oid);
      const [orderRows,payments]=await Promise.all([
        local?Promise.resolve([local]):apiJson(`orders?order_id=eq.${encodeURIComponent(oid)}&select=*&limit=1`).catch(()=>[]),
        apiJson(`payments?order_id=eq.${encodeURIComponent(oid)}&select=*`).catch(()=>[])
      ]);
      const order=Array.isArray(orderRows)&&orderRows.length?orderRows[0]:local;
      state.currentOrderContext={orderId:oid,order:order||null,payments:Array.isArray(payments)?payments:[]};
      if(focusTicketId){
        const fr=state.currentTickets.find(r=>String(r.id)===String(focusTicketId));
        if(fr&&!isClosedRow(fr)&&!ticketRequest(fr.id))state.refundDraftSelectedIds.add(String(fr.id));
      }
      renderRefundOrder();
    }catch(e){alert("Не вдалося відкрити ордер:\n"+e.message);}
  }

  function refundStatusLabel(s){return({registered:"Заява зареєстрована",processing:"Очікує фактичного повернення",completed:"Повернення підтверджено",cancelled:"Заяву скасовано"})[s]||s||"—";}

  function renderRefundOrder(){
    const inc=state.currentIncident,ctx=state.currentOrderContext;if(!inc||!ctx)return;
    const oid=ctx.orderId,order=ctx.order||{};
    const rows=state.currentTickets.filter(r=>orderIdOf(r)===oid);
    const requests=state.currentRefundRequests.filter(r=>String(r.order_id)===oid);
    const activeMapped=new Set(state.currentRefundRequestTickets.filter(m=>m.active!==false).map(m=>String(m.incident_ticket_id)));
    const available=rows.filter(r=>!isClosedRow(r)&&!activeMapped.has(String(r.id)));
    const completed=rows.filter(r=>r.resolution_status==="completed");
    const buyer=order.buyer_name||rows[0]?.buyer_name||"—";
    const phone=order.buyer_phone||rows[0]?.buyer_phone||"";
    const email=order.buyer_email||rows[0]?.buyer_email||"";
    const channel=order.channel||rows[0]?.channel||rows[0]?.source_kind||"—";
    const route=isOperatorRow(rows[0])?"Повернення виконує зовнішній оператор":String(channel).toLowerCase().includes("cash")?"Касове повернення":"На вихідний платіжний засіб ордера";
    const incidentCompleted=String(inc.operational_status||"").toLowerCase()==="completed";

    const requestCards=requests.length?requests.map(r=>{
      const mapped=requestMappings(r.id);
      const badge=r.status==="completed"?"ok":r.status==="cancelled"?"":"warn";
      const statementFile=r.statement_storage_path?`<button class="btn ghost" onclick="VASeanceOps.downloadRefundStatement('${r.id}')">Заява / файл</button>`:"";
      const actions=r.status==="completed"?`<span class="va-refund-ok"><b>✅ ${esc(r.refund_reference||"Повернення підтверджено")}</b></span>`:r.status==="cancelled"?`<span class="va-refund-muted">Заяву скасовано</span>`:`<button class="btn green" onclick="VASeanceOps.completeRefundRequest('${r.id}')">Фактичне повернення виконано</button><button class="btn ghost" onclick="VASeanceOps.cancelRefundRequest('${r.id}')">Скасувати заяву</button>`;
      return `<div class="va-refund-request-card"><div class="va-refund-request-head"><div><div class="va-refund-request-no">${esc(r.request_no)}</div><div class="va-refund-muted">${esc(String(r.created_at||""))}</div></div><span class="va-refund-badge ${badge}">${esc(refundStatusLabel(r.status))}</span></div><div class="va-refund-kv" style="margin-top:10px"><div class="k">Заявник</div><div class="v">${esc(r.applicant_name||"—")}${r.applicant_phone?` · ${esc(r.applicant_phone)}`:""}</div><div class="k">Заява</div><div class="v">№ ${esc(r.statement_number||"—")} від ${esc(r.statement_date||"—")}</div><div class="k">Особа</div><div class="v">Перевірено · ${esc(r.identity_document_type||"документ")}${r.identity_document_ref?` · ${esc(r.identity_document_ref)}`:""}</div><div class="k">Квитки</div><div class="v">${mapped.length||r.requested_ticket_count} · ${money(r.requested_amount)}</div></div><div class="va-incident-actions" style="margin-top:10px">${statementFile}${actions}</div></div>`;
    }).join(""):`<div class="va-refund-muted">Заяв по цьому ордеру ще немає.</div>`;

    const byPrice=new Map();
    for(const r of available){const key=Number(r.price||0).toFixed(2);if(!byPrice.has(key))byPrice.set(key,[]);byPrice.get(key).push(r);}
    for(const arr of byPrice.values())arr.sort((a,b)=>{
      if(String(a.id)===state.refundFocusTicketId)return-1;if(String(b.id)===state.refundFocusTicketId)return 1;return String(a.seat_label||a.ticket_number||a.id).localeCompare(String(b.seat_label||b.ticket_number||b.id),"uk");
    });
    const priceSelectors=Array.from(byPrice.entries()).map(([key,arr])=>{
      const selected=arr.filter(r=>state.refundDraftSelectedIds.has(String(r.id))).length;
      return `<div class="va-refund-price-row"><b>${money(Number(key))}</b><div class="va-refund-muted">Доступно: ${arr.length}</div><select onchange="VASeanceOps.setRefundPriceQty('${key}',this.value)">${Array.from({length:arr.length+1},(_,i)=>`<option value="${i}" ${i===selected?"selected":""}>${i}</option>`).join("")}</select></div>`;
    }).join("");

    const detail=available.length?`<details class="va-refund-ticket-detail" ${state.refundFocusTicketId?"open":""}><summary>Показати конкретні квитки / місця</summary><div>${available.map(r=>`<label class="va-refund-ticket-line"><input type="checkbox" data-refund-ticket-id="${esc(r.id)}" ${state.refundDraftSelectedIds.has(String(r.id))?"checked":""} onchange="VASeanceOps.toggleRefundDraftTicket('${esc(r.id)}',this.checked)"><span><b>${esc(r.ticket_number||r.external_ticket_id||r.ticket_id||"—")}</b> · ${esc(r.seat_label||"—")}${String(r.id)===state.refundFocusTicketId?` <span style="color:#60a5fa">← знайдений квиток</span>`:""}</span><span>${money(r.price)}</span></label>`).join("")}</div></details>`:"";

    const newForm=!incidentCompleted&&available.length?`<div class="va-refund-section"><h4>Нове звернення на повернення</h4><div class="va-incident-banner warn"><b>Обов'язково:</b> оригінал заяви покупця/заявника + пред'явлений документ, що посвідчує особу. Заявник може відрізнятися від платника за ордером. Гроші повертаються за правилами вихідного платежу цього ордера.</div><div class="va-refund-form-grid">
      <div class="field"><label>Заявник *</label><input id="vaRefundApplicantName" placeholder="ПІБ особи, яка подала заяву"></div>
      <div class="field"><label>Телефон заявника</label><input id="vaRefundApplicantPhone" placeholder="Телефон"></div>
      <div class="field"><label>Email заявника</label><input id="vaRefundApplicantEmail" placeholder="Email"></div>
      <div class="field"><label>Дата заяви *</label><input id="vaRefundStatementDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="field"><label>№ / реєстрація заяви *</label><input id="vaRefundStatementNumber" placeholder="Напр. ВХ-27/08-15"></div>
      <div class="field"><label>Скан / фото заяви (за наявності)</label><input id="vaRefundStatementFile" type="file" accept="application/pdf,image/jpeg,image/png,image/webp"></div>
      <label class="va-refund-check wide"><input id="vaRefundStatementReceived" type="checkbox"><span><b>Оригінал заяви отримано.</b><br><span class="va-refund-muted">Без цієї відмітки реєстрація повернення неможлива.</span></span></label>
      <div class="field"><label>Документ, що посвідчує особу *</label><select id="vaRefundIdentityType"><option value="">Оберіть</option><option>Паспорт / ID-картка</option><option>Закордонний паспорт</option><option>Посвідчення водія</option><option>Інший документ</option></select></div>
      <div class="field"><label>Реквізит документа (необов'язково)</label><input id="vaRefundIdentityRef" placeholder="Напр. останні 4 цифри; повну копію не потрібно"></div>
      <label class="va-refund-check wide"><input id="vaRefundIdentityVerified" type="checkbox"><span><b>Особу заявника перевірено за пред'явленим документом.</b></span></label>
      <div class="field wide"><label>Примітка</label><textarea id="vaRefundRequestNote" placeholder="За потреби"></textarea></div>
    </div><h4 style="margin-top:16px">Квитки з цього ордера</h4><div class="va-refund-price-grid">${priceSelectors}</div>${detail}<div id="vaRefundDraftSummary" class="va-refund-summary"></div><div class="va-incident-actions"><button class="btn green" onclick="VASeanceOps.createRefundRequest()">Зареєструвати заяву</button></div></div>`:available.length?"":`<div class="va-refund-section"><b>Нових квитків для заяви в цьому ордері немає.</b></div>`;

    document.getElementById("vaIncidentBody").innerHTML=`<div class="va-refund-back"><button class="btn ghost" onclick="VASeanceOps.backToCancelOrders()">← До списку ордерів</button></div><div class="va-refund-section"><h4>Ордер ${esc(oid)}</h4><div class="va-refund-kv"><div class="k">Платник / покупець</div><div class="v">${esc(buyer)}${phone?` · ${esc(phone)}`:""}${email?` · ${esc(email)}`:""}</div><div class="k">Канал</div><div class="v">${esc(channel)}</div><div class="k">Вихідний платіж</div><div class="v">${esc(paymentSummary(order,ctx.payments))}</div><div class="k">Маршрут повернення</div><div class="v">${esc(route)}</div><div class="k">Квитки ордера в цьому сеансі</div><div class="v">${rows.length} · ${money(rows.reduce((s,r)=>s+Number(r.price||0),0))}</div><div class="k">Вже закрито</div><div class="v">${completed.length}/${rows.length}</div></div></div><div class="va-refund-section"><h4>Заяви по ордеру</h4>${requestCards}</div>${newForm}`;
    updateRefundDraftSummary();
  }

  function backToCancelOrders(){state.currentOrderContext=null;state.refundDraftSelectedIds.clear();state.refundFocusTicketId="";renderIncident();}

  function availableOrderTickets(){
    const oid=state.currentOrderContext?.orderId||"";
    const activeMapped=new Set(state.currentRefundRequestTickets.filter(m=>m.active!==false).map(m=>String(m.incident_ticket_id)));
    return state.currentTickets.filter(r=>orderIdOf(r)===oid&&!isClosedRow(r)&&!activeMapped.has(String(r.id)));
  }

  function setRefundPriceQty(priceKey,qty){
    const arr=availableOrderTickets().filter(r=>Number(r.price||0).toFixed(2)===String(priceKey)).sort((a,b)=>{
      if(String(a.id)===state.refundFocusTicketId)return-1;if(String(b.id)===state.refundFocusTicketId)return 1;return String(a.seat_label||a.ticket_number||a.id).localeCompare(String(b.seat_label||b.ticket_number||b.id),"uk");
    });
    arr.forEach(r=>state.refundDraftSelectedIds.delete(String(r.id)));
    arr.slice(0,Math.max(0,Number(qty)||0)).forEach(r=>state.refundDraftSelectedIds.add(String(r.id)));
    syncRefundDraftChecks();updateRefundDraftSummary();
  }

  function toggleRefundDraftTicket(id,checked){if(checked)state.refundDraftSelectedIds.add(String(id));else state.refundDraftSelectedIds.delete(String(id));updateRefundDraftSummary();}
  function syncRefundDraftChecks(){document.querySelectorAll("[data-refund-ticket-id]").forEach(el=>{el.checked=state.refundDraftSelectedIds.has(String(el.dataset.refundTicketId));});}
  function updateRefundDraftSummary(){
    const el=document.getElementById("vaRefundDraftSummary");if(!el)return;
    const rows=availableOrderTickets().filter(r=>state.refundDraftSelectedIds.has(String(r.id)));
    const amount=rows.reduce((s,r)=>s+Number(r.price||0),0);
    el.textContent=`До повернення за цією заявою: ${rows.length} квит. · ${money(amount)}`;
  }

  function safeFileName(name){return String(name||"statement").replace(/[^a-zA-Z0-9а-яА-ЯіїєґІЇЄҐ._-]+/g,"-").replace(/-+/g,"-").slice(-120);}
  async function uploadRefundStatement(file){
    if(!file)return null;
    if(file.size>10*1024*1024)throw new Error("Файл заяви більший за 10 МБ.");
    const allowed=["application/pdf","image/jpeg","image/png","image/webp"];
    if(file.type&&!allowed.includes(file.type))throw new Error("Дозволені PDF, JPG, PNG, WEBP.");
    const inc=state.currentIncident,oid=state.currentOrderContext?.orderId||"order";
    const path=`${inc.id}/${safeFileName(oid)}/${Date.now()}-${safeFileName(file.name)}`;
    const encoded=path.split("/").map(encodeURIComponent).join("/");
    const c=cfg();
    const res=await fetch(`${c.supabaseUrl}/storage/v1/object/va-return-documents/${encoded}`,{method:"POST",headers:{apikey:c.supabaseKey,Authorization:`Bearer ${c.supabaseKey}`,"Content-Type":file.type||"application/octet-stream","x-upsert":"false"},body:file});
    if(!res.ok)throw new Error((await res.text())||"Не вдалося завантажити заяву");
    return {bucket:"va-return-documents",path,originalName:file.name};
  }

  async function createRefundRequest(){
    const inc=state.currentIncident,ctx=state.currentOrderContext;if(!inc||!ctx)return;
    const selected=availableOrderTickets().filter(r=>state.refundDraftSelectedIds.has(String(r.id)));
    if(!selected.length)return alert("Оберіть кількість квитків для цієї заяви.");
    const applicant=String(document.getElementById("vaRefundApplicantName")?.value||"").trim();
    const phone=String(document.getElementById("vaRefundApplicantPhone")?.value||"").trim();
    const email=String(document.getElementById("vaRefundApplicantEmail")?.value||"").trim();
    const statementDate=document.getElementById("vaRefundStatementDate")?.value||"";
    const statementNo=String(document.getElementById("vaRefundStatementNumber")?.value||"").trim();
    const statementReceived=!!document.getElementById("vaRefundStatementReceived")?.checked;
    const identityType=String(document.getElementById("vaRefundIdentityType")?.value||"").trim();
    const identityRef=String(document.getElementById("vaRefundIdentityRef")?.value||"").trim();
    const identityVerified=!!document.getElementById("vaRefundIdentityVerified")?.checked;
    const note=String(document.getElementById("vaRefundRequestNote")?.value||"").trim();
    if(!applicant)return alert("Вкажіть ПІБ заявника.");
    if(!statementDate||!statementNo||!statementReceived)return alert("Потрібна заява: дата, № / реєстрація та відмітка про отримання оригіналу.");
    if(!identityVerified||!identityType)return alert("Потрібно перевірити особу за документом і вказати тип документа.");
    const actor=actorValue()||prompt("Відповідальний:","")||"";if(!actor)return;rememberActor(actor);
    const amount=selected.reduce((s,r)=>s+Number(r.price||0),0);
    if(!confirm(`Зареєструвати заяву по ордеру ${ctx.orderId}?\n\nЗаявник: ${applicant}\nКвитків: ${selected.length}\nСума: ${money(amount)}\n\nГроші зараз НЕ повертаються.`))return;
    try{
      const file=document.getElementById("vaRefundStatementFile")?.files?.[0]||null;
      const uploaded=await uploadRefundStatement(file);
      const result=await rpc("va_create_refund_request",{
        p_incident_id:inc.id,p_order_id:ctx.orderId,p_incident_ticket_ids:selected.map(r=>r.id),
        p_applicant_name:applicant,p_applicant_phone:phone||null,p_applicant_email:email||null,
        p_statement_date:statementDate,p_statement_number:statementNo,
        p_statement_storage_bucket:uploaded?.bucket||null,p_statement_storage_path:uploaded?.path||null,p_statement_original_name:uploaded?.originalName||null,
        p_identity_document_type:identityType,p_identity_document_ref:identityRef||null,p_identity_verified:true,
        p_actor:actor,p_note:note||null
      });
      alert(`Заяву ${result?.request_no||""} зареєстровано.\nКвитків: ${result?.tickets||selected.length} · ${money(result?.amount||amount)}.\nТепер очікуємо фактичного повернення.`);
      const oid=ctx.orderId;
      await openIncident(inc.seance_id,inc.incident_type,inc.id);
      await openRefundOrder(oid);
    }catch(e){alert("Не вдалося зареєструвати заяву:\n"+e.message);}
  }

  async function completeRefundRequest(requestId){
    const req=state.currentRefundRequests.find(r=>String(r.id)===String(requestId));if(!req)return;
    const ref=prompt("Документ / ID ФАКТИЧНО виконаного повернення:\n(касовий документ, ID refund у платіжній системі або підтвердження оператора)","");
    if(!ref)return;
    const actor=actorValue()||prompt("Відповідальний:","")||"";if(!actor)return;rememberActor(actor);
    const note=prompt("Примітка (за потреби):","")||null;
    if(!confirm(`Підтвердити, що гроші за заявою ${req.request_no} ФАКТИЧНО повернено?\n\n${req.requested_ticket_count} квит. · ${money(req.requested_amount)}\n\nVA лише зафіксує результат.`))return;
    try{await rpc("va_complete_refund_request",{p_request_id:req.id,p_refund_reference:ref,p_actor:actor,p_note:note});const oid=req.order_id;const inc=state.currentIncident;await openIncident(inc.seance_id,inc.incident_type,inc.id);await openRefundOrder(oid);}catch(e){alert("Не вдалося підтвердити повернення:\n"+e.message);}
  }

  async function cancelRefundRequest(requestId){
    const req=state.currentRefundRequests.find(r=>String(r.id)===String(requestId));if(!req)return;
    const note=prompt(`Причина скасування заяви ${req.request_no}:`,"");if(!note)return;
    const actor=actorValue()||prompt("Відповідальний:","")||"";if(!actor)return;rememberActor(actor);
    if(!confirm("Скасувати цю заяву? Її квитки знову стануть доступними для нового звернення."))return;
    try{await rpc("va_cancel_refund_request",{p_request_id:req.id,p_actor:actor,p_note:note});const oid=req.order_id;const inc=state.currentIncident;await openIncident(inc.seance_id,inc.incident_type,inc.id);await openRefundOrder(oid);}catch(e){alert("Не вдалося скасувати заяву:\n"+e.message);}
  }

  async function downloadRefundStatement(requestId){
    const req=state.currentRefundRequests.find(r=>String(r.id)===String(requestId));if(!req?.statement_storage_path)return alert("Файл заяви не прикріплено.");
    try{
      const c=cfg(),encoded=String(req.statement_storage_path).split("/").map(encodeURIComponent).join("/");
      const res=await fetch(`${c.supabaseUrl}/storage/v1/object/va-return-documents/${encoded}`,{headers:{apikey:c.supabaseKey,Authorization:`Bearer ${c.supabaseKey}`}});
      if(!res.ok)throw new Error(await res.text());
      const blob=await res.blob(),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=req.statement_original_name||`${req.request_no}.bin`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(e){alert("Не вдалося відкрити файл заяви:\n"+e.message);}
  }

  function rowActions(r){
    const inc=state.currentIncident;if(!inc||String(inc.operational_status||"").toLowerCase()==="completed"||["completed","not_required"].includes(r.resolution_status))return"—";
    if(r.resolution_kind==="valid_new_date"&&r.token)return`<button class="va-mi-gold" onclick="VASeanceOps.grantRepertoireReplacement('${r.id}')">Репертуарна заміна</button>`;
    if(r.resolution_kind==="compensation_eligible")return`<span style="color:#f5b400">Очікує рішення про компенсацію</span>`;
    return"—";
  }

  function renderIncidentTable(){
    const host=document.getElementById("vaIncidentTableHost");if(!host)return;
    const q=String(document.getElementById("vaIncidentSearch")?.value||"").trim().toLowerCase();
    const st=document.getElementById("vaIncidentStatusFilter")?.value||"all";
    const rows=state.currentTickets.filter(r=>{if(st!=="all"&&r.resolution_status!==st)return false;if(!q)return true;return[r.ticket_number,r.external_ticket_id,r.token,r.order_id,r.seat_label,r.buyer_name,r.buyer_email,r.buyer_phone,r.channel].join(" ").toLowerCase().includes(q);});
    host.innerHTML=`<div class="va-incident-table-wrap"><table class="va-incident-table"><thead><tr><th>Квиток / місце</th><th>Канал</th><th>Сума</th><th>Глядач</th><th>Стан на момент</th><th>Рішення</th><th>Обробка</th><th>Дія</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td><b>${esc(r.ticket_number||r.external_ticket_id||r.ticket_id||"—")}</b><br>${esc(r.seat_label||"—")}${r.order_id?`<br><span style="color:#94a3b8">Замовлення: ${esc(r.order_id)}</span>`:""}</td><td>${esc(r.channel||r.source_kind||"—")}</td><td>${money(r.price)}</td><td>${esc(r.buyer_name||"—")}<br><span style="color:#94a3b8">${esc(r.buyer_email||r.buyer_phone||"")}</span></td><td>${esc(r.ticket_status_at_incident||"—")}${r.checked_in_at?`<br><span style="color:#f5b400">погашено</span>`:""}</td><td>${esc(resolutionLabel(r.resolution_kind))}</td><td>${esc(resolutionStatusLabel(r.resolution_status))}</td><td>${rowActions(r)}</td></tr>`).join(""):`<tr><td colspan="8">Немає рядків за фільтром.</td></tr>`}</tbody></table></div>`;
  }

  async function refreshIncident(){const i=state.currentIncident;if(i)await openIncident(i.seance_id,i.incident_type,i.id);}
  async function setStage(id,kind,status,amount=null,note=null){
    const actor=actorValue()||prompt("Відповідальний:","")||"";rememberActor(actor);
    try{await rpc("va_set_incident_ticket_resolution",{p_incident_ticket_id:id,p_resolution_kind:kind,p_resolution_status:status,p_actor:actor||null,p_amount:amount,p_note:note});await refreshIncident();}catch(e){alert("Не вдалося змінити стан:\n"+e.message);}
  }
  async function confirmRefund(id,kind,amount){if(!confirm(`Зафіксувати, що повернення ${money(amount)} ФАКТИЧНО виконано?\n\nЦя кнопка не відправляє гроші. Вона закриває обліковий рядок після реальної касової / платіжної / операторської процедури.`))return;const note=prompt("Номер документа / примітка (за наявності):","")||null;await setStage(id,kind,"completed",amount,note);}
  async function otherDecision(id){const note=prompt("Опишіть інше рішення по квитку. Воно буде зафіксоване в реєстрі:","");if(note)await setStage(id,"other","completed",0,note);}
  async function grantRepertoireReplacement(id){if(!confirm("Оформити одноразове право відвідування іншого репертуарного сеансу?\n\nПісля цього вихідний квиток буде вимкнено для звичайного проходу на перенесений сеанс. Нової виручки не виникає."))return;const actor=actorValue()||prompt("Відповідальний:","")||"";rememberActor(actor);const note=prompt("Примітка (за потреби):","Репертуарна заміна після перенесення")||null;try{await rpc("va_grant_repertoire_replacement",{p_incident_ticket_id:id,p_actor:actor||null,p_note:note});await refreshIncident();}catch(e){alert("Не вдалося оформити репертуарну заміну:\n"+e.message);}}
  async function createInterruptionCompensation(incidentId){if(!confirm("Створити одноразові компенсаційні права для ВСІХ погашених до переривання квитків, які ще очікують рішення?\n\nМісця на новий сеанс не переносяться. Нова виручка не створюється."))return;const actor=actorValue()||prompt("Відповідальний:","")||"";rememberActor(actor);try{const result=await rpc("va_create_interruption_compensation",{p_incident_id:incidentId,p_actor:actor||null,p_note:"Компенсація після переривання"});alert(`Створено компенсацій: ${result?.created??0}. Пропущено: ${result?.skipped??0}.`);await refreshIncident();}catch(e){alert("Не вдалося створити компенсацію:\n"+e.message);}}
  async function completeIncident(){
    const inc=state.currentIncident;if(!inc)return;
    if(String(inc.operational_status||"").toLowerCase()==="completed") return;
    const pending=state.currentTickets.filter(r=>!["completed","not_required"].includes(r.resolution_status)).length;
    if(pending>0){
      alert(`Завершити обробку поки не можна.\n\nНезавершених рядків: ${pending}.\nСпочатку по кожному квитку зафіксуйте результат: «Повернено» або «Інше».`);
      return;
    }
    const actor=actorValue()||prompt("Відповідальний:","")||"";rememberActor(actor);
    const note=prompt("Підсумкова примітка:","Обробку завершено")||null;
    try{await rpc("va_complete_seance_incident",{p_incident_id:inc.id,p_actor:actor||"Квитковий відділ",p_note:note,p_allow_pending:false});await reload(inc.seance_id);await refreshIncident();}catch(e){alert("Не вдалося завершити обробку:\n"+e.message);}
  }

  async function handleRequestedView(){
    if(state.requestedViewOpened)return;
    const q=new URLSearchParams(location.search),view=q.get("view")||"",sid=q.get("seance")||q.get("seance_id")||"";
    if(!sid||!view)return;
    state.requestedViewOpened=true;
    if(view==="postpone")await openPostpone(sid);
    else if(view==="cancel")await openCancel(sid);
    else if(view==="incident-postponed")await openIncident(sid,"postponed");
    else if(view==="incident-cancelled")await openIncident(sid,"cancelled");
  }

  function init(config){state.cfg=config;mount();}

  window.VASeanceOps={init,openPostpone,submitPostpone,closePostpone,openCancel,submitCancel,closeCancel,openIncident,closeIncident,renderIncidentTable,refreshIncident,setStage,confirmRefund,otherDecision,grantRepertoireReplacement,createInterruptionCompensation,completeIncident,handleRequestedView,renderCancelOrderList,applyCancelOrderSearch,clearCancelOrderSearch,findRefundTicket,openRefundOrder,backToCancelOrders,setRefundPriceQty,toggleRefundDraftTicket,createRefundRequest,completeRefundRequest,cancelRefundRequest,downloadRefundStatement};
})();
