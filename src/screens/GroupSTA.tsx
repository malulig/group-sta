import { Entypo, Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, Vibration } from "react-native";
import { useNavigation } from "@react-navigation/native";

/** Локализация */
type Lang = "ru" | "en" | "kk";
const STRINGS: Record<Lang, Record<string, string>> = {
  ru: {
    session: "Сессия",
    results: "Результаты",
    add: "Добавить",
    deleteAll: "Удалить всех",
    participantNamePh: "Имя участника",
    ok: "Ок",
    cancel: "Отмена",
    emptyHint: "Добавьте участников (до 10), затем нажмите «Старт».",
    start: "Старт",
    reset: "Сброс",
    stop: "Стоп",
    delete: "Удалить",
    listEmpty: "Список пуст.",
  },
  en: {
    session: "Session",
    results: "Results",
    add: "Add",
    deleteAll: "Delete all",
    participantNamePh: "Participant name",
    ok: "OK",
    cancel: "Cancel",
    emptyHint: "Add participants (up to 10), then press “Start”.",
    start: "Start",
    reset: "Reset",
    stop: "Stop",
    delete: "Delete",
    listEmpty: "List is empty.",
  },
  kk: {
    session: "Сеанс",
    results: "Нәтижелер",
    add: "Қосу",
    deleteAll: "Барлығын жою",
    participantNamePh: "Қатысушының аты",
    ok: "Жарайды",
    cancel: "Бас тарту",
    emptyHint: "Қатысушыларды (10-ға дейін) қосып, «Бастау» басыңыз.",
    start: "Бастау",
    reset: "Қалпына келтіру",
    stop: "Тоқтату",
    delete: "Жою",
    listEmpty: "Тізім бос.",
  },
};

/** Модель */
type Participant = {
  id: string;
  name: string;
  running: boolean;
  startedAtMs: number | null;
  offsetSec: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function secToMMSS(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${pad2(m)}:${pad2(r)}`;
}

export default function GroupSTA() {
  const navigation = useNavigation();

  /** Язык */
  const [lang, setLang] = useState<Lang>("ru");
  const t = STRINGS[lang];
  const [langOpen, setLangOpen] = useState(false);

  /** Участники */
  const [list, setList] = useState<Participant[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  /** Сессия (глобальный таймер) */
  const [sessionRunning, setSessionRunning] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const sessionStartedAt = useRef<number | null>(null);

  /** Каждую минуту — вибрация */
  const nextBuzzAtSec = useRef<number>(60);

  /** Тики для обновления */
  const tickIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  /** Модалка результатов */
  const [resultsOpen, setResultsOpen] = useState(false);

  const someoneRunning = useMemo(() => list.some((p) => p.running), [list]);

  /** HeaderRight — селектор языка */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => setLangOpen(true)}
          style={{ paddingHorizontal: 12, paddingVertical: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Language selector"
        >
          <Text style={{ fontWeight: "800", color: "#111827" }}>{lang.toUpperCase()}</Text>
        </Pressable>
      ),
    });
  }, [navigation, lang]);

  /** Запуск/останов интервала тиков */
  useEffect(() => {
    if (someoneRunning || sessionRunning) {
      if (!tickIdRef.current) {
        tickIdRef.current = setInterval(() => setNowMs(Date.now()), 250);
      }
    } else {
      if (tickIdRef.current) {
        clearInterval(tickIdRef.current);
        tickIdRef.current = null;
      }
    }
    return () => {
      if (tickIdRef.current) {
        clearInterval(tickIdRef.current);
        tickIdRef.current = null;
      }
    };
  }, [someoneRunning, sessionRunning]);

  /** Глобальный таймер */
  useEffect(() => {
    if (!sessionRunning || !sessionStartedAt.current) return;
    const elapsed = (nowMs - sessionStartedAt.current) / 1000;
    setSessionElapsed(elapsed);
  }, [nowMs, sessionRunning]);

  /** Вибрация каждую минуту (1:00, 2:00, ...) */
  useEffect(() => {
    if (!sessionRunning) {
      nextBuzzAtSec.current = 60;
      return;
    }
    if (sessionElapsed >= nextBuzzAtSec.current) {
      // Короткая вибрация ~200ms
      Vibration.vibrate(200);
      nextBuzzAtSec.current += 60;
    }
  }, [sessionElapsed, sessionRunning]);

  /** Если остановили последнего, останавливаем сессию */
  useEffect(() => {
    if (!someoneRunning && sessionRunning) {
      handleStopAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [someoneRunning]);

  /** Добавить участника (кнопка) */
  const onAddTrainee = () => {
    if (sessionRunning) return;
    if (list.length >= 10) return;
    setAdding(true);
    setNewName("");
  };

  /** Подтвердить добавление */
  const confirmAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const p: Participant = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      running: false,
      startedAtMs: null,
      offsetSec: 0,
    };
    setList((prev) => [...prev, p]);
    setAdding(false);
    setNewName("");
    Keyboard.dismiss();
  };

  /** Удалить одного (кнопка на карточке, скрыта во время сессии) */
  const removeParticipant = (id: string) => {
    if (sessionRunning) return;
    setList((prev) => prev.filter((p) => p.id !== id));
  };

  /** Удалить всех (рядом с Добавить) */
  const removeAll = () => {
    if (sessionRunning) return;
    setList([]);
  };

  /** Старт всем */
  const handleStartAll = () => {
    if (list.length === 0) return;
    const startedAt = Date.now();
    sessionStartedAt.current = startedAt;
    setSessionElapsed(0);
    nextBuzzAtSec.current = 60; // первая вибрация на 1:00
    setSessionRunning(true);

    setList((prev) => prev.map((p) => (p.running ? p : { ...p, running: true, startedAtMs: startedAt })));
  };

  /** Стоп всем (не сбрасывает) */
  const handleStopAll = () => {
    setSessionRunning(false);
    sessionStartedAt.current = null;
    nextBuzzAtSec.current = 60;

    setList((prev) =>
      prev.map((p) => {
        if (!p.running || p.startedAtMs === null) return p;
        const elapsed = (Date.now() - p.startedAtMs) / 1000;
        return {
          ...p,
          running: false,
          startedAtMs: null,
          offsetSec: p.offsetSec + elapsed,
        };
      })
    );
  };

  /** Сброс всем */
  const handleResetAll = () => {
    setSessionRunning(false);
    sessionStartedAt.current = null;
    setSessionElapsed(0);
    nextBuzzAtSec.current = 60;
    setList((prev) =>
      prev.map((p) => ({
        ...p,
        running: false,
        startedAtMs: null,
        offsetSec: 0,
      }))
    );
  };

  /** Стоп одному (кнопка справа в ряду таймера) */
  const handleStopOne = (id: string) => {
    setList((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (!p.running || p.startedAtMs === null) return p;
        const elapsed = (Date.now() - p.startedAtMs) / 1000;
        return {
          ...p,
          running: false,
          startedAtMs: null,
          offsetSec: p.offsetSec + elapsed,
        };
      })
    );
  };

  /** ±1с участнику */
  const nudge = (id: string, delta: number) => {
    setList((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.running && p.startedAtMs !== null) {
          const elapsed = (Date.now() - p.startedAtMs) / 1000;
          const nextOffset = Math.max(0, p.offsetSec + elapsed + delta);
          return {
            ...p,
            offsetSec: nextOffset,
            startedAtMs: Date.now(),
          };
        }
        const nextOffset = Math.max(0, p.offsetSec + delta);
        return { ...p, offsetSec: nextOffset };
      })
    );
  };

  /** Текущее значение участника */
  const getParticipantSeconds = (p: Participant) => {
    if (!p.running || p.startedAtMs === null) return Math.floor(p.offsetSec);
    const elapsed = (nowMs - p.startedAtMs) / 1000;
    return Math.max(0, Math.floor(p.offsetSec + elapsed));
  };

  /** Можно ли «Сбросить всех» (когда никто не бежит и есть ненулевые значения) */
  const canResetAll = useMemo(
    () => !someoneRunning && list.some((p) => Math.floor(p.offsetSec) > 0),
    [list, someoneRunning]
  );

  /** Результаты для модалки (считаем на лету) */
  const results = useMemo(
    () =>
      list.map((p) => ({
        id: p.id,
        name: p.name,
        value: getParticipantSeconds(p),
      })),
    [list, nowMs]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: 8 }}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        {/* Таймер сессии */}
        <View style={styles.sessionPill}>
          <Feather name="clock" size={14} color="#111827" />
          <Text style={styles.sessionPillText}>
            {t.session}: {secToMMSS(sessionElapsed)}
          </Text>
        </View>

        {/* Результаты */}
        <Pressable style={[styles.btnToolbar, styles.btnGhost]} onPress={() => setResultsOpen(true)}>
          <Feather name="list" size={16} color="#111827" />
          <Text style={{ fontWeight: "800", color: "#111827" }}>{t.results}</Text>
        </Pressable>
      </View>

      {/* Добавить */}
      {!sessionRunning && (
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.btnPrimary, styles.btnToolbar, adding || list.length >= 10 ? styles.btnDisabled : null]}
            disabled={adding || list.length >= 10}
            onPress={onAddTrainee}
          >
            <Entypo name="plus" size={20} color="white" />
            <Text style={styles.btnText}>{t.add}</Text>
            <Text style={styles.badge}>{list.length}/10</Text>
          </Pressable>

          <Pressable
            style={[styles.btnDanger, styles.btnToolbar, list.length === 0 ? styles.btnDisabled : null]}
            disabled={list.length === 0}
            onPress={removeAll}
          >
            <Feather name="trash-2" size={18} color="white" />
            <Text style={styles.btnText}>{t.deleteAll}</Text>
          </Pressable>
        </View>
      )}

      {/* Ввод имени */}
      {adding && !sessionRunning && (
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder={t.participantNamePh}
            value={newName}
            onChangeText={setNewName}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={confirmAdd}
          />
          <Pressable style={[styles.btn, styles.btnPrimary, styles.btnSm]} onPress={confirmAdd}>
            <Text style={styles.btnText}>{t.ok}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnDanger, styles.btnSm]}
            onPress={() => {
              setAdding(false);
              setNewName("");
            }}
          >
            <Text style={styles.btnText}>{t.cancel}</Text>
          </Pressable>
        </View>
      )}

      {/* Список участников */}
      <ScrollView contentContainerStyle={styles.list}>
        {list.map((p) => {
          const value = getParticipantSeconds(p);
          return (
            <View key={p.id} style={styles.card}>
              {/* Верх строки: имя + статус */}
              <View style={styles.cardTop}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={[styles.statusDot, { backgroundColor: p.running ? "#22c55e" : "#9ca3af" }]} />
                  <Text style={styles.cardName}>{p.name}</Text>
                </View>
              </View>

              {/* Один ряд: [-] [время] [+] [Стоп] [Удалить] */}
              <View style={styles.timerRow}>
                <Pressable style={[styles.smallBtn, styles.btnGhost]} onPress={() => nudge(p.id, -1)}>
                  <Feather name="minus" size={16} color="#111827" />
                </Pressable>

                <Text style={styles.timerText}>{secToMMSS(value)}</Text>

                <Pressable style={[styles.smallBtn, styles.btnGhost]} onPress={() => nudge(p.id, +1)}>
                  <Feather name="plus" size={16} color="#111827" />
                </Pressable>

                <Pressable
                  style={[styles.smallBtn, p.running ? styles.btnDanger : styles.btnDisabledGhost]}
                  onPress={() => p.running && handleStopOne(p.id)}
                >
                  <Text style={styles.btnText}>{t.stop}</Text>
                </Pressable>

                {!sessionRunning && (
                  <Pressable style={[styles.smallBtn, styles.btnDangerLight]} onPress={() => removeParticipant(p.id)}>
                    <Feather name="trash-2" size={16} color="#fff" />
                    <Text style={[styles.btnText, { fontSize: 12 }]}>{t.delete}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {list.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t.emptyHint}</Text>
          </View>
        )}
      </ScrollView>

      {/* Нижняя панель */}
      <View style={styles.controlsBar}>
        {!sessionRunning ? (
          <>
            <Pressable
              style={[styles.btn, styles.btnPrimary, list.length === 0 ? styles.btnDisabled : null]}
              disabled={list.length === 0}
              onPress={handleStartAll}
            >
              <Text style={styles.btnText}>{t.start}</Text>
            </Pressable>

            {canResetAll ? (
              <Pressable style={[styles.btn, styles.btnWarn]} onPress={handleResetAll}>
                <Text style={styles.btnText}>{t.reset}</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.btn, styles.btnGhost, styles.btnDisabled]} disabled>
                <Text style={[styles.btnText, { color: "#6b7280" }]}>{t.reset}</Text>
              </Pressable>
            )}
          </>
        ) : (
          <Pressable style={[styles.btn, styles.btnDanger]} onPress={handleStopAll}>
            <Text style={styles.btnText}>{t.stop}</Text>
          </Pressable>
        )}
      </View>

      {/* Модалка результатов */}
      <Modal visible={resultsOpen} transparent animationType="slide" onRequestClose={() => setResultsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.results}</Text>
              <Pressable style={[styles.smallBtn, styles.btnGhost]} onPress={() => setResultsOpen(false)}>
                <Feather name="x" size={18} color="#111827" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 6, gap: 8 }}>
              {results.length === 0 ? (
                <Text style={{ color: "#6b7280" }}>{t.listEmpty}</Text>
              ) : (
                results.map((r) => (
                  <View key={r.id} style={styles.resultRow}>
                    <Text style={styles.resultName}>{r.name}</Text>
                    <Text style={styles.resultTime}>{secToMMSS(r.value)}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={{ marginTop: 12, alignItems: "flex-end" }}>
              <Pressable
                style={[styles.btn, styles.btnPrimary, styles.btnSm, styles.modalOKbtn]}
                onPress={() => setResultsOpen(false)}
              >
                <Text style={styles.btnText}>{t.ok}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка выбора языка */}
      <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
        <View style={styles.langBackdrop}>
          <View style={styles.langCard}>
            <Text style={styles.langTitle}>Language / Язык / Тіл</Text>
            <View style={{ gap: 8 }}>
              {(["ru", "en", "kk"] as Lang[]).map((l) => (
                <Pressable
                  key={l}
                  style={[styles.langBtn, l === lang ? { backgroundColor: "#e5e7eb", borderColor: "#d1d5db" } : null]}
                  onPress={() => {
                    setLang(l);
                    setLangOpen(false);
                  }}
                >
                  <Text style={{ fontWeight: "800", color: "#111827" }}>{l.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.btn, styles.btnGhost, styles.btnSm, { marginTop: 10 }]}
              onPress={() => setLangOpen(false)}
            >
              <Text style={{ fontWeight: "800", color: "#111827" }}>{t.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* Стили */
const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 30,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 10,
  },

  sessionPillText: { fontSize: 14, fontWeight: "800", color: "#111827" },
  btnToolbar: {
    width: 160,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  sessionPill: {
    width: 160,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    backgroundColor: "#f3f4f6",
  },

  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    fontSize: 16,
  },

  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 10,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    justifyContent: "space-between",
  },
  cardName: { fontSize: 16, fontWeight: "800", color: "#111827" },
  statusDot: {
    marginLeft: 8,
    marginRight: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  timerRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timerText: { fontSize: 28, fontWeight: "900", letterSpacing: 1, minWidth: 90, textAlign: "center" },

  smallBtn: {
    borderRadius: 12,
    height: 40,
    minWidth: 44,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },

  emptyBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    alignItems: "center",
  },
  emptyText: { color: "#6b7280", fontSize: 14 },

  controlsBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#ffffff",
    padding: 16,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },

  btn: {
    borderRadius: 12,
    minWidth: 120,
    height: 48,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  btnSm: { minWidth: 90, height: 40 },
  btnText: { fontWeight: "800", color: "white" },

  btnPrimary: { backgroundColor: "#0ea5e9" },
  btnWarn: { backgroundColor: "#f7c673ff" },
  btnDanger: { backgroundColor: "#ef4444" },
  btnGhost: { backgroundColor: "#f3f4f6" },
  btnDangerLight: { backgroundColor: "#f87171" },
  btnDisabled: { opacity: 0.5 },
  btnDisabledGhost: { backgroundColor: "#e5e7eb", opacity: 0.7 },

  badge: {
    marginLeft: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontWeight: "800",
    color: "white",
    fontSize: 12,
  },

  /* Модалка результатов */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "70%",
    gap: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#111827", flex: 1 },
  modalOKbtn: {
    marginBottom: 20,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  resultName: { fontWeight: "700", color: "#111827" },
  resultTime: { fontWeight: "900", color: "#111827", letterSpacing: 0.5 },

  /* Модалка выбора языка */
  langBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  langCard: {
    width: "90%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
  },
  langTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 10 },
  langBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
  },
});
