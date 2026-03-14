declare module 'react-native-config' {
  export interface NativeConfig {
    GROQ_API_KEY?: string;
    GROQ_MODEL?: string;
    GROQ_API_URL?: string;
  }

  const Config: NativeConfig;
  export default Config;
}
