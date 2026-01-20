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
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
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

    const syncUserToFirestore = async (fUser: FirebaseUser) => {
        const userRef = doc(db, "users", fUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            const newUser: User = {
                uid: fUser.uid,
                displayName: fUser.displayName,
                email: fUser.email,
                photoURL: fUser.photoURL,
                createdAt: Date.now(),
                lastSeen: Date.now(),
            };
            await setDoc(userRef, newUser);
            setUser(newUser);
        } else {
            setUser(userSnap.data() as User);
            // Optionally update lastSeen here or in presence logic
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
            try {
                setFirebaseUser(fUser);
                if (fUser) {
                    console.log("AuthContext: User authenticated, syncing to Firestore...", fUser.uid);
                    await syncUserToFirestore(fUser);
                    console.log("AuthContext: User synced successfully");
                } else {
                    console.log("AuthContext: No user authenticated");
                    setUser(null);
                }
            } catch (error) {
                console.error("AuthContext: Error during auth state change", error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

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
