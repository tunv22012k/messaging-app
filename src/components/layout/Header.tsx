"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useNotification } from "@/context/NotificationContext";

export default function Header() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { unreadCount } = useNotification();

    const navItems = [
        {
            name: 'Bản đồ', href: '/map', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
            )
        },
        {
            name: 'Lịch đặt', href: '/my-bookings', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            name: 'Nhượng sân', href: '/marketplace', icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
            )
        },
        {
            name: 'Tin nhắn', href: '/chat', icon: (
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
            name: 'Cộng đồng', href: '/people', icon: (
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
