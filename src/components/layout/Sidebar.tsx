"use client";

import { useEffect, useState } from "react";
import { db, rtdb } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import { User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter, useParams, usePathname } from "next/navigation";
import LastSeen from "../ui/LastSeen";

export default function Sidebar() {
    const { user, logout } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [presence, setPresence] = useState<Record<string, any>>({});
    const [chatsMap, setChatsMap] = useState<Record<string, any>>({});
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const activeChatId = params?.chatId as string;
    const [searchQuery, setSearchQuery] = useState("");

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
        const isConnected = user?.connections?.includes(u.uid);
        return matchesSearch && isConnected;
    });

    // 1. Fetch Users
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "users"), where("uid", "!=", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersList: User[] = [];
            snapshot.forEach((doc) => {
                usersList.push(doc.data() as User);
            });
            setUsers(usersList);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // 2. Fetch Presence
    useEffect(() => {
        const statusRef = ref(rtdb, "status");
        const unsubscribe = onValue(statusRef, (snapshot) => {
            setPresence(snapshot.val() || {});
        });
        return () => unsubscribe();
    }, []);

    // 3. Fetch Chats (for Last Message)
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "chats"), where("participantIds", "array-contains", user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const map: Record<string, any> = {};
            snapshot.forEach((doc) => {
                map[doc.id] = doc.data();
            });
            setChatsMap(map);
        });
        return () => unsubscribe();
    }, [user?.uid]);

    const createChat = (targetUser: User) => {
        if (!user) return;
        const chatId = [user.uid, targetUser.uid].sort().join("_");
        router.push(`/chat/${chatId}`);
    };

    const getStatusIndicator = (uid: string) => {
        const userStatus = presence[uid];
        if (userStatus?.state === "online") {
            return (
                <div className="absolute bottom-0 right-0 shadow-sm rounded-full bg-white p-[1.5px]">
                    <div className="h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></div>
                </div>
            );
        }

        // Show offline time if available
        if (userStatus?.last_changed) {
            return (
                <div className="absolute bottom-0 right-0 transform translate-y-1">
                    <LastSeen
                        date={userStatus.last_changed}
                        format="short"
                        className="text-[10px] font-bold text-gray-500 bg-white px-1 rounded-sm shadow-sm ring-1 ring-gray-200"
                    />
                </div>
            );
        }

        return null;
    };

    const getLastMessageText = (targetUid: string, isActive: boolean) => {
        if (!user) return "";
        const chatId = [user.uid, targetUid].sort().join("_");
        const chat = chatsMap[chatId];

        if (chat?.lastMessage) {
            const isMe = chat.lastMessage.senderId === user.uid;
            const prefix = isMe ? "You: " : "";

            // Check if unread (not sent by me, and readBy doesn't include me)
            const isUnread = !isMe && (!chat.lastMessage.readBy || !chat.lastMessage.readBy.includes(user.uid));

            // Text Color Logic
            let textColorClass = "text-gray-600";
            if (isActive) {
                textColorClass = "text-white/90";
            } else if (isUnread) {
                textColorClass = "font-bold text-gray-900";
            } else {
                textColorClass = "text-gray-500";
            }

            // Base style for media (usually slightly different but let's sync)
            const mediaClass = isActive ? "text-white/90" : (isUnread ? "font-bold text-gray-900" : "text-gray-500");

            // Handle media types
            if (chat.lastMessage.type === 'image') return <span className={mediaClass}>{prefix}Sent an image</span>;
            if (chat.lastMessage.type === 'video') return <span className={mediaClass}>{prefix}Sent a video</span>;
            return <span className={textColorClass}>{prefix}{chat.lastMessage.text}</span>;
        }

        return <span className={isActive ? "text-white/70 italic" : "text-gray-400 italic"}>No messages yet</span>;
    };

    return (
        <div className="flex h-screen w-full md:w-80 flex-col border-r border-gray-200 bg-white">
            <div className="flex flex-col gap-4 p-4 pb-2 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                        Messages
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-600">
                            {users.length}
                        </span>
                    </h2>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        className="block w-full rounded-2xl border-0 bg-gray-100 py-2.5 pl-10 pr-4 text-sm text-gray-900 ring-0 transition-all placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
                {filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                        <p className="text-sm">No contacts found</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredUsers.map((u) => {
                            const chatId = [user?.uid, u.uid].sort().join("_");
                            const isActive = activeChatId === chatId;
                            // Check if last message is unread to highlight
                            const chat = chatsMap[chatId];
                            const lastMsg = chat?.lastMessage;
                            const isUnread = lastMsg && lastMsg.senderId !== user?.uid && (!lastMsg.readBy || !lastMsg.readBy.includes(user?.uid));

                            return (
                                <button
                                    key={u.uid}
                                    onClick={() => createChat(u)}
                                    className={`group relative flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all duration-200 
                                        ${isActive
                                            ? "bg-blue-500 shadow-md shadow-blue-500/20"
                                            : "hover:bg-gray-100"
                                        }`}
                                >
                                    <div className="relative flex-none">
                                        <div className={`rounded-full p-0.5 ${isActive ? 'bg-white/20' : 'bg-transparent'}`}>
                                            <img
                                                src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`}
                                                alt={u.displayName || "User"}
                                                className="h-12 w-12 rounded-full object-cover bg-gray-200"
                                            />
                                        </div>
                                        {getStatusIndicator(u.uid)}
                                    </div>

                                    <div className="flex-1 min-w-0 overflow-hidden">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <p className={`truncate text-sm font-semibold ${isActive ? "text-white" : "text-gray-900"}`}>
                                                {u.displayName}
                                            </p>
                                        </div>
                                        <p className={`truncate text-xs ${isActive
                                            ? "text-white/90"
                                            : isUnread
                                                ? "font-bold text-gray-900"
                                                : "text-gray-500 group-hover:text-gray-600"
                                            }`}>
                                            {getLastMessageText(u.uid, isActive)}
                                        </p>
                                    </div>

                                    {isUnread && !isActive && (
                                        <div className="h-2.5 w-2.5 flex-none rounded-full bg-blue-600 ring-4 ring-white"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
