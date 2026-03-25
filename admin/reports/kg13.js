const SUPABASE_URL = "https://fhusjlkneckbvnrdhbil.supabase.co";
const SUPABASE_KEY = "sb_publishable_nCCfptJOb8Lzy1uAwGBJzA_OJtDneTS";

async function loadKG13() {

  const date = document.getElementById("date").value;
  const cashier = document.getElementById("cashier").value.trim();

  if (!date || !cashier) {
    alert("Вкажіть дату та касира");
    return;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tickets?select=price,created_at,status`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": "Bearer " + SUPABASE_KEY
        }
      }
    );

    const data = await res.json();

    let count = 0;
    let sum = 0;

    const start = new Date(date + "T00:00:00");
    const end = new Date(date + "T23:59:59");

    for (const t of data) {
      if (!t.created_at) continue;
      if (t.status !== "sold" && t.status !== "used") continue;

      const d = new Date(t.created_at);

      if (d >= start && d <= end) {
        count++;
        sum += Number(t.price || 0);
      }
    }

    document.getElementById("report").innerHTML = `
      <p><strong>Касир:</strong> ${cashier}</p>
      <p><strong>Дата:</strong> ${date}</p>

      <table>
        <tr>
          <th>Кількість проданих квитків</th>
          <th>Сума реалізації, грн</th>
        </tr>
        <tr>
          <td>${count}</td>
          <td>${sum}</td>
        </tr>
      </table>

      <br><br>
      Підпис касира ______________________
    `;

  } catch (e) {
    console.error(e);
    alert("Помилка завантаження звіту");
  }
}
