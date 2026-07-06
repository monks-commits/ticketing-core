window.VAToolbar = {
  render({
    targetId,
    tableId,
    title = "Журнал",
    onRefresh = null,
    onSaveSnapshot = null
  }) {
    const target = document.getElementById(targetId);
    if (!target) return;

    target.innerHTML = `
      <div class="va-toolbar">
        <input class="va-toolbar-search" type="search" placeholder="Пошук..." data-va-search="${tableId}">

        <select class="va-toolbar-period">
          <option value="">Період</option>
          <option value="today">Сьогодні</option>
          <option value="yesterday">Вчора</option>
          <option value="week">Тиждень</option>
          <option value="month">Місяць</option>
        </select>

        <button type="button" data-va-refresh="${targetId}">🔄 Оновити</button>
        <button type="button" data-va-print="${tableId}" data-title="${title}">🖨 Роздрукувати</button>
        <button type="button" data-va-copy="${tableId}">📋 Копіювати</button>
        <button type="button" data-va-snapshot="${targetId}">💾 Зберегти звіт</button>
        <button type="button" data-va-csv="${tableId}" data-title="${title}">⬇ CSV</button>
      </div>
    `;

    target.querySelector("[data-va-refresh]")?.addEventListener("click", () => {
      if (typeof onRefresh === "function") onRefresh();
    });

    target.querySelector("[data-va-snapshot]")?.addEventListener("click", () => {
      if (typeof onSaveSnapshot === "function") {
        onSaveSnapshot();
      } else {
        alert("Збереження звіту буде підключено окремо.");
      }
    });

    target.querySelector("[data-va-print]")?.addEventListener("click", (e) => {
      VAToolbar.printTable(e.currentTarget.dataset.vaPrint, e.currentTarget.dataset.title);
    });

    target.querySelector("[data-va-copy]")?.addEventListener("click", (e) => {
      VAToolbar.copyTable(e.currentTarget.dataset.vaCopy);
    });

    target.querySelector("[data-va-csv]")?.addEventListener("click", (e) => {
      VAToolbar.exportCsv(e.currentTarget.dataset.vaCsv, e.currentTarget.dataset.title);
    });

    target.querySelector("[data-va-search]")?.addEventListener("input", (e) => {
      VAToolbar.searchTable(e.currentTarget.dataset.vaSearch, e.currentTarget.value);
    });
  },

  searchTable(tableId, query) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const q = String(query || "").toLowerCase();

    table.querySelectorAll("tbody tr").forEach(row => {
      row.style.display = row.innerText.toLowerCase().includes(q) ? "" : "none";
    });
  },

  copyTable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return alert("Таблицю не знайдено.");

    const text = Array.from(table.rows)
      .map(row => Array.from(row.cells).map(cell => cell.innerText.trim()).join("\t"))
      .join("\n");

    navigator.clipboard.writeText(text)
      .then(() => alert("Скопійовано."))
      .catch(() => alert("Не вдалося скопіювати."));
  },

  printTable(tableId, title) {
    const table = document.getElementById(tableId);
    if (!table) return alert("Таблицю не знайдено.");

    const win = window.open("", "_blank");
    if (!win) return alert("Браузер заблокував друк.");

    win.document.write(`
      <!doctype html>
      <html lang="uk">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:24px;color:#111827;}
          h1{font-size:22px;margin:0 0 18px;}
          table{width:100%;border-collapse:collapse;font-size:13px;}
          th,td{border:1px solid #d1d5db;padding:7px;text-align:left;}
          th{background:#f3f4f6;}
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${table.outerHTML}
      </body>
      </html>
    `);

    win.document.close();
    win.focus();
    win.print();
  },

  exportCsv(tableId, title) {
    const table = document.getElementById(tableId);
    if (!table) return alert("Таблицю не знайдено.");

    const rows = Array.from(table.rows).map(row =>
      Array.from(row.cells)
        .map(cell => `"${cell.innerText.replace(/"/g, '""')}"`)
        .join(",")
    );

    const blob = new Blob([rows.join("\n")], { type:"text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title || "journal"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
};
