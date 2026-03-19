import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { ref, onValue } from "firebase/database";
import { db } from "../firebaseConfig";

export type SoilData = {
  moisture: number;
  waterFlow: number;
  lastUpdated: Date | null;
};

export type WeatherData = {
  condition: string;
  temperature: number;
  icon: string;
  isRaining: boolean;
  lastUpdated: Date | null;
};

type SoilDataContextType = {
  soil: SoilData;
  weather: WeatherData;
  isLoadingSoil: boolean;
  isLoadingWeather: boolean;
  soilError: string | null;
  weatherError: string | null;
  refreshSoil: () => void;
  refreshWeather: () => void;
  weatherApiKey: string;
  setWeatherApiKey: (key: string) => void;
  firebaseUrl: string;
  setFirebaseUrl: (url: string) => void;
};

const defaultSoil: SoilData = {
  moisture: 0,
  waterFlow: 0,
  lastUpdated: null,
};

const defaultWeather: WeatherData = {
  condition: "",
  temperature: 0,
  icon: "",
  isRaining: false,
  lastUpdated: null,
};

const SoilDataContext = createContext<SoilDataContextType>({
  soil: defaultSoil,
  weather: defaultWeather,
  isLoadingSoil: false,
  isLoadingWeather: false,
  soilError: null,
  weatherError: null,
  refreshSoil: () => {},
  refreshWeather: () => {},
  weatherApiKey: "",
  setWeatherApiKey: () => {},
  firebaseUrl: "",
  setFirebaseUrl: () => {},
});

const STORAGE_KEYS = {
  WEATHER_API_KEY: "@smartsoil/weather_api_key",
  FIREBASE_URL: "@smartsoil/firebase_url",
  SOIL_CACHE: "@smartsoil/soil_cache",
  WEATHER_CACHE: "@smartsoil/weather_cache",
};

// Coordinates for Davao City
const DAVAO_CITY_COORDS = { lat: 7.1907, lon: 125.4553 };
const REFRESH_INTERVAL_MS = 30_000;

export function SoilDataProvider({ children }: { children: React.ReactNode }) {
  const [soil, setSoil] = useState<SoilData>(defaultSoil);
  const [weather, setWeather] = useState<WeatherData>(defaultWeather);
  const [isLoadingSoil, setIsLoadingSoil] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [soilError, setSoilError] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherApiKey, setWeatherApiKeyState] = useState("");
  const [firebaseUrl, setFirebaseUrlState] = useState("");

  const weatherTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const [apiKey, fbUrl, soilCache, weatherCache] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.WEATHER_API_KEY),
        AsyncStorage.getItem(STORAGE_KEYS.FIREBASE_URL),
        AsyncStorage.getItem(STORAGE_KEYS.SOIL_CACHE),
        AsyncStorage.getItem(STORAGE_KEYS.WEATHER_CACHE),
      ]);
      if (apiKey) setWeatherApiKeyState(apiKey);
      if (fbUrl) setFirebaseUrlState(fbUrl);
      if (soilCache) {
        const parsed = JSON.parse(soilCache);
        setSoil({ ...parsed, lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated) : null });
      }
      if (weatherCache) {
        const parsed = JSON.parse(weatherCache);
        setWeather({ ...parsed, lastUpdated: parsed.lastUpdated ? new Date(parsed.lastUpdated) : null });
      }
    } catch {
      // ignore cache errors
    }
  }

 // --- FIREBASE REALTIME LISTENER ---
  useEffect(() => {
    setIsLoadingSoil(true);
    setSoilError(null);

    // 1. Listen to the /sensor node your ESP32 is writing to
    const sensorRef = ref(db, '/sensor');
    
    const unsubscribeSensor = onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      
      if (data) {
        setSoil(prev => {
          const newSoil = {
            ...prev,
            // Match the exact variable name from your ESP32 ("/sensor/moisture")
            moisture: typeof data?.moisture === "number" ? Math.max(0, Math.min(100, data.moisture)) : prev.moisture,
            // Note: ESP32 doesn't have a water flow sensor yet, so we keep this at 0 for now
            waterFlow: typeof data?.water_flow === "number" ? data.water_flow : 0, 
            lastUpdated: new Date(),
          };
          AsyncStorage.setItem(STORAGE_KEYS.SOIL_CACHE, JSON.stringify(newSoil));
          return newSoil;
        });
      }
      setIsLoadingSoil(false);
    }, (error) => {
      setSoilError(`Firebase error: ${error.message}`);
      setIsLoadingSoil(false);
    });

    // 2. Optional but awesome: Listen to the /status node so your app knows what the pump is doing!
    const statusRef = ref(db, '/status');
    const unsubscribeStatus = onValue(statusRef, (snapshot) => {
      const statusText = snapshot.val();
      if (statusText) {
        console.log("ESP32 Status:", statusText); 
        // You can save this to state later to show "Irrigating (Dry Soil)" on your dashboard!
      }
    });

    return () => {
      unsubscribeSensor();
      unsubscribeStatus();
    };
  }, []);

  // --- WEATHER REST API ---
  const fetchWeatherData = useCallback(async (apiKey: string) => {
    if (!apiKey) {
      setWeatherError("No OpenWeatherMap API key. Go to Settings to configure.");
      return;
    }
    setIsLoadingWeather(true);
    setWeatherError(null);
    try {
      const { lat, lon } = DAVAO_CITY_COORDS;
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
      const data = await res.json();
      const condition: string = data?.weather?.[0]?.main ?? "";
      const newWeather: WeatherData = {
        condition,
        temperature: Math.round(data?.main?.temp ?? 0),
        icon: data?.weather?.[0]?.icon ?? "",
        isRaining: ["Rain", "Drizzle", "Thunderstorm"].includes(condition),
        lastUpdated: new Date(),
      };
      setWeather(newWeather);
      await AsyncStorage.setItem(STORAGE_KEYS.WEATHER_CACHE, JSON.stringify(newWeather));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch weather";
      setWeatherError(msg);
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  useEffect(() => {
    if (weatherApiKey) {
      fetchWeatherData(weatherApiKey);
      weatherTimerRef.current = setInterval(() => fetchWeatherData(weatherApiKey), REFRESH_INTERVAL_MS * 2);
    }
    return () => {
      if (weatherTimerRef.current) clearInterval(weatherTimerRef.current);
    };
  }, [weatherApiKey, fetchWeatherData]);

  // Pull-to-refresh for weather (Soil is automatic now, so it just simulates a refresh)
  const refreshSoil = useCallback(() => {
    // Soil updates automatically via Firebase, so we just clear errors if any
    setSoilError(null);
  }, []);

  const refreshWeather = useCallback(() => {
    fetchWeatherData(weatherApiKey);
  }, [fetchWeatherData, weatherApiKey]);

  const setWeatherApiKey = useCallback(async (key: string) => {
    setWeatherApiKeyState(key);
    await AsyncStorage.setItem(STORAGE_KEYS.WEATHER_API_KEY, key);
  }, []);

  const setFirebaseUrl = useCallback(async (url: string) => {
    setFirebaseUrlState(url);
    await AsyncStorage.setItem(STORAGE_KEYS.FIREBASE_URL, url);
  }, []);

  return (
    <SoilDataContext.Provider
      value={{
        soil,
        weather,
        isLoadingSoil,
        isLoadingWeather,
        soilError,
        weatherError,
        refreshSoil,
        refreshWeather,
        weatherApiKey,
        setWeatherApiKey,
        firebaseUrl,
        setFirebaseUrl,
      }}
    >
      {children}
    </SoilDataContext.Provider>
  );
}

export function useSoilData() {
  return useContext(SoilDataContext);
}