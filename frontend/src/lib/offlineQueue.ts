const QUEUE_KEY = "pushme-offline-queue";

export type QueuedRequest = {
  method: "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  createdAt: string;
};

export function readQueue(): QueuedRequest[] {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as QueuedRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushQueue(item: Omit<QueuedRequest, "createdAt">): void {
  const queue = readQueue();
  queue.push({ ...item, createdAt: new Date().toISOString() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export function setQueue(queue: QueuedRequest[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}
