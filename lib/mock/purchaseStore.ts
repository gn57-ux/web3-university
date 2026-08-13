export interface MockPurchaseRecord {
  courseId: string;
  courseName: string;
  priceYD: number;
  purchasedAt: string;
  /** Mock 生成的假交易哈希，仅用于前端展示，不对应任何真实链上交易 */
  txHash: string;
}

const STORAGE_KEY = "mock_purchases";

// 同 tab 内的订阅者（浏览器原生 "storage" 事件只在其他 tab 写入时触发，
// 本 tab 内 recordPurchase 后必须手动通知，供 useSyncExternalStore 消费）。
type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribePurchases(listener: Listener): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

// useSyncExternalStore 要求 getSnapshot 在底层数据不变时返回同一个引用，否则
// React 会判定"每次都变了"陷入重渲染死循环。localStorage.getItem 本身不缓存，
// JSON.parse 每次都产出新数组，因此这里按原始字符串做一层引用缓存：只有当
// localStorage 里的字符串真的变化时才重新解析、更新缓存引用。
let cachedRaw: string | null = null;
let cachedRecords: MockPurchaseRecord[] = [];

function readStorage(): MockPurchaseRecord[] {
  if (typeof window === "undefined") return cachedRecords;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedRecords;

    cachedRaw = raw;
    if (!raw) {
      cachedRecords = [];
      return cachedRecords;
    }
    const parsed = JSON.parse(raw);
    cachedRecords = Array.isArray(parsed) ? (parsed as MockPurchaseRecord[]) : [];
    return cachedRecords;
  } catch {
    cachedRecords = [];
    return cachedRecords;
  }
}

function writeStorage(records: MockPurchaseRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function mockTxHash(): string {
  const hex = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return `0xmock${hex.slice(5)}`;
}

export function getPurchases(): MockPurchaseRecord[] {
  return readStorage();
}

export function recordPurchase(
  courseId: string,
  courseName: string,
  priceYD: number
): MockPurchaseRecord {
  const records = readStorage();
  const existing = records.find((r) => r.courseId === courseId);
  if (existing) return existing;

  const record: MockPurchaseRecord = {
    courseId,
    courseName,
    priceYD,
    purchasedAt: new Date().toISOString(),
    txHash: mockTxHash(),
  };
  writeStorage([...records, record]);
  notifyListeners();
  return record;
}
