// engine/renderer.js

export function renderHall(container, hallConfig, state = {}, options = {}) {
  if (!hallConfig?.rows) {
    container.innerHTML = '<p>Hall config error</p>';
    return;
  }

  container.innerHTML = '';
  const selected = new Set();

  hallConfig.rows.forEach((rowCfg) => {
    const rowNum = rowCfg.row;
    const seatsCount = Number(rowCfg.seats || 0);
    const aisles = rowCfg.aisles || [];
    const offset = Number(rowCfg.offset || 0);

    const rowEl = document.createElement('div');
    rowEl.className = 'hall-row';

    // номер ряда
    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = rowNum;
    rowEl.appendChild(label);

    // контейнер мест
    const seatsWrap = document.createElement('div');
    seatsWrap.className = 'hall-row-seats';

    // offset (сдвиг первого ряда)
    for (let i = 0; i < offset; i++) {
      const spacer = document.createElement('div');
      spacer.className = 'seat spacer';
      seatsWrap.appendChild(spacer);
    }

    // генерация мест
    for (let s = 1; s <= seatsCount; s++) {

      // 🔥 ПРОХОД ДО МЕСТА
      if (aisles.includes(s)) {
        const aisle = document.createElement('div');
        aisle.className = 'aisle';
        seatsWrap.appendChild(aisle);
      }

      const seatId = `P${rowNum}-M${s}`;

      const btn = document.createElement('button');
      btn.className = 'seat';
      btn.dataset.seatId = seatId;
      btn.textContent = s;

      const st = state[seatId];

      if (st === 'taken') {
        btn.classList.add('taken');
        btn.disabled = true;
      } else {
        btn.classList.add('free');
      }

      // 🔥 ВНЕШНЯЯ ЛОГИКА (editor / Supabase)
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

      // выбор места
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

      seatsWrap.appendChild(btn);
    }

    rowEl.appendChild(seatsWrap);
    container.appendChild(rowEl);

    // отступ между блоками (если есть)
    if (rowCfg.gapAfter) {
      const gap = document.createElement('div');
      gap.className = 'hall-row-gap';
      container.appendChild(gap);
    }
  });
}
