async function loadKG13() {

  const date = document.getElementById("date").value;
  const cashier = document.getElementById("cashier").value.trim();

  if (!date || !cashier) {
    alert("Вкажіть дату та касира");
    return;
  }

  const result = await window.api.getKG13(date, cashier);

  document.getElementById("report").innerHTML = `
    <p><strong>Касир:</strong> ${result.cashier}</p>
    <p><strong>Дата:</strong> ${result.date}</p>

    <table>
      <tr>
        <th>Кількість проданих квитків</th>
        <th>Сума реалізації, грн</th>
      </tr>
      <tr>
        <td>${result.totalTickets}</td>
        <td>${result.totalAmount}</td>
      </tr>
    </table>

    <br><br>
    Підпис касира ______________________
  `;
}
