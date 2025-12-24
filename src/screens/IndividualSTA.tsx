import { Entypo, Feather, FontAwesome } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import {
  Alert,
  AppState,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useLanguage } from "../i18n/LanguageContext";
import { STRINGS, LANG_LABEL, SUPPORTED_LANGS } from "../i18n/strings";
import { addHistoryEntry, loadHistory } from "../history/historyStore";
import { loadIndividualState, saveIndividualState, IndividualParticipant } from "../storage/individualStore";
import type { RootStackParamList } from "../../App";
import { useThemeMode } from "../theme/ThemeContext";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function secToMMSS(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${pad2(m)}:${pad2(r)}`;
}

export default function IndividualSTA() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { lang, setLang } = useLanguage();
  const t = STRINGS[lang];
  const tEn = STRINGS.en;
  const getText = (key: string) => t[key] ?? tEn[key] ?? key;
  const { isDark, toggleTheme } = useThemeMode();
  const colors = useMemo(
    () => ({
      bg: isDark ? "#0b0f19" : "#ffffff",
      card: isDark ? "#111827" : "#ffffff",
      text: isDark ? "#f9fafb" : "#111827",
      muted: isDark ? "#9ca3af" : "#6b7280",
      ghost: isDark ? "#1f2937" : "#f3f4f6",
      list: isDark ? "#0f172a" : "#f9fafb",
      border: isDark ? "#374151" : "#e5e7eb",
    }),
    [isDark]
  );
  const [langOpen, setLangOpen] = useState(false);

  const [list, setList] = useState<IndividualParticipant[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const [resultsOpen, setResultsOpen] = useState(false);
  const [nowMs, setNowMs] = useState<number>(Date.now());
  const tickIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastStoppedAtMs, setLastStoppedAtMs] = useState<number | null>(null);

  const someoneRunning = useMemo(() => list.some((p) => p.running), [list]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            onPress={toggleTheme}
            style={{ paddingHorizontal: 8, paddingVertical: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Toggle theme"
          >
            <Feather name={isDark ? "sun" : "moon"} size={18} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => setLangOpen(true)}
            style={{ paddingHorizontal: 8, paddingVertical: 6 }}
            accessibilityRole="button"
            accessibilityLabel="Language selector"
          >
            <Text style={{ fontWeight: "800", color: colors.text }}>{LANG_LABEL[lang]}</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, lang, colors.text, isDark, toggleTheme]);

  useEffect(() => {
    const load = async () => {
      const stored = await loadIndividualState();
      setList(stored.list ?? []);
      setLastStoppedAtMs(stored.lastStoppedAtMs ?? null);
    };
    void load();
  }, []);

  useEffect(() => {
    if (someoneRunning) {
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
  }, [someoneRunning]);

  const getParticipantSeconds = (p: IndividualParticipant) => {
    if (!p.running || p.startedAtMs === null) return Math.floor(p.offsetSec);
    const elapsed = (nowMs - p.startedAtMs) / 1000;
    return Math.max(0, Math.floor(p.offsetSec + elapsed));
  };

  const snapshotList = useCallback(
    (atMs: number) =>
      list.map((p) => {
        if (!p.running || p.startedAtMs === null) {
          return { ...p, running: false, startedAtMs: null, offsetSec: p.offsetSec };
        }
        const elapsed = (atMs - p.startedAtMs) / 1000;
        return {
          ...p,
          running: false,
          startedAtMs: null,
          offsetSec: Math.max(0, p.offsetSec + elapsed),
        };
      }),
    [list]
  );

  useEffect(() => {
    const persist = async () => {
      const atMs = Date.now();
      await saveIndividualState({ list: snapshotList(atMs), lastStoppedAtMs });
    };
    void persist();
  }, [snapshotList, lastStoppedAtMs, list]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        const atMs = Date.now();
        void saveIndividualState({ list: snapshotList(atMs), lastStoppedAtMs });
      }
    });
    return () => sub.remove();
  }, [snapshotList, lastStoppedAtMs]);

  const onAddTrainee = () => {
    if (list.length >= 10) return;
    setAdding(true);
    setNewName("");
  };

  const confirmAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const p: IndividualParticipant = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      running: false,
      startedAtMs: null,
      offsetSec: 0,
    };
    setList((prev) => [...prev, p]);
    setAdding(false);
    setNewName("");
  };

  const removeParticipant = (id: string) => {
    const target = list.find((p) => p.id === id);
    if (target?.running) return;
    setList((prev) => prev.filter((p) => p.id !== id));
  };

  const removeAll = () => {
    if (someoneRunning) return;
    setList([]);
  };

  const handleStartOne = (id: string) => {
    setList((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.running) return p;
        return {
          ...p,
          running: true,
          startedAtMs: Date.now(),
        };
      })
    );
  };

  const handleStopOne = (id: string) => {
    const endedAt = Date.now();
    setLastStoppedAtMs(endedAt);
    setList((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (!p.running || p.startedAtMs === null) return p;
        const elapsed = (endedAt - p.startedAtMs) / 1000;
        return {
          ...p,
          running: false,
          startedAtMs: null,
          offsetSec: p.offsetSec + elapsed,
        };
      })
    );
  };

  const results = useMemo(
    () =>
      list.map((p) => ({
        id: p.id,
        name: p.name,
        value: getParticipantSeconds(p),
      })),
    [list, nowMs]
  );

  const handleSaveHistory = async () => {
    if (results.length === 0) {
      Alert.alert(getText("historyNoDataTitle"), getText("historyNoDataBody"));
      return;
    }
    if (someoneRunning) return;
    if (!lastStoppedAtMs) {
      Alert.alert(getText("historyNoSessionTitle"), getText("historyNoSessionBody"));
      return;
    }
    const endedAtSec = Math.floor(lastStoppedAtMs / 1000);
    const history = await loadHistory();
    const hasSameTimestamp = history.some((entry) => {
      const entrySec = Math.floor(new Date(entry.dateIso).getTime() / 1000);
      return entrySec === endedAtSec;
    });
    if (hasSameTimestamp) {
      Alert.alert(getText("historyAlreadySavedTitle"), getText("historyAlreadySavedBody"));
      return;
    }
    await addHistoryEntry({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      dateIso: new Date(lastStoppedAtMs).toISOString(),
      items: results.map((r) => ({ name: r.name, seconds: r.value })),
    });
    Alert.alert(getText("historySavedTitle"), getText("historySavedBody"));
  };

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dx > 80) {
            navigation.navigate("GroupSTA", { transition: "slide_from_left" });
          } else if (gesture.dx < -80) {
            navigation.navigate("GroupSTA", { transition: "slide_from_right" });
          }
        },
      }),
    [navigation]
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 8 }} {...swipeResponder.panHandlers}>
      <View style={styles.headerRow}>
        <Pressable
          style={[
            styles.btnToolbar,
            styles.btnGhost,
            { backgroundColor: colors.ghost },
            someoneRunning ? styles.btnDisabled : null,
          ]}
          onPress={() => setResultsOpen(true)}
          disabled={someoneRunning}
        >
          <Feather name="list" size={16} color={colors.text} />
          <Text style={{ fontWeight: "800", color: colors.text }}>{t.results}</Text>
        </Pressable>
      </View>

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
          style={[styles.btnDanger, styles.btnToolbar, list.length === 0 || someoneRunning ? styles.btnDisabled : null]}
          disabled={list.length === 0 || someoneRunning}
          onPress={removeAll}
        >
          <Feather name="trash-2" size={18} color="white" />
          <Text style={styles.btnText}>{t.deleteAll}</Text>
        </Pressable>
      </View>

      {adding && (
        <View style={styles.addRow}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder={t.participantNamePh}
            placeholderTextColor={colors.muted}
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

      <ScrollView contentContainerStyle={styles.list}>
        {list.map((p) => {
          const value = getParticipantSeconds(p);
          return (
            <View key={p.id} style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.cardTop}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={[styles.statusDot, { backgroundColor: p.running ? "#22c55e" : "#9ca3af" }]} />
                  <Text style={[styles.cardName, { color: colors.text }]}>{p.name}</Text>
                </View>
              </View>

              <View style={styles.timerRow}>
                <Pressable
                  style={[styles.smallBtn, p.running ? styles.btnDanger : styles.btnPrimary]}
                  onPress={() => (p.running ? handleStopOne(p.id) : handleStartOne(p.id))}
                >
                  <Text style={styles.btnText}>{p.running ? t.stop : t.start}</Text>
                </Pressable>

                <Text style={[styles.timerText, { color: colors.text }]}>{secToMMSS(value)}</Text>

                <Pressable
                  style={[styles.smallBtn, styles.btnDangerLight, p.running ? styles.btnDisabled : null]}
                  onPress={() => removeParticipant(p.id)}
                  disabled={p.running}
                >
                  <Feather name="trash-2" size={16} color="#fff" />
                  <Text style={[styles.btnText, { fontSize: 12 }]}>{t.delete}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {list.length === 0 && (
          <View style={[styles.emptyBox, { backgroundColor: colors.list }]}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>{t.emptyHint}</Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={resultsOpen} transparent animationType="slide" onRequestClose={() => setResultsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t.results}</Text>
              <Pressable style={[styles.smallBtn, styles.btnGhost, { backgroundColor: colors.ghost }]} onPress={() => setResultsOpen(false)}>
                <Feather name="x" size={18} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.historyRow}>
              <Pressable
                style={[styles.iconBtn, styles.btnGhost, { backgroundColor: colors.ghost }]}
                onPress={() => navigation.navigate("History")}
                accessibilityRole="button"
                accessibilityLabel="History"
              >
                <FontAwesome name="history" size={24} color={colors.text} />
              </Pressable>
              <Pressable style={[styles.btn, styles.btnPrimary, styles.historySaveBtn]} onPress={handleSaveHistory}>
                <Text style={styles.btnText}>{getText("historySave")}</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 6, gap: 8 }}>
              {results.length === 0 ? (
                <Text style={{ color: colors.muted }}>{t.listEmpty}</Text>
              ) : (
                results.map((r) => (
                  <View key={r.id} style={[styles.resultRow, { backgroundColor: colors.list }]}>
                    <Text style={[styles.resultName, { color: colors.text }]}>{r.name}</Text>
                    <Text style={[styles.resultTime, { color: colors.text }]}>{secToMMSS(r.value)}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
        <View style={styles.langBackdrop}>
          <View style={[styles.langCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.langTitle, { color: colors.text }]}>Language</Text>
            <View style={{ gap: 8 }}>
              {SUPPORTED_LANGS.map((l) => (
                <Pressable
                  key={l}
                  style={[
                    styles.langBtn,
                    { borderColor: colors.border },
                    l === lang ? { backgroundColor: colors.ghost, borderColor: colors.border } : null,
                  ]}
                  onPress={() => {
                    setLang(l);
                    setLangOpen(false);
                  }}
                >
                  <Text style={{ fontWeight: "800", color: colors.text }}>{LANG_LABEL[l]}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.btn, styles.btnGhost, styles.btnSm, { marginTop: 10, backgroundColor: colors.ghost }]}
              onPress={() => setLangOpen(false)}
            >
              <Text style={{ fontWeight: "800", color: colors.text }}>{t.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 10,
  },

  btnToolbar: {
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    flexGrow: 1,
    flexBasis: "48%",
    minWidth: 140,
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: "0px 2px 8px rgba(0,0,0,0.05)",
      },
    }),
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
    flexWrap: "wrap",
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
  btnDanger: { backgroundColor: "#ef4444" },
  btnGhost: { backgroundColor: "#f3f4f6" },
  btnDangerLight: { backgroundColor: "#f87171" },
  btnDisabled: { opacity: 0.5 },

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
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  historySaveBtn: {
    flexGrow: 1,
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
