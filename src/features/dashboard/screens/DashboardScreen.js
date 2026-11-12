import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDashboard } from '../hooks/useDashboard';
import { styles } from '../styles/dashboard.styles';
import ExerciseCard from '../../../components/ExerciseCard';

const DashboardScreen = () => {
  const {
    user,
    totalWorkouts,
    averageAccuracy,
    exercises,
    handleSelectExercise,
    handleLogout,
    handleViewHistory,
  } = useDashboard();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.fullName || 'Athlete'} 👋</Text>
          <Text style={styles.emailText}>{user?.email || ''}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Exit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statVal}>{totalWorkouts}</Text>
          <Text style={styles.statLbl}>Workouts</Text>
        </View>
        <View style={[styles.statBox, styles.statBorder]}>
          <Text style={[styles.statVal, styles.statValGood]}>{averageAccuracy}%</Text>
          <Text style={styles.statLbl}>Avg Form Accuracy</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          <TouchableOpacity onPress={handleViewHistory} activeOpacity={0.7}>
            <Text style={styles.sectionAction}>View History 📊</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ExerciseCard
              exercise={item}
              onPress={() => handleSelectExercise(item.name)}
              activeOpacity={0.7}
            />
          )}
        />
      </View>
    </SafeAreaView>
  );
};

export default DashboardScreen;
