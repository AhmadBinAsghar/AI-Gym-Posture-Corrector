import type { HybridObject } from 'react-native-nitro-modules';

/** Thin wrapper around Android's built-in TextToSpeech engine. */
export interface Speaker extends HybridObject<{ android: 'kotlin' }> {
  /** Speaks `text`, replacing anything currently being spoken. */
  speak(text: string): void;
  /** Stops any speech in progress. */
  stop(): void;
}
