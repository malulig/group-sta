import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Pressable } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

import GroupSTA from "./src/screens/GroupSTA";
import SupportScreen from "./src/screens/SupportScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import IndividualSTA from "./src/screens/IndividualSTA";
import { LanguageProvider } from "./src/i18n/LanguageContext";
import { ThemeProvider, useThemeMode } from "./src/theme/ThemeContext";

export type RootStackParamList = {
  Home: undefined;
  GroupSTA: { transition?: "slide_from_left" | "slide_from_right" } | undefined;
  LogsSTA: undefined;
  Support: undefined;
  History: undefined;
  IndividualSTA: { transition?: "slide_from_left" | "slide_from_right" } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { isDark, toggleTheme } = useThemeMode();
  return (
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <SafeAreaView style={{ flex: 1 }}>
        <Stack.Navigator
          initialRouteName="GroupSTA"
          screenOptions={{
            headerStyle: { backgroundColor: isDark ? "#0b0f19" : "#ffffff" },
            headerTintColor: isDark ? "#f9fafb" : "#111827",
            headerRight: () => (
              <Pressable
                onPress={toggleTheme}
                style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                accessibilityRole="button"
                accessibilityLabel="Toggle theme"
                hitSlop={10}
              >
                <FontAwesome5 name={isDark ? "sun" : "moon"} size={18} color={isDark ? "#f9fafb" : "#111827"} />
              </Pressable>
            ),
          }}
        >
          <Stack.Screen
            name="GroupSTA"
            component={GroupSTA}
            options={({ navigation, route }) => ({
              title: "Group STA",
              headerTitleAlign: "center",
              animation: route.params?.transition ?? "slide_from_right",
              headerLeft: () => (
                <Pressable
                  onPress={() => navigation.navigate("Support")}
                  style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Support"
                  hitSlop={10}
                >
                  <FontAwesome5 name="question-circle" size={20} color={isDark ? "#f9fafb" : "#111827"} />
                </Pressable>
              ),
              headerRight: undefined,
            })}
          />
          <Stack.Screen
            name="IndividualSTA"
            component={IndividualSTA}
            options={({ navigation, route }) => ({
              title: "Individual STA",
              headerTitleAlign: "center",
              animation: route.params?.transition ?? "slide_from_right",
              headerLeft: () => (
                <Pressable
                  onPress={() => navigation.navigate("Support")}
                  style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Support"
                  hitSlop={10}
                >
                  <FontAwesome5 name="question-circle" size={20} color={isDark ? "#f9fafb" : "#111827"} />
                </Pressable>
              ),
              headerRight: undefined,
            })}
          />
          <Stack.Screen
            name="Support"
            component={SupportScreen}
            options={{ title: "Support", headerTitleAlign: "center" }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{ title: "History", headerTitleAlign: "center" }}
          />
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AppNavigator />
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
