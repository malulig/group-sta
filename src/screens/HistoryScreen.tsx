import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { clearHistory, loadHistory, HistoryEntry, removeHistoryEntry } from "../history/historyStore";
import { useLanguage } from "../i18n/LanguageContext";
import { STRINGS } from "../i18n/strings";

export default function HistoryScreen({ navigation }: { navigation: any }) {
  const { lang } = useLanguage();
  const t = STRINGS[lang];
  const tEn = STRINGS.en;
  const getText = (key: string) => t[key] ?? tEn[key] ?? key;

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await loadHistory();
    setHistory(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onClear = useCallback(() => {
    Alert.alert(getText("historyClearConfirmTitle"), getText("historyClearConfirmBody"), [
      { text: getText("historyCancelAction"), style: "cancel" },
      {
        text: getText("historyClearAction"),
        style: "destructive",
        onPress: async () => {
          await clearHistory();
          setHistory([]);
        },
      },
    ]);
  }, [getText]);

  const onRemoveOne = useCallback(
    (id: string) => {
      Alert.alert(getText("historyDeleteConfirmTitle"), getText("historyDeleteConfirmBody"), [
        { text: getText("historyCancelAction"), style: "cancel" },
        {
          text: getText("historyDeleteAction"),
          style: "destructive",
          onPress: async () => {
            await removeHistoryEntry(id);
            setHistory((prev) => prev.filter((entry) => entry.id !== id));
          },
        },
      ]);
    },
    [getText]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{getText("historyTitle")}</Text>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Feather name="x" size={20} color="#111827" />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.btn, styles.btnDanger]} onPress={onClear}>
          <Text style={styles.btnText}>{getText("historyClear")}</Text>
        </Pressable>
      </View>

      {loading && <Text style={styles.noteText}>{getText("historyLoading")}</Text>}

      {!loading && history.length === 0 && <Text style={styles.noteText}>{getText("historyEmpty")}</Text>}

      {!loading &&
        history.map((entry) => (
          <View key={entry.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{new Date(entry.dateIso).toLocaleString()}</Text>
              <Pressable style={styles.iconBtn} onPress={() => onRemoveOne(entry.id)}>
                <Feather name="trash-2" size={18} color="#111827" />
              </Pressable>
            </View>
            <View style={styles.list}>
              {entry.items.map((item, idx) => (
                <View key={`${entry.id}_${idx}`} style={styles.row}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.time}>{secToMMSS(item.seconds)}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  actions: {
    marginBottom: 12,
  },
  btn: {
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  btnGhost: { backgroundColor: "#f3f4f6" },
  btnTextGhost: { fontWeight: "800", color: "#111827" },
  noteText: {
    color: "#6b7280",
    marginTop: 6,
  },
  card: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 12,
    marginBottom: 12,
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardTitle: {
    fontWeight: "800",
    color: "#111827",
  },
  btnDanger: { backgroundColor: "#ef4444" },
  btnText: { fontWeight: "800", color: "white" },
  list: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  name: { fontWeight: "700", color: "#111827" },
  time: { fontWeight: "900", color: "#111827" },
});

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function secToMMSS(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${pad2(m)}:${pad2(r)}`;
}
