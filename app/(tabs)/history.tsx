import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSoilData } from "@/context/SoilDataContext";
import { useTheme } from "@/hooks/useTheme";
import "../../firebaseConfig"; 

type HistoryEntry = {
  id: string;
  timestamp: string;
  moisture: number;
  totalLiters: number; // ✅ Changed to totalLiters
};

const HISTORY_KEY = "@smartsoil/history";
const MAX_HISTORY = 50;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMoistureColor(v: number) {
  if (v < 20) return "#E9C46A";
  if (v < 40) return "#F4A261";
  if (v < 60) return "#52B788";
  if (v < 80) return "#40916C";
  return "#48CAE4";
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { soil } = useSoilData();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Save a snapshot whenever soil updates (WITH SMART THROTTLING)
  useEffect(() => {
    const currentDate = soil.lastUpdated;
    
    if (!currentDate) return;
    
    AsyncStorage.getItem(HISTORY_KEY).then((raw) => {
      const existing: HistoryEntry[] = raw ? JSON.parse(raw) : [];
      
      // --- SMART THROTTLING LOGIC ---
      if (existing.length > 0) {
        const lastEntryTime = new Date(existing[0].timestamp).getTime();
        const currentTime = currentDate.getTime();
        const timeDiffMinutes = (currentTime - lastEntryTime) / (1000 * 60);
        
        const moistureDiff = Math.abs(existing[0].moisture - soil.moisture);

        // ONLY save if 15 minutes have passed OR moisture changed by more than 10%
        if (timeDiffMinutes < 15 && moistureDiff < 10) {
          return; 
        }
      }

      const entry: HistoryEntry = {
        id: currentDate.toISOString() + Math.random().toString(),
        timestamp: currentDate.toISOString(),
        moisture: soil.moisture,
        totalLiters: soil.totalLiters, // ✅ Changed to totalLiters
      };
      
      const updated = [entry, ...existing].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      setHistory(updated);
    });
  }, [soil.lastUpdated?.getTime(), soil.moisture, soil.totalLiters]); // ✅ Changed dependency

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
          History
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          {history.length} readings recorded
        </Text>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomPad + 100, paddingHorizontal: 20 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="leaf" size={48} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
              No history yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
              Data will appear here once your sensors start reporting.
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <HistoryRow item={item} index={index} colors={colors} />
        )}
      />
    </View>
  );
}

function HistoryRow({
  item,
  index,
  colors,
}: {
  item: HistoryEntry;
  index: number;
  colors: Record<string, string>;
}) {
  const moistureColor = getMoistureColor(item.moisture);
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.indexBadge, { backgroundColor: colors.primary + "18" }]}>
          <Text style={[styles.indexText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
            {String(index + 1).padStart(2, "0")}
          </Text>
        </View>
        <View style={styles.rowInfo}>
          <Text style={[styles.rowTime, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            {formatDateTime(item.timestamp)}
          </Text>
          <View style={styles.rowMetrics}>
            <View style={styles.metric}>
              <MaterialCommunityIcons name="water-percent" size={13} color={moistureColor} />
              <Text style={[styles.metricValue, { color: moistureColor, fontFamily: "Inter_600SemiBold" }]}>
                {item.moisture}%
              </Text>
            </View>
            <View style={styles.metric}>
              <Ionicons name="water" size={13} color={colors.water} />
              <Text style={[styles.metricValue, { color: colors.water, fontFamily: "Inter_600SemiBold" }]}>
                {item.totalLiters.toFixed(2)}L {/* ✅ Changed to totalLiters */}
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={[styles.moistureBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.moistureFill,
            {
              height: `${item.moisture}%`,
              backgroundColor: moistureColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 4,
  },
  title: { fontSize: 30 },
  subtitle: { fontSize: 13 },
  list: { gap: 10 },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 18 },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  rowLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  indexBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: { fontSize: 12 },
  rowInfo: { flex: 1, gap: 4 },
  rowTime: { fontSize: 12 },
  rowMetrics: { flexDirection: "row", gap: 12 },
  metric: { flexDirection: "row", alignItems: "center", gap: 4 },
  metricValue: { fontSize: 14 },
  moistureBar: {
    width: 6,
    height: 48,
    borderRadius: 3,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  moistureFill: {
    width: 6,
    borderRadius: 3,
  },
});