export function createSeatMetaGetter(seance) {
  return ({ row, seat }) => {
    const seatKey = `P${row}-M${seat}`;

    // override (приоритет)
    if (seance.seat_overrides?.[seatKey]) {
      const o = seance.seat_overrides[seatKey];
      return {
        price: o.price ?? 0,
        color: o.color,
        disabled: o.sale === false
      };
    }

    // pricing rules
    for (const key in seance.pricing) {
      const match = key.match(/^P(\d+)-(\d+)$/);
      if (!match) continue;

      const from = Number(match[1]);
      const to   = Number(match[2]);

      if (row >= from && row <= to) {
        const rule = seance.pricing[key];
        return {
          price: rule.price,
          color: zoneColors[zone],
          disabled: rule.sale === false
        };
      }
    }

    // fallback
    const zoneColors = {
  left: "#3b82f6",    // синий
  center: "#a855f7",  // фиолетовый
  right: "#06b6d4"    // голубой
};

return {
  price: 0,
  color: zoneColors[zone] || "#e5e7eb"
};
  };
}
