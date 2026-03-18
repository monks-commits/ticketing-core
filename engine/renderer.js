export function renderHall(container, hallConfig, state = {}, options = {}) {
  if (!hallConfig?.rows) {
    container.innerHTML = '<p>Hall config error</p>'; 
    return;
  }

  container.innerHTML = '';
  const selected = new Set();

  hallConfig.rows.forEach((rowCfg) => {
    const rowNum = rowCfg.row;
    const seatsCount = rowCfg.seats || 0;
    const AISLES = [6, 17]; // 🔥 настраиваемо

    const rowEl = document.createElement('div');
    rowEl.className = 'hall-row';

    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = rowNum;
    rowEl.appendChild(label);

    const seatsWrap = document.createElement('div');
    seatsWrap.className = 'hall-row-seats';

    for (let s = 1; s <= seatsCount; s++) {

      // 🔥 считаем сколько проходов слева
      const passedAisles = aisles.filter(a => a < s).length;

      // 🔥 ширина прохода (в "ячейках")
      const aisleWidth = 2;

      // 🔥 итоговая колонка
      const col = s + passedAisles * aisleWidth;

      const seatId = `P${rowNum}-M${s}`;

      const btn = document.createElement('button');
      btn.className = 'seat';
      btn.dataset.seatId = seatId;
      btn.textContent = s;

      // 🔥 позиционирование через grid
      btn.style.gridColumn = col;

      const st = state[seatId];

      if (st === 'taken') {
        btn.classList.add('taken');
        btn.disabled = true;
      } else {
        btn.classList.add('free');
      }

      // 🔥 adapter (цены / цвета / блокировки)
      if (options.getSeatMeta) {
        const meta = options.getSeatMeta({ row: rowNum, seat: s }) || {};

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

    if (rowCfg.gapAfter) {
      const gap = document.createElement('div');
      gap.className = 'hall-row-gap';
      container.appendChild(gap);
    }
  });
}
