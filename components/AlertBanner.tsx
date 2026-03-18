import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  visible: boolean;
  message: string;
};

export function AlertBanner({ visible, message }: Props) {
  const { colors } = useTheme();
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      pulseOpacity.value = withRepeat(
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [visible]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: colors.cardAlert ?? "#FFE8E0" },
        pulseStyle,
      ]}
    >
      <Ionicons name="rainy" size={20} color={colors.danger} />
      <Text style={[styles.text, { color: colors.danger, fontFamily: "Inter_600SemiBold" }]}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
});
