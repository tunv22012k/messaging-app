"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";

import { useEffect, useState } from "react";
import echo from "@/lib/echo";

export default function Header() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread count
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

    // Initial fetch - separate effect
    useEffect(() => {
        if (!user) return;
        fetchUnreadCount();
    }, [user]);

    // WebSocket subscription - only on client side
    useEffect(() => {
        if (!user) return;

        // Ensure we're on client side and echo is available
        if (typeof window === 'undefined' || !echo) {
            console.log("[Header] Echo not available yet");
            return;
        }

        // Delay subscription slightly to ensure Echo is fully connected
        const subscriptionTimeout = setTimeout(() => {
            // Ensure Echo is authenticated for private channel
            const token = localStorage.getItem('auth_token');
            if (token && echo.connector) {
                echo.connector.options.auth.headers['Authorization'] = `Bearer ${token}`;
            }

            // Listen for real-time messages
            // We use the same channel as Sidebar: App.Models.User.{id}
            const channelName = `App.Models.User.${user.uid}`; // uid is usually google_id or id
            console.log("[Header] Subscribing to channel:", channelName);

            const channel = echo.private(channelName);

            const handleMessage = (e: any) => {
                console.log("[Header] Received UserReceivedMessage:", e);
                const msg = e.message;
                if (msg) {
                    // Check if message is from me
                    const isFromMe = String(msg.sender_id) === String(user.id);

                    if (!isFromMe) {
                        console.log("[Header] Incrementing unread count");
                        setUnreadCount(prev => prev + 1);
                    }
                }
            };

            channel.listen('.UserReceivedMessage', handleMessage);

            // Store cleanup function
            (window as any).__headerChannelCleanup = () => {
                console.log("[Header] Cleaning up channel subscription");
                channel.stopListening('.UserReceivedMessage');
            };
        }, 500); // Wait 500ms for Echo to be fully ready

        // Listen for local event to refresh (when user reads messages)
        const handleRefresh = () => {
            console.log("[Header] Refreshing unread count");
            fetchUnreadCount();
        };
        window.addEventListener('REFRESH_UNREAD_COUNT', handleRefresh);

        return () => {
            clearTimeout(subscriptionTimeout);
            if ((window as any).__headerChannelCleanup) {
                (window as any).__headerChannelCleanup();
            }
            window.removeEventListener('REFRESH_UNREAD_COUNT', handleRefresh);
        };
    }, [user]);

    const navItems = [
        {
            name: 'Map', href: '/map', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
            )
        },
        {
            name: 'Bookings', href: '/my-bookings', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            name: 'Market', href: '/marketplace', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
            )
        },
        {
            name: 'Chat', href: '/chat', icon: (
                <div className="relative">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    {unreadCount > 0 && (
                        <span className="absolute -top-2.5 -right-3 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-[10px] font-bold text-white bg-gradient-to-br from-red-500 via-red-600 to-rose-600 rounded-full border-2 border-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </div>
            )
        },
        {
            name: 'People', href: '/people', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )
        },
    ];

    return (
        <header className="h-16 flex-none bg-white border-b border-gray-200 px-4 md:px-8 flex items-center justify-between z-20 shadow-sm relative">
            {/* Left: Logo / Home */}
            <div className="flex items-center gap-2 md:gap-4 flex-none w-auto md:w-48">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg group-hover:bg-blue-700 transition-colors">
                        S
                    </div>
                    <span className="font-bold text-gray-900 text-lg hidden md:block group-hover:text-blue-600 transition-colors">
                        SportsBook
                    </span>
                </Link>
            </div>

            {/* Center: Navigation - Hidden on mobile, visible on desktop */}
            {user && (
                <div className="hidden md:flex items-center gap-2">
                    {navItems.map((item) => {
                        const isActive = pathname?.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-2 px-1 md:px-3 py-2 rounded-xl transition-all ${isActive
                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                                    }`}
                            >
                                {item.icon}
                                <span className={`text-sm hidden md:block ${isActive ? 'font-semibold' : ''}`}>{item.name}</span>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Right: User User */}
            <div className="flex items-center gap-2 md:gap-4 flex-none w-auto md:w-48 justify-end">
                {user && (
                    <>
                        <button
                            onClick={() => router.push('/profile')}
                            className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition-colors"
                        >
                            <span className="text-sm font-medium text-gray-700 hidden lg:block">
                                {user.displayName}
                            </span>
                            <img
                                src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}`}
                                alt={user.displayName || "User"}
                                className="h-9 w-9 rounded-full object-cover border border-gray-200"
                            />
                        </button>

                        <button
                            onClick={async () => {
                                await logout();
                                router.push('/login');
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Logout"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </>
                )}
            </div>
        </header>
    );
}
