import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';

/**
 * HUD Real-time Posture warning alert card
 */
// `isInfo`: a positioning hint (nobody in frame) rather than a form error, so it is amber.
const CustomAlert = ({ message, isVisible, isInfo = false }) => {
  if (!isVisible || !message) return null;

  return (
    <View style={[styles.container, isInfo && styles.containerInfo]}>
      <View style={styles.alertBar} />
      <View style={styles.content}>
        <Text style={styles.icon}>{isInfo ? 'ℹ️' : '⚠️'}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
};

export default CustomAlert;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // Sits below the exercise/reps/accuracy badges instead of covering them.
    top: hp('20%'),
    left: 20,
    right: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.95)', // Crimson Red overlay
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 999,
  },
  containerInfo: {
    backgroundColor: 'rgba(217, 119, 6, 0.95)', // amber
    shadowColor: '#D97706',
  },
  alertBar: {
    width: 6,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    flex: 1,
  }
});
