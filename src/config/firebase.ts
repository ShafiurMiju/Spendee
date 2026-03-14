/**
 * Firebase Configuration
 *
 * Replace the placeholder values below with your actual Firebase project config.
 * You can find these values in the Firebase Console:
 *   Project Settings → General → Your apps → SDK setup and configuration
 *
 * For production, use environment-specific config via react-native-config.
 */
import firebase from '@react-native-firebase/app';

// If the default app hasn't been initialised yet, configure it.
// When using @react-native-firebase the native SDKs handle init automatically
// via google-services.json (Android) and GoogleService-Info.plist (iOS).
// This file simply re-exports the firebase instance for convenience.

export default firebase;
