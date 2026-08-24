/* VA Ticket Office — Recovery actions: one ticket / entire interrupted seance */
(() => {
  "use strict";

  const state = { cfg:null, seanceId:"", busy:false };
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

  function seanceTitle(s){ return s?.show || s?.title || s?.name || s?.id || "Сеанс"; }
  function normalize(v){ return String(v || "").trim(); }
  function headers(extra={}){
    return {
      apikey: state.cfg.supabaseKey,
      Authorization: `Bearer ${state.cfg.supabaseKey}`,
      ...extra
    };
  }
  async function rest(path, options={}){
    const res = await fetch(`${state.cfg.supabaseUrl}/rest/v1/${path}`, {
      cache:"no-store",
      ...options,
      headers:{...headers(), ...(options.headers||{})}
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if(!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
    return data;
  }
  async function rpc(name, body){
    const res = await fetch(`${state.cfg.supabaseUrl}/rest/v1/rpc/${name}`, {
      method:"POST",
      headers:headers({"Content-Type":"application/json"}),
      body:JSON.stringify(body || {})
    });
    const text=await res.text();
    let data=null; try{data=text?JSON.parse(text):null}catch{data=text}
    if(!res.ok) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
    return data;
  }

  function mount(){
    if($("vaRecoveryActionsModal")) return;
    const host=document.createElement("div");
    host.innerHTML=`
      <div id="vaRecoveryActionsModal" class="va-seance-modal hidden">
        <div class="va-seance-modal-content" style="width:min(900px,96vw)">
          <div class="va-seance-modal-head">
            <h3>♻️ Recovery — активація компенсації</h3>
            <button class="va-seance-modal-close" type="button" onclick="VARecoveryActions.close()">×</button>
          </div>
          <div id="vaRecoverySeanceInfo" class="va-incident-info"></div>
          <div class="va-incident-banner warn">
            <b>Два робочі режими.</b> «1 квиток» активує компенсаційне право для конкретного квитка. «Сеанс» створює права для всіх квитків, які вже були погашені до переривання цього сеансу. Місця не переносяться, нова виручка не створюється.
          </div>
          <div class="va-incident-form-grid" style="margin-top:14px">
            <label class="wide">Причина компенсації
              <select id="vaRecoveryReason">
                <option value="air_alert">Повітряна тривога</option>
                <option value="blackout">Відсутність електроенергії</option>
                <option value="technical">Технічний збій</option>
                <option value="other">Інше</option>
              </select>
            </label>
            <label class="wide">Примітка
              <textarea id="vaRecoveryNote" placeholder="Причина / обставини">Мероприятие было прервано после начала. Компенсационный проход без предоставления места.</textarea>
            </label>
          </div>
          <div style="margin-top:18px;padding:16px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(255,255,255,.04)">
            <h4 style="margin:0 0 10px">1. Один квиток</h4>
            <div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end">
              <label>Номер квитка / QR / token
                <input id="vaRecoveryTicketToken" placeholder="TK-… або QR payload">
              </label>
              <button class="btn orange" id="vaRecoveryOneBtn" type="button" onclick="VARecoveryActions.activateOne()">Активувати 1 квиток</button>
            </div>
            <div id="vaRecoveryOneResult" class="note" style="margin-top:10px">—</div>
          </div>
          <div style="margin-top:14px;padding:16px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(255,255,255,.04)">
            <h4 style="margin:0 0 10px">2. Сеанс</h4>
            <p style="margin:0 0 12px;color:#cbd5e1">Активація виконується тільки для квитків із зафіксованим проходом <b>checked_in_at</b>. Непогашені квитки не перетворюються на компенсаційні.</p>
            <button class="btn orange" id="vaRecoverySeanceBtn" type="button" onclick="VARecoveryActions.activateSeance()">Активувати погашені квитки сеансу</button>
            <div id="vaRecoverySeanceResult" class="note" style="margin-top:10px">—</div>
          </div>
          <div class="va-incident-actions">
            <button class="btn ghost" type="button" onclick="VARecoveryActions.openCabinet()">Відкрити Recovery Cabinet / імпорт CSV</button>
            <button class="btn ghost" type="button" onclick="VARecoveryActions.openAccounting()">Облік компенсацій</button>
            <button class="btn" type="button" onclick="VARecoveryActions.close()">Закрити</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(host.firstElementChild);
  }

  function selectedSeance(){
    const list=state.cfg?.getSeances?.() || [];
    return list.find(s=>String(s.id)===String(state.seanceId)) || state.cfg?.getSelectedSeance?.() || null;
  }
  function renderInfo(){
    const s=selectedSeance();
    $("vaRecoverySeanceInfo").innerHTML = s
      ? `<b>${esc(seanceTitle(s))}</b><br>Seance ID: ${esc(s.id)}<br>${esc(s.date||"")} ${esc(String(s.time||"").slice(0,5))} · ${esc(s.venue_id||s.hall||"")}`
      : `Seance ID: ${esc(state.seanceId)}`;
  }
  function open(seanceId){
    state.seanceId=normalize(seanceId || state.cfg?.getSelectedSeanceId?.());
    if(!state.seanceId) return alert("Оберіть сеанс.");
    mount(); renderInfo();
    $("vaRecoveryOneResult").textContent="—";
    $("vaRecoverySeanceResult").textContent="—";
    $("vaRecoveryActionsModal").classList.remove("hidden");
  }
  function close(){ $("vaRecoveryActionsModal")?.classList.add("hidden"); }

  async function loadSeanceById(id){
    const rows=await rest(`seances?id=eq.${encodeURIComponent(id)}&select=*`);
    return Array.isArray(rows)&&rows.length?rows[0]:null;
  }
  async function ensureRecoveryEventForSeance(id){
    const rows=await rest(`recovery_events?source_seance_id=eq.${encodeURIComponent(id)}&select=*&order=created_at.desc&limit=1`);
    if(Array.isArray(rows)&&rows.length) return rows[0];
    const s=await loadSeanceById(id);
    if(!s) throw new Error("Сеанс не знайдено: "+id);
    const title=seanceTitle(s);
    const reason=$("vaRecoveryReason")?.value || "other";
    const note=normalize($("vaRecoveryNote")?.value);
    const created=await rest("recovery_events",{
      method:"POST",
      headers:{"Content-Type":"application/json",Prefer:"return=representation"},
      body:JSON.stringify({
        title:`Компенсація: ${title}`,
        original_event:title,
        recovery_event:"Компенсаційний прохід без місця",
        source_seance_id:id,
        venue_id:s.venue_id || s.hall || "",
        venue_name:s.venue_id || s.hall || "",
        locality:"",
        event_scope:"repertoire",
        incident_type:"interrupted_after_start",
        incident_reason:reason,
        incident_note:note,
        target_policy:"any_repertoire",
        operational_status:"ACTIVE",
        status:"active"
      })
    });
    return Array.isArray(created)?created[0]:created;
  }

  async function findTicket(raw){
    const token=normalize(raw);
    if(!token) return null;
    let rows=await rest(`tickets?qr_payload=eq.${encodeURIComponent(token)}&select=id,order_id,seance_id,show_slug,seat_label,price,buyer_name,buyer_email,qr_payload,ticket_number,checked_in_at,status&limit=2`);
    if(Array.isArray(rows)&&rows.length) return rows[0];
    rows=await rest(`tickets?ticket_number=ilike.${encodeURIComponent(token)}&select=id,order_id,seance_id,show_slug,seat_label,price,buyer_name,buyer_email,qr_payload,ticket_number,checked_in_at,status&limit=2`);
    return Array.isArray(rows)&&rows.length?rows[0]:null;
  }
  async function existingToken(eventId, token){
    const rows=await rest(`recovery_tokens?recovery_event_id=eq.${encodeURIComponent(eventId)}&token=eq.${encodeURIComponent(token)}&select=id,token&limit=1`);
    return Array.isArray(rows)&&rows.length?rows[0]:null;
  }
  async function createRecoveryToken(event, t){
    const token=normalize(t.qr_payload || t.ticket_number || t.id);
    if(!token) throw new Error("У квитка немає QR/token.");
    if(await existingToken(event.id,token)) return {status:"exists",token};
    await rest("recovery_tokens",{
      method:"POST",
      headers:{"Content-Type":"application/json",Prefer:"return=representation"},
      body:JSON.stringify({
        recovery_event_id:event.id,
        token,
        seat_label:"",
        owner_name:t.buyer_name || "",
        owner_email:t.buyer_email || null,
        compensation_allowed:true,
        compensation_used:false,
        source_seance_id:state.seanceId,
        source_ticket_id:String(t.id||""),
        source_order_id:String(t.order_id||""),
        source_show_slug:t.show_slug||"",
        source_seat_label:t.seat_label||"",
        source_checked_in_at:t.checked_in_at||null,
        note:"Компенсаційний прохід без місця"
      })
    });
    return {status:"created",token};
  }

  async function activateOne(){
    if(state.busy) return;
    const raw=normalize($("vaRecoveryTicketToken")?.value);
    if(!raw) return alert("Введіть номер квитка, QR або token.");
    state.busy=true; $("vaRecoveryOneBtn").disabled=true;
    try{
      const t=await findTicket(raw);
      if(!t) throw new Error("Квиток не знайдено.");
      if(String(t.seance_id)!==String(state.seanceId)) throw new Error(`Квиток належить іншому сеансу: ${t.seance_id||"—"}.`);
      const event=await ensureRecoveryEventForSeance(state.seanceId);
      const result=await createRecoveryToken(event,t);
      $("vaRecoveryOneResult").innerHTML = result.status==="exists"
        ? `↻ Recovery уже було активовано.<br><b>${esc(t.ticket_number||result.token)}</b> · ${esc(t.seat_label||"—")}`
        : `✅ Recovery активовано.<br><b>${esc(t.ticket_number||result.token)}</b> · старе місце: ${esc(t.seat_label||"—")}`;
    }catch(e){ $("vaRecoveryOneResult").textContent="❌ "+String(e?.message||e); }
    finally{state.busy=false; $("vaRecoveryOneBtn").disabled=false;}
  }

  async function latestInterruptedIncident(){
    try{
      const rows=await rest(`va_seance_incidents?seance_id=eq.${encodeURIComponent(state.seanceId)}&incident_type=eq.postponed&interrupted_after_start=eq.true&select=id,operational_status,created_at&order=created_at.desc&limit=1`);
      return Array.isArray(rows)&&rows.length?rows[0]:null;
    }catch{return null;}
  }

  async function activateSeance(){
    if(state.busy) return;
    if(!confirm("Активувати компенсаційні права для ВСІХ погашених квитків цього сеансу?\n\nНепогашені квитки не зачіпаються. Місця не переносяться. Кожне право одноразове.")) return;
    state.busy=true; $("vaRecoverySeanceBtn").disabled=true;
    try{
      const incident=await latestInterruptedIncident();
      if(incident){
        const actor=prompt("Відповідальний:", localStorage.getItem("va_incident_actor_v1")||"") || "Квитковий відділ";
        localStorage.setItem("va_incident_actor_v1",actor);
        const result=await rpc("va_create_interruption_compensation",{p_incident_id:incident.id,p_actor:actor,p_note:normalize($("vaRecoveryNote")?.value)||"Компенсація після переривання"});
        $("vaRecoverySeanceResult").innerHTML=`✅ Сеанс оброблено через реєстр перенесення.<br>Створено: <b>${Number(result?.created||0)}</b> · вже існували / пропущено: <b>${Number(result?.skipped||0)}</b>`;
        return;
      }

      const tickets=await rest(`tickets?seance_id=eq.${encodeURIComponent(state.seanceId)}&checked_in_at=not.is.null&select=id,order_id,seance_id,show_slug,seat_label,price,buyer_name,buyer_email,qr_payload,ticket_number,checked_in_at,status`);
      const valid=(Array.isArray(tickets)?tickets:[]).filter(t=>!["returned","cancelled","canceled"].includes(String(t.status||"").toLowerCase()));
      if(!valid.length){
        $("vaRecoverySeanceResult").textContent="Погашених квитків для компенсації не знайдено.";
        return;
      }
      const event=await ensureRecoveryEventForSeance(state.seanceId);
      let created=0,exists=0,errors=0;
      for(const t of valid){
        try{
          const r=await createRecoveryToken(event,t);
          if(r.status==="created") created++; else exists++;
        }catch(e){console.error(e);errors++;}
      }
      $("vaRecoverySeanceResult").innerHTML=`✅ Активацію сеансу завершено.<br>Погашених квитків: <b>${valid.length}</b> · нових Recovery: <b>${created}</b> · вже існували: <b>${exists}</b> · помилок: <b>${errors}</b>`;
    }catch(e){ $("vaRecoverySeanceResult").textContent="❌ "+String(e?.message||e); }
    finally{state.busy=false; $("vaRecoverySeanceBtn").disabled=false;}
  }

  function openCabinet(){
    const id=state.seanceId || state.cfg?.getSelectedSeanceId?.();
    const url=`https://monks-commits.github.io/hall-engine-lab/recovery/cabinet.html?source_seance_id=${encodeURIComponent(id||"")}&seance=${encodeURIComponent(id||"")}`;
    window.open(url,"_blank");
  }
  function openAccounting(){
    const id=state.seanceId || state.cfg?.getSelectedSeanceId?.();
    window.open(`./compensation-cabinet.html?seance=${encodeURIComponent(id||"")}&source_seance_id=${encodeURIComponent(id||"")}`,"_blank");
  }
  function init(cfg){state.cfg=cfg;mount();}

  window.VARecoveryActions={init,open,close,activateOne,activateSeance,openCabinet,openAccounting};
})();
