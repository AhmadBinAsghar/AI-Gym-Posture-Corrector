package com.margelo.nitro.poselandmarker

import android.speech.tts.TextToSpeech
import androidx.annotation.Keep
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import java.util.Locale

@DoNotStrip
@Keep
class HybridSpeaker : HybridSpeakerSpec() {
  private var tts: TextToSpeech? = null
  private var ready = false
  private var pending: String? = null

  private fun ensureEngine() {
    if (tts != null) return
    val context = NitroModules.applicationContext ?: return
    tts =
      TextToSpeech(context) { status ->
        synchronized(this) {
          if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale.US
            ready = true
            pending?.let { tts?.speak(it, TextToSpeech.QUEUE_FLUSH, null, "posture") }
            pending = null
          }
        }
      }
  }

  override fun speak(text: String) {
    synchronized(this) {
      ensureEngine()
      if (ready) {
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "posture")
      } else {
        pending = text
      }
    }
  }

  override fun stop() {
    synchronized(this) {
      pending = null
      tts?.stop()
    }
  }

  override fun dispose() {
    synchronized(this) {
      tts?.stop()
      tts?.shutdown()
      tts = null
      ready = false
    }
    super.dispose()
  }
}
