import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
  Animated,
  Easing
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertBanner } from "@/components/AlertBanner";
import { DataCard } from "@/components/DataCard";
import { MoistureGauge } from "@/components/MoistureGauge";
import { StatusDot } from "@/components/StatusDot";
import { useSoilData } from "@/context/SoilDataContext";
import { useTheme } from "@/hooks/useTheme";
import { ref, onValue, update } from "firebase/database";
import { db } from "../../firebaseConfig";


function getWeatherIcon(condition: string, color: string, size = 32) {
  // Safe check to handle undefined or null conditions
  const c = (condition || "").toLowerCase();

  if (c.includes("rain") || c.includes("drizzle")) {
    return <Ionicons name="rainy" size={size} color={color} />;
  }
  
  if (c.includes("cloud") || c.includes("overcast")) {
    return <Ionicons name="cloudy" size={size} color={color} />;
  }

  if (c.includes("thunder") || c.includes("storm")) {
    return <Ionicons name="thunderstorm" size={size} color={color} />;
  }

  if (c.includes("clear") || c.includes("sun")) {
    return <Ionicons name="sunny" size={size} color={color} />;
  }

  // Final fallback (The "Default" icon) to prevent the "red" error
  return <Ionicons name="partly-sunny" size={size} color={color} />;
}

// Simple Sparkline component for Moisture Trend
function MoistureTrend({ data, color }: { data: number[], color: string }) {
  if (data.length < 2) return null;
  const max = 100;
  const width = 160;
  const height = 40;
  const step = width / (data.length - 1);
  
  return (
    <View style={{ width, height, justifyContent: 'flex-end', marginTop: 10 }}>
      <View style={styles.trendContainer}>
        {data.map((val, i) => (
          <View 
            key={i} 
            style={{
              width: 4,
              height: (val / max) * height,
              backgroundColor: color,
              borderRadius: 2,
              opacity: 0.3 + (i / data.length) * 0.7
            }} 
          />
        ))}
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { soil, weather, isLoadingSoil, isLoadingWeather, soilError, refreshWeather } = useSoilData();

  const [isManualMode, setIsManualMode] = useState(false);
  const [isPumpOn, setIsPumpOn] = useState(false);
  const [rainProb, setRainProb] = useState(0);
  const [spinValue] = useState(new Animated.Value(0));

  useEffect(() => {
    const unsubMode = onValue(ref(db, '/control/manualMode'), (s) => setIsManualMode(s.val() === 1));
    const unsubPump = onValue(ref(db, '/control/pumpON'), (s) => setIsPumpOn(s.val() === 1));
    const unsubRain = onValue(ref(db, '/sensor/rain'), (s) => setRainProb(s.val() || 0));
    return () => { unsubMode(); unsubPump(); unsubRain(); };
  }, []);

  const startSpin = () => {
    spinValue.setValue(0);
    Animated.timing(spinValue, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }).start();
  };

  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const toggleMode = () => {
    const next = isManualMode ? 0 : 1;
    update(ref(db, '/control'), { manualMode: next, pumpON: 0 });
  };

  const togglePump = () => {
    if (isManualMode) update(ref(db, '/control'), { pumpON: isPumpOn ? 0 : 1 });
  };

  const onSyncPress = () => {
    startSpin();
    refreshWeather();
  };

  const isRefreshing = isLoadingSoil || isLoadingWeather;
  const showRainDelay = soil.moisture < 30 && rainProb >= 50 && !isManualMode;

  // Budget calculation
  const budgetUsed = Math.min(100, (soil.totalLiters / (soil.dailyBudget || 5)) * 100);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 100 }]}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onSyncPress} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Aneronix</Text>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>Dashboard</Text>
        </View>
        <View style={styles.statusRow}>
          <StatusDot active={!soilError} color={soil.waterDepleted ? colors.danger : colors.primary} />
          <Text style={[styles.statusText, { color: soil.waterDepleted ? colors.danger : colors.textSecondary }]}>
            {soil.systemStatus}
          </Text>
        </View>
      </View>

      {/* Mode Control */}
      <View style={[styles.controlPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.modeRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.modeTitle, { color: colors.text }]}>System Mode</Text>
            <Text style={[styles.modeSub, { color: isManualMode ? colors.warning : colors.primary }]}>
              {isManualMode ? "MANUAL OVERRIDE" : "SMART AUTO ACTIVE"}
            </Text>
          </View>
          <Switch value={isManualMode} onValueChange={toggleMode} thumbColor={isManualMode ? colors.warning : colors.primary} />
        </View>
        {isManualMode && (
          <TouchableOpacity onPress={togglePump} style={[styles.pumpButton, { backgroundColor: isPumpOn ? colors.danger : colors.primary, marginTop: 16 }]}>
            <Text style={styles.pumpButtonText}>{isPumpOn ? "STOP PUMPING" : "START PUMPING"}</Text>
          </TouchableOpacity>
        )}
      </View>

      <AlertBanner visible={showRainDelay} message={`Rain Delay: Watering paused (${rainProb}% rain expected).`} />

      {/* Enhanced Moisture Card with Trend & Prediction */}
      <DataCard title="Moisture Tracking" icon={<MaterialCommunityIcons name="water-percent" size={18} color={colors.primary} />} cardColor={colors.cardMoisture}>
        <View style={styles.gaugeRow}>
          <View style={{ alignItems: 'center' }}>
            <MoistureGauge value={soil.moisture || 0} size={130} />
            <MoistureTrend data={soil.moistureHistory} color={colors.primary} />
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <View style={styles.predictBadge}>
              <Text style={styles.predictLabel}>NEXT RUN</Text>
              <Text style={[styles.predictValue, { color: colors.primary }]}>{soil.nextRunTime}</Text>
            </View>
            <StatItem label="Current" value={`${soil.moisture || 0}%`} color={colors.primary} colors={colors} />
            <StatItem label="Flow Rate" value={`${(soil.waterFlow || 0).toFixed(2)} L/m`} color={colors.textSecondary} colors={colors} />
            <StatItem label="Health" value={soil.waterDepleted ? "ERROR" : "OK"} color={soil.waterDepleted ? colors.danger : colors.primary} colors={colors} />
          </View>
        </View>
      </DataCard>

      {/* Water Budget Card */}
      <DataCard title="Daily Water Budget" icon={<Ionicons name="stats-chart" size={18} color={colors.water} />} cardColor={colors.cardWater}>
        <View style={styles.budgetHeader}>
          <Text style={[styles.budgetText, { color: colors.text }]}>
            <Text style={{ fontWeight: '800', fontSize: 24 }}>{soil.totalLiters.toFixed(2)}L</Text> / {soil.dailyBudget}L
          </Text>
          <Text style={[styles.budgetPercent, { color: budgetUsed > 90 ? colors.danger : colors.water }]}>{Math.round(budgetUsed)}%</Text>
        </View>
        <View style={[styles.budgetTrack, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.budgetFill, { width: `${budgetUsed}%`, backgroundColor: colors.water }]} />
        </View>
        <Text style={styles.budgetSubtext}>Estimated {soil.waterSaved.toFixed(2)}L saved via smart rain delays.</Text>
      </DataCard>

      {/* Weather Forecast */}
      <DataCard title="Davao City Forecast" icon={<Ionicons name="partly-sunny" size={18} color={colors.warning} />} cardColor={colors.cardWeather}>
        <View style={styles.weatherRow}>
          {getWeatherIcon(weather.condition || "", colors.warning)}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{weather.condition}</Text>
            <Text style={{ color: colors.warning, fontSize: 28, fontWeight: '700' }}>{weather.temperature}°C</Text>
          </View>
          <View style={[styles.popBadge, { backgroundColor: rainProb >= 50 ? colors.danger + "22" : colors.primary + "22" }]}>
            <Text style={{ color: rainProb >= 50 ? colors.danger : colors.primary, fontWeight: '700' }}>{rainProb}% Rain</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
          {(weather.hourly || []).map((hr, i) => (
            <View key={i} style={styles.hourlyItem}>
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{hr.time}</Text>
              {getWeatherIcon(hr.condition, colors.warning, 20)}
              <Text style={{ color: colors.text, fontWeight: '600' }}>{hr.temp}°</Text>
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700' }}>{hr.pop}%</Text>
            </View>
          ))}
        </ScrollView>
      </DataCard>

      <TouchableOpacity style={[styles.syncBtn, { backgroundColor: colors.primary + "18" }]} onPress={onSyncPress} activeOpacity={0.7}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </Animated.View>
        <Text style={[styles.syncText, { color: colors.primary }]}>{isRefreshing ? "Syncing..." : "Sync Aneronix"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatItem({ label, value, color, colors }: any) {
  return (
    <View>
      <Text style={{ color: colors.textSecondary, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ color, fontSize: 16, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  greeting: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 28 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  controlPanel: { padding: 16, borderRadius: 20, borderWidth: 1 },
  modeRow: { flexDirection: "row", alignItems: "center" },
  modeTitle: { fontSize: 16, fontWeight: '600' },
  modeSub: { fontSize: 11, fontWeight: '700' },
  pumpButton: { padding: 14, borderRadius: 12, alignItems: 'center' },
  pumpButtonText: { color: '#FFF', fontWeight: '700', letterSpacing: 1 },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  predictBadge: { backgroundColor: 'rgba(0,0,0,0.05)', padding: 8, borderRadius: 10 },
  predictLabel: { fontSize: 8, color: '#888', fontWeight: '700' },
  predictValue: { fontSize: 14, fontWeight: '800' },
  trendContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  budgetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  budgetText: { fontSize: 14 },
  budgetPercent: { fontSize: 18, fontWeight: '800' },
  budgetTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 5 },
  budgetSubtext: { fontSize: 10, color: '#888', marginTop: 8, fontStyle: 'italic' },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  popBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  hourlyItem: { alignItems: 'center', width: 60, gap: 4 },
  syncBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16 },
  syncText: { fontSize: 15, fontWeight: '600' }
});