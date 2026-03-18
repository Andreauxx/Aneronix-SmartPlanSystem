import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

// This manually forces Expo to look into your local /app folder
export function App() {
  const ctx = require.context('./app'); 
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);