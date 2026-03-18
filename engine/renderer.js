export function renderHall(container, hallConfig, state = {}, options = {}) {
  if (!hallConfig?.rows) {
    container.innerHTML = '<p>Hall config error</p>';
    return;
  }

  container.innerHTML = '';
  const selected = new Set();

  hallConfig.rows.forEach((rowCfg) => {
    const rowNum = rowCfg.row;

    const rowEl = document.createElement('div');
    rowEl.className = 'hall-row';

    const label = document.createElement('div');
    label.className = 'row-label';
    label.textContent = rowNum;
    rowEl.appendChild(label);

    const seatsWrap = document.createElement('div');
    seatsWrap.className = 'hall-row-seats';

    let seatCounter = 1;

    const blocks = rowCfg.blocks
      ? rowCfg.blocks
      : [{ seats: rowCfg.seats || 0 }];

    blocks.forEach(block => {

      // ✅ приводим к числам
      const offset = Number(block.offset || 0);
      const gap = Number(block.gap || 0);
      const seatsCount = Number(block.seats || 0);

      // offset (пустота слева)
      for (let i = 0; i < offset; i++) {
        const spacer = document.createElement('div');
        spacer.className = 'seat spacer';
        seatsWrap.appendChild(spacer);
      }

      // seats
      for (let i = 0; i < seatsCount; i++) {
        const s = seatCounter++;
        const seatId = `P${rowNum}-M${s}`;
        const zone = block.zone;

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

        // 🔥 внешняя логика
        if (options.getSeatMeta) {
          const meta = options.getSeatMeta({ row: rowNum, seat: s, zone }) || {};

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

      // gap (проход)
      for (let i = 0; i < gap; i++) {
        const gapEl = document.createElement('div');
        gapEl.className = 'aisle';
        seatsWrap.appendChild(gapEl);
      }

    });

    rowEl.appendChild(seatsWrap);
    container.appendChild(rowEl);

    if (rowCfg.gapAfter) {
      const gap = document.createElement('div');
      gap.className = 'hall-row-gap';
      container.appendChild(gap);
    }
  });
}
