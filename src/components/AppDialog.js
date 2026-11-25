import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../constants/colors';

/**
 * App-themed replacement for the system Alert.alert. The native dialog is a grey Material box
 * that clashed with the dark purple UI; this one uses the app's card, border and button styles.
 *
 * Call it like Alert.alert:
 *   showDialog('Log Out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', style: 'destructive', onPress }]);
 * with an optional 4th argument: { icon: '🎉', details: [{ label: 'Reps', value: '12' }] }
 * `details` renders as a stats grid (the workout summary), so numbers are not buried in text.
 *
 * <AppDialogHost /> is mounted once at the app root and shows whatever is queued.
 */

let listener = null;
const queue = [];

const publish = () => listener && listener(queue[0] || null);

export const showDialog = (title, message, buttons, options = {}) => {
  queue.push({
    title,
    message,
    buttons: buttons && buttons.length ? buttons : [{ text: 'OK' }],
    icon: options.icon,
    details: options.details,
  });
  if (queue.length === 1) publish();
};

const close = () => {
  queue.shift();
  publish();
};

export const AppDialogHost = () => {
  const [dialog, setDialog] = useState(null);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    listener = setDialog;
    publish();
    return () => {
      if (listener === setDialog) listener = null;
    };
  }, []);

  if (!dialog) return null;

  const press = button => {
    close();
    if (button?.onPress) button.onPress();
  };
  // Back button / tap outside behaves like the Cancel button, and only when there is one:
  // the workout summary has no Cancel, so it cannot be dismissed without choosing.
  const cancelButton = dialog.buttons.find(b => b.style === 'cancel');
  const onRequestClose = () => cancelButton && press(cancelButton);

  const landscape = width > height;
  const stacked = dialog.buttons.length > 2;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={onRequestClose}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onRequestClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[styles.card, landscape && styles.cardLandscape, { maxHeight: height * 0.9 }]}
        >
          <ScrollView bounces={false} contentContainerStyle={styles.content}>
            {dialog.icon ? (
              <View style={styles.iconBubble}>
                <Text style={styles.icon}>{dialog.icon}</Text>
              </View>
            ) : null}
            <Text style={styles.title}>{dialog.title}</Text>
            {dialog.message ? <Text style={styles.message}>{dialog.message}</Text> : null}

            {dialog.details ? (
              <View style={styles.details}>
                {dialog.details.map(d => (
                  <View key={d.label} style={styles.detailCell}>
                    <Text style={styles.detailValue}>{d.value}</Text>
                    <Text style={styles.detailLabel}>{d.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={[styles.buttons, stacked && styles.buttonsStacked]}>
              {dialog.buttons.map(b => (
                <TouchableOpacity activeOpacity={0.7}
                  key={b.text}
                  style={[
                    styles.button,
                    stacked && styles.buttonStacked,
                    b.style === 'cancel' ? styles.buttonCancel : b.style === 'destructive' ? styles.buttonDanger : styles.buttonPrimary,
                  ]}
                  onPress={() => press(b)}
                >
                  <Text
                    style={[styles.buttonText, b.style === 'cancel' && styles.buttonTextCancel]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {b.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 8, 12, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#1E1E26',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.dot,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  cardLandscape: {
    maxWidth: 440,
  },
  content: {
    padding: 22,
    alignItems: 'center',
  },
  iconBubble: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124, 58, 237, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  icon: {
    fontSize: 26,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  details: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  detailCell: {
    width: '48.5%',
    backgroundColor: colors.line,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  detailValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 18,
    gap: 10,
  },
  buttonsStacked: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  buttonStacked: {
    flex: 0,
  },
  buttonPrimary: {
    backgroundColor: colors.purple,
  },
  buttonDanger: {
    backgroundColor: '#EF4444',
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.dot,
  },
  buttonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  buttonTextCancel: {
    color: colors.textSecondary,
  },
});
