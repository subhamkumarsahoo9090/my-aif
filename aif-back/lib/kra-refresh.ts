import { readLastKraCheck, saveLastKraCheck } from "./admin-store.js";
import { kraStatus } from "./kra.js";
import { pendingKraClients, setInvestorKra } from "./portal-store.js";

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function msUntilNextCheck() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(0, 10, 0, 0);
  return Math.max(60_000, next.getTime() - Date.now());
}

let running = false;

export async function refreshUntickedKra() {
  if (running) return;
  if ((await readLastKraCheck()) === todayIso()) return;
  running = true;
  try {
    const pending = await pendingKraClients();
    let failed = 0;
    for (const client of pending) {
      const verified = await kraStatus(client.pan, client.dob);
      if (verified == null) {
        failed += 1;
        continue;
      }
      if (verified.kra || verified.fatca) await setInvestorKra(client.code, verified.kra, verified.fatca);
    }
    if (pending.length === 0 || failed < pending.length) {
      await saveLastKraCheck(todayIso());
    }
  } finally {
    running = false;
  }
}

export function startDailyKraCheck() {
  const tick = async () => {
    let retrySoon = false;
    try {
      const before = await readLastKraCheck();
      await refreshUntickedKra();
      retrySoon = (await readLastKraCheck()) === before && before !== todayIso();
    } catch (error) {
      console.error(error);
      retrySoon = true;
    }
    setTimeout(tick, retrySoon ? 60 * 60 * 1000 : msUntilNextCheck());
  };
  void tick();
}
