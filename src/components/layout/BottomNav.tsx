"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotification } from "@/context/NotificationContext";

export default function BottomNav() {
    const pathname = usePathname();
    const { unreadCount } = useNotification();

    const navItems = [
        {
            name: 'Bản đồ', href: '/map', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
            )
        },
        {
            name: 'Lịch đặt', href: '/my-bookings', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            name: 'Nhượng sân', href: '/marketplace', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
            )
        },
        {
            name: 'Tin nhắn', href: '/chat', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            )
        },
        {
            name: 'Cộng đồng', href: '/people', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )
        },
    ];

    return (
        <div className="md:hidden flex-none h-16 bg-white border-t border-gray-200 flex items-center justify-around px-2 pb-safe z-30">
            {navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href);
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`
                            flex flex-col items-center justify-center w-full h-full gap-1
                            ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
                        `}
                    >
                        <div className={`relative p-1 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
                            {item.icon}
                            {item.name === 'Tin nhắn' && unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm border border-white">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </div>
                        <span className="text-[10px] font-medium">{item.name}</span>
                    </Link>
                );
            })}
        </div>
    );
}
