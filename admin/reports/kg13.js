async function getKG13(day, cashier) {

  const data = await sbFetch("tickets?select=price,created_at");

  let count = 0;
  let sum = 0;

  for (const t of data) {
    if (!t.created_at) continue;

    const dayStr = t.created_at.slice(0, 10);

    if (dayStr === day) {
      count++;
      sum += Number(t.price || 0);
    }
  }

  return {
    date: day,
    cashier: cashier,
    count: count,
    sum: sum
  };
}
