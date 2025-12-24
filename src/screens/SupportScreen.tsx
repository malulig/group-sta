import React, { useCallback } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View, Platform } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { STRINGS } from "../i18n/strings";
import { useLanguage } from "../i18n/LanguageContext";
import { useThemeMode } from "../theme/ThemeContext";

const SUPPORT_URL = process.env.EXPO_PUBLIC_SUPPORT_URL ?? "";
const CONTACT_URL = process.env.EXPO_PUBLIC_CONTACT_URL ?? "";

function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

async function openUrl(url: string) {
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    Alert.alert("Can't open link", url);
    return;
  }
  await Linking.openURL(url);
}

export default function SupportScreen() {
  const { lang } = useLanguage();
  const t = STRINGS[lang];
  const { isDark } = useThemeMode();
  const colors = {
    bg: isDark ? "#0b0f19" : "#ffffff",
    card: isDark ? "#111827" : "#ffffff",
    text: isDark ? "#f9fafb" : "#111827",
    muted: isDark ? "#9ca3af" : "#6b7280",
    ghost: isDark ? "#1f2937" : "#f3f4f6",
  };
  const onSupport = useCallback(async () => {
    if (!SUPPORT_URL || !isValidHttpUrl(SUPPORT_URL)) {
      Alert.alert("Support link is not set", "Set EXPO_PUBLIC_SUPPORT_URL in .env (e.g. https://paypal.me/yourname)");
      return;
    }
    await openUrl(SUPPORT_URL);
  }, []);

  const onContact = useCallback(async () => {
    if (!CONTACT_URL || !isValidHttpUrl(CONTACT_URL)) {
      Alert.alert("Contact link is not set", "Set EXPO_PUBLIC_CONTACT_URL in .env (e.g. https://t.me/yourusername)");
      return;
    }
    await openUrl(CONTACT_URL);
  }, []);

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t.HelpTitle}</Text>

        <Text style={[styles.bodyText, { color: colors.text }]}>{t.HelpBody0}</Text>
        <Text style={[styles.bodyText, { color: colors.text }]}>{t.HelpBody1}</Text>
        <Text style={[styles.bodyText, { color: colors.text }]}>{t.HelpBody2}</Text>

        <Text style={[styles.title, { color: colors.text }]}>{t.supportTitle}</Text>

        <Text style={[styles.bodyText, { color: colors.text }]}>{t.supportBody1}</Text>

        <Text style={[styles.bodyText, { color: colors.text }]}>{t.supportBody2}</Text>

        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onSupport}>
            <FontAwesome name="paypal" size={18} color="white" />
            <Text style={styles.btnText}>{t.supportPayPal}</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnGhost, { backgroundColor: colors.ghost }]} onPress={onContact}>
            <FontAwesome name="telegram" size={18} color={colors.text} />
            <Text style={[styles.btnText, { color: colors.text }]}>{t.supportContact}</Text>
          </Pressable>
        </View>

        <Text style={[styles.noteText, { color: colors.muted }]}>{t.supportNote}</Text>

        <Text style={[styles.noteText, { color: colors.muted }]}>{t.appIconNote}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 16,
    gap: 10,
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
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 22,
    color: "#111827",
  },
  actions: {
    gap: 10,
    marginTop: 6,
  },
  btn: {
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnPrimary: { backgroundColor: "#0ea5e9" },
  btnGhost: { backgroundColor: "#f3f4f6" },
  btnText: { fontWeight: "800", color: "white" },
  btnTextGhost: { color: "#111827" },
  noteText: {
    marginTop: 6,
    opacity: 0.75,
    lineHeight: 20,
    color: "#111827",
  },
});
