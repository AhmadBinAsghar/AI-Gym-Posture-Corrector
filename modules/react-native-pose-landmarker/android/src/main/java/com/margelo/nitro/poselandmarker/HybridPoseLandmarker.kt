package com.margelo.nitro.poselandmarker

import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseDetector
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions
import com.margelo.nitro.camera.HybridFrameSpec
import com.margelo.nitro.camera.public.NativeFrame

@DoNotStrip
@Keep
class HybridPoseLandmarker : HybridPoseLandmarkerSpec() {
  // STREAM_MODE tracks the person across frames; fastest option for live video.
  private val detector: PoseDetector =
    PoseDetection.getClient(
      PoseDetectorOptions.Builder()
        .setDetectorMode(PoseDetectorOptions.STREAM_MODE)
        .build(),
    )

  override fun detect(frame: HybridFrameSpec): PoseResult {
    val nativeFrame =
      frame as? NativeFrame
        ?: throw IllegalArgumentException("Expected a VisionCamera native frame.")
    val proxy = nativeFrame.image
    val mediaImage =
      proxy.image
        ?: throw UnsupportedOperationException("VisionCamera frame does not expose a media image.")

    val rotation = proxy.imageInfo.rotationDegrees
    val input = InputImage.fromMediaImage(mediaImage, rotation)
    // ML Kit reports coordinates in the upright (rotation applied) image space.
    val sideways = rotation == 90 || rotation == 270
    val width = (if (sideways) input.height else input.width).toDouble()
    val height = (if (sideways) input.width else input.height).toDouble()

    val pose = Tasks.await(detector.process(input))

    if (pose.allPoseLandmarks.isEmpty()) return PoseResult(width, height, emptyArray())

    // Always emit all 33 slots in ML Kit order; missing ones get confidence 0.
    val landmarks =
      Array(33) { type ->
        val lm = pose.getPoseLandmark(type)
        if (lm == null) {
          PoseLandmark(0.0, 0.0, 0.0)
        } else {
          PoseLandmark(lm.position.x.toDouble(), lm.position.y.toDouble(), lm.inFrameLikelihood.toDouble())
        }
      }
    return PoseResult(width, height, landmarks)
  }

  override fun dispose() {
    runCatching { detector.close() }
    super.dispose()
  }
}
