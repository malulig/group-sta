import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Pressable } from "react-native";
import { FontAwesome, FontAwesome5 } from "@expo/vector-icons";

import GroupSTA from "./src/screens/GroupSTA";
import SupportScreen from "./src/screens/SupportScreen";
import { LanguageProvider } from "./src/i18n/LanguageContext";

export type RootStackParamList = {
  Home: undefined;
  GroupSTA: undefined;
  LogsSTA: undefined;
  Support: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <NavigationContainer>
          <SafeAreaView style={{ flex: 1 }}>
            <Stack.Navigator initialRouteName="GroupSTA">
              <Stack.Screen
                name="GroupSTA"
                component={GroupSTA}
                options={({ navigation }) => ({
                  title: "Group STA v1",
                  headerTitleAlign: "center",
                  headerLeft: () => (
                    <Pressable
                      onPress={() => navigation.navigate("Support")}
                      style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel="Support"
                      hitSlop={10}
                    >
                      <FontAwesome5 name="donate" size={20} color="black" />{" "}
                    </Pressable>
                  ),
                })}
              />

              <Stack.Screen
                name="Support"
                component={SupportScreen}
                options={{ title: "Support", headerTitleAlign: "center" }}
              />
            </Stack.Navigator>
          </SafeAreaView>
        </NavigationContainer>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
