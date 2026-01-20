"use client";

import { useEffect, useState } from "react";
import { db, rtdb } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ref, onValue } from "firebase/database";
import { User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import LastSeen from "../ui/LastSeen";

export default function Sidebar() {
    const { user, logout } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [presence, setPresence] = useState<Record<string, any>>({});
    const [chatsMap, setChatsMap] = useState<Record<string, any>>({});
    const router = useRouter();
    const params = useParams();
    const activeChatId = params?.chatId as string;

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
    }, [user]);

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
    }, [user]);

    const createChat = (targetUser: User) => {
        if (!user) return;
        const chatId = [user.uid, targetUser.uid].sort().join("_");
        router.push(`/chat/${chatId}`);
    };

    const getStatusIndicator = (uid: string) => {
        const userStatus = presence[uid];
        if (userStatus?.state === "online") {
            return <div className="h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></div>;
        }

        // Show offline time if available
        if (userStatus?.last_changed) {
            return (
                <LastSeen
                    date={userStatus.last_changed}
                    format="short"
                    className="text-[10px] font-bold text-gray-500 bg-white px-1 rounded-sm shadow-sm ring-1 ring-gray-200"
                />
            );
        }

        return <div className="h-3 w-3 rounded-full bg-gray-300 ring-2 ring-white"></div>;
    };

    const getLastMessageText = (targetUid: string) => {
        if (!user) return "";
        const chatId = [user.uid, targetUid].sort().join("_");
        const chat = chatsMap[chatId];

        if (chat?.lastMessage) {
            const isMe = chat.lastMessage.senderId === user.uid;
            const prefix = isMe ? "You: " : "";

            // Check if unread (not sent by me, and readBy doesn't include me)
            const isUnread = !isMe && (!chat.lastMessage.readBy || !chat.lastMessage.readBy.includes(user.uid));
            const baseStyle = isUnread ? "font-bold text-gray-900" : "text-gray-500";
            const textStyle = isUnread ? "font-bold text-gray-900" : "text-gray-600";

            // Handle media types
            if (chat.lastMessage.type === 'image') return <span className={baseStyle}>{prefix}Sent an image</span>;
            if (chat.lastMessage.type === 'video') return <span className={baseStyle}>{prefix}Sent a video</span>;
            return <span className={textStyle}>{prefix}{chat.lastMessage.text}</span>;
        }

        return <span className="text-gray-400 italic">No messages yet</span>;
    };

    return (
        <div className="flex h-screen w-full md:w-80 flex-col border-r border-gray-200 bg-white">
            <div className="border-b bg-gray-50 p-4 pb-2 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">Chats</h2>
                    <div className="text-sm text-gray-600">
                        Hello, {user?.displayName || "User"}
                    </div>
                </div>
                <Link href="/profile" className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-all" title="Edit Profile">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase text-gray-400">Contacts</h3>
                <div className="space-y-2">
                    {users.map((u) => {
                        const chatId = [user?.uid, u.uid].sort().join("_");
                        const isActive = activeChatId === chatId;
                        return (
                            <button
                                key={u.uid}
                                onClick={() => createChat(u)}
                                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors cursor-pointer ${isActive ? "bg-gray-100" : "hover:bg-gray-100"
                                    }`}
                            >
                                <div className="relative">
                                    <img
                                        src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`}
                                        alt={u.displayName || "User"}
                                        className="h-10 w-10 rounded-full object-cover"
                                    />
                                    <div className="absolute bottom-0 right-0 transform translate-x-1 translate-y-1">
                                        {getStatusIndicator(u.uid)}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="truncate font-medium text-gray-900">{u.displayName}</p>
                                    <p className="truncate text-xs">{getLastMessageText(u.uid)}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="border-t bg-gray-50 p-4 pt-[26px]">
                <div className="flex items-center gap-3">
                    <img
                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || "User"}`}
                        alt="My Profile"
                        className="h-10 w-10 rounded-full object-cover"
                    />
                    <div className="flex-1 overflow-hidden">
                        <p className="truncate font-medium text-gray-900">{user?.displayName || "User"}</p>
                        <p className="truncate text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="rounded-full p-2 text-gray-500 hover:bg-gray-200 hover:text-red-600"
                        title="Logout"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 01-3-3h4a3 3 0 01 3 3v1" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
