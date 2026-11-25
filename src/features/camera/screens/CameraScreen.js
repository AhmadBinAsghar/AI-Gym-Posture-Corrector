import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Linking, StatusBar, useWindowDimensions } from 'react-native';
import { Camera } from 'react-native-vision-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCamera } from '../hooks/useCamera';
import { THRESHOLDS } from '../../../utils/postureEngine';
import { styles, landscapeStyles } from '../styles/camera.styles';
import SkeletonCanvas from '../../../components/SkeletonCanvas';
import BodyGuide from '../../../components/BodyGuide';
import CustomAlert from '../../../components/CustomAlert';

// Memoised so the screen re-rendering for the HUD (reps, accuracy, ...) does not re-create the
// whole camera view every time. Its props are all referentially stable now.
const MemoCamera = React.memo(Camera);

const CameraScreen = () => {
  const {
    activeExercise,
    reps,
    calories,
    duration,
    accuracyScore,
    isPostureCorrect,
    isTracking,
    postureWarning,
    onLayout,
    viewSize,
    voiceEnabled,
    setVoiceEnabled,
    hasPermission,
    requestPermission,
    flipCamera,
    device,
    frameOutput,
    isPaused,
    isCalibrationOpen,
    kneeSlider,
    backSlider,
    elbowSlider,
    elbowTuckSlider,
    hipSlider,
    setIsPaused,
    setIsCalibrationOpen,
    setKneeSlider,
    setBackSlider,
    setElbowSlider,
    setElbowTuckSlider,
    setHipSlider,
    handleStopWorkout,
  } = useCamera();

  // Stable prop identities: with these, MemoCamera only re-renders when the device or the
  // viewport actually changes, instead of on every HUD update.
  const cameraStyle = useMemo(
    () => [styles.fullScreenCamera, { width: viewSize.width, height: viewSize.height }],
    [viewSize.width, viewSize.height]
  );
  const constraints = useMemo(() => [{ fps: 30 }], []);

  // The pushup camera runs in landscape (see useCamera); lay the HUD out for it.
  const window = useWindowDimensions();
  const landscape = window.width > window.height;
  // In landscape the system navigation buttons sit on one side and the camera cut-out on the
  // other; the app draws edge-to-edge underneath them, so push the HUD in by those insets.
  const insets = useSafeAreaInsets();
  const ls = useMemo(() => {
    if (!landscape) return {};
    const left = landscapeStyles.hudOverlay.left + insets.left;
    const right = landscapeStyles.hudOverlay.right + insets.right;
    return {
      ...landscapeStyles,
      hudOverlay: [landscapeStyles.hudOverlay, { left, right }],
      calibrationContainer: [landscapeStyles.calibrationContainer, { right }],
      alert: [landscapeStyles.alert, { left, right: landscapeStyles.alert.right + insets.right }],
    };
  }, [landscape, insets.left, insets.right]);
  const iconBtn = [styles.iconBtn, ls.iconBtn];
  const outputs = useMemo(() => [frameOutput], [frameOutput]);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* The app draws edge-to-edge, and in landscape the status bar covered the badge row. */}
      <StatusBar hidden={landscape} />
      {/* 1. Live Camera Preview */}
      {hasPermission && device ? (
        <MemoCamera
          // Explicit size: a bare absolute-fill style left the native preview 0px high (no surface, black).
          style={cameraStyle}
          device={device}
          isActive={!isPaused}
          resizeMode="cover"
          // Draw the video as a regular view (TextureView) so the skeleton can sit above it.
          implementationMode="compatible"
          constraints={constraints}
          outputs={outputs}
        />
      ) : (
        <View style={styles.cameraPlaceholder}>
          {hasPermission ? (
            <Text style={styles.cameraText}>🎥 Connecting Camera Feed...</Text>
          ) : (
            <>
              <Text style={styles.cameraText}>📷 Camera access is needed to check your form.</Text>
              <TouchableOpacity activeOpacity={0.7} style={styles.permissionBtn} onPress={requestPermission}>
                <Text style={styles.iconBtnText}>Allow Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} style={styles.permissionBtn} onPress={() => Linking.openSettings()}>
                <Text style={styles.iconBtnText}>Open Settings</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* 2. "Stand here" outline (green once the pose is tracked), then the tracked skeleton on top */}
      <BodyGuide width={viewSize.width} height={viewSize.height} activeExercise={activeExercise} />
      <SkeletonCanvas width={viewSize.width} height={viewSize.height} />

      {/* 3. Real-time Posture Error HUD Warning */}
      <CustomAlert message={postureWarning} isVisible={!!postureWarning} isInfo={!isTracking} style={ls.alert} />

      {/* 4. Active Workout HUD Statistics overlays */}
      <View style={[styles.hudOverlay, ls.hudOverlay]}>
        <View style={styles.hudHeader}>
          <View style={styles.hudBadge}>
            <Text style={styles.hudBadgeText}>{activeExercise}</Text>
          </View>
          <View style={[styles.hudBadge, styles.hudBadgeReps]}>
            <Text style={styles.hudBadgeText}>REPS: {reps}</Text>
          </View>
          <View style={[styles.hudBadge, isPostureCorrect ? styles.hudBadgeGood : styles.hudBadgeBad]}>
            <Text style={styles.hudBadgeText}>ACC: {accuracyScore}%</Text>
          </View>
          {/* Landscape has no height to spare for the stats card, so it joins this row. */}
          {landscape && (
            <>
              <View style={styles.hudBadge}>
                <Text style={styles.hudBadgeText}>⏱️ {duration}s</Text>
              </View>
              <View style={styles.hudBadge}>
                <Text style={styles.hudBadgeText}>🔥 {calories} Kcal</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.hudFooter}>
          {!landscape && (
            <View style={styles.statsCard}>
              <Text style={styles.statsText}>⏱️ {duration}s</Text>
              <Text style={styles.statsText}>🔥 {calories} Kcal</Text>
            </View>
          )}

          {/* Quick Control Options */}
          <View style={styles.controlRow}>
            <TouchableOpacity activeOpacity={0.7} style={iconBtn} onPress={() => setIsPaused(!isPaused)}>
              <Text style={styles.iconBtnText} numberOfLines={1} adjustsFontSizeToFit>{isPaused ? '▶ Resume' : '⏸ Pause'}</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} style={iconBtn} onPress={flipCamera}>
              <Text style={styles.iconBtnText} numberOfLines={1} adjustsFontSizeToFit>🔄 Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} style={iconBtn} onPress={() => setVoiceEnabled(!voiceEnabled)}>
              <Text style={styles.iconBtnText} numberOfLines={1} adjustsFontSizeToFit>{voiceEnabled ? '🔊 Voice' : '🔇 Muted'}</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} style={[iconBtn, styles.stopBtn]} onPress={handleStopWorkout}>
              <Text style={styles.iconBtnText} numberOfLines={1} adjustsFontSizeToFit>🛑 Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 5. Floating Interactive Calibration Override Dashboard */}
      <View style={[styles.calibrationContainer, ls.calibrationContainer]}>
        <View style={styles.calibrationHeader}>
          <Text style={styles.calibrationTitle}>🔬 Interactive Calibration Override</Text>
          <Switch
            value={isCalibrationOpen}
            onValueChange={setIsCalibrationOpen}
            trackColor={{ false: '#3F3F54', true: '#7C3AED' }}
            thumbColor="#FFFFFF"
          />
        </View>

        {isCalibrationOpen && (
          <ScrollView style={[styles.calibrationScroll, ls.calibrationScroll]} contentContainerStyle={styles.calibrationList}>
            {activeExercise === 'Deep Squats' && (
              <>
                <View style={styles.slideItem}>
                  <Text style={styles.slideLabel}>Hip/Knee angle: {kneeSlider}° (Squat Depth)</Text>
                  <View style={styles.sliderMockRow}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setKneeSlider(Math.max(30, kneeSlider - 15))}>
                      <Text style={styles.adjustValBtn}>- Flex</Text>
                    </TouchableOpacity>
                    <Text style={styles.valText}>{kneeSlider}°</Text>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setKneeSlider(Math.min(180, kneeSlider + 15))}>
                      <Text style={styles.adjustValBtn}>+ Extend</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.thresholdInfo}>Counts as a rep below {THRESHOLDS.squat.downAt}°; warns under {THRESHOLDS.squat.kneeTooDeep}°</Text>
                </View>

                <View style={styles.slideItem}>
                  <Text style={styles.slideLabel}>Back lean angle: {backSlider}°</Text>
                  <View style={styles.sliderMockRow}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setBackSlider(Math.max(0, backSlider - 5))}>
                      <Text style={styles.adjustValBtn}>- Straight</Text>
                    </TouchableOpacity>
                    <Text style={styles.valText}>{backSlider}°</Text>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setBackSlider(Math.min(60, backSlider + 5))}>
                      <Text style={styles.adjustValBtn}>+ Arch</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.thresholdInfo}>Threshold: turns Red if bent &gt; {THRESHOLDS.squat.backMax}°</Text>
                </View>
              </>
            )}

            {activeExercise === 'Bicep Curls' && (
              <>
                <View style={styles.slideItem}>
                  <Text style={styles.slideLabel}>Elbow angle: {elbowSlider}°</Text>
                  <View style={styles.sliderMockRow}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setElbowSlider(Math.max(30, elbowSlider - 15))}>
                      <Text style={styles.adjustValBtn}>- Curl</Text>
                    </TouchableOpacity>
                    <Text style={styles.valText}>{elbowSlider}°</Text>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setElbowSlider(Math.min(170, elbowSlider + 15))}>
                      <Text style={styles.adjustValBtn}>+ Extend</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.thresholdInfo}>Rep: flex ≤ {THRESHOLDS.curl.flexedAt}° then extend ≥ {THRESHOLDS.curl.extendedAt}°</Text>
                </View>

                <View style={styles.slideItem}>
                  <Text style={styles.slideLabel}>Elbow swing flare: {elbowTuckSlider}°</Text>
                  <View style={styles.sliderMockRow}>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setElbowTuckSlider(Math.max(0, elbowTuckSlider - 5))}>
                      <Text style={styles.adjustValBtn}>- Tuck</Text>
                    </TouchableOpacity>
                    <Text style={styles.valText}>{elbowTuckSlider}°</Text>
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setElbowTuckSlider(Math.min(45, elbowTuckSlider + 5))}>
                      <Text style={styles.adjustValBtn}>+ Flare</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.thresholdInfo}>Threshold: turns Red if flare &gt; {THRESHOLDS.curl.tuckMax}°</Text>
                </View>
              </>
            )}

            {activeExercise === 'Pushups' && (
              <View style={styles.slideItem}>
                <Text style={styles.slideLabel}>Hip alignment offset: {hipSlider}°</Text>
                <View style={styles.sliderMockRow}>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setHipSlider(Math.max(140, hipSlider - 10))}>
                    <Text style={styles.adjustValBtn}>- Sag</Text>
                  </TouchableOpacity>
                  <Text style={styles.valText}>{hipSlider}°</Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={() => setHipSlider(Math.min(220, hipSlider + 10))}>
                    <Text style={styles.adjustValBtn}>+ Pike</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.thresholdInfo}>Threshold: turns Red if hips sag beyond {180 - THRESHOLDS.pushup.sagMin}° or pike beyond {180 - THRESHOLDS.pushup.pikeMin}°</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

export default CameraScreen;
