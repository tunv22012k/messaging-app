"use client";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import BottomNav from "@/components/layout/BottomNav";
import { useAuth } from "@/context/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { useRouter, useParams, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();

    // Initialize presence
    usePresence();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <div className="flex flex-col items-center gap-6">
                    {/* Spinner */}
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-gray-200"></div>
                        <div
                            className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin"
                            style={{ animationDuration: '0.8s' }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-300/50 animate-pulse"></div>
                        </div>
                    </div>
                    {/* Text */}
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            Đang tải...
                        </p>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    const isChatSection = pathname?.startsWith('/chat');
    // Safe check for chatId since params can be empty or have different structure
    const isChatDetail = params && 'chatId' in params && !!params.chatId;

    // logic for fixed layout pages
    const shouldHaveFixedLayout = isChatSection || pathname?.startsWith('/map');

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 flex-col">
            <Header />
            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar: Visible only in chat section. Mobile: Hidden if in detail view. Desktop: Always visible in chat section. */}
                <div className={`
                    flex-col flex-none w-full md:w-80 bg-white border-r border-gray-200
                    ${isChatSection ? (isChatDetail ? 'hidden md:flex' : 'flex') : 'hidden'}
                `}>
                    <Sidebar />
                </div>

                {/* Main Content: Always visible except on mobile chat list view (where sidebar takes over) */}
                <main className={`
                    flex-col flex-1 min-w-0
                    ${shouldHaveFixedLayout ? 'overflow-hidden' : 'overflow-y-auto'}
                    ${pathname === '/chat' ? 'hidden md:flex' : 'flex'}
                `}>
                    {children}
                </main>
            </div>

            {/* Bottom Navigation for Mobile */}
            <BottomNav />
        </div>
    );
}
