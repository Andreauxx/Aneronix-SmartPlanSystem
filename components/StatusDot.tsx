import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

type Props = {
  active: boolean;
  color: string;
};

export function StatusDot({ active, color }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withTiming(1.6, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      scale.value = 1;
    }
  }, [active]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: active ? 0.35 : 0,
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.ring,
          { borderColor: color },
          ringStyle,
        ]}
      />
      <View
        style={[
          styles.dot,
          { backgroundColor: active ? color : "#9CA3AF" },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
