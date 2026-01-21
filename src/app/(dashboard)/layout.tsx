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
            <div className="flex h-screen items-center justify-center">
                Loading...
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
