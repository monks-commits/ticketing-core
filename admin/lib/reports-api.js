async function getKG13(day, cashier) {

  const data = await sbFetch("tickets?select=price,created_at");

  for (const t of data) {
  if (!t.created_at) continue;

  const dayStr = t.created_at.slice(0, 10);

  if (dayStr === date) {
    count++;
    sum += Number(t.price || 0);
  }
}

  let count = 0;
  let sum = 0;

  for (const t of data) {

    if (!t.created_at) continue;
    if (t.status !== "sold" && t.status !== "used") continue;

    const d = new Date(t.created_at);

    if (d >= start && d <= end) {
      count++;
      sum += Number(t.price || 0);
    }
  }

  return {
    date: day,
    cashier,
    count,
    sum
  };
}
