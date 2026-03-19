function createSeatMetaGetter(seance) {
  return ({ row, seat }) => {
    const seatKey = `P${row}-M${seat}`;

    if (seance.seat_overrides?.[seatKey]) {
      const o = seance.seat_overrides[seatKey];

      return {
        price: o.price ?? 0,
        color: o.color,
        disabled: o.sale === false
      };
    }

    for (const key in seance.pricing) {
      const match = key.match(/^([A-Z])(\\d+)-(\\d+)$/);
      if (!match) continue;

      const zone = match[1];
      const from = Number(match[2]);
      const to   = Number(match[3]);

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

    return {
      price: 0,
      color: '#e5e7eb'
    };
  };
}

window.createSeatMetaGetter = createSeatMetaGetter;
