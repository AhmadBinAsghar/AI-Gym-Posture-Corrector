package com.gymposturecorrector

import android.content.pm.ActivityInfo
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.ViewManager

/**
 * Locks the screen orientation from JS. Pushups are filmed lying down, and a portrait frame is
 * far too narrow for a horizontal body: the user had to back into the far corner of the room
 * to fit, which left the arms 20-30px long and the elbow angle too noisy to count reps. The
 * pushup camera screen therefore asks for landscape; everything else stays portrait.
 *
 * SENSOR_LANDSCAPE picks whichever landscape way up the phone is held, and does so even with
 * the system auto-rotate switched off (which it is on many phones).
 */
class OrientationModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "OrientationLock"

  private fun request(orientation: Int) {
    UiThreadUtil.runOnUiThread {
      reactApplicationContext.currentActivity?.requestedOrientation = orientation
    }
  }

  @ReactMethod
  fun lockLandscape() = request(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE)

  @ReactMethod
  fun lockPortrait() = request(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
}

class OrientationPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(OrientationModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
