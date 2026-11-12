import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHistory } from '../hooks/useHistory';
import Button from '../../../components/Button';
import { styles } from '../styles/history.styles';

const HistoryScreen = () => {
  const { goBack, logs, isSyncing, isLoading, canSync, handleSync, handleClear } = useHistory();

  const renderHistoryItem = ({ item }) => {
    const dateObj = new Date(item.createdAt);
    const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.logCard}>
        <View style={styles.logHeader}>
          <View>
            <Text style={styles.logExercise}>{item.exerciseName}</Text>
            <Text style={styles.logDate}>{dateStr} at {timeStr}</Text>
          </View>
          {item.isSynced ? (
            <View style={[styles.badge, styles.badgeSynced]}>
              <Text style={[styles.badgeText, styles.textSynced]}>✓ Synced</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeOffline]}>
              <Text style={[styles.badgeText, styles.textOffline]}>☁ Offline</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{item.reps}</Text>
            <Text style={styles.statLbl}>Reps</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{Math.floor(item.duration / 60)}m {item.duration % 60}s</Text>
            <Text style={styles.statLbl}>Duration</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={[styles.statVal, item.accuracy >= 80 ? styles.accuracyGood : styles.accuracyBad]}>{item.accuracy}%</Text>
            <Text style={styles.statLbl}>Accuracy</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statVal}>{item.calories}</Text>
            <Text style={styles.statLbl}>Kcal</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Workout Analytics</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.actionsBar}>
        <Button
          title="☁ Sync Cloud"
          onPress={handleSync}
          isLoading={isSyncing}
          variant="secondary"
          style={styles.syncBtn}
          disabled={!canSync}
        />
        <Button
          title="🗑 Reset Cache"
          onPress={handleClear}
          variant="danger"
          style={styles.clearBtn}
        />
      </View>

      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🏋️‍♂️</Text>
            <Text style={styles.emptyTitle}>No workouts recorded yet</Text>
            <Text style={styles.emptyText}>Go back to the dashboard and open the camera to begin your first session.</Text>
          </View>
        ) : (
          <FlatList
            data={logs}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={renderHistoryItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default HistoryScreen;
