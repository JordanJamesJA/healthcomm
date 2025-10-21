// services/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAvcvcLCKfXUF8WB77w_0q_NKeZe6QR3wA",
  authDomain: "healthcomm-bridge.firebaseapp.com",
  projectId: "healthcomm-bridge",
  storageBucket: "healthcomm-bridge.firebasestorage.app",
  messagingSenderId: "843637832607",
  appId: "1:843637832607:web:2768dee07258dc7478dbaa"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
