"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from "firebase/firestore";
import { User } from "@/types";
import { useAuth } from "@/context/AuthContext";

export default function PeoplePage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            if (!user) return;
            try {
                // Fetch all users except current user
                // In a real app, you might want pagination or search
                const q = query(collection(db, "users"), where("uid", "!=", user.uid));
                const querySnapshot = await getDocs(q);
                const usersList: User[] = [];
                querySnapshot.forEach((doc) => {
                    usersList.push(doc.data() as User);
                });
                setUsers(usersList);
            } catch (error) {
                console.error("Error fetching users:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [user]);

    const handleConnect = async (targetUser: User) => {
        if (!user || connecting) return;
        setConnecting(targetUser.uid);

        try {
            // 1. Add target to current user's connections
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                connections: arrayUnion(targetUser.uid)
            });

            // 2. Add current user to target's connections (Mutual)
            const targetRef = doc(db, "users", targetUser.uid);
            await updateDoc(targetRef, {
                connections: arrayUnion(user.uid)
            });

            // Update local state to reflect change immediately (optimistic UI)
            // or just let the user know. 
            // Ideally we reload or update the connection status.
            alert(`Connected with ${targetUser.displayName}!`);

        } catch (error) {
            console.error("Error connecting:", error);
            alert("Failed to connect. Please try again.");
        } finally {
            setConnecting(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center">Loading people...</div>;

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Connect with People</h1>

                {/* Search Bar */}
                <div className="relative w-full md:w-96">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search people..."
                        className="block w-full rounded-2xl border-0 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((u) => {
                    const isConnected = user?.connections?.includes(u.uid);

                    return (
                        <div key={u.uid} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-shadow hover:shadow-md">
                            <img
                                src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`}
                                alt={u.displayName || "User"}
                                className="h-16 w-16 rounded-full object-cover bg-gray-200"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-lg text-gray-900 truncate">{u.displayName}</h3>
                                <p className="text-sm text-gray-500 mb-3 truncate">{u.email}</p>

                                {isConnected ? (
                                    <button
                                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium cursor-default"
                                        disabled
                                    >
                                        Connected
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleConnect(u)}
                                        disabled={connecting === u.uid}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {connecting === u.uid ? "Connecting..." : "Connect"}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredUsers.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                    {users.length === 0 ? "No other users found." : "No users match your search."}
                </div>
            )}
        </div>
    );
}
