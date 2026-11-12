import { StyleSheet } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp('6%'),
    paddingTop: hp('3%'),
    paddingBottom: hp('2%'),
  },
  greeting: {
    fontSize: hp('3%'),
    fontWeight: '900',
    color: '#FFFFFF',
  },
  emailText: {
    fontSize: hp('1.6%'),
    color: '#9CA3AF',
    marginTop: hp('0.5%'),
    fontWeight: '500',
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: wp('4%'),
    paddingVertical: hp('1%'),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: hp('1.5%'),
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E1E26',
    borderRadius: 20,
    marginHorizontal: wp('6%'),
    paddingVertical: hp('2%'),
    borderWidth: 1,
    borderColor: '#2D2D3A',
    marginBottom: hp('3%'),
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: '#2D2D3A',
  },
  statValGood: {
    color: '#10B981',
  },
  statVal: {
    fontSize: hp('3%'),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLbl: {
    fontSize: hp('1.6%'),
    color: '#9CA3AF',
    marginTop: hp('0.5%'),
    fontWeight: '600',
  },
  body: {
    flex: 1,
    paddingHorizontal: wp('6%'),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp('1.5%'),
  },
  sectionTitle: {
    fontSize: hp('2.2%'),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionAction: {
    fontSize: hp('1.6%'),
    color: '#9F7AEA',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: hp('3%'),
  },
});
