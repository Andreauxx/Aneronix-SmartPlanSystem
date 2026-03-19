import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBGS-d094tj8OM775FQlnkrBpdMqT-aEbE",
  authDomain: "aneronix-73847.firebaseapp.com",
  databaseURL: "https://aneronix-73847-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aneronix-73847",
  storageBucket: "aneronix-73847.firebasestorage.app",
  messagingSenderId: "650428902272",
  appId: "1:650428902272:web:fa61e701421f5487062f65"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

// READ DATA
export const listenToMoisture = (callback: any) => {
  const moistureRef = ref(db, "sensor/moisture");
  onValue(moistureRef, (snapshot) => {
    callback(snapshot.val());
  });
};

// CONTROL PUMP
export const setPump = (value: number) => {
  set(ref(db, "control/manual"), value);
};