import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ref, onValue, update } from 'firebase/database';
import { db } from '../../firebaseConfig'; 
import { useTheme } from "@/hooks/useTheme";

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [isOverride, setIsOverride] = useState(false);
  const [manualRain, setManualRain] = useState(0);
  const [rainThreshold, setRainThreshold] = useState(50);
  const [isManualMode, setIsManualMode] = useState(false);
  const [dailyBudget, setDailyBudget] = useState(5.0);

  useEffect(() => {
    const controlRef = ref(db, 'control');
    
    const unsubscribe = onValue(controlRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIsOverride(data.weatherOverride ?? false);
        setManualRain(data.manualRainValue ?? 0);
        setRainThreshold(data.rainThreshold ?? 50);
        setIsManualMode(data.manualMode === 1);
        setDailyBudget(data.dailyBudget ?? 5.0);
      }
    });

    return () => unsubscribe(); 
  }, []);

  const updateFirebase = (updates: object) => {
    update(ref(db, 'control'), updates);
  };

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
            System Configuration
          </Text>
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_700Bold" }]}>
            Settings
          </Text>
        </View>

        <Text style={[styles.description, { color: colors.textSecondary, fontFamily: "Inter_400Regular" }]}>
          Configure Aneronix thresholds and test hardware logic through cloud overrides.
        </Text>

        {/* --- NEW: Daily Water Budget --- */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sliderHeader}>
            <MaterialCommunityIcons name="water-pump" size={20} color={colors.water} />
            <Text style={[styles.sliderTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
              Daily Water Budget: <Text style={{ color: colors.water }}>{dailyBudget}L</Text>
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1.0}
            maximumValue={20.0}
            step={0.5}
            value={dailyBudget}
            onSlidingComplete={(val) => updateFirebase({ dailyBudget: parseFloat(val.toFixed(1)) })}
            minimumTrackTintColor={colors.water}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.water}
          />
          <Text style={[styles.sliderSubtext, { color: colors.textSecondary }]}>
            Set your daily consumption target. This updates the dashboard progress tracker.
          </Text>
        </View>

        {/* --- System Mode Toggle --- */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="cog-refresh" size={22} color={isManualMode ? colors.warning : colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.label, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                Manual Override Mode
              </Text>
              <Text style={[styles.subtext, { color: colors.textSecondary }]}>
                Bypass smart sensors for direct control
              </Text>
            </View>
            <Switch 
              value={isManualMode} 
              onValueChange={(val) => updateFirebase({ manualMode: val ? 1 : 0, pumpON: 0 })} 
              trackColor={{ false: colors.border, true: colors.warning + "80" }}
              thumbColor={isManualMode ? colors.warning : "#f4f3f4"}
            />
          </View>
        </View>

        {/* --- Weather Simulation Toggle --- */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.row}>
            <View style={styles.iconContainer}>
              <Ionicons name="cloud-offline" size={22} color={isOverride ? colors.warning : colors.textSecondary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.label, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
                Weather Simulation
              </Text>
              <Text style={[styles.subtext, { color: colors.textSecondary }]}>
                Override real-time OpenWeather API
              </Text>
            </View>
            <Switch 
              value={isOverride} 
              onValueChange={(val) => updateFirebase({ weatherOverride: val })} 
              trackColor={{ false: colors.border, true: colors.warning + "80" }}
              thumbColor={isOverride ? colors.warning : "#f4f3f4"}
            />
          </View>
        </View>

        {/* --- Manual Rain Value Slider --- */}
        <View style={[
          styles.card, 
          { backgroundColor: colors.surface, borderColor: colors.border },
          !isOverride && styles.disabledCard
        ]}>
          <View style={styles.sliderHeader}>
            <Ionicons name="rainy" size={20} color={isOverride ? colors.warning : colors.textSecondary} />
            <Text style={[styles.sliderTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
              Simulated Rain Prob: <Text style={{ color: colors.warning }}>{manualRain}%</Text>
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={1}
            disabled={!isOverride}
            value={manualRain}
            onSlidingComplete={(val) => updateFirebase({ manualRainValue: Math.round(val) })}
            minimumTrackTintColor={colors.warning}
            maximumTrackTintColor={colors.border}
            thumbTintColor={isOverride ? colors.warning : colors.border}
          />
          <Text style={[styles.sliderSubtext, { color: colors.textSecondary }]}>
            Simulate a rain probability to test "Rain Delay" behavior.
          </Text>
        </View>

        {/* --- Rain Threshold Slider --- */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sliderHeader}>
            <MaterialCommunityIcons name="weather-pouring" size={20} color={colors.primary} />
            <Text style={[styles.sliderTitle, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
              Rain Delay Threshold: <Text style={{ color: colors.primary }}>{rainThreshold}%</Text>
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={100}
            step={5}
            value={rainThreshold}
            onSlidingComplete={(val) => updateFirebase({ rainThreshold: Math.round(val) })}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
          <Text style={[styles.sliderSubtext, { color: colors.textSecondary }]}>
            If rain probability is above this, Aneronix will pause irrigation.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { marginBottom: 8 },
  greeting: { fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" },
  title: { fontSize: 30, marginTop: 2 },
  description: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  disabledCard: { opacity: 0.4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.04)', alignItems: 'center', justifyContent: 'center' },
  textContainer: { flex: 1 },
  label: { fontSize: 16 },
  subtext: { fontSize: 12, marginTop: 2 },
  sliderHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sliderTitle: { fontSize: 16 },
  slider: { width: '100%', height: 40 },
  sliderSubtext: { fontSize: 11, marginTop: 4, lineHeight: 16, fontStyle: 'italic' },
});