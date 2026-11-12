import { StyleSheet } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { colors } from '../../../constants/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dullBlue,
  },
  header: {
    height: hp('6%'), // Scaled dynamically relative to screen height
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: wp('6%'), // Adaptive horizontal padding
  },
  skipText: {
    color: colors.textSecondary,
    fontSize: hp('1.75%'), // Responsive typography
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp('8%'),
  },
  glow: {
    position: 'absolute',
    width: wp('45%'), // Responsive vector overlay size
    height: wp('45%'), // Keep aspect ratio uniform using width metrics for both sides
    borderRadius: wp('22.5%'),
    backgroundColor: colors.purple,
    opacity: 0.1,
    filter: 'blur(40px)',
  },
  emoji: {
    fontSize: hp('9%'), // Scaling the tracking graphics/emojis dynamically
    marginBottom: hp('3.5%'),
  },
  title: {
    fontSize: hp('3%'), // High-contrast bold headers scaled for device layout height
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
    marginBottom: hp('2%'),
    letterSpacing: 0.5,
  },
  description: {
    fontSize: hp('1.75%'), // Optimized technical microcopy scale
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp('2.75%'),
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: wp('6%'),
    paddingBottom: hp('3%'),
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    marginBottom: hp('3%'),
  },
  dot: {
    width: wp('2%'),
    height: wp('2%'),
    borderRadius: wp('1%'),
    backgroundColor: colors.dot,
    marginHorizontal: wp('1.25%'),
  },
  activeDot: {
    width: wp('6%'), // Active capsule shape stretching smoothly
    backgroundColor: colors.purple,
  },
  actionBtn: {
    width: '100%', // Keeps its stable flex boundary container limit
  }
});