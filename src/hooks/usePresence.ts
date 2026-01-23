"use client";

import { useEffect, useState } from "react";
import echo from "@/lib/echo";
import { useAuth } from "@/context/AuthContext";

export function usePresence() {
    const { user } = useAuth();
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

    useEffect(() => {
        if (!user || !echo) return;

        const token = localStorage.getItem('auth_token');
        if (token && echo.connector) {
            echo.connector.options.auth.headers['Authorization'] = `Bearer ${token}`;
        }

        echo.join('presence')
            .here((users: any[]) => {
                setOnlineUsers(users);
            })
            .joining((joinedUser: any) => {
                setOnlineUsers(prev => {
                    if (prev.find(u => u.id === joinedUser.id)) return prev;
                    return [...prev, joinedUser];
                });
            })
            .leaving((leftUser: any) => {
                setOnlineUsers(prev => prev.filter(u => u.id !== leftUser.id));
            })
            .error((error: any) => {
                console.error('Presence error:', error);
            });

        return () => {
            echo.leave('presence');
        };
    }, [user]);

    // Helper to check if a specific user is online
    // Check against both id and google_id
    const isUserOnline = (uid: string) => {
        return onlineUsers.some(u =>
            String(u.id) === String(uid) ||
            (u.google_id && String(u.google_id) === String(uid))
        );
    };

    return { onlineUsers, isUserOnline };
}
