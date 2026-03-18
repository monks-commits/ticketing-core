export function createSeatMetaGetter(seance) {

  // ✅ ОБЯЗАТЕЛЬНО ВВЕРХУ
  const zoneColors = {
    left: "#3b82f6",    // синий
    center: "#a855f7",  // фиолетовый
    right: "#06b6d4"    // голубой
  };

  return ({ row, seat, zone }) => {
    const seatKey = `P${row}-M${seat}`;

    // 1. override (приоритет)
    if (seance.seat_overrides?.[seatKey]) {
      const o = seance.seat_overrides[seatKey];
      return {
        price: o.price ?? 0,
        color: o.color ?? zoneColors[zone],
        disabled: o.sale === false
      };
    }

    // 2. pricing rules
    for (const key in seance.pricing) {
      const match = key.match(/^P(\d+)-(\d+)$/);
      if (!match) continue;

      const from = Number(match[1]);
      const to   = Number(match[2]);

      if (row >= from && row <= to) {
        const rule = seance.pricing[key];

        return {
          price: rule.price ?? 0,
          color: zoneColors[zone],   // ✅ фикс
          disabled: rule.sale === false
        };
      }
    }

    // 3. fallback
    return {
      price: 0,
      color: zoneColors[zone] || "#e5e7eb"
    };
  };
}
