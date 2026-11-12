import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E26',
    paddingBottom: 16,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncBtn: {
    flex: 1.1,
    marginRight: 10,
    height: 44,
  },
  clearBtn: {
    flex: 0.9,
    height: 44,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 24,
  },
  logCard: {
    backgroundColor: '#1E1E26',
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#2D2D3A',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D3A',
    paddingBottom: 12,
    marginBottom: 12,
  },
  logExercise: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  logDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSynced: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeOffline: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textSynced: {
    color: '#10B981',
  },
  textOffline: {
    color: '#F59E0B',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 60,
  },
  accuracyGood: {
    color: '#10B981',
  },
  accuracyBad: {
    color: '#EF4444',
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLbl: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '600',
  },
});
