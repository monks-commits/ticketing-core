// engine/renderer.js

export function renderHall(container, hallConfig, state = {}, options = {}) {
  if (!hallConfig?.rows || !Array.isArray(hallConfig.rows)) {
    container.innerHTML = '<p>Hall config error</p>';
    return;
  }

  container.innerHTML = '';
  const selected = new Set();

  hallConfig.rows.forEach((rowCfg) => {
    const rowNum     = rowCfg.row;
    const seatsCount = Number(rowCfg.seats || 0);
    const aisles     = Array.isArray(rowCfg.aisles) ? rowCfg.aisles : [];
    const offset     = Number(rowCfg.offset || 0);

    const rowDiv = document.createElement('div');
    rowDiv.className = 'hall-row';

    // номер ряда
    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = rowNum;
    rowDiv.appendChild(label);

    // контейнер мест
    const seatsWrap = document.createElement('div');
    seatsWrap.className = 'hall-row-seats';

    // OFFSET (сдвиг)
    for (let i = 0; i < offset; i++) {
      const spacer = document.createElement('button');
      spacer.className = 'seat';
      spacer.style.visibility = 'hidden';
      seatsWrap.appendChild(spacer);
    }

    // СИДЕНЬЯ
    for (let s = 1; s <= seatsCount; s++) {

      const seatId = `P${rowNum}-M${s}`;

      // 1️⃣ создаём кнопку
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'seat';
      btn.dataset.seatId = seatId;
      btn.textContent = s;

      // состояние (занято / свободно)
      if (state[seatId] === 'taken') {
        btn.classList.add('taken');
        btn.disabled = true;
      } else {
        btn.classList.add('free');
      }

      // внешняя логика (editor / Supabase)
      if (options.getSeatMeta) {
        const meta = options.getSeatMeta({
          row: rowNum,
          seat: s
        }) || {};

        if (meta.price !== undefined) {
          btn.title = `Ряд ${rowNum}, місце ${s} — ${meta.price} грн`;
        }

        if (meta.color) {
          btn.style.background = meta.color;
        }

        if (meta.disabled) {
          btn.disabled = true;
          btn.style.opacity = 0.4;
        }

        if (meta.className) {
          btn.classList.add(meta.className);
        }
      }

      // выбор
      btn.addEventListener('click', () => {
        if (btn.disabled) return;

        if (btn.classList.contains('selected')) {
          btn.classList.remove('selected');
          selected.delete(seatId);
        } else {
          btn.classList.add('selected');
          selected.add(seatId);
        }

        options.onSelect?.(Array.from(selected));
      });

      // 2️⃣ добавляем место
      seatsWrap.appendChild(btn);

      // 3️⃣ ПРОХОД ПОСЛЕ МЕСТА
      if (aisles.includes(s)) {
        const aisle = document.createElement('div');
        aisle.className = 'aisle';
        seatsWrap.appendChild(aisle);
      }
    }

    rowDiv.appendChild(seatsWrap);
    container.appendChild(rowDiv);

    // gap между блоками (если задан)
    if (rowCfg.gapAfter) {
      const gap = document.createElement('div');
      gap.className = 'hall-row-gap';
      container.appendChild(gap);
    }
  });
}
