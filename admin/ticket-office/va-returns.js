window.VAReturns = {

  state: {
    seanceId: "",
    bookings: []
  },


  render({ targetId, seanceId, bookings = [] }) {

    const target = document.getElementById(targetId);
    if (!target) return;

    this.state.seanceId = seanceId || "";
    this.state.bookings = Array.isArray(bookings) ? bookings : [];


    target.innerHTML = `

      <div class="panel">

        <h3>Повернення квитків</h3>

        <div class="work-grid">

          <div>

            <div class="field">
              <label>Організація</label>
              <input id="returnOrg" placeholder="Назва організації">
            </div>

            <div class="field">
              <label>Контактна особа</label>
              <input id="returnPerson" placeholder="ПІБ">
            </div>

            <div class="field">
              <label>Телефон</label>
              <input id="returnPhone" placeholder="+380...">
            </div>

            <div class="field">
              <label>Email</label>
              <input id="returnEmail" placeholder="email">
            </div>

          </div>


          <div>

            <div class="field">
              <label>Документ видачі</label>
              <input id="returnDoc" placeholder="№ документа">
            </div>


            <div class="field">
              <label>Місця</label>
              <input id="returnSeats" readonly>
            </div>


            <div class="field">
              <label>Примітка</label>
              <input id="returnNote" placeholder="Коментар">
            </div>

          </div>


        </div>


        <div class="buttons">

          <button class="btn green" onclick="VAReturns.save()">
            ↩ Повернути квитки
          </button>

          <button class="btn ghost" onclick="VAReturns.clear()">
            🗑 Очистити
          </button>

        </div>

      </div>


      <div class="stub" style="margin-top:14px">

        <h4>Журнал повернень</h4>

        <table style="width:100%">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Організація</th>
              <th>Місця</th>
              <th>Документ</th>
              <th>Примітка</th>
            </tr>
          </thead>

          <tbody id="returnsJournalBody"></tbody>

        </table>

      </div>

    `;


    this.fillSeats();

    this.loadJournal();

  },


  seatsFromBooking(b){

    if(Array.isArray(b.seats))
      return b.seats;

    if(Array.isArray(b.seat_labels))
      return b.seat_labels;

    if(b.seat_label)
      return [b.seat_label];

    return [];

  },
fillContacts(){

    const booking = this.state.bookings
        .find(b => String(b.status || "").toLowerCase() === "reserved");

    if (!booking) return;


    const org = document.getElementById("returnOrg");
    const person = document.getElementById("returnPerson");
    const phone = document.getElementById("returnPhone");
    const email = document.getElementById("returnEmail");


    if (org)
        org.value = booking.organization || "";


    if (person)
        person.value =
            booking.contact_name ||
            booking.buyer_name ||
            "";


    if (phone)
        phone.value =
            booking.buyer_phone ||
            "";


    if (email)
        email.value =
            booking.buyer_email ||
            "";

}

  fillSeats(){

    const input = document.getElementById("returnSeats");

    if(!input) return;


    const seats = [];


    this.state.bookings
      .filter(b => String(b.status).toLowerCase()==="reserved")
      .forEach(b=>{

        this.seatsFromBooking(b)
          .forEach(s=>{

            if(!seats.includes(s))
              seats.push(s);

          });

      });


    input.value = seats.join(", ");

  },


  async save(){

    if(!this.state.seanceId){

      alert("Не обрано сеанс.");
      return;

    }


    const seats =
      document.getElementById("returnSeats")
      ?.value
      .split(",")
      .map(x=>x.trim())
      .filter(Boolean)
      || [];


    if(!seats.length){

      alert("Немає місць для повернення.");
      return;

    }


    const rows =
      this.state.bookings.filter(b=>{

        if(String(b.status).toLowerCase()!=="reserved")
          return false;


        return this.seatsFromBooking(b)
          .some(s=>seats.includes(s));

      });



    const payload = {

      seance_id:this.state.seanceId,

      booking_ids:
        rows.map(r=>r.id),

      seats,

      organization:
        document.getElementById("returnOrg")?.value || "",

      contact_name:
        document.getElementById("returnPerson")?.value || "",

      buyer_phone:
        document.getElementById("returnPhone")?.value || "",

      buyer_email:
        document.getElementById("returnEmail")?.value || "",

      issue_doc:
        document.getElementById("returnDoc")?.value || "",

      return_note:
        document.getElementById("returnNote")?.value || ""

    };


    try{


      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/ticket_returns`,
        {

          method:"POST",

          headers:{

            apikey:SUPABASE_ANON_KEY,
            Authorization:`Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type":"application/json",
            Prefer:"return=representation"

          },

          body:JSON.stringify(payload)

        }
      );


      const data = await res.json();


      if(!res.ok){

        console.error(data);
        alert("Помилка збереження повернення.");
        return;

      }


      alert("Повернення оформлено.");

      this.clear();

      this.loadJournal();


    }catch(e){

      console.error(e);
      alert("Помилка.");

    }


  },


  async loadJournal(){

    const body =
      document.getElementById("returnsJournalBody");

    if(!body) return;


    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ticket_returns?seance_id=eq.${encodeURIComponent(this.state.seanceId)}&order=created_at.desc`,
      {
        headers:{
          apikey:SUPABASE_ANON_KEY,
          Authorization:`Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );


    const rows = await res.json();


    body.innerHTML = (rows||[]).map(r=>`

      <tr>

        <td>${new Date(r.created_at).toLocaleString("uk-UA")}</td>

        <td>${r.organization||""}</td>

        <td>${(r.seats||[]).join(", ")}</td>

        <td>${r.issue_doc||""}</td>

        <td>${r.return_note||""}</td>

      </tr>

    `).join("");

  },


  clear(){

    [
      "returnOrg",
      "returnPerson",
      "returnPhone",
      "returnEmail",
      "returnDoc",
      "returnSeats",
      "returnNote"

    ].forEach(id=>{

      const el=document.getElementById(id);
      if(el) el.value="";

    });


    this.fillSeats();

  }


};
