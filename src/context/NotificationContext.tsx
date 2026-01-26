"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import echo from "@/lib/echo";

interface NotificationContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
    unreadCount: 0,
    refreshUnreadCount: async () => { },
});

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async () => {
        if (!user) return;
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('http://localhost:8000/api/messages/unread-count', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.count);
            }
        } catch (error) {
            console.error("Failed to fetch unread count", error);
        }
    };

    useEffect(() => {
        if (!user) return;
        fetchUnreadCount();

        if (typeof window === 'undefined' || !echo) return;

        const subscriptionTimeout = setTimeout(() => {
            const token = localStorage.getItem('auth_token');
            if (token && echo.connector) {
                echo.connector.options.auth.headers['Authorization'] = `Bearer ${token}`;
            }

            const channelName = `App.Models.User.${user.uid}`;
            const channel = echo.private(channelName);

            channel.listen('.UserReceivedMessage', (e: any) => {
                const msg = e.message;
                if (msg && String(msg.sender_id) !== String(user.id)) {
                    setUnreadCount(prev => prev + 1);
                }
            });

            // Listen for local refresh events (e.g. from chat window)
            const handleRefresh = () => fetchUnreadCount();
            window.addEventListener('REFRESH_UNREAD_COUNT', handleRefresh);

            return () => {
                channel.stopListening('.UserReceivedMessage');
                window.removeEventListener('REFRESH_UNREAD_COUNT', handleRefresh);
            };
        }, 500);

        return () => clearTimeout(subscriptionTimeout);
    }, [user]);

    return (
        <NotificationContext.Provider value={{ unreadCount, refreshUnreadCount: fetchUnreadCount }}>
            {children}
        </NotificationContext.Provider>
    );
};
