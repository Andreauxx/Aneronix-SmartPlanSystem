import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ref, onValue, update, get, child } from "firebase/database";
import { db } from "../firebaseConfig";

export type SoilData = {
  moisture: number;
  waterFlow: number;
  totalLiters: number;
  waterSaved: number;
  systemStatus: string;
  waterDepleted: boolean;
  lastUpdated: Date | null;
  // --- NEW: Predictive & Budget Data ---
  moistureHistory: number[]; // For the Trend Graph
  nextRunTime: string;       // Estimated next irrigation
  dailyBudget: number;       // Liters allowed per day
};

export type HourlyForecast = {
  time: string;
  temp: number;
  pop: number; 
  icon: string;
  condition: string;
};

export type WeatherData = {
  condition: string;
  temperature: number;
  icon: string;
  isRaining: boolean;
  pop: number; 
  hourly: HourlyForecast[];
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
};

const defaultSoil: SoilData = {
  moisture: 0,
  waterFlow: 0,
  totalLiters: 0,
  waterSaved: 0,
  systemStatus: "Waiting for ESP32...",
  waterDepleted: false,
  lastUpdated: null,
  moistureHistory: [],
  nextRunTime: "Calculating...",
  dailyBudget: 5.0, // Default 5L budget
};

const SoilDataContext = createContext<SoilDataContextType>({
  soil: defaultSoil,
  weather: {} as WeatherData,
  isLoadingSoil: false,
  isLoadingWeather: false,
  soilError: null,
  weatherError: null,
  refreshSoil: () => {},
  refreshWeather: () => {},
});

const DAVAO_CITY_COORDS = { lat: 7.1907, lon: 125.4553 };

export function SoilDataProvider({ children }: { children: React.ReactNode }) {
  const [soil, setSoil] = useState<SoilData>(defaultSoil);
  const [weather, setWeather] = useState<WeatherData>({} as WeatherData);
  const [isLoadingSoil, setIsLoadingSoil] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [soilError, setSoilError] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const calculateNextRun = (currentMoisture: number, history: number[]) => {
    if (history.length < 2 || currentMoisture <= 30) return "Soon";
    
    // Calculate average drop per reading (every 30s)
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    const dropRate = prev - last; // moisture points lost per interval

    if (dropRate <= 0) return "Steady";

    const pointsToTarget = currentMoisture - 30;
    const intervalsUntilTarget = pointsToTarget / dropRate;
    const minutesUntilTarget = (intervalsUntilTarget * 30) / 60;

    const runDate = new Date(Date.now() + minutesUntilTarget * 60000);
    return runDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  useEffect(() => {
    setIsLoadingSoil(true);
    
    // 1. Listen for Real-time Sensors
    const sensorRef = ref(db, '/sensor');
    const unsubSensor = onValue(sensorRef, (snap) => {
      const data = snap.val();
      if (data) {
        setSoil(prev => {
          const newHistory = [...prev.moistureHistory, data.moisture || 0].slice(-20);
          return {
            ...prev,
            moisture: data.moisture || 0,
            waterFlow: data.flowRate || 0,
            totalLiters: data.totalLiters || 0,
            waterSaved: data.waterSaved || 0,
            waterDepleted: data.waterDepleted ?? false,
            moistureHistory: newHistory,
            nextRunTime: calculateNextRun(data.moisture || 0, newHistory),
            lastUpdated: new Date(),
          };
        });
      }
      setIsLoadingSoil(false);
    });

    // 2. Listen for User Settings (Budget)
    const controlRef = ref(db, '/control');
    const unsubControl = onValue(controlRef, (snap) => {
      const data = snap.val();
      if (data?.dailyBudget) {
        setSoil(prev => ({ ...prev, dailyBudget: data.dailyBudget }));
      }
    });

    const statusRef = ref(db, '/status');
    const unsubStatus = onValue(statusRef, (snap) => {
      if (snap.val()) setSoil(prev => ({ ...prev, systemStatus: snap.val() }));
    });

    return () => { unsubSensor(); unsubControl(); unsubStatus(); };
  }, []);

  const fetchWeatherData = useCallback(async () => {
    setIsLoadingWeather(true);
    try {
      const apiKey = "755f1eb93900330866d7f29e3323fa0c"; 
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${DAVAO_CITY_COORDS.lat}&lon=${DAVAO_CITY_COORDS.lon}&appid=${apiKey}&units=metric`;
      
      const res = await fetch(url);
      const data = await res.json();
      
      const current = data.list[0];
      const currentPop = Math.round((current.pop || 0) * 100);

      const hourlyData = data.list.slice(0, 5).map((item: any) => ({
        time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: 'numeric' }),
        temp: Math.round(item.main.temp),
        pop: Math.round((item.pop || 0) * 100),
        icon: item.weather[0].icon,
        condition: item.weather[0].main
      }));
      
      setWeather({
        condition: current.weather[0].main,
        temperature: Math.round(current.main.temp),
        icon: current.weather[0].icon,
        isRaining: current.weather[0].main.includes("Rain"),
        pop: currentPop,
        hourly: hourlyData,
        lastUpdated: new Date(),
      });

      // Firebase Sync for rain
      const controlSnap = await get(child(ref(db), 'control'));
      const ctrl = controlSnap.val();
      if (!ctrl?.weatherOverride) {
        update(ref(db, '/sensor'), { rain: currentPop });
      }
    } catch (err: any) {
      setWeatherError(err.message);
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  useEffect(() => { fetchWeatherData(); }, [fetchWeatherData]);

  return (
    <SoilDataContext.Provider value={{ soil, weather, isLoadingSoil, isLoadingWeather, soilError, weatherError, refreshSoil: () => {}, refreshWeather: fetchWeatherData }}>
      {children}
    </SoilDataContext.Provider>
  );
}

export function useSoilData() {
  return useContext(SoilDataContext);
}