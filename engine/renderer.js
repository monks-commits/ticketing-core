// engine/renderer.js

export function renderHall(container, hallConfig, state = {}, options = {}) {
  if (!container) return;

  container.innerHTML = '';

  const selected = new Set();

  function toggleSelect(key, btn) {
    if (btn.disabled) return;

    if (btn.classList.contains('selected')) {
      btn.classList.remove('selected');
      selected.delete(key);
    } else {
      btn.classList.add('selected');
      selected.add(key);
    }

    options.onSelect?.(Array.from(selected));
  }

  function renderRows(rows, prefix = 'P') {
    rows.forEach((rowCfg) => {
      const rowNum = rowCfg.row;
      const seatsCount = Number(rowCfg.seats || 0);
      const aisles = Array.isArray(rowCfg.aisles) ? rowCfg.aisles : [];
      const offset = Number(rowCfg.offset || 0);

      const rowDiv = document.createElement('div');
      rowDiv.className = 'hall-row';

      const label = document.createElement('div');
      label.className = 'row-label';
      label.textContent = rowNum;
      rowDiv.appendChild(label);

      const seatsWrap = document.createElement('div');
      seatsWrap.className = 'hall-row-seats';

      for (let i = 0; i < offset; i++) {
        const spacer = document.createElement('button');
        spacer.className = 'seat';
        spacer.style.visibility = 'hidden';
        seatsWrap.appendChild(spacer);
      }

      for (let s = 1; s <= seatsCount; s++) {
        const seatId = `${prefix}${rowNum}-M${s}`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'seat';
        btn.dataset.seatId = seatId;
        btn.textContent = s;

        if (state[seatId] === 'taken' || state[seatId] === 'sold') {
          btn.classList.add('taken');
          btn.disabled = true;
        } else {
          btn.classList.add('free');
        }

        if (options.getSeatMeta) {
          const meta = options.getSeatMeta({
            key: seatId,
            row: rowNum,
            seat: s,
            type: 'seat'
          }) || {};

          if (meta.price !== undefined) {
            btn.title = `Ряд ${rowNum}, місце ${s} — ${meta.price} грн`;
          }

          if (meta.color) btn.style.background = meta.color;
          if (meta.disabled) {
            btn.disabled = true;
            btn.style.opacity = 0.4;
          }
          if (meta.className) btn.classList.add(meta.className);
        }

        btn.addEventListener('click', () => toggleSelect(seatId, btn));

        seatsWrap.appendChild(btn);

        if (aisles.includes(s)) {
          const aisle = document.createElement('div');
          aisle.className = 'aisle';
          seatsWrap.appendChild(aisle);
        }
      }

      rowDiv.appendChild(seatsWrap);
      container.appendChild(rowDiv);

      if (rowCfg.gapAfter) {
        const gap = document.createElement('div');
        gap.className = 'hall-row-gap';
        container.appendChild(gap);
      }
    });
  }

  function renderTables(section) {
    const layer = document.createElement('div');
    layer.className = 'club-tables-layer';

    const title = document.createElement('div');
    title.className = 'hall-section-title';
    title.textContent = section.title || 'Столи';
    layer.appendChild(title);

    (section.items || []).forEach((table) => {
      const key = table.id;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `club-table club-table--${table.shape || 'round'}`;

      btn.dataset.key = key;
      btn.dataset.type = 'table';
      btn.dataset.capacity = String(table.capacity || 0);
      btn.dataset.bookingMode = table.booking_mode || 'table_only';
      btn.dataset.deposit = String(table.deposit || '');
      btn.dataset.pricePerSeat = String(table.price_per_seat || '');

      btn.style.left = `${Number(table.x || 0)}px`;
      btn.style.top = `${Number(table.y || 0)}px`;

      btn.innerHTML = `
        <div class="club-table-title">${table.title || key}</div>
        <div class="club-table-meta">${table.capacity || 0} місць</div>
        ${
          table.deposit
            ? `<div class="club-table-price">депозит ${table.deposit} грн</div>`
            : table.price_per_seat
              ? `<div class="club-table-price">${table.price_per_seat} грн / місце</div>`
              : ''
        }
      `;

      if (state[key] === 'taken' || state[key] === 'sold') {
        btn.classList.add('taken');
        btn.disabled = true;
      } else {
        btn.classList.add('free');
      }

      btn.addEventListener('click', () => toggleSelect(key, btn));

      layer.appendChild(btn);
    });

    container.appendChild(layer);
  }

  // Старый формат
  if (Array.isArray(hallConfig.rows)) {
    renderRows(hallConfig.rows, hallConfig.prefix || 'P');
    return;
  }

  // Новый формат sections
  if (Array.isArray(hallConfig.sections)) {
    hallConfig.sections.forEach((section) => {
      if (section.type === 'rows') {
        renderRows(section.rows || [], section.prefix || 'P');
      }

      if (section.type === 'tables') {
        renderTables(section);
      }
    });

    return;
  }

  container.innerHTML = '<p>Hall config error</p>';
}
