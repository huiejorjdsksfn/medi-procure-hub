/**
 * EL5 MediProcure — Network Engine: Priority Request Queue
 * Adaptive concurrency governor. Concurrency ceiling shrinks/grows with
 * live link quality (via connectionMonitor) instead of a fixed pLimit(4).
 * Critical (UI-blocking) requests always jump ahead of background/prefetch work.
 *
 * ProcurBosse · Embu Level 5 Hospital
 */
import { connectionMonitor } from "./connectionMonitor";

export type Priority = "critical" | "normal" | "background";

interface QueuedTask<T> {
  run: () => Promise<T>;
  priority: Priority;
  resolve: (v: T) => void;
  reject: (e: any) => void;
}

const PRIORITY_WEIGHT: Record<Priority, number> = {
  critical: 0,
  normal: 1,
  background: 2,
};

class PriorityRequestQueue {
  private queue: QueuedTask<any>[] = [];
  private active = 0;

  private get ceiling(): number {
    const suggested = connectionMonitor.suggestedConcurrency();
    return Math.max(1, suggested); // never fully stall even when "offline" is misdetected
  }

  enqueue<T>(run: () => Promise<T>, priority: Priority = "normal"): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ run, priority, resolve, reject });
      this.queue.sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);
      this.drain();
    });
  }

  private drain(): void {
    while (this.active < this.ceiling && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.active++;
      task
        .run()
        .then(task.resolve, task.reject)
        .finally(() => {
          this.active--;
          this.drain();
        });
    }
  }

  /** For a live health panel */
  stats() {
    return {
      pending: this.queue.length,
      active: this.active,
      ceiling: this.ceiling,
      byPriority: {
        critical: this.queue.filter((t) => t.priority === "critical").length,
        normal: this.queue.filter((t) => t.priority === "normal").length,
        background: this.queue.filter((t) => t.priority === "background").length,
      },
    };
  }
}

export const requestQueue = new PriorityRequestQueue();
