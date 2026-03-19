import { addToQueue, getQueue } from "../../shared/cash-queue.js";
import { addToJournal } from "../../shared/journal.js";
import { syncQueue } from "../../shared/sync.js";
import { buildPrintPayload, openPrintQueue } from "../../shared/print.js";

export function initCash(){

  const btnSell = document.getElementById("btn-sell");
  const btnPrint = document.getElementById("btn-print");
  const btnReserve = document.getElementById("btn-reserve");
  const btnSync = document.getElementById("btn-sync");
  const btnPrintLast = document.getElementById("btn-print-last");

  let selectedSeats = [];

  // ⚠️ ВАЖНО: временно берём seats из старого кода
  window.setCashSelectedSeats = (seats) => {
    selectedSeats = seats;
  };

  function buildTickets(orderId){

    return selectedSeats.map(seat => ({
      seat_label: seat,
      order_id: orderId,
      price: 0
    }));
  }

  function buildOrderId(){
    return "CASH-" + Date.now();
  }

  // ПРОДАТИ + ДРУК
  btnSell.onclick = () => {

    if (!selectedSeats.length) return;

    const orderId = buildOrderId();
    const tickets = buildTickets(orderId);

    addToQueue({
      id: orderId,
      tickets
    });

    tickets.forEach(t => {
      addToJournal({
        action: "SALE",
        seat: t.seat_label
      });
    });

    const payload = buildPrintPayload(tickets, "offline");

    openPrintQueue(payload);
  };

  // ДРУК
  btnPrint.onclick = () => {

    const orderId = buildOrderId();
    const tickets = buildTickets(orderId);

    const payload = buildPrintPayload(tickets, "offline");

    openPrintQueue(payload);
  };

  // РЕЗЕРВ
  btnReserve.onclick = () => {

    const orderId = "RES-" + Date.now();
    const tickets = buildTickets(orderId);

    addToQueue({
      type: "reserve",
      id: orderId,
      tickets
    });

    addToJournal({
      action: "RESERVE",
      seats: selectedSeats.join(", ")
    });

    alert("Заброньовано");
  };

  // SYNC
  btnSync.onclick = async () => {
    await syncQueue();
    alert("Синхронізовано");
  };

  // ПОВТОР ДРУКУ
  btnPrintLast.onclick = () => {

    const last = getQueue().slice(-1)[0];
    if (!last) return;

    const payload = buildPrintPayload(last.tickets, "offline");

    openPrintQueue(payload);
  };
}
