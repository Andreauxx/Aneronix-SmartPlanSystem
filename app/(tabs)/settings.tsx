import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSoilData } from "@/context/SoilDataContext";
import { useTheme } from "@/hooks/useTheme";

function SettingRow({
  label,
  hint,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  colors,
  isDark,
}: {
  label: string;
  hint: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  colors: Record<string, string>;
  isDark: boolean;
}) {
  return (
    <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.settingLabel, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
        {label}
      </Text>
      <Text style={[styles.settingHint, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
        {hint}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: isDark ? colors.surfaceElevated : colors.background,
            borderColor: colors.border,
            fontFamily: "Inter_400Regular",
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    weatherApiKey,
    setWeatherApiKey,
    firebaseUrl,
    setFirebaseUrl,
    refreshSoil,
    refreshWeather,
  } = useSoilData();

  const [localFirebaseUrl, setLocalFirebaseUrl] = useState(firebaseUrl);
  const [localApiKey, setLocalApiKey] = useState(weatherApiKey);
  const [saved, setSaved] = useState(false);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setFirebaseUrl(localFirebaseUrl.trim());
    await setWeatherApiKey(localApiKey.trim());
    refreshSoil();
    refreshWeather();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            Settings
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Configure your data sources
          </Text>
        </View>

        {/* Firebase Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={16} color="#FF6D00" />
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
              Firebase Realtime Database
            </Text>
          </View>
          <SettingRow
            label="Database URL"
            hint="Your Firebase Realtime DB root URL (e.g. https://project.firebaseio.com)"
            value={localFirebaseUrl}
            onChangeText={setLocalFirebaseUrl}
            placeholder="https://your-project.firebaseio.com"
            colors={colors}
            isDark={isDark}
          />
          <View style={[styles.infoBox, { backgroundColor: colors.cardMoisture ?? colors.surface }]}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              The app reads{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>
                soil_moisture
              </Text>{" "}
              (integer 0–100) and{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>
                water_flow
              </Text>{" "}
              (float, liters) from your database root.
            </Text>
          </View>
        </View>

        {/* OpenWeatherMap Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="partly-sunny" size={16} color="#E9C46A" />
            <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
              OpenWeatherMap API
            </Text>
          </View>
          <SettingRow
            label="API Key"
            hint="Get a free key at openweathermap.org/api"
            value={localApiKey}
            onChangeText={setLocalApiKey}
            placeholder="Your API key"
            secureTextEntry={false}
            colors={colors}
            isDark={isDark}
          />
          <View style={[styles.infoBox, { backgroundColor: colors.cardWeather ?? colors.surface }]}>
            <Feather name="map-pin" size={14} color={colors.warning} />
            <Text style={[styles.infoText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Weather is fetched for{" "}
              <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>
                Davao City, Philippines
              </Text>
              . Data refreshes every 60 seconds.
            </Text>
          </View>
        </View>

        {/* Smart Logic Section */}
        <View style={[styles.smartSection, { backgroundColor: colors.cardAlert ?? colors.surface, borderColor: colors.danger + "40" }]}>
          <Ionicons name="bulb" size={20} color={colors.danger} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.smartTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
              Smart Watering Logic
            </Text>
            <Text style={[styles.smartText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              A{" "}
              <Text style={{ color: colors.danger, fontFamily: "Inter_600SemiBold" }}>
                "Watering Paused: Rain Expected"
              </Text>{" "}
              alert appears on the dashboard when soil moisture drops below 40% AND
              OpenWeatherMap reports Rain, Drizzle, or Thunderstorm conditions.
            </Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: saved ? colors.primaryLight : colors.primary },
          ]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          {saved ? (
            <Ionicons name="checkmark" size={20} color="#fff" />
          ) : (
            <Feather name="save" size={18} color="#fff" />
          )}
          <Text style={[styles.saveBtnText, { fontFamily: "Inter_700Bold" }]}>
            {saved ? "Saved!" : "Save & Connect"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  header: { gap: 4 },
  title: { fontSize: 30 },
  subtitle: { fontSize: 14 },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: { fontSize: 16 },
  settingRow: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
  },
  settingLabel: { fontSize: 14 },
  settingHint: { fontSize: 12, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  smartSection: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  smartTitle: { fontSize: 14, marginBottom: 4 },
  smartText: { fontSize: 13, lineHeight: 19 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
  },
});
