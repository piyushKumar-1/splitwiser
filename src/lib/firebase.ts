import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBpeMGlRaqzVbEJGdGwDgqYU8XEF9P889o",
  authDomain: "eftro-1a3ab.firebaseapp.com",
  projectId: "eftro-1a3ab",
  storageBucket: "eftro-1a3ab.firebasestorage.app",
  messagingSenderId: "58456227178",
  appId: "1:58456227178:web:d725a76d6a859f32e2f913",
  measurementId: "G-0VPMJV77SM",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const firebaseAuth = getAuth(app);
