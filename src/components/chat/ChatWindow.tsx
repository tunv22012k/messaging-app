"use client";

import { useEffect, useRef, useState, useLayoutEffect } from "react";
import {
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
    updateDoc,
    limitToLast
} from "firebase/firestore";
import {
    ref,
    set,
    onValue,
    onDisconnect,
    remove
} from "firebase/database";
import { db, rtdb } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Message, Chat } from "@/types";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";
import Link from "next/link";
import ImageModal from "@/components/ui/ImageModal";
import LastSeen from "@/components/ui/LastSeen";

interface ChatWindowProps {
    chatId: string;
}

// Helper functions for date formatting
const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
};

const formatDateLabel = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (isSameDay(date, today)) {
        return "Today";
    } else if (isSameDay(date, yesterday)) {
        return "Yesterday";
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

export default function ChatWindow({ chatId }: ChatWindowProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [chatData, setChatData] = useState<Chat | null>(null);
    const [loading, setLoading] = useState(true);
    const [showTypingIndicator, setShowTypingIndicator] = useState(false);

    // State for Other User Profile & Status
    const [otherUser, setOtherUser] = useState<any>(null);
    const [otherUserStatus, setOtherUserStatus] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch Other User Profile & Status
    useEffect(() => {
        if (!user || !chatId) return;
        const parts = chatId.split('_');
        const otherUid = parts.find(uid => uid !== user.uid);

        if (otherUid) {
            // 1. Get User Profile
            getDoc(doc(db, "users", otherUid)).then(snap => {
                if (snap.exists()) {
                    setOtherUser(snap.data());
                }
            });

            // 2. Listen to Status
            const statusRef = ref(rtdb, `status/${otherUid}`);
            const unsub = onValue(statusRef, (snapshot) => {
                setOtherUserStatus(snapshot.val());
            });
            return () => unsub();
        }
    }, [chatId, user]);

    const [messageLimit, setMessageLimit] = useState(20);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const isFetchingOlderRef = useRef(false);
    const prevScrollHeightRef = useRef(0);
    const oldestMessageIdRef = useRef<string | null>(null);
    const lastMessageIdRef = useRef<string | null>(null);
    const initialLoadDone = useRef(false);

    // ... existing presence useEffect ...

    // Initialize Chat (Run once per chat)
    useEffect(() => {
        if (!user || !chatId) return;

        // Reset state for new chat
        setMessages([]);
        setLoading(true);
        initialLoadDone.current = false;
        lastMessageIdRef.current = null;
        isFetchingOlderRef.current = false;
        prevScrollHeightRef.current = 0;
        oldestMessageIdRef.current = null;

        const initChat = async () => {
            const chatRef = doc(db, "chats", chatId);
            const chatSnap = await getDoc(chatRef);

            if (!chatSnap.exists()) {
                const parts = chatId.split('_');
                if (parts.length === 2) {
                    const otherUid = parts.find(uid => uid !== user.uid);
                    if (otherUid) {
                        const newChat: Partial<Chat> = {
                            type: 'private',
                            participantIds: parts,
                            participants: {},
                            updatedAt: Date.now(),
                        };
                        await setDoc(chatRef, newChat);
                    }
                }
            }
        };

        initChat().then(() => {
            const unsubChat = onSnapshot(doc(db, "chats", chatId), (doc) => {
                if (doc.exists()) {
                    setChatData({ id: doc.id, ...doc.data() } as Chat);
                }
            });
            return unsubChat;
        });

        const typingRef = ref(rtdb, `typing/${chatId}`);
        const unsubTyping = onValue(typingRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const otherUserTyping = Object.keys(data).some(uid => uid !== user.uid && data[uid] === true);
                setShowTypingIndicator(otherUserTyping);
            } else {
                setShowTypingIndicator(false);
            }
        });

        return () => {
            // Cleanup listeners when chat changes
            // unsubChat is returned from initChat().then() and handled there.
            unsubTyping();
            remove(ref(rtdb, `typing/${chatId}/${user.uid}`));
        };
    }, [chatId, user]); // Removed messageLimit dependency

    // Messages Listener (Run when limit changes)
    useEffect(() => {
        if (!user || !chatId) return;

        const q = query(
            collection(db, "chats", chatId, "messages"),
            orderBy("createdAt", "asc"),
            limitToLast(messageLimit)
        );

        const unsubMessages = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
                };
            }) as Message[];

            setMessages(msgs);
            setLoading(false);
        });

        return () => {
            unsubMessages();
        };
    }, [chatId, user, messageLimit]);

    // Update the scroll handler
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        // Prevent fetching older if we haven't done the initial scroll to bottom yet
        if (!initialLoadDone.current) return;

        const { scrollTop, scrollHeight } = e.currentTarget;
        if (scrollTop === 0 && !loading && messages.length >= messageLimit) {
            // Only fetch if we are scrolling up and hit the top
            // Capture height BEFORE update
            const container = scrollContainerRef.current;
            if (container) {
                if (isFetchingOlderRef.current) return;

                // Capture the ID of the top-most message to anchor to
                if (messages.length > 0) {
                    oldestMessageIdRef.current = messages[0].id;
                }

                prevScrollHeightRef.current = container.scrollHeight;
                isFetchingOlderRef.current = true;
                setMessageLimit(prev => prev + 20);
            }
        }
    };

    // Use LayoutEffect to adjust scroll BEFORE browser paints
    // This effectively hides the "jump" from the user
    useLayoutEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || messages.length === 0) return;

        const currentLastMessageId = messages[messages.length - 1].id;
        const lastMessageChanged = currentLastMessageId !== lastMessageIdRef.current;

        if (isFetchingOlderRef.current) {
            // Restore scroll position based on height difference
            // We loop until height actually updates to handle browser layout delays
            let attempts = 0;
            const restoreScrollPosition = () => {
                const newScrollHeight = container.scrollHeight;
                const heightDifference = newScrollHeight - prevScrollHeightRef.current;

                if (heightDifference > 0) {
                    container.scrollTop = heightDifference;
                    isFetchingOlderRef.current = false;
                } else if (attempts < 20) {
                    // Retry in next frame if height hasn't updated yet
                    attempts++;
                    requestAnimationFrame(restoreScrollPosition);
                } else {
                    // Give up after timeout (approx 300ms) prevents infinite loop
                    isFetchingOlderRef.current = false;
                }
            };

            restoreScrollPosition();
        } else if (lastMessageChanged) {
            // Normal behavior: auto-scroll to bottom ONLY if a new message arrived
            // Use "auto" (instant) for initial load to ensure we hit the bottom immediately
            // Use "smooth" for subsequent messages
            const behavior = lastMessageIdRef.current === null ? "auto" : "smooth";
            messagesEndRef.current?.scrollIntoView({ behavior });

            // Mark initial load as done after we've scrolled to bottom once
            if (!initialLoadDone.current) {
                // Use setTimeout to allow the scroll to complete/paint before enabling scroll handler
                setTimeout(() => {
                    initialLoadDone.current = true;
                }, 500); // Increased timeout to allowed for some image loading
            }
        }

        // Update ref for next render
        lastMessageIdRef.current = currentLastMessageId;
    }, [messages, showTypingIndicator]);

    // ResizeObserver to handle images loading and expanding height during initial load
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => {
            if (!initialLoadDone.current && messages.length > 0) {
                messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
            }
        });

        observer.observe(container);
        // We also observe the last child if possible, but container scrollHeight change should trigger.
        // Actually ResizeObserver monitors content box, not necessarily scrollHeight directly on overflows in all browsers,
        // but observing the inner wrapper or simply the container usually works if flex changes.
        // A better approach for a chat list: observe the 'messagesEndRef' parent or the messages list wrapper.
        // Since we map messages directly into the container, let's observe the container's first child (wrapper) if it existed,
        // but here messages are direct children.
        // We can observe the container element itself.

        // For standard "stick to bottom" during load:
        if (!initialLoadDone.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }

        return () => observer.disconnect();
    }, [messages]);

    const handleTyping = (isTypingInput: boolean) => {
        if (!user || !chatId) return;
        const userTypingRef = ref(rtdb, `typing/${chatId}/${user.uid}`);

        if (isTypingInput) {
            set(userTypingRef, true);
            onDisconnect(userTypingRef).remove();

            // Auto-stop after 5 seconds
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                set(userTypingRef, null);
            }, 5000);

        } else {
            set(userTypingRef, null);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    };

    // Mark messages as read
    useEffect(() => {
        if (!user || !chatId || messages.length === 0) return;

        const markAsRead = async () => {
            const unreadMessages = messages.filter(msg =>
                msg.senderId !== user.uid &&
                (!msg.readBy || !msg.readBy.includes(user.uid))
            );

            if (unreadMessages.length > 0) {
                await Promise.all(unreadMessages.map(async (msg) => {
                    const msgRef = doc(db, "chats", chatId, "messages", msg.id);
                    const newReadBy = [...(msg.readBy || []), user.uid];
                    await updateDoc(msgRef, { readBy: newReadBy });
                }));
            }

            // Also update the chat doc's lastMessage if it matches and is unread
            // We loosen the check: if we are viewing the chat, and the last message is from other user,
            // we mark the chat's last message as read.
            // THIS MUST BE OUTSIDE THE unreadMessages CHECK to ensure sidebar updates
            // even if messages were marked read elsewhere or race conditions occurred.
            if (chatData?.lastMessage && chatData.lastMessage.senderId !== user.uid) {
                const currentReadBy = chatData.lastMessage.readBy || [];
                if (!currentReadBy.includes(user.uid)) {
                    const chatRef = doc(db, "chats", chatId);
                    const newReadBy = [...currentReadBy, user.uid];
                    await updateDoc(chatRef, {
                        "lastMessage.readBy": newReadBy
                    });
                }
            }
        };

        markAsRead();
    }, [messages, user, chatId, chatData]);

    const sendMessage = async (text: string) => {
        if (!user || !chatId) return;

        // Stop typing immediately
        handleTyping(false);

        const messageData = {
            senderId: user.uid,
            text,
            type: "text",
            createdAt: serverTimestamp(),
            readBy: [user.uid]
        };

        // Add to messages subcollection
        const msgsRef = collection(db, "chats", chatId, "messages");
        await addDoc(msgsRef, messageData);

        // Update last message in chat doc
        const chatRef = doc(db, "chats", chatId);
        await updateDoc(chatRef, {
            lastMessage: {
                text,
                senderId: user.uid,
                timestamp: Date.now(),
                readBy: [user.uid]
            },
            updatedAt: serverTimestamp()
        });
    };

    const sendMedia = async (mediaData: any) => {
        if (!user || !chatId) return;

        handleTyping(false);

        const type = mediaData.mimeType?.startsWith('video') ? 'video' : 'image';

        const messageData = {
            senderId: user.uid,
            text: "",
            type,
            media: mediaData,
            createdAt: serverTimestamp(),
            readBy: [user.uid]
        };

        const msgsRef = collection(db, "chats", chatId, "messages");
        await addDoc(msgsRef, messageData);

        const chatRef = doc(db, "chats", chatId);
        await updateDoc(chatRef, {
            lastMessage: {
                text: type === 'image' ? 'Sent an image' : 'Sent a video',
                senderId: user.uid,
                timestamp: Date.now(),
                readBy: [user.uid]
            },
            updatedAt: serverTimestamp()
        });
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        if (!user || !chatId) return;

        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        const message = messages[messageIndex];
        const currentReactions = message.reactions || {};
        const userIds = currentReactions[emoji] || [];

        let newReactions = { ...currentReactions };

        if (userIds.includes(user.uid)) {
            // Remove reaction
            const newUserIds = userIds.filter(id => id !== user.uid);
            if (newUserIds.length > 0) {
                newReactions[emoji] = newUserIds;
            } else {
                delete newReactions[emoji];
            }
        } else {
            // Add reaction
            newReactions[emoji] = [...userIds, user.uid];
            // Optional: Limit to 1 reaction per user per message? 
            // For now let's allow multiple. If single, we'd remove user.uid from other emojis.
        }

        const msgRef = doc(db, "chats", chatId, "messages", messageId);
        await updateDoc(msgRef, { reactions: newReactions });
    };

    if (loading) return <div className="flex h-full items-center justify-center">Loading chat...</div>;

    return (
        <div className="flex h-full flex-col bg-gray-50">
            <div className="border-b bg-white p-4 shadow-sm flex items-center gap-3">
                <Link href="/" className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                {otherUser ? (
                    <>
                        <div className="relative">
                            <img
                                src={otherUser.photoURL || `https://ui-avatars.com/api/?name=${otherUser.displayName}`}
                                alt={otherUser.displayName}
                                className="h-10 w-10 rounded-full object-cover"
                            />
                            {otherUserStatus?.state === 'online' && (
                                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-white"></span>
                            )}
                        </div>
                        <div>
                            <h2 className="font-semibold text-gray-800">{otherUser.displayName}</h2>
                            <p className="text-xs text-gray-500">
                                {otherUserStatus?.state === 'online' ? (
                                    <span className="text-green-600 font-medium">Online</span>
                                ) : (
                                    otherUserStatus?.last_changed ? (
                                        <LastSeen date={otherUserStatus.last_changed} format="long" />
                                    ) : 'Offline'
                                )}
                            </p>
                        </div>
                    </>
                ) : (
                    <h2 className="font-semibold text-gray-800">Chat</h2>
                )}
            </div>

            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-4"
                style={{ overflowAnchor: "none" }}
                onScroll={handleScroll}
            >
                {/* Visual loader could go here if we tracked state */}
                {messages.map((msg, index) => {
                    const isLastMessage = index === messages.length - 1;
                    const currentDate = new Date(msg.createdAt);
                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;
                    const showDateSeparator = !prevDate || !isSameDay(currentDate, prevDate);

                    // Avatar Logic
                    // Show avatar if:
                    // 1. First message in list
                    // 2. Different sender from previous
                    // 3. Same sender but > 1 hour gap
                    const ONE_HOUR = 60 * 60 * 1000;
                    const isFirstInGroup = !prevMsg ||
                        prevMsg.senderId !== msg.senderId ||
                        (msg.createdAt - prevMsg.createdAt > ONE_HOUR);

                    const showAvatar = isFirstInGroup;

                    // Determine Avatar URL
                    // If isOwn, we use user?.photoURL. If other, we use otherUser?.photoURL
                    // We also have a fallback UI Avatar if photoURL is missing
                    const avatarUrl = msg.senderId === user?.uid
                        ? (user?.photoURL || undefined)
                        : (otherUser?.photoURL || undefined);

                    return (
                        <div key={msg.id}>
                            {showDateSeparator && (
                                <div className="my-4 flex justify-center">
                                    <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-500 shadow-sm border border-gray-200">
                                        {formatDateLabel(currentDate)}
                                    </span>
                                </div>
                            )}
                            <div id={`msg-${msg.id}`} className="w-full">
                                <MessageBubble
                                    message={msg}
                                    onImageClick={(url) => setPreviewImage(url)}
                                    showAvatar={showAvatar}
                                    avatarUrl={avatarUrl}
                                    onReaction={handleReaction}
                                />
                            </div>
                        </div>
                    );
                })}
                {showTypingIndicator && (
                    <div className="mb-4">
                        <TypingIndicator />
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <ChatInput onSendMessage={sendMessage} onSendMedia={sendMedia} onTyping={handleTyping} />

            <ImageModal
                isOpen={!!previewImage}
                imageUrl={previewImage}
                onClose={() => setPreviewImage(null)}
            />
        </div>
    );
}
