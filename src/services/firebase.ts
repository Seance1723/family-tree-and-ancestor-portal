import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  deleteDoc, 
  query, 
  where,
  writeBatch,
  updateDoc
} from "firebase/firestore";

// Firebase credentials from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyBDQjNBWCIHvWMJcr_1HDpWVnoCEE2GzSc",
  authDomain: "authentic-tape-ptsmh.firebaseapp.com",
  projectId: "authentic-tape-ptsmh",
  storageBucket: "authentic-tape-ptsmh.firebasestorage.app",
  messagingSenderId: "1063917337906",
  appId: "1:1063917337906:web:1dfa951d41d088f0bb6b2b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with custom database ID
const customDatabaseId = "ai-studio-familytreeandanc-3611d477-1ba2-4d09-b5c1-eade213518da";
export const db = initializeFirestore(app, {}, customDatabaseId);

export { 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  updateDoc
};
export type { User };
