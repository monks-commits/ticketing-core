export function createSeatMetaGetter(seance) {
  return ({ row, seat }) => {
    const seatKey = `P${row}-M${seat}`;

    // 🎯 1. override (приоритет)
    if (seance.seat_overrides?.[seatKey]) {
      const o = seance.seat_overrides[seatKey];

      return {
        price: o.price ?? 0,
        color: o.color,
        disabled: o.sale === false
      };
    }

    // 🎯 2. pricing rules (из editor)
    for (const key in seance.pricing) {
      const match = key.match(/^([A-Z])(\d+)-(\d+)$/);
      if (!match) continue;

      const zone = match[1]; // P / A / B
      const from = Number(match[2]);
      const to   = Number(match[3]);

      // 👉 сейчас используем только P (партер)
      if (zone !== 'P') continue;

      if (row >= from && row <= to) {
        const rule = seance.pricing[key];

        return {
          price: rule.price,
          color: rule.color,
          disabled: rule.sale === false
        };
      }
    }

    // 🎯 3. fallback
    return {
      price: 0,
      color: '#e5e7eb'
    };
  };
}
