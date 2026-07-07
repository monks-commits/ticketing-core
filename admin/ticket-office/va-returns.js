window.VAReturns = {

  state:{
    seanceId:"",
    tickets:[]
  },

  render({targetId,seanceId,tickets=[]}){

    const root=document.getElementById(targetId);
    if(!root) return;

    this.state.seanceId=seanceId||"";
    this.state.tickets=tickets||[];

    root.innerHTML=`

<div class="panel">

<h3>Повернення квитків</h3>

<div class="work-grid">

<div>

<div class="field">
<label>Квиток / QR</label>
<input id="returnTicket" placeholder="№ квитка або QR">
</div>

<div class="field">
<label>ПІБ покупця</label>
<input id="returnBuyer">
</div>

<div class="field">
<label>Телефон</label>
<input id="returnPhone">
</div>

<div class="field">
<label>Причина</label>
<input id="returnReason">
</div>

</div>

<div>

<div class="field">
<label>Місце</label>
<input id="returnSeat" readonly>
</div>

<div class="field">
<label>Сума</label>
<input id="returnAmount" readonly>
</div>

<div class="field">
<label>Хто прийняв</label>
<input id="returnCashier">
</div>

<div class="field">
<label>Примітка</label>
<input id="returnNote">
</div>

</div>

</div>

<div class="buttons">

<button class="btn red"
onclick="VAReturns.makeReturn()">

↩ Повернути

</button>

<button class="btn ghost"
onclick="VAReturns.clear()">

🗑 Очистити

</button>

<button class="btn ghost"
onclick="VAReturns.print()">

🖨 Друк

</button>

<button class="btn ghost"
onclick="VAReturns.copy()">

📋 Копіювати

</button>

</div>

</div>


<div class="stub" style="margin-top:14px;">

<h4>Журнал повернень</h4>

<div id="returnsToolbar"></div>

<div style="overflow:auto;margin-top:12px;">

<table
id="returnsJournalTable"
style="width:100%;border-collapse:collapse;font-size:14px;">

<thead>

<tr>

<th>Дата</th>
<th>Квиток</th>
<th>Покупець</th>
<th>Телефон</th>
<th>Місце</th>
<th>Сума</th>
<th>Причина</th>
<th>Статус</th>

</tr>

</thead>

<tbody id="returnsJournalBody">

<tr>

<td colspan="8"
style="padding:10px;">

Повернень поки немає.

</td>

</tr>

</tbody>

</table>

</div>

</div>

`;

    if(window.VAToolbar){

      VAToolbar.render({

        targetId:"returnsToolbar",
        tableId:"returnsJournalTable",
        title:"Журнал повернень",

        onRefresh(){

          if(typeof loadTurnover==="function")
            loadTurnover(seanceId);

        }

      });

    }

  },

  makeReturn(){

    alert("Наступний етап.");

  },

  clear(){

[
"returnTicket",
"returnBuyer",
"returnPhone",
"returnReason",
"returnSeat",
"returnAmount",
"returnCashier",
"returnNote"
].forEach(id=>{

const el=document.getElementById(id);

if(el) el.value="";

});

  },

  print(){

if(window.VAToolbar)
VAToolbar.printTable(
"returnsJournalTable",
"Журнал повернень"
);

  },

  copy(){

if(window.VAToolbar)
VAToolbar.copyTable(
"returnsJournalTable"
);

  }

};
