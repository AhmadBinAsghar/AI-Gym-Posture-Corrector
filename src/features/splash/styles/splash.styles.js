import { StyleSheet } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { colors } from '../../../constants/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dullBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: hp('6.5%'),
    marginBottom: hp('1%'),
    zIndex: 1,
  },
  glow: {
    position: 'absolute',
    width: wp('45%'),
    height: wp('45%'),
    borderRadius: wp('22.5%'),
    backgroundColor: colors.purple,
    opacity: 0.1,
    filter: 'blur(40px)',
  },
  appName: {
    fontSize: hp('4%'),
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 2,
    zIndex: 1,
  },
  highlight: {
    color: colors.purple,
  },
  subtitle: {
    fontSize: hp('1.8%'),
    color: colors.textSecondary,
    marginTop: hp('1%'),
    letterSpacing: 1.5,
    fontWeight: '600',
    zIndex: 1,
  },
});
