"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    User as FirebaseUser,
    onAuthStateChanged,
    GoogleAuthProvider,
    FacebookAuthProvider,
    signInWithPopup,
    signOut
} from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User } from "@/types";

interface AuthContextType {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithFacebook: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    firebaseUser: null,
    loading: true,
    signInWithGoogle: async () => { },
    signInWithFacebook: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (fUser) => {
            setFirebaseUser(fUser);
            if (!fUser) {
                setUser(null);
                setLoading(false);
            }
            // If fUser exists, the second useEffect will handle fetching/listening
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        let unsubscribeSnapshot: () => void;

        const setupUserListener = async () => {
            if (!firebaseUser) return;

            try {
                const userRef = doc(db, "users", firebaseUser.uid);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    const newUser: User = {
                        uid: firebaseUser.uid,
                        displayName: firebaseUser.displayName,
                        email: firebaseUser.email,
                        photoURL: firebaseUser.photoURL,
                        createdAt: Date.now(),
                        lastSeen: Date.now(),
                        connections: [],
                    };
                    await setDoc(userRef, newUser);
                }

                // Listen for real-time updates
                // Listen for real-time updates
                unsubscribeSnapshot = onSnapshot(userRef, (userDoc) => {
                    if (userDoc.exists()) {
                        setUser(userDoc.data() as User);
                    }
                    setLoading(false);
                });
            } catch (error) {
                console.error("Error setting up user listener", error);
                setLoading(false);
            }
        };

        setupUserListener();

        return () => {
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };
    }, [firebaseUser]);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const signInWithFacebook = async () => {
        const provider = new FacebookAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Facebook", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, firebaseUser, loading, signInWithGoogle, signInWithFacebook, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
