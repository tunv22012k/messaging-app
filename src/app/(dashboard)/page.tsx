"use client";

import { useEffect, useState } from "react";
import { db, rtdb } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import { User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [presence, setPresence] = useState<Record<string, any>>({});
    const router = useRouter();

    // 1. Fetch Users
    useEffect(() => {
        if (!user) return;
        // Show all users except self
        const q = query(collection(db, "users"), where("uid", "!=", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersList: User[] = [];
            snapshot.forEach((doc) => {
                usersList.push(doc.data() as User);
            });
            setUsers(usersList);
        });
        return () => unsubscribe();
    }, [user]);

    // 2. Fetch Presence
    useEffect(() => {
        const statusRef = ref(rtdb, "status");
        const unsubscribe = onValue(statusRef, (snapshot) => {
            setPresence(snapshot.val() || {});
        });
        return () => unsubscribe();
    }, []);

    const createChat = (targetUser: User) => {
        if (!user) return;
        const chatId = [user.uid, targetUser.uid].sort().join("_");
        router.push(`/chat/${chatId}`);
    };

    const getStatusIndicator = (uid: string) => {
        const userStatus = presence[uid];
        if (userStatus?.state === "online") {
            return <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 ring-2 ring-white"></span>;
        }
        return <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-gray-300 ring-2 ring-white"></span>;
    };

    return (
        <div className="flex h-full flex-col bg-gray-50 p-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.displayName}!</h1>
                <p className="mt-2 text-gray-600">Select a contact below to start messaging.</p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {users.map((u) => (
                    <button
                        key={u.uid}
                        onClick={() => createChat(u)}
                        className="group relative flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
                    >
                        <div className="relative mb-4">
                            <img
                                src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`}
                                alt={u.displayName || "User"}
                                className="h-20 w-20 rounded-full object-cover"
                            />
                            {getStatusIndicator(u.uid)}
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900">{u.displayName}</h3>

                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                            {presence[u.uid]?.state === 'online' ? (
                                <span className="text-green-600 font-medium">Online</span>
                            ) : (
                                <span>
                                    {presence[u.uid]?.last_changed
                                        ? `Last seen ${Math.floor((Date.now() - presence[u.uid].last_changed) / 60000)}m ago`
                                        : 'Offline'}
                                </span>
                            )}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
