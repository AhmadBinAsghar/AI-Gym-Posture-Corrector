import { StyleSheet } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenCamera: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#121214',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraText: {
    textAlign: 'center',
    paddingHorizontal: 24,
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '700',
  },
  hudOverlay: {
    position: 'absolute',
    left: wp('5%'),
    right: wp('5%'),
    top: hp('12%'),
    bottom: hp('15%'),
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    pointerEvents: 'box-none',
  },
  hudBadge: {
    backgroundColor: 'rgba(30, 30, 38, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  hudBadgeReps: {
    backgroundColor: '#7C3AED',
  },
  hudBadgeGood: {
    backgroundColor: '#10B981',
  },
  hudBadgeBad: {
    backgroundColor: '#EF4444',
  },
  permissionBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hudBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hudFooter: {
    pointerEvents: 'box-none',
  },
  statsCard: {
    backgroundColor: 'rgba(30, 30, 38, 0.85)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  statsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconBtn: {
    flex: 1,
    marginHorizontal: 3,
    paddingHorizontal: 4,
    height: hp('6%'),
    borderRadius: 12,
    // Dark enough to stay readable over a bright camera image.
    backgroundColor: 'rgba(20,20,26,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  stopBtn: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  iconBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  calibrationContainer: {
    position: 'absolute',
    bottom: hp('3%'),
    left: wp('5%'),
    right: wp('5%'),
    backgroundColor: '#1E1E26',
    borderRadius: 16,
    padding: hp('1.5%'),
    borderWidth: 1.5,
    borderColor: '#3F3F54',
  },
  calibrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calibrationTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  calibrationScroll: {
    maxHeight: hp('18%'),
    marginTop: hp('1%'),
  },
  calibrationList: {
    paddingBottom: 4,
  },
  slideItem: {
    marginVertical: 6,
    backgroundColor: '#2D2D3A',
    borderRadius: 8,
    padding: 8,
  },
  slideLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  sliderMockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  adjustValBtn: {
    backgroundColor: '#7C3AED',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '700',
  },
  valText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  thresholdInfo: {
    color: '#9CA3AF',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
});

/**
 * Overrides for the landscape (pushup) camera. The portrait styles above are sized from the
 * launch-time portrait screen (wp/hp do not follow rotation), so on a ~360dp-tall landscape
 * screen they would stack the HUD right across the lying body. The screen hides the status
 * bar here (it covered the badge row), the stats join the top badge row, the controls are one
 * thin bottom row, and the calibration toggle tucks into the top-right corner under the
 * badges. The body lies on the floor (outline at 52-65% of the height, its hint just below),
 * so the band between the badges and the outline is the free space; the warning sits there
 * on the left and the calibration panel opens downward on the right.
 * `left: 'auto'` (not undefined) is what actually clears the portrait `left`.
 */
export const landscapeStyles = StyleSheet.create({
  hudOverlay: {
    top: 8,
    bottom: 8,
    left: 24,
    right: 24,
  },
  iconBtn: {
    height: 40,
  },
  calibrationContainer: {
    top: 54,
    bottom: 'auto',
    left: 'auto',
    right: 24,
    width: 290,
    padding: 8,
  },
  calibrationScroll: {
    maxHeight: 110,
  },
  alert: {
    top: 54,
    left: 24,
    right: 330,
  },
});
