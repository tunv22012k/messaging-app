"use client";

import { useEffect, useState } from "react";
import { rtdb, db } from "@/lib/firebase";
import { ref, onValue, onDisconnect, set, serverTimestamp as rtdbServerTimestamp, push } from "firebase/database";
import { doc, updateDoc, serverTimestamp as firestoreServerTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

export function usePresence() {
    const { user } = useAuth();
    const [isOnline, setIsOnline] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;

        // References
        const userStatusDatabaseRef = ref(rtdb, `/status/${user.uid}`);
        const isOfflineForDatabase = {
            state: 'offline',
            last_changed: rtdbServerTimestamp(),
        };
        const isOnlineForDatabase = {
            state: 'online',
            last_changed: rtdbServerTimestamp(),
        };

        // Firestore ref to update 'lastSeen' persistently
        const userFirestoreRef = doc(db, "users", user.uid);

        const connectedRef = ref(rtdb, ".info/connected");

        // Listen to connection state
        const unsubscribe = onValue(connectedRef, async (snapshot) => {
            if (snapshot.val() === false) {
                setIsOnline(false);
                return;
            }

            // If we are connected:

            // 1. Set what happens on disconnect
            await onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase);

            // 2. Set current status to online
            await set(userStatusDatabaseRef, isOnlineForDatabase);
            setIsOnline(true);

            // 3. Update Firestore lastSeen (optional, good for cold queries)
            updateDoc(userFirestoreRef, {
                lastSeen: firestoreServerTimestamp()
            }).catch((e) => console.error("Error updating firestore lastSeen", e));

        });

        return () => {
            unsubscribe();
            // On unmount/logout, set offline immediately
            set(userStatusDatabaseRef, isOfflineForDatabase);
        };
    }, [user]);

    return isOnline;
}
