import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * Exercise display card for the Dashboard
 */
const ExerciseCard = ({ exercise, onPress }) => {
  const { name, target, difficulty, duration, icon } = exercise;

  // color coding based on difficulty
  const isBeginner = difficulty === 'Beginner';
  
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={[
          styles.badge,
          isBeginner ? styles.badgeBeginner : styles.badgeIntermediate
        ]}>
          <Text style={[
            styles.badgeText,
            isBeginner ? styles.textBeginner : styles.textIntermediate
          ]}>
            {difficulty}
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{name}</Text>
      
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>🎯 Targets: </Text>
          <Text style={styles.value}>{target}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.label}>⏱️ Recommendation: </Text>
          <Text style={styles.value}>{duration}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.actionText}>Start Workout  ›</Text>
      </View>
    </TouchableOpacity>
  );
};

export default ExerciseCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E26',
    borderRadius: 18,
    padding: 18,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#2D2D3A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2D2D3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeBeginner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)', // transparent lime green
  },
  badgeIntermediate: {
    backgroundColor: 'rgba(159, 122, 234, 0.15)', // transparent purple
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textBeginner: {
    color: '#10B981',
  },
  textIntermediate: {
    color: '#9F7AEA',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  details: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  label: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  value: {
    fontSize: 13,
    color: '#E5E7EB',
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#2D2D3A',
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED', // Electric Violet action text
  }
});
