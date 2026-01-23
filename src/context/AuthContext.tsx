"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@/types";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => void;
    signInWithFacebook: () => void;
    logout: () => Promise<void>;
    loginWithToken: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signInWithGoogle: () => { },
    signInWithFacebook: () => { },
    logout: async () => { },
    loginWithToken: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Function to map Backend User to Frontend User Interface
    const mapBackendUser = (backendUser: any): User => {
        return {
            uid: backendUser.google_id || String(backendUser.id),
            displayName: backendUser.name,
            email: backendUser.email,
            avatar: backendUser.avatar,
            createdAt: new Date(backendUser.created_at).getTime(),
            lastSeen: new Date(backendUser.updated_at).getTime(),
            connections: [],
            google_id: backendUser.google_id,
            id: backendUser.id,
        };
    };

    const fetchUser = async (token: string) => {
        try {
            const response = await fetch('http://localhost:8000/api/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(mapBackendUser(data));
            } else {
                localStorage.removeItem('auth_token');
                setUser(null);
            }
        } catch (error) {
            console.error("Failed to fetch user:", error);
            localStorage.removeItem('auth_token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            fetchUser(token);
        } else {
            setLoading(false);
        }
    }, []);

    const signInWithGoogle = () => {
        // Redirect to Backend Socialite Endpoint
        window.location.href = 'http://localhost:8000/api/auth/google/redirect';
    };

    const signInWithFacebook = () => {
        console.warn("Facebook login not yet implemented");
        // window.location.href = 'http://localhost:8000/api/auth/facebook/redirect';
    };

    const loginWithToken = async (token: string) => {
        localStorage.setItem('auth_token', token);
        await fetchUser(token);
    };

    const logout = async () => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            try {
                await fetch('http://localhost:8000/api/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    }
                });
            } catch (error) {
                console.error("Logout failed", error);
            }
        }
        localStorage.removeItem('auth_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signInWithFacebook, logout, loginWithToken }}>
            {children}
        </AuthContext.Provider>
    );
};
