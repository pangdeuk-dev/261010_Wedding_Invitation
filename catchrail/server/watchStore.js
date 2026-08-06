import { randomUUID } from "crypto";

/**
 * 감시 작업 저장소 (인메모리)
 * status: watching | found | booking | booked | failed | stopped
 */
export class WatchStore {
  constructor() {
    /** @type {Map<string, object>} */
    this.jobs = new Map();
  }

  create(input) {
    const id = randomUUID();
    const job = {
      id,
      from: input.from,
      to: input.to,
      date: input.date,
      trainType: input.trainType || "전체",
      preferDepartFrom: input.preferDepartFrom || null,
      preferDepartTo: input.preferDepartTo || null,
      passengers: Math.max(1, Math.min(4, Number(input.passengers) || 1)),
      autoBook: Boolean(input.autoBook),
      passengerName: (input.passengerName || "손님").slice(0, 20),
      status: "watching",
      matchedTrain: null,
      bookedSeat: null,
      checks: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      logs: [{ at: Date.now(), message: "감시 시작" }],
    };
    this.jobs.set(id, job);
    return job;
  }

  list() {
    return [...this.jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  get(id) {
    return this.jobs.get(id) || null;
  }

  update(id, patch) {
    const job = this.jobs.get(id);
    if (!job) return null;
    Object.assign(job, patch, { updatedAt: Date.now() });
    return job;
  }

  addLog(id, message) {
    const job = this.jobs.get(id);
    if (!job) return;
    job.logs.push({ at: Date.now(), message });
    if (job.logs.length > 40) job.logs.shift();
    job.updatedAt = Date.now();
  }

  remove(id) {
    return this.jobs.delete(id);
  }

  stop(id) {
    return this.update(id, { status: "stopped" });
  }
}
