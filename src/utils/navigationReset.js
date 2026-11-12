import { CommonActions } from '@react-navigation/native';

/** Replaces the whole stack so the back button can't return to login/onboarding. */
export const resetTo = (navigation, name) =>
  navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name }] }));
