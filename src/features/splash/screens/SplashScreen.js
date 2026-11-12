import React from 'react';
import { Text, View, Animated } from 'react-native';
import { useSplashAnimation } from '../hooks/useSplashAnimation';
import { styles } from '../styles/splash.styles';

const SplashScreen = ({ navigation }) => {
  const { scaleAnim, opacityAnim } = useSplashAnimation(navigation);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.glow} />
        <Text style={styles.logoText}>⚡</Text>
        <Text style={styles.appName}>
          AURA <Text style={styles.highlight}>FIT</Text>
        </Text>
        <Text style={styles.subtitle}>GYM Posture Corrector</Text>
      </Animated.View>
    </View>
  );
};

export default SplashScreen;
