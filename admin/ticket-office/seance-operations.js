(function(){
  "use strict";

  const state = {
    cfg:null,
    currentIncident:null,
    currentTickets:[],
    formSeanceId:"",
    actorKey:"va_incident_actor_v1",
    requestedViewOpened:false
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
  function closeIncident(){hide("va-incident-modal");state.currentIncident=null;state.currentTickets=[];}

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
      const rows=await apiJson(`va_incident_tickets?incident_id=eq.${encodeURIComponent(inc.id)}&select=*&order=seat_label.asc,created_at.asc`);
      state.currentTickets=Array.isArray(rows)?rows:[];
      renderIncident();
      show("va-incident-modal");
    }catch(e){console.error(e);alert("Не вдалося відкрити реєстр:\n"+e.message);}
  }

  function renderIncident(){
    const inc=state.currentIncident,rows=state.currentTickets;if(!inc)return;
    const seance=getSeances().find(s=>String(s.id)===String(inc.seance_id));
    const total=rows.length,amount=rows.reduce((s,r)=>s+Number(r.price||0),0),isCancel=inc.incident_type==="cancelled";
    document.getElementById("vaIncidentTitle").textContent=isCancel?"⛔ Обробка скасування":"📅 Обробка перенесення";
    let stats="",banner="",special="";
    if(isCancel){
      const refundable=rows.filter(r=>["refund_due","operator_refund","review_required"].includes(r.resolution_kind));
      const refundableAmount=refundable.reduce((s,r)=>s+Number(r.resolution_amount||r.price||0),0);
      const refunded=rows.filter(r=>r.resolution_status==="completed"&&["refund_due","operator_refund"].includes(r.resolution_kind));
      const refundedAmount=refunded.reduce((s,r)=>s+Number(r.resolution_amount||r.price||0),0);
      const operators=rows.filter(r=>r.resolution_kind==="operator_refund").length;
      const zero=rows.filter(r=>r.resolution_kind==="no_money").length;
      stats=`<div class="va-incident-stat"><span>Зафіксовано</span><strong>${total}</strong><br>${money(amount)}</div><div class="va-incident-stat"><span>Під контролем повернення</span><strong>${refundable.length}</strong><br>${money(refundableAmount)}</div><div class="va-incident-stat"><span>Підтверджено повернення</span><strong>${refunded.length}</strong><br>${money(refundedAmount)}</div><div class="va-incident-stat"><span>Зовнішній оператор</span><strong>${operators}</strong></div><div class="va-incident-stat"><span>Без грошей</span><strong>${zero}</strong></div>`;
      banner=`<div class="va-incident-banner bad"><b>Грошове повернення не запускається цим екраном.</b> Кнопка «Повернено» лише фіксує вже фактично виконане повернення після касової, платіжної або операторської процедури.</div>`;
    }else{
      const valid=rows.filter(r=>r.resolution_kind==="valid_new_date").length;
      const eligible=rows.filter(r=>r.resolution_kind==="compensation_eligible").length;
      const comp=rows.filter(r=>r.resolution_kind==="interruption_compensation");
      const repl=rows.filter(r=>r.resolution_kind==="repertoire_replacement");
      stats=`<div class="va-incident-stat"><span>На момент перенесення</span><strong>${total}</strong><br>${money(amount)}</div><div class="va-incident-stat"><span>Дійсні на нову дату</span><strong>${valid}</strong></div><div class="va-incident-stat"><span>Потребують рішення</span><strong>${eligible}</strong></div><div class="va-incident-stat"><span>Компенсація</span><strong>${comp.filter(r=>r.resolution_status==="completed").length}/${comp.length}</strong></div><div class="va-incident-stat"><span>Репертуарна заміна</span><strong>${repl.filter(r=>r.resolution_status==="completed").length}/${repl.length}</strong></div>`;
      banner=inc.interrupted_after_start?`<div class="va-incident-banner warn"><b>Перенесення після переривання.</b> Непогашені квитки залишаються дійсними на нову дату. Погашені виділені окремо; компенсаційні права створюються лише після рішення адміністрації.</div>`:`<div class="va-incident-banner ok"><b>Звичайне перенесення.</b> Квитки залишаються дійсними на нову дату. Для конкретного звернення можна оформити одноразову репертуарну заміну — тоді вихідний квиток більше не працюватиме на перенесений сеанс.</div>`;
      if(inc.interrupted_after_start&&eligible>0)special=`<button class="btn orange" onclick="VASeanceOps.createInterruptionCompensation('${inc.id}')">Створити компенсацію по погашених (${eligible})</button>`;
    }
    const incidentCompleted=String(inc.operational_status||"").toLowerCase()==="completed";
    const incidentActions = incidentCompleted
      ? `<button class="btn ghost" onclick="VASeanceOps.refreshIncident()">Оновити</button><span style="display:inline-flex;align-items:center;padding:0 8px;font-weight:800;color:#2ecc71;">✅ Обробку завершено</span>`
      : `${special}<button class="btn ghost" onclick="VASeanceOps.refreshIncident()">Оновити</button><button class="btn green" onclick="VASeanceOps.completeIncident()">Завершити обробку</button>`;
    document.getElementById("vaIncidentBody").innerHTML=`<div class="va-incident-info"><b>${esc(seance?seanceTitle(seance):inc.seance_id)}</b><br>${isCancel?`Скасовано: ${esc(String(inc.occurred_at||""))}`:`Було: ${esc(dateTimeHuman(inc.old_date,inc.old_time))} → Стало: ${esc(dateTimeHuman(inc.new_date,inc.new_time))}`}<br>Причина: ${esc(inc.reason||"—")}${inc.document_ref?`<br>Підстава: ${esc(inc.document_ref)}`:""}<br>Стан обробки: <b>${esc(inc.operational_status||"open")}</b></div>${banner}<div class="va-incident-stats">${stats}</div><div class="va-incident-actions">${incidentActions}</div><div class="va-incident-toolbar"><input id="vaIncidentSearch" placeholder="Пошук: квиток, QR, замовлення, місце, ПІБ, email" oninput="VASeanceOps.renderIncidentTable()"><select id="vaIncidentStatusFilter" onchange="VASeanceOps.renderIncidentTable()"><option value="all">Усі стани</option><option value="pending">Очікує</option><option value="contact_received">Звернення отримано</option><option value="processing">В роботі</option><option value="completed">Завершено</option><option value="not_required">Не потрібно</option></select></div><div id="vaIncidentTableHost"></div>`;
    renderIncidentTable();
  }

  function rowActions(r){
    const inc=state.currentIncident;if(!inc||String(inc.operational_status||"").toLowerCase()==="completed"||["completed","not_required"].includes(r.resolution_status))return"—";
    if(inc.incident_type==="cancelled"){
      const finalKind=r.source_kind==="operator"||r.resolution_kind==="operator_refund"?"operator_refund":"refund_due";
      return `<div class="va-incident-mini-actions">${r.resolution_status==="pending"?`<button class="va-mi-blue" onclick="VASeanceOps.setStage('${r.id}','${r.resolution_kind}','contact_received')">Звернення</button>`:""}<button class="va-mi-gray" onclick="VASeanceOps.setStage('${r.id}','${r.resolution_kind}','processing')">В роботу</button><button class="va-mi-green" onclick="VASeanceOps.confirmRefund('${r.id}','${finalKind}',${Number(r.resolution_amount||r.price||0)})">${finalKind==="operator_refund"?"Повернено оператором":"Повернено"}</button><button class="va-mi-gold" onclick="VASeanceOps.otherDecision('${r.id}')">Інше</button></div>`;
    }
    if(r.resolution_kind==="valid_new_date"&&r.token)return`<button class="va-mi-gold" onclick="VASeanceOps.grantRepertoireReplacement('${r.id}')">Репертуарна заміна</button>`;
    if(r.resolution_kind==="compensation_eligible")return`<span style="color:#f5b400">Очікує рішення про компенсацію</span>`;
    return"—";
  }

  function renderIncidentTable(){
    const host=document.getElementById("vaIncidentTableHost");if(!host)return;
    const q=String(document.getElementById("vaIncidentSearch")?.value||"").trim().toLowerCase();
    const st=document.getElementById("vaIncidentStatusFilter")?.value||"all";
    const rows=state.currentTickets.filter(r=>{if(st!=="all"&&r.resolution_status!==st)return false;if(!q)return true;return[r.ticket_number,r.external_ticket_id,r.token,r.order_id,r.seat_label,r.buyer_name,r.buyer_email,r.buyer_phone,r.channel].join(" ").toLowerCase().includes(q);});
    host.innerHTML=`<div class="va-incident-table-wrap"><table class="va-incident-table"><thead><tr><th>Квиток / місце</th><th>Канал</th><th>Сума</th><th>Глядач</th><th>Стан на момент</th><th>Рішення</th><th>Обробка</th><th>Дія</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td><b>${esc(r.ticket_number||r.external_ticket_id||r.ticket_id||"—")}</b><br>${esc(r.seat_label||"—")}</td><td>${esc(r.channel||r.source_kind||"—")}</td><td>${money(r.price)}</td><td>${esc(r.buyer_name||"—")}<br><span style="color:#94a3b8">${esc(r.buyer_email||r.buyer_phone||"")}</span></td><td>${esc(r.ticket_status_at_incident||"—")}${r.checked_in_at?`<br><span style="color:#f5b400">погашено</span>`:""}</td><td>${esc(resolutionLabel(r.resolution_kind))}</td><td>${esc(resolutionStatusLabel(r.resolution_status))}</td><td>${rowActions(r)}</td></tr>`).join(""):`<tr><td colspan="8">Немає рядків за фільтром.</td></tr>`}</tbody></table></div>`;
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
    let allowPending=false;if(pending>0){allowPending=confirm(`Незавершених рядків: ${pending}.\n\nЗавершити обробку з фіксацією цього залишку?`);if(!allowPending)return;}
    const actor=actorValue()||prompt("Відповідальний:","")||"";rememberActor(actor);
    const note=prompt("Підсумкова примітка:",pending?`Завершено з незакритими зверненнями: ${pending}`:"Обробку завершено")||null;
    try{await rpc("va_complete_seance_incident",{p_incident_id:inc.id,p_actor:actor||"Квитковий відділ",p_note:note,p_allow_pending:allowPending});await reload(inc.seance_id);await refreshIncident();}catch(e){alert("Не вдалося завершити обробку:\n"+e.message);}
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

  window.VASeanceOps={init,openPostpone,submitPostpone,closePostpone,openCancel,submitCancel,closeCancel,openIncident,closeIncident,renderIncidentTable,refreshIncident,setStage,confirmRefund,otherDecision,grantRepertoireReplacement,createInterruptionCompensation,completeIncident,handleRequestedView};
})();
