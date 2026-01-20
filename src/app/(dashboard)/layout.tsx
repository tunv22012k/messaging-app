"use client";

import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const isChatActive = !!params?.chatId;

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

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100">
            <div className={`${isChatActive ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-none flex-col`}>
                <Sidebar />
            </div>
            <main className={`flex-1 min-w-0 overflow-hidden flex-col ${isChatActive ? 'flex' : 'hidden md:flex'}`}>
                {children}
            </main>
        </div>
    );
}
