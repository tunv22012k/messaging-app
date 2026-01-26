"use client";

import { useEffect, useState } from "react";

interface LoadingOverlayProps {
    isLoading: boolean;
    message?: string;
    fullScreen?: boolean;
}

export default function LoadingOverlay({
    isLoading,
    message = "Đang tải...",
    fullScreen = true
}: LoadingOverlayProps) {
    const [show, setShow] = useState(false);

    // Delay showing to prevent flash for fast loads
    useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => setShow(true), 100);
            return () => clearTimeout(timer);
        } else {
            setShow(false);
        }
    }, [isLoading]);

    if (!show) return null;

    return (
        <div
            className={`${fullScreen ? 'fixed' : 'absolute'} inset-0 z-[9999] flex items-center justify-center bg-white/50 backdrop-blur-[2px] transition-all duration-300`}
            style={{ animation: 'fadeIn 0.3s ease-out' }}
        >
            <div className="flex flex-col items-center gap-6">
                {/* Main Spinner */}
                <div className="relative">
                    {/* Outer ring */}
                    <div className="w-20 h-20 rounded-full border-4 border-gray-200"></div>

                    {/* Spinning gradient ring */}
                    <div
                        className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin"
                        style={{ animationDuration: '0.8s' }}
                    ></div>

                    {/* Inner pulsing dot */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-300/50 animate-pulse"></div>
                    </div>
                </div>

                {/* Loading Text */}
                <div className="flex flex-col items-center gap-2">
                    <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {message}
                    </p>

                    {/* Animated dots */}
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}

// Simple spinner for inline use
export function Spinner({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
    const sizeClasses = {
        sm: "w-4 h-4 border-2",
        md: "w-8 h-8 border-3",
        lg: "w-12 h-12 border-4"
    };

    return (
        <div className={`${sizeClasses[size]} rounded-full border-gray-200 border-t-blue-500 animate-spin ${className}`}></div>
    );
}

// Page loading component for pages
export function PageLoading({ message = "Đang tải..." }: { message?: string }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6">
                {/* Fancy spinner */}
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

                <p className="text-gray-500 font-medium">{message}</p>
            </div>
        </div>
    );
}
