import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import React, { useCallback } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertBanner } from "@/components/AlertBanner";
import { DataCard } from "@/components/DataCard";
import { MoistureGauge } from "@/components/MoistureGauge";
import { StatusDot } from "@/components/StatusDot";
import { useSoilData } from "@/context/SoilDataContext";
import { useTheme } from "@/hooks/useTheme";
import "../../firebaseConfig";

function formatTime(d: Date | null) {
  if (!d) return "Never";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getWeatherIcon(icon: string, condition: string, color: string) {
  const c = condition.toLowerCase();
  if (c.includes("rain") || c.includes("drizzle")) return <Ionicons name="rainy" size={36} color={color} />;
  if (c.includes("thunder")) return <Ionicons name="thunderstorm" size={36} color={color} />;
  if (c.includes("cloud")) return <Ionicons name="cloudy" size={36} color={color} />;
  if (c.includes("clear")) return <Ionicons name="sunny" size={36} color={color} />;
  if (c.includes("snow")) return <Ionicons name="snow" size={36} color={color} />;
  if (c.includes("mist") || c.includes("fog")) return <Ionicons name="water" size={36} color={color} />;
  return <Ionicons name="partly-sunny" size={36} color={color} />;
}

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    soil,
    weather,
    isLoadingSoil,
    isLoadingWeather,
    soilError,
    weatherError,
    refreshSoil,
    refreshWeather,
    weatherApiKey, // Removed firebaseUrl since Firebase is now automatic
  } = useSoilData();

  const isRefreshing = isLoadingSoil || isLoadingWeather;

  const onRefresh = useCallback(() => {
    refreshSoil();
    refreshWeather();
  }, [refreshSoil, refreshWeather]);

  const showAlert =
    soil.moisture < 40 && weather.isRaining && soil.lastUpdated !== null && weather.lastUpdated !== null;
  const isConnected = soil.lastUpdated !== null && !soilError;

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Smart Soil
          </Text>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            Dashboard
          </Text>
        </View>
        <View style={styles.statusRow}>
          <StatusDot active={isConnected} color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {isConnected ? "Live" : "Offline"}
          </Text>
        </View>
      </View>

      {/* Alert Banner */}
      <AlertBanner
        visible={showAlert}
        message="Watering Paused: Rain Expected — soil moisture is low but rain is incoming."
      />

      {/* Not configured notice - UPDATED */}
      {(!weatherApiKey) && (
        <View style={[styles.setupNotice, { backgroundColor: colors.cardWeather ?? colors.surface }]}>
          <Feather name="info" size={18} color={colors.warning} />
          <Text style={[styles.setupText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Configure your Weather API key in Settings to see live weather forecasts for Davao City.
          </Text>
        </View>
      )}

      {/* Soil Moisture Card */}
      <DataCard
        title="Soil Moisture"
        icon={<MaterialCommunityIcons name="water-percent" size={18} color={colors.primary} />}
        cardColor={isDark ? colors.cardMoisture : colors.cardMoisture}
        isLoading={isLoadingSoil && soil.lastUpdated === null}
        subtitle={soilError ? soilError : `Updated ${formatTime(soil.lastUpdated)}`}
      >
        <View style={styles.gaugeRow}>
          <MoistureGauge value={soil.moisture} size={150} />
          <View style={styles.soilStats}>
            <StatItem
              label="Moisture"
              value={`${soil.moisture}%`}
              color={colors.primary}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <StatItem
              label="Water Flow"
              value={`${soil.waterFlow.toFixed(2)} L`}
              color={colors.water}
              colors={colors}
            />
          </View>
        </View>
      </DataCard>

      {/* Water Usage Card */}
      <DataCard
        title="Total Water Used"
        icon={<Ionicons name="water" size={18} color={colors.water} />}
        cardColor={isDark ? colors.cardWater : colors.cardWater}
        isLoading={isLoadingSoil && soil.lastUpdated === null}
        subtitle={`Updated ${formatTime(soil.lastUpdated)}`}
      >
        <View style={styles.waterRow}>
          <Text style={[styles.waterValue, { color: colors.water, fontFamily: "Inter_700Bold" }]}>
            {soil.waterFlow.toFixed(2)}
          </Text>
          <Text style={[styles.waterUnit, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            Liters
          </Text>
        </View>
        <WaterBar value={soil.waterFlow} max={100} color={colors.water} trackColor={colors.border} />
      </DataCard>

      {/* Weather Card */}
      <DataCard
        title="Davao City Weather"
        icon={<Ionicons name="partly-sunny" size={18} color={colors.warning} />}
        cardColor={isDark ? colors.cardWeather : colors.cardWeather}
        isLoading={isLoadingWeather && weather.lastUpdated === null}
        subtitle={weatherError ? weatherError : `Updated ${formatTime(weather.lastUpdated)}`}
      >
        <View style={styles.weatherRow}>
          {getWeatherIcon(weather.icon, weather.condition, colors.warning)}
          <View style={styles.weatherInfo}>
            <Text style={[styles.weatherCondition, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
              {weather.condition || "—"}
            </Text>
            <Text style={[styles.weatherTemp, { color: colors.warning, fontFamily: "Inter_700Bold" }]}>
              {weather.temperature > 0 ? `${weather.temperature}°C` : "—"}
            </Text>
          </View>
          {weather.isRaining && (
            <View style={[styles.rainBadge, { backgroundColor: colors.danger + "22" }]}>
              <Text style={[styles.rainBadgeText, { color: colors.danger, fontFamily: "Inter_600SemiBold" }]}>
                Rain
              </Text>
            </View>
          )}
        </View>
      </DataCard>

      {/* Refresh button */}
      <TouchableOpacity
        style={[styles.refreshBtn, { backgroundColor: colors.primary + "18" }]}
        onPress={onRefresh}
        activeOpacity={0.7}
      >
        <Ionicons name="refresh" size={18} color={colors.primary} />
        <Text style={[styles.refreshText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
          Refresh Weather
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatItem({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: string;
  color: string;
  colors: Record<string, string>;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statLabel, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color, fontFamily: "Inter_700Bold" }]}>{value}</Text>
    </View>
  );
}

function WaterBar({
  value,
  max,
  color,
  trackColor,
}: {
  value: number;
  max: number;
  color: string;
  trackColor: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <View style={[styles.waterTrack, { backgroundColor: trackColor }]}>
      <View style={[styles.waterFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  greeting: { fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" },
  title: { fontSize: 30, marginTop: 2 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  statusText: { fontSize: 12 },
  setupNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    padding: 14,
  },
  setupText: { flex: 1, fontSize: 13, lineHeight: 18 },
  gaugeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  soilStats: { flex: 1, gap: 12 },
  divider: { height: 1 },
  statItem: { gap: 2 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 22 },
  waterRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  waterValue: { fontSize: 42 },
  waterUnit: { fontSize: 16 },
  waterTrack: { height: 6, borderRadius: 3, overflow: "hidden", marginTop: 8 },
  waterFill: { height: 6, borderRadius: 3 },
  weatherRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  weatherInfo: { flex: 1, gap: 2 },
  weatherCondition: { fontSize: 18 },
  weatherTemp: { fontSize: 32 },
  rainBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rainBadgeText: { fontSize: 13 },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  refreshText: { fontSize: 15 },
});