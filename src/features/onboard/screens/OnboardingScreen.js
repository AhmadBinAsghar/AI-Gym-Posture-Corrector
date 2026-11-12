import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Button from '../../../components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { resetTo } from '../../../utils/navigationReset';
import { styles } from '../styles/onboard.styles';

const SLIDES = [
  {
    id: 1,
    emoji: '🤖',
    title: 'Real-time AI Guidance',
    description: 'Our on-device pose-detection engine monitors your body structure through your front camera with real-time response.',
  },
  {
    id: 2,
    emoji: '🎯',
    title: 'Posture Correction Overlay',
    description: 'Instantly overlays a dynamic skeleton over your joints. Bones glow Lime Green when posture is perfect, and turn Crimson Red if form sags.',
  },
  {
    id: 3,
    emoji: '💾',
    title: 'Zero Connection Persistence',
    description: 'Train with absolute peace of mind. All stats, reps, and accuracy are stored locally in the gym and synced up to the cloud when online.',
  }
];

const OnboardingScreen = ({navigation}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const handleNext = () => {
    if (currentSlideIndex < SLIDES.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      resetTo(navigation, 'Login');
    }
  };

  const handleSkip = () => {
    resetTo(navigation, 'Login');
  };

  const slide = SLIDES[currentSlideIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.slideContainer}>
        <View style={styles.glow} />
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      <View style={styles.footer}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentSlideIndex === index && styles.activeDot
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <Button
          title={currentSlideIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
          onPress={handleNext}
          style={styles.actionBtn}
        />
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen;
