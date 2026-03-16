declare module 'react-native-config' {
  export interface NativeConfig {
    GROQ_API_KEY?: string;
    GROQ_MODEL?: string;
    GROQ_API_URL?: string;
    GROQ_STT_LANGUAGE?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
