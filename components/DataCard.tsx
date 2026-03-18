import React, { useEffect } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  cardColor?: string;
  style?: ViewStyle;
  isLoading?: boolean;
  subtitle?: string;
};

function PulseSkeleton({ color }: { color: string }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.skeletonContainer}>
      <Animated.View style={[styles.skeletonLine, { backgroundColor: color }, style]} />
      <Animated.View style={[styles.skeletonLineSmall, { backgroundColor: color }, style]} />
    </View>
  );
}

export function DataCard({ title, icon, children, cardColor, style, isLoading, subtitle }: Props) {
  const { colors } = useTheme();
  const bg = cardColor ?? colors.surface;

  return (
    <View style={[styles.card, { backgroundColor: bg }, style]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon}
          <Text style={[styles.title, { color: colors.text, fontFamily: "Inter_600SemiBold" }]}>
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      {isLoading ? (
        <PulseSkeleton color={colors.border} />
      ) : (
        <View style={styles.content}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginLeft: 28,
  },
  content: {},
  skeletonContainer: {
    gap: 8,
  },
  skeletonLine: {
    height: 32,
    borderRadius: 8,
    width: "70%",
  },
  skeletonLineSmall: {
    height: 14,
    borderRadius: 6,
    width: "45%",
  },
});
