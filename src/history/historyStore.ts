export type HistoryItem = {
  name: string;
  seconds: number;
};

export type HistoryEntry = {
  id: string;
  dateIso: string;
  items: HistoryItem[];
};

const STORAGE_KEY = "groupSTA.history.v1";

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  return readJson<HistoryEntry[]>(STORAGE_KEY, []);
}

export async function addHistoryEntry(entry: HistoryEntry): Promise<void> {
  const existing = await loadHistory();
  await writeJson(STORAGE_KEY, [entry, ...existing]);
}

export async function clearHistory(): Promise<void> {
  const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function removeHistoryEntry(id: string): Promise<void> {
  const existing = await loadHistory();
  const next = existing.filter((entry) => entry.id !== id);
  await writeJson(STORAGE_KEY, next);
}
