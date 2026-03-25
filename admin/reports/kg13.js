const SUPABASE_URL = "https://fhusjlkneckbvnrdhbil.supabase.co";
const SUPABASE_ANON_KEY = "ВСТАВЬ_СВОЙ_КЛЮЧ_СЮДА";

async function run() {

  const day = document.getElementById("day").value;
  const cashier = document.getElementById("cashier").value.trim();

  if (!day || !cashier) {
    alert("Вкажіть дату та касира");
    return;
  }

  try {

    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/tickets?select=price,created_at`,
      {
        headers: {
          "apikey": SUPABASE_ANON_KEY.trim(),
          "Authorization": "Bearer " + SUPABASE_ANON_KEY.trim()
        }
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(text);
      alert("Помилка завантаження звіту");
      return;
    }

    const data = await res.json();

    let count = 0;
    let sum = 0;

    for (const t of data) {
      if (!t.created_at) continue;

      const dayStr = t.created_at.slice(0, 10);

      if (dayStr === day) {
        count++;
        sum += Number(t.price || 0);
      }
    }

    document.getElementById("out").innerHTML = `
      <p><b>Дата:</b> ${day}</p>
      <p><b>Касир:</b> ${cashier}</p>
      <p><b>Кількість:</b> ${count}</p>
      <p><b>Сума:</b> ${sum} грн</p>
    `;

  } catch (e) {
    console.error(e);
    alert("Помилка звіту");
  }
}
