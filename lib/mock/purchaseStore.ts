export interface MockPurchaseRecord {
  courseId: string;
  courseName: string;
  priceYD: number;
  purchasedAt: string;
  /** Mock 生成的假交易哈希，仅用于前端展示，不对应任何真实链上交易 */
  txHash: string;
}

const STORAGE_KEY_PREFIX = "mock_purchases:";

// 购买记录必须按登录账户隔离（accountKey 取 Privy 嵌入式钱包地址）：早期只有一个
// 固定 Mock 身份时全局共享一份记录没有问题，但接入真实多账户登录后，同一浏览器
// 里退出再登录另一个账户，不能直接继承上一个账户的已购课程/学习权限/购买记录
// ——那是一个真实的越权问题，不只是 UI 展示不一致。accountKey 为 null（未登录）
// 时不读写任何存储，视为"没有购买记录"。
function storageKeyFor(accountKey: string): string {
  return `${STORAGE_KEY_PREFIX}${accountKey.toLowerCase()}`;
}

// 同 tab 内的订阅者（浏览器原生 "storage" 事件只在其他 tab 写入时触发，
// 本 tab 内 recordPurchase 后必须手动通知，供 useSyncExternalStore 消费）。
// 通知是全局广播（不区分账户）：某个账户写入后，其它账户的订阅者也会被要求
// 重新读一次快照，但由于各自的缓存按账户区分、未变化的账户会拿到同一个缓存
// 引用，useSyncExternalStore 判定"没变"后不会触发它们重渲染。
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
// 对应账户在 localStorage 里的字符串真的变化时才重新解析、更新缓存引用。
const EMPTY_RECORDS: MockPurchaseRecord[] = [];
const cachedRaw = new Map<string, string | null>();
const cachedRecords = new Map<string, MockPurchaseRecord[]>();

function readStorage(accountKey: string): MockPurchaseRecord[] {
  if (typeof window === "undefined") return cachedRecords.get(accountKey) ?? EMPTY_RECORDS;
  try {
    const raw = window.localStorage.getItem(storageKeyFor(accountKey));
    if (raw === (cachedRaw.get(accountKey) ?? null)) {
      return cachedRecords.get(accountKey) ?? EMPTY_RECORDS;
    }

    cachedRaw.set(accountKey, raw);
    if (!raw) {
      cachedRecords.set(accountKey, EMPTY_RECORDS);
      return EMPTY_RECORDS;
    }
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed) ? (parsed as MockPurchaseRecord[]) : EMPTY_RECORDS;
    cachedRecords.set(accountKey, records);
    return records;
  } catch {
    cachedRecords.set(accountKey, EMPTY_RECORDS);
    return EMPTY_RECORDS;
  }
}

function writeStorage(accountKey: string, records: MockPurchaseRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKeyFor(accountKey), JSON.stringify(records));
}

function mockTxHash(): string {
  const hex = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return `0xmock${hex.slice(5)}`;
}

/** accountKey 为 null（未登录）时视为没有任何购买记录，不读取任何存储。 */
export function getPurchases(accountKey: string | null): MockPurchaseRecord[] {
  if (!accountKey) return EMPTY_RECORDS;
  return readStorage(accountKey);
}

export function recordPurchase(
  accountKey: string,
  courseId: string,
  courseName: string,
  priceYD: number
): MockPurchaseRecord {
  const records = readStorage(accountKey);
  const existing = records.find((r) => r.courseId === courseId);
  if (existing) return existing;

  const record: MockPurchaseRecord = {
    courseId,
    courseName,
    priceYD,
    purchasedAt: new Date().toISOString(),
    txHash: mockTxHash(),
  };
  writeStorage(accountKey, [...records, record]);
  notifyListeners();
  return record;
}
