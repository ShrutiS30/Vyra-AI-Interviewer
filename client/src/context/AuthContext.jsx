import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase';

const AuthContext = createContext(null);
const LOCAL_USER_KEY = 'ai_interviewer_current_user';
const LOCAL_ACCOUNTS_KEY = 'ai_interviewer_accounts';

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function register(email, password, displayName) {
    if (!isFirebaseConfigured) {
      const accounts = JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) || '{}');
      const normalizedEmail = email.trim().toLowerCase();
      if (accounts[normalizedEmail]) {
        const err = new Error('Email already in use');
        err.code = 'auth/email-already-in-use';
        throw err;
      }
      const user = { uid: normalizedEmail, email: normalizedEmail, displayName: displayName || normalizedEmail.split('@')[0] };
      accounts[normalizedEmail] = { ...user, password };
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
      setCurrentUser(user);
      return { user };
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      displayName,
      createdAt: serverTimestamp()
    });
    return userCredential;
  }

  async function login(email, password) {
    if (!isFirebaseConfigured) {
      const accounts = JSON.parse(localStorage.getItem(LOCAL_ACCOUNTS_KEY) || '{}');
      const normalizedEmail = email.trim().toLowerCase();
      const acc = accounts[normalizedEmail];
      if (!acc || acc.password !== password) {
        const err = new Error('Invalid email or password');
        err.code = 'auth/invalid-credential';
        throw err;
      }
      const user = { uid: acc.uid, email: acc.email, displayName: acc.displayName };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
      setCurrentUser(user);
      return { user };
    }
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    if (!isFirebaseConfigured) {
      localStorage.removeItem(LOCAL_USER_KEY);
      setCurrentUser(null);
      return;
    }
    return signOut(auth);
  }

  useEffect(() => {
    if (!isFirebaseConfigured) {
      const saved = localStorage.getItem(LOCAL_USER_KEY);
      if (saved) {
        try { setCurrentUser(JSON.parse(saved)); } catch {}
      }
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isFirebaseConfigured,
    register,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
