"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import echo from "@/lib/echo";
import { useAuth } from "@/context/AuthContext";

interface PresenceContextType {
    onlineUsers: any[];
    isUserOnline: (uid: string) => boolean;
}

const PresenceContext = createContext<PresenceContextType>({
    onlineUsers: [],
    isUserOnline: () => false,
});

export const usePresence = () => useContext(PresenceContext);

export const PresenceProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

    useEffect(() => {
        if (!user || !echo) return;

        const token = localStorage.getItem('auth_token');
        if (token && echo.connector) {
            echo.connector.options.auth.headers['Authorization'] = `Bearer ${token}`;
        }

        console.log("PresenceProvider: Joining presence channel");
        const channel = echo.join('presence');

        channel
            .here((users: any[]) => {
                console.log("PresenceProvider: here", users);
                setOnlineUsers(users);
            })
            .joining((joinedUser: any) => {
                console.log("PresenceProvider: joining", joinedUser);
                setOnlineUsers(prev => {
                    if (prev.find(u => u.id === joinedUser.id)) return prev;
                    return [...prev, joinedUser];
                });
            })
            .leaving((leftUser: any) => {
                console.log("PresenceProvider: leaving", leftUser);
                setOnlineUsers(prev => prev.filter(u => u.id !== leftUser.id));
            })
            .error((error: any) => {
                console.error('PresenceProvider error:', error);
            });

        return () => {
            console.log("PresenceProvider: Leaving presence channel");
            echo.leave('presence');
        };
    }, [user]);

    const isUserOnline = (uid: string) => {
        return onlineUsers.some(u =>
            String(u.id) === String(uid) ||
            (u.google_id && String(u.google_id) === String(uid))
        );
    };

    return (
        <PresenceContext.Provider value={{ onlineUsers, isUserOnline }}>
            {children}
        </PresenceContext.Provider>
    );
};
