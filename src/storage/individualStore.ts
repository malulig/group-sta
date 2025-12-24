export type IndividualParticipant = {
  id: string;
  name: string;
  running: boolean;
  startedAtMs: number | null;
  offsetSec: number;
};

export type IndividualState = {
  list: IndividualParticipant[];
  lastStoppedAtMs: number | null;
};

const STORAGE_KEY = "groupSTA.individual.v1";

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

export async function loadIndividualState(): Promise<IndividualState> {
  return readJson<IndividualState>(STORAGE_KEY, { list: [], lastStoppedAtMs: null });
}

export async function saveIndividualState(state: IndividualState): Promise<void> {
  await writeJson(STORAGE_KEY, state);
}
