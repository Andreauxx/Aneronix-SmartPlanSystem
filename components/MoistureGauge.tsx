import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  value: number;
  size?: number;
};

function getMoistureLabel(v: number) {
  if (v < 20) return "Very Dry";
  if (v < 40) return "Dry";
  if (v < 60) return "Optimal";
  if (v < 80) return "Moist";
  return "Saturated";
}

function getMoistureColor(v: number, isDark: boolean) {
  if (v < 20) return "#E9C46A";
  if (v < 40) return "#F4A261";
  if (v < 60) return "#52B788";
  if (v < 80) return "#40916C";
  return "#48CAE4";
}

export function MoistureGauge({ value, size = 140 }: Props) {
  const { colors, isDark } = useTheme();
  const clampedValue = Math.max(0, Math.min(100, value));
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withSpring(clampedValue, { damping: 14, stiffness: 80 });
  }, [clampedValue]);

  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = circumference * (1 - clampedValue / 100);
  const gaugeColor = getMoistureColor(clampedValue, isDark);
  const label = getMoistureLabel(clampedValue);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View style={styles.wrapper}>
      <View style={[styles.svgContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor={gaugeColor} stopOpacity="0.6" />
              <Stop offset="100%" stopColor={gaugeColor} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={10}
            stroke={isDark ? "#2D4A38" : "#E5EAE7"}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={10}
            stroke="url(#gaugeGrad)"
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDash}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}>
          <View style={styles.centerContent}>
            <Text style={[styles.valueText, { color: gaugeColor }]}>
              {clampedValue}
              <Text style={[styles.unit, { color: colors.textSecondary }]}>%</Text>
            </Text>
          </View>
        </View>
      </View>
      <Text style={[styles.label, { color: gaugeColor, fontFamily: "Inter_600SemiBold" }]}>
        {label}
      </Text>
      <View style={[styles.barTrack, { backgroundColor: isDark ? "#2D4A38" : "#E5EAE7" }]}>
        <Animated.View
          style={[styles.barFill, barStyle, { backgroundColor: gaugeColor }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    gap: 6,
  },
  svgContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
  },
  unit: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
  barTrack: {
    height: 4,
    width: 100,
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
});
