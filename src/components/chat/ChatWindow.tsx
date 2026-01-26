"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useAuth } from "@/context/AuthContext";
import { Message, Chat } from "@/types";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import Link from "next/link";
import MediaModal from "@/components/ui/MediaModal";
import echo from "@/lib/echo";
import { usePresence } from "@/hooks/usePresence";

interface ChatWindowProps {
    chatId: string;
}

const markAsRead = async (chatId: string) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    try {
        const res = await fetch(`http://localhost:8000/api/chats/${chatId}/read`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (res.ok) {
            window.dispatchEvent(new Event("REFRESH_UNREAD_COUNT"));
        }
    } catch (e) {
        console.error("Failed to mark as read", e);
    }
};

export default function ChatWindow({ chatId }: ChatWindowProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const prevScrollHeightRef = useRef<number>(0);

    const [recipient, setRecipient] = useState<any>(null);
    const { isUserOnline } = usePresence();
    const isRecipientOnline = recipient ? isUserOnline(recipient.uid || recipient.google_id || String(recipient.id)) : false;

    const [selectedMedia, setSelectedMedia] = useState<{ src: string, type: 'image' | 'video', mimeType?: string } | null>(null);

    const handleMediaClick = (src: string, type: 'image' | 'video', mimeType?: string) => {
        setSelectedMedia({ src, type, mimeType });
    };

    // Fetch Recipient Details
    useEffect(() => {
        if (!chatId || !user) return;
        const [id1, id2] = chatId.split('_');
        const recipientId = id1 === String(user.uid) ? id2 : id1;

        if (!recipientId) return;

        const token = localStorage.getItem('auth_token');
        fetch(`http://localhost:8000/api/users/${recipientId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        })
            .then(res => res.json())
            .then(data => setRecipient(data))
            .catch(err => console.error("Failed to fetch recipient", err));
    }, [chatId, user]);

    // Fetch Messages Function
    const fetchMessages = async (beforeTimestamp?: number) => {
        if (!user || !chatId) return;

        const token = localStorage.getItem('auth_token');
        const isLoadMore = !!beforeTimestamp;

        if (isLoadMore) {
            setLoadingMore(true);
            if (scrollContainerRef.current) {
                prevScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
            }
        } else {
            setLoading(true);
        }

        try {
            const url = new URL(`http://localhost:8000/api/chats/${chatId}/messages`);
            if (beforeTimestamp) {
                const dateStr = new Date(beforeTimestamp).toISOString().slice(0, 19).replace('T', ' ');
                url.searchParams.append('before', dateStr);
            }
            url.searchParams.append('limit', '20');

            const res = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await res.json();

            const mappedMessages = (data.messages || []).map((m: any) => ({
                ...m,
                createdAt: new Date(m.created_at).getTime(),
                id: String(m.id),
                senderId: String(m.sender_id),
                readAt: m.read_at, // Map read_at
                sender: m.sender ? {
                    uid: m.sender.google_id || String(m.sender.id),
                    displayName: m.sender.name,
                    email: m.sender.email,
                    avatar: m.sender.avatar,
                    createdAt: new Date(m.sender.created_at).getTime(),
                } : undefined,
            }));

            if (isLoadMore) {
                if (mappedMessages.length > 0) {
                    setMessages(prev => [...mappedMessages, ...prev]);
                } else {
                    setHasMore(false);
                }
                setLoadingMore(false);
            } else {
                setMessages(mappedMessages);
                setLoading(false);
                setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
            }

        } catch (err) {
            console.error("Failed to load messages", err);
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Initial Load & Mark as Read
    useEffect(() => {
        fetchMessages();
        setHasMore(true);
        markAsRead(chatId); // Mark as read when opening chat
    }, [chatId, user]);

    // Listen for Real-time Message Read Events (Sender Side)
    useEffect(() => {
        if (!user || !echo) return;

        // Listen on YOUR private channel for read receipts from others
        const channel = echo.private(`App.Models.User.${user.uid}`);

        channel.listen('.MessageRead', (e: any) => {
            if (String(e.chat_id) === String(chatId)) {
                // Update messages in this chat to be read
                setMessages(prev => prev.map(m => {
                    // If message is sent by me and unread, mark it
                    // Actually, backend marks all unread. 
                    // To be precise, we blindly set readAt for all my messages that were unread
                    if (String(m.senderId) === String(user.id) || String(m.senderId) === String(user.uid)) {
                        return { ...m, readAt: e.read_at };
                    }
                    return m;
                }));
            }
        });

        return () => {
            channel.stopListening('.MessageRead');
        }
    }, [chatId, user]);

    // Restore scroll position after loading more
    useEffect(() => {
        if (loadingMore === false && prevScrollHeightRef.current > 0 && scrollContainerRef.current) {
            const newScrollHeight = scrollContainerRef.current.scrollHeight;
            const diff = newScrollHeight - prevScrollHeightRef.current;
            scrollContainerRef.current.scrollTop = diff;
            prevScrollHeightRef.current = 0;
        }
    }, [messages, loadingMore]);

    // Scroll Handler
    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollTop } = scrollContainerRef.current;
            if (scrollTop === 0 && hasMore && !loadingMore && messages.length > 0) {
                const oldestMsg = messages[0];
                fetchMessages(oldestMsg.createdAt);
            }
        }
    };

    // Listen for Real-time Messages & Read Receipts
    useEffect(() => {
        if (!user || !chatId || !echo) return;

        const token = localStorage.getItem('auth_token');
        if (token && echo.connector) {
            echo.connector.options.auth.headers['Authorization'] = `Bearer ${token}`;
        }

        // 1. User Channel (for Read Receipts ONLY)
        const userChannelName = `App.Models.User.${user.uid}`;
        const userChannel = echo.private(userChannelName);
        console.log("Listening on user channel:", userChannelName);

        const handleMessageRead = (e: any) => {
            console.log("Processing read receipt for chat:", e.chat_id, "Current chat:", chatId);
            if (String(e.chat_id) === String(chatId)) {
                setMessages(prev => prev.map(m => {
                    if (String(m.senderId) === String(user.id) || String(m.senderId) === String(user.uid)) {
                        if (m.readAt === e.read_at) return m;
                        return { ...m, readAt: e.read_at };
                    }
                    return m;
                }));
            }
        };

        // Listen for both dot and no-dot variations to be safe
        userChannel.listen('.MessageRead', (e: any) => {
            console.log("Received .MessageRead event:", e);
            handleMessageRead(e);
        });
        userChannel.listen('MessageRead', (e: any) => {
            console.log("Received MessageRead event (no dot):", e);
            handleMessageRead(e);
        });

        // 2. Chat Channel (for Incoming Messages)
        // Use chat channel instead of User channel to avoid conflicts with Sidebar listener
        const chatChannelName = `chat.${chatId}`;
        const chatChannel = echo.private(chatChannelName);
        console.log("Listening on chat channel:", chatChannelName);

        chatChannel.listen('.MessageSent', (e: any) => {
            console.log("Received .MessageSent event:", e);
            const newMessage = e.message;

            // Handle incoming message
            let shouldScroll = false;
            if (scrollContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
                if (scrollHeight - scrollTop - clientHeight <= 50) {
                    shouldScroll = true;
                }
            }

            setMessages(prev => {
                const mappedMsg = {
                    ...newMessage,
                    createdAt: new Date(newMessage.created_at).getTime(),
                    id: String(newMessage.id),
                    senderId: String(newMessage.sender_id),
                    readAt: newMessage.read_at,
                    sender: newMessage.sender ? {
                        uid: newMessage.sender.google_id || String(newMessage.sender.id),
                        displayName: newMessage.sender.name,
                        email: newMessage.sender.email,
                        avatar: newMessage.sender.avatar,
                        createdAt: new Date(newMessage.sender.created_at).getTime(),
                    } : undefined,
                };
                // Prevent duplicates
                if (prev.find(m => String(m.id) === String(mappedMsg.id))) return prev;
                return [...prev, mappedMsg];
            });

            if (shouldScroll) {
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }

            // If I am NOT the sender, mark it as read immediately
            if (String(newMessage.sender_id) !== String(user.id) && String(newMessage.sender_id) !== String(user.uid)) {
                markAsRead(chatId);
            }
        });

        // Listen for Reactions
        chatChannel.listen('.MessageReactionUpdated', (e: any) => {
            console.log("Received .MessageReactionUpdated event:", e);
            setMessages(prev => prev.map(m => {
                if (String(m.id) === String(e.messageId)) {
                    return { ...m, reactions: e.reactions };
                }
                return m;
            }));
        });

        return () => {
            // Only stop specific listeners
            userChannel.stopListening('.MessageRead');
            userChannel.stopListening('MessageRead');
            chatChannel.stopListening('.MessageSent');
        };
    }, [chatId, user]);


    const sendMessage = async (text: string) => {
        if (!user || !chatId) return;

        const token = localStorage.getItem('auth_token');
        const socketId = echo?.connector?.pusher?.connection?.socket_id;

        try {
            const res = await fetch(`http://localhost:8000/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    ...(socketId ? { 'X-Socket-ID': socketId } : {})
                },
                body: JSON.stringify({
                    text,
                    type: 'text'
                })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => {
                    const newMsg = {
                        ...data.message,
                        createdAt: new Date(data.message.created_at).getTime(),
                        id: String(data.message.id),
                        senderId: String(data.message.sender_id),
                        sender: data.message.sender ? {
                            uid: data.message.sender.google_id || String(data.message.sender.id),
                            displayName: data.message.sender.name,
                            email: data.message.sender.email,
                            avatar: data.message.sender.avatar,
                            createdAt: new Date(data.message.sender.created_at).getTime(),
                        } : undefined,
                    };
                    if (prev.find(m => String(m.id) === String(newMsg.id))) return prev;
                    return [...prev, newMsg];
                });

                // Always scroll to bottom for sender
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }
        } catch (error) {
            console.error("Failed to send message", error);
        }
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        if (!user) return;
        const token = localStorage.getItem('auth_token');
        const socketId = echo?.connector?.pusher?.connection?.socket_id;

        // Helper to get raw ID regardless of type
        const myId = user.id ? String(user.id) : null;
        const myUid = user.uid ? String(user.uid) : null;

        // Optimistic update
        setMessages(prev => prev.map(m => {
            if (String(m.id) === String(messageId)) {
                const currentReactions = m.reactions || [];

                // Check if I already have this exact reaction
                const existingIndex = currentReactions.findIndex(r =>
                    r.reaction === emoji &&
                    (String(r.user_id) === String(myId) || String(r.user_id) === String(myUid) || String(r.user_id) === String(user.google_id))
                );

                let newReactions = [...currentReactions];

                if (existingIndex !== -1) {
                    // Remove it (Toggle off)
                    newReactions.splice(existingIndex, 1);
                } else {
                    // Add new reaction
                    newReactions.push({
                        id: Date.now(), // Temp unique ID
                        message_id: Number(messageId),
                        user_id: Number(myId || 0), // Fallback ID
                        reaction: emoji,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }

                return { ...m, reactions: newReactions };
            }
            return m;
        }));

        try {
            const res = await fetch(`http://localhost:8000/api/messages/${messageId}/react`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    ...(socketId ? { 'X-Socket-ID': socketId } : {})
                },
                body: JSON.stringify({ reaction: emoji })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => prev.map(m => {
                    if (String(m.id) === String(messageId)) {
                        return { ...m, reactions: data.reactions };
                    }
                    return m;
                }));
            }
        } catch (err) {
            console.error("Failed to send reaction", err);
        }
    };

    const sendMedia = async (mediaData: any) => {
        if (!user || !chatId) return;

        const token = localStorage.getItem('auth_token');
        const socketId = echo?.connector?.pusher?.connection?.socket_id;
        const type = mediaData.mimeType?.startsWith('video/') ? 'video' : 'image';

        try {
            const res = await fetch(`http://localhost:8000/api/chats/${chatId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    ...(socketId ? { 'X-Socket-ID': socketId } : {})
                },
                body: JSON.stringify({
                    text: "", // Optional caption could be added later
                    type: type,
                    media: mediaData
                })
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev => {
                    const newMsg = {
                        ...data.message,
                        createdAt: new Date(data.message.created_at).getTime(),
                        id: String(data.message.id),
                        senderId: String(data.message.sender_id),
                        sender: data.message.sender ? {
                            uid: data.message.sender.google_id || String(data.message.sender.id),
                            displayName: data.message.sender.name,
                            email: data.message.sender.email,
                            avatar: data.message.sender.avatar,
                            createdAt: new Date(data.message.sender.created_at).getTime(),
                        } : undefined,
                    };
                    if (prev.find(m => String(m.id) === String(newMsg.id))) return prev;
                    return [...prev, newMsg];
                });

                // Always scroll to bottom for sender
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
            }
        } catch (error) {
            console.error("Failed to send media", error);
            alert("Failed to send media");
        }
    };

    if (loading) return (
        <div className="flex h-full items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center gap-4">
                {/* Chat bubble spinner */}
                <div className="relative">
                    <div className="w-14 h-14 rounded-full border-4 border-gray-200"></div>
                    <div
                        className="absolute inset-0 w-14 h-14 rounded-full border-4 border-transparent border-t-blue-500 border-r-indigo-500 animate-spin"
                        style={{ animationDuration: '0.8s' }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                </div>
                <p className="text-gray-500 font-medium">Đang tải cuộc trò chuyện...</p>
            </div>
        </div>
    );

    return (
        <div className="flex h-full flex-col bg-gray-50">
            <div className="border-b bg-white p-4 shadow-sm flex items-center gap-3">
                <Link href="/chat" className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                {recipient ? (
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            {recipient.avatar ? (
                                <img
                                    src={recipient.avatar}
                                    alt={recipient.name}
                                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                                    {recipient.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            {isRecipientOnline && (
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                            )}
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-800 leading-tight">{recipient.name}</h2>
                            {isRecipientOnline ? (
                                <p className="text-xs text-green-600 font-medium">Đang hoạt động</p>
                            ) : (

                                <p className="text-xs text-gray-500 font-medium">
                                    {recipient.updated_at
                                        ? `Hoạt động ${formatDistanceToNow(new Date(recipient.updated_at), { addSuffix: true, locale: vi })}`
                                        : 'Không hoạt động'}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <h2 className="font-semibold text-gray-800">Tin nhắn</h2>
                )}
            </div>

            <div
                className="flex-1 overflow-y-auto p-4 flex flex-col gap-1"
                ref={scrollContainerRef}
                onScroll={handleScroll}
            >
                {loadingMore && (
                    <div className="text-center py-2 text-xs text-gray-500">Đang tải thêm...</div>
                )}

                {(() => {
                    // Find the last message sent by ME that has been read
                    let lastReadMessageId = null;
                    // Iterate backwards to find the latest read message
                    for (let i = messages.length - 1; i >= 0; i--) {
                        const m = messages[i];
                        // Check if it's my message
                        const isMe = String(m.senderId) === String(user?.uid) || (!!user?.id && String(m.senderId) === String(user.id));
                        if (isMe && m.readAt) {
                            lastReadMessageId = m.id;
                            break;
                        }
                    }

                    return messages.map((msg, index) => {
                        const prevMsg = messages[index - 1];
                        const nextMsg = messages[index + 1];

                        // Check if message is mine:
                        const isMe =
                            String(msg.senderId) === String(user?.uid) ||
                            (!!user?.id && String(msg.senderId) === String(user.id)) ||
                            (!!user?.google_id && String(msg.senderId) === String(user.google_id)) ||
                            (!!msg.sender && (
                                String(msg.sender.google_id) === String(user?.uid) ||
                                String(msg.sender.id) === String(user?.uid) ||
                                (!!user?.id && String(msg.sender.id) === String(user.id))
                            ));

                        // --- Grouping Calculation ---
                        const TIME_WINDOW = 15 * 60 * 1000; // 15 minutes
                        const ONE_HOUR = 60 * 60 * 1000;

                        const isSameSenderAsPrev = prevMsg && String(prevMsg.senderId) === String(msg.senderId);
                        const isWithinTimeWindowPrev = prevMsg && (msg.createdAt - prevMsg.createdAt < TIME_WINDOW);

                        const isSameSenderAsNext = nextMsg && String(nextMsg.senderId) === String(msg.senderId);
                        const isWithinTimeWindowNext = nextMsg && (nextMsg.createdAt - msg.createdAt < TIME_WINDOW);

                        const isFirstInGroup = !isSameSenderAsPrev || !isWithinTimeWindowPrev;
                        const isLastInGroup = !isSameSenderAsNext || !isWithinTimeWindowNext;


                        // --- Date Header Logic ---
                        let showDateHeader = false;
                        let dateHeaderText = "";
                        const timeDiff = prevMsg ? msg.createdAt - prevMsg.createdAt : 0;
                        if (!prevMsg || timeDiff > ONE_HOUR) {
                            showDateHeader = true;
                            const date = new Date(msg.createdAt);
                            const today = new Date();
                            const isToday = date.toDateString() === today.toDateString();
                            if (isToday) {
                                dateHeaderText = "Hôm nay " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            } else {
                                dateHeaderText = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + date.toLocaleDateString('vi-VN');
                            }
                        }

                        // --- Avatar Logic ---
                        const showAvatar = !isMe && isFirstInGroup;
                        const avatarUrl = isMe ? user?.avatar : (msg.sender?.avatar || recipient?.avatar);


                        return (
                            <div key={msg.id} className="w-full flex flex-col">
                                {showDateHeader && (
                                    <div className="flex justify-center my-4">
                                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                                            {dateHeaderText}
                                        </span>
                                    </div>
                                )}

                                <div className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-4' : 'mb-0.5'}`}>
                                    <div className={`max-w-[70%] ${isMe ? 'order-1' : 'order-2'} flex flex-col items-end`}>
                                        <MessageBubble
                                            message={msg}
                                            showAvatar={showAvatar}
                                            isMe={isMe}
                                            avatarUrl={avatarUrl}
                                            onReaction={handleReaction}
                                            onMediaClick={handleMediaClick}
                                        />
                                        {isMe && msg.id === lastReadMessageId && (
                                            <div className="flex items-center gap-1 mt-1 mr-1">
                                                <img
                                                    src={recipient?.avatar || `https://ui-avatars.com/api/?name=${recipient?.name}`}
                                                    className="w-3.5 h-3.5 rounded-full border border-white opacity-90"
                                                    alt="Đã xem"
                                                    title={`Đã xem lúc ${msg.readAt ? new Date(msg.readAt).toLocaleTimeString() : ''}`}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                })()}
                <div ref={messagesEndRef} />
            </div>

            <ChatInput onSendMessage={sendMessage} onSendMedia={sendMedia} />

            {/* Media Viewer Modal */}
            {selectedMedia && (
                <MediaModal
                    isOpen={!!selectedMedia}
                    onClose={() => setSelectedMedia(null)}
                    src={selectedMedia.src}
                    type={selectedMedia.type}
                    mimeType={selectedMedia.mimeType}
                />
            )}

        </div >
    );
}
