"use client";

import { useEffect, useState } from "react";
import { User } from "@/types";
import { useAuth } from "@/context/AuthContext";

export default function PeoplePage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const token = localStorage.getItem('auth_token');

        fetch('http://localhost:8000/api/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                const mappedUsers = data.map((u: any) => ({
                    uid: u.google_id || String(u.id),
                    displayName: u.name,
                    email: u.email,
                    avatar: u.avatar,
                    createdAt: new Date(u.created_at).getTime(),
                    lastSeen: new Date(u.updated_at).getTime(),
                    connections: [], // Backend doesn't send this yet
                }));
                setUsers(mappedUsers);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch users", err);
                setLoading(false);
            });
    }, [user]);


    const filteredUsers = users.filter(u =>
        u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center">Loading people...</div>;

    return (
        <div className="p-6 md:p-10 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <h1 className="text-3xl font-bold text-gray-900">Connect with People</h1>

                <div className="relative w-full md:w-96">
                    <input
                        type="text"
                        placeholder="Search people..."
                        className="block w-full rounded-2xl border-0 bg-white py-3 pl-4 pr-4 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map((u) => {
                    return (
                        <div key={u.uid} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-4 transition-all hover:shadow-md">
                            <div className="flex items-center gap-4 min-w-0">
                                <img
                                    src={u.avatar || `https://ui-avatars.com/api/?name=${u.displayName}`}
                                    alt={u.displayName || "User"}
                                    className="h-14 w-14 rounded-full object-cover bg-gray-200"
                                />
                                <div className="min-w-0">
                                    <h3 className="font-bold text-base text-gray-900 truncate">{u.displayName}</h3>
                                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (!user) return;
                                    const chatId = [user.uid, u.uid].sort().join("_");
                                    // Use window.location or router to navigate. 
                                    // Using router passed from parent or import? 
                                    // PeoplePage is a page, so we can use useRouter.
                                    // Need to import useRouter first.
                                    window.location.href = `/chat/${chatId}`;
                                }}
                                className="px-5 py-2 rounded-full bg-blue-50 text-blue-600 font-semibold text-sm hover:bg-blue-100 transition-colors"
                            >
                                Connect
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
