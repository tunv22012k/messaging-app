"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
// Firebase imports removed
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
    const { user } = useAuth();
    const router = useRouter();

    const [displayName, setDisplayName] = useState("");
    const [avatar, setAvatar] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || "");
            setAvatar(user.avatar || "");
        }
    }, [user]);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // Disabled
        alert("Upload disabled during migration");
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        alert("Profile update disabled during migration");
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-50">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-gray-800">Edit Profile</h1>
                    <Link href="/" className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </Link>
                </div>

                <div className="text-center text-gray-500 mb-6">
                    Profile editing is temporarily disabled.
                </div>
            </div>
        </div>
    );
}
