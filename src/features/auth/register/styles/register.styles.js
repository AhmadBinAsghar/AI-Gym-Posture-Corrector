import { StyleSheet } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { colors } from '../../../../constants/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dullBlue,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: wp('6%'),
    justifyContent: 'center',
    paddingVertical: hp('5%'),
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: hp('4.5%'),
  },
  title: {
    fontSize: hp('3.5%'),
    fontWeight: '900',
    color: colors.text,
    marginBottom: hp('1%'),
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: hp('1.7%'),
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    width: '100%',
    marginBottom: hp('3%'),
  },
  submitBtn: {
    marginTop: hp('2%'),
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: hp('2.5%'),
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  dividerText: {
    color: colors.divider,
    paddingHorizontal: wp('3%'),
    fontSize: hp('1.5%'),
    fontWeight: '700',
  },
  sandboxBtn: {
    borderColor: colors.purple,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: hp('1.7%'),
    fontWeight: '500',
  },
  linkText: {
    color: colors.purple,
    fontSize: hp('1.7%'),
    fontWeight: '700',
  },
  logoText: {
    fontSize: hp('6.5%'),
    marginBottom: hp('1%'),
  },
});
