window.VASalesJournal = {
  buildRows(tickets = []) {
    return tickets.map(t => ({
      date: t.created_at || "",
      op: "Продаж",
      seat: t.seat_label || "",
      type: t.ticket_type || "",
      channel: t.channel || t.ref_code || "",
      amount: t.price ?? "",
      note: [
        t.buyer_name || "",
        t.buyer_phone || "",
        t.buyer_email || ""
      ].filter(Boolean).join(" • ")
    }));
  }
};
