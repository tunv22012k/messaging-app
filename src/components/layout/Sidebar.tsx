"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter, useParams, usePathname } from "next/navigation";
import LastSeen from "../ui/LastSeen";
import { usePresence } from "@/hooks/usePresence";

import echo from "@/lib/echo";
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function Sidebar() {
    const { user, logout } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const router = useRouter();
    const params = useParams();
    const { onlineUsers, isUserOnline } = usePresence();
    const activeChatId = params?.chatId as string;
    // Use ref to track activeChatId inside event listeners
    const activeChatIdRef = useRef<string | null>(null);

    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const observer = useRef<IntersectionObserver | null>(null);
    const lastUserElementRef = useCallback((node: HTMLDivElement) => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore]);

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1); // Reset page when search changes
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Use server-side filtered users directly
    const filteredUsers = users;

    console.log("[Sidebar] Render - Users:", users.map(u => ({ uid: u.uid, lastMessage: u.lastMessage })));

    // 1. Fetch Users (Paginated)
    useEffect(() => {
        if (!user) return;

        // Prevent fetching if already loading or no more (unless it's page 1 which is reset or init)
        if (loading) return;

        setLoading(true);
        const token = localStorage.getItem('auth_token');

        // Append page and search parameters
        let url = `http://localhost:8000/api/chats?page=${page}`;
        if (debouncedSearch) {
            url += `&search=${encodeURIComponent(debouncedSearch)}`;
        }

        fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then((response: any) => {
                // Check if response is paginated (has data property)
                const isPaginated = Array.isArray(response.data);
                const rawUsers = isPaginated ? response.data : response;

                const mappedUsers = rawUsers.map((u: any) => ({
                    uid: u.google_id || String(u.id),
                    id: u.id,
                    displayName: u.name,
                    email: u.email,
                    avatar: u.avatar,
                    createdAt: new Date(u.created_at).getTime(),
                    lastSeen: new Date(u.updated_at).getTime(),
                    lastMessage: u.last_message,
                    lastMessageSenderId: u.last_message_sender_id,
                    lastMessageReadAt: u.last_message_read_at,
                    connections: [],
                }));

                setUsers(prev => {
                    // If page 1, replace. Else append.
                    if (page === 1) return mappedUsers;

                    // Filter out duplicates (just in case)
                    const existingIds = new Set(prev.map(u => u.uid));
                    const newUsers = mappedUsers.filter((u: any) => !existingIds.has(u.uid));
                    return [...prev, ...newUsers];
                });

                if (isPaginated) {
                    setHasMore(response.current_page < response.last_page);
                } else {
                    setHasMore(false); // If backend returns simple array, assume no more pages
                }
            })
            .catch(err => console.error("Failed to fetch users", err))
            .finally(() => setLoading(false));

    }, [user, page, debouncedSearch]); // Re-fetch when page or search changes

    // Listen for new messages globally to update Sidebar list
    useEffect(() => {
        if (!user || !echo) return;

        // Ensure we are authenticated for private channel
        const token = localStorage.getItem('auth_token');
        if (token && echo.connector) {
            echo.connector.options.auth.headers['Authorization'] = `Bearer ${token}`;
        }

        const channelName = `App.Models.User.${user.uid}`;
        console.log("[Sidebar] Subscribing to channel:", channelName);
        const channel = echo.private(channelName);

        channel.listen('.UserReceivedMessage', (e: any) => {
            // e.message is the new message
            const newMessage = e.message;
            const messageText = newMessage.text || (newMessage.type === 'image' ? '[Hình ảnh]' : (newMessage.type === 'video' ? '[Video]' : 'Tin nhắn mới'));

            const sender = newMessage.sender;
            // Resolve sender UID: Prefer google_id if available (matches sidebar logic)
            const resolvedSenderId = sender ? (sender.google_id || String(sender.id)) : String(newMessage.sender_id);

            // Check if WE are the sender
            const isMe = (!!user.id && String(newMessage.sender_id) === String(user.id)) || String(resolvedSenderId) === String(user.uid);

            let targetUserId = resolvedSenderId;
            let displayMessage = messageText;

            if (isMe) {
                // If we sent it, we need to find the OTHER user in the chat_id to update their row
                // chat_id format: uid1_uid2
                const parts = newMessage.chat_id.split('_');
                const otherId = parts.find((id: string) => String(id) !== String(user.uid));
                if (otherId) {
                    targetUserId = otherId;
                    displayMessage = messageText; // Keep raw text, let renderer handle prefix
                }
            } else {
                console.log("[Sidebar] Received message FROM OTHERS:", {
                    senderId: newMessage.sender_id,
                    resolvedSenderId,
                    targetUserId: resolvedSenderId
                });
                // targetUserId is already resolvedSenderId, which is correct for incoming messages
            }

            // Update users list (targetUserId is either the sender OR the person we sent to)
            setUsers(prev => {
                console.log("[Sidebar] Processing new message:", {
                    text: messageText,
                    targetUserId,
                    isMe,
                    senderId: newMessage.sender_id,
                    resolvedSenderId,
                    hasSender: !!newMessage.sender,
                    chatId: newMessage.chat_id,
                    myUid: user.uid
                });

                const existingUserIndex = prev.findIndex(u =>
                    String(u.uid) === String(targetUserId) ||
                    String(u.id) === String(targetUserId) || // Fallback to numeric ID
                    String(u.uid) === String(newMessage.sender_id) // Match sender_id directly against uid (if targetUserId derivation failed)
                );
                if (existingUserIndex !== -1) {
                    // Move to top and update last message
                    const newUsers = [...prev];
                    const [existingUser] = newUsers.splice(existingUserIndex, 1);

                    // New message is unread by default (null read_at)
                    // UNLESS we are currently looking at this chat
                    const isActive = activeChatIdRef.current === newMessage.chat_id;

                    // Create a NEW object to ensure React detects the change
                    const updatedUser = {
                        ...existingUser,
                        lastMessage: displayMessage,
                        lastMessageSenderId: String(newMessage.sender_id),
                        lastMessageReadAt: isActive ? new Date().toISOString() : null
                    };

                    console.log("[Sidebar] Updating existing user:", updatedUser);
                    return [updatedUser, ...newUsers];
                } else {
                    // User not in list, we need to fetch them. 
                    // If isMe is true, it means we sent a message to someone not in our list? 
                    // Possible if we initiated chat via URL or People page.
                    // Note: fetchUserAndAdd should also ideally set lastMessageSenderId
                    fetchUserAndAdd(targetUserId, displayMessage);
                    return prev;
                }
            });
        });

        return () => {
            channel.stopListening('.UserReceivedMessage');
        }
    }, [user]);

    const fetchUserAndAdd = (uid: string, initialMessage?: string) => {
        const token = localStorage.getItem('auth_token');
        fetch(`http://localhost:8000/api/users/${uid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                const newUser: User = {
                    uid: data.google_id || String(data.id),
                    id: data.id, // Add this line
                    displayName: data.name,
                    email: data.email,
                    avatar: data.avatar,
                    createdAt: new Date(data.created_at).getTime(),
                    lastSeen: new Date(data.updated_at).getTime(),
                    lastMessage: initialMessage,
                    lastMessageSenderId: undefined, // Or populate if passed (currently undefined is fine)
                    connections: [],
                };
                setUsers(prev => {
                    if (prev.find(u => u.uid === newUser.uid)) return prev;
                    return [newUser, ...prev];
                });
            })
            .catch(err => console.error("Failed to fetch new sender", err));
    };

    // 2. Fetch specific user if we are in a chat but that user is not in the list (Connect flow)
    useEffect(() => {
        if (!user || !params?.chatId) return;
        const chatId = params.chatId as string;

        // Extract UID from chatId (uid1_uid2)
        // We know one UID is ours. The other is the target.
        const parts = chatId.split('_');
        if (parts.length !== 2) return;

        const otherUid = parts.find(id => id !== String(user.uid));
        if (!otherUid) return; // Should not happen if chatId is valid

        // Check if this user is already in our list
        const exists = users.find(u => String(u.uid) === otherUid || String(u.uid) === otherUid);
        if (exists) return;

        // Fetch this user
        const token = localStorage.getItem('auth_token');
        fetch(`http://localhost:8000/api/users/${otherUid}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error("User not found via ID");
                return res.json();
            })
            .then(data => {
                const newUser: User = {
                    uid: data.google_id || String(data.id),
                    displayName: data.name,
                    email: data.email,
                    avatar: data.avatar,
                    createdAt: new Date(data.created_at).getTime(),
                    lastSeen: new Date(data.updated_at).getTime(),
                    connections: [],
                };
                // Add to users list (prepend so it shows at top)
                setUsers(prev => {
                    // Double check existence to avoid race conditions
                    if (prev.find(u => u.uid === newUser.uid)) return prev;
                    return [newUser, ...prev];
                });
            })
            .catch(err => console.error("Failed to fetch connected user", err));

    }, [user, params?.chatId, users]); // Depend on users to re-check existence

    const createChat = (targetUser: User) => {
        if (!user) return;
        // Simple chat ID generation: sort UIDs
        // In real app, might want to create chat on backend and get ID
        const chatId = [user.uid, targetUser.uid].sort().join("_");

        // Optimistically mark as read in sidebar state
        setUsers(prev => prev.map(u => {
            if (u.uid === targetUser.uid) {
                return { ...u, lastMessageReadAt: new Date().toISOString() } as any;
                // cast to any because User type might not strictly match the extra props we added
            }
            return u;
        }));

        router.push(`/chat/${chatId}`);
    };

    const getStatusIndicator = (user: User) => {
        const isOnline = isUserOnline(user.uid);
        if (isOnline) {
            return (
                <div className="absolute bottom-0 right-0 shadow-sm rounded-full bg-white p-[1.5px]">
                    <div className="h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></div>
                </div>
            );
        } else if (user.lastSeen) {
            let timeAgo = formatDistanceToNow(new Date(user.lastSeen), { addSuffix: false, locale: vi });
            // Remove prefixes like "khoảng", "dưới", "hơn"
            timeAgo = timeAgo.replace(/^khoảng\s+/, '')
                .replace(/^dưới\s+/, '')
                .replace(/^hơn\s+/, '');

            return (
                <div className="absolute -bottom-1 -right-1 shadow-sm rounded-full bg-gray-100 border border-white px-1 py-0.5 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-500 leading-none whitespace-nowrap">{timeAgo}</span>
                </div>
            );
        }
        return null;
    };

    const getLastMessageText = (targetUid: string, isActive: boolean, lastMsg?: string, lastMsgSenderId?: string, lastMsgReadAt?: string) => {
        if (lastMsg) {
            // Check isMe for initial load - robust check against id or uid
            const isMe = user && (String(lastMsgSenderId) === String(user.id) || String(lastMsgSenderId) === String(user.uid));
            const prefix = isMe ? "Bạn: " : "";

            // Bold if NOT me AND read_at is null (unread)
            const isUnread = !isMe && !lastMsgReadAt;
            const textClass = isActive
                ? "text-white/80"
                : (isUnread ? "text-gray-900 font-bold" : "text-gray-500");

            return <span className={textClass}>{prefix}{lastMsg}</span>;
        }
        return <span className={isActive ? "text-white/70 italic" : "text-gray-400 italic"}>Bắt đầu trò chuyện</span>;
    };

    return (
        <div className="flex h-screen w-full md:w-80 flex-col border-r border-gray-200 bg-white">
            <div className="flex flex-col gap-4 p-4 pb-2 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                        Tin nhắn
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
                        placeholder="Tìm kiếm người dùng..."
                        className="block w-full rounded-2xl border-0 bg-gray-100 py-2.5 pl-10 pr-4 text-sm text-gray-900 ring-0 transition-all placeholder:text-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
                {loading && page === 1 ? (
                    <div className="space-y-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex w-full items-center gap-3 rounded-2xl p-3">
                                <div className="h-12 w-12 flex-none rounded-full bg-gray-100 animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
                                    <div className="h-3 w-32 rounded bg-gray-100 animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                        <p className="text-sm">Không tìm thấy người dùng</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {filteredUsers.map((u, index) => {
                            const chatId = [user?.uid, u.uid].sort().join("_");
                            const isActive = activeChatId === chatId;

                            console.log(`[Sidebar] Rendering row [${u.uid}] msg: ${u.lastMessage}`);
                            const isLastUser = index === filteredUsers.length - 1;

                            // Use div wrapper for ref to avoid button ref issues if any
                            return (
                                <div key={`${u.uid}-${u.lastMessage}`} ref={isLastUser ? lastUserElementRef : null} className="w-full">
                                    <button
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
                                                    src={u.avatar || `https://ui-avatars.com/api/?name=${u.displayName}`}
                                                    alt={u.displayName || "User"}
                                                    className="h-12 w-12 rounded-full object-cover bg-gray-200"
                                                />
                                            </div>
                                            {getStatusIndicator(u)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <p className={`truncate text-sm font-semibold ${isActive ? "text-white" : "text-gray-900"}`}>
                                                    {u.displayName}
                                                </p>
                                            </div>
                                            <p className={`truncate text-xs ${isActive ? "text-white/90" : "text-gray-500"}`}>
                                                {getLastMessageText(u.uid, isActive, (u as any).lastMessage, (u as any).lastMessageSenderId, (u as any).lastMessageReadAt)}
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                        {loading && page > 1 && (
                            <div className="py-2 text-center text-xs text-gray-500">
                                Đang tải thêm...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
}
