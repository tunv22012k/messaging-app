import { Message } from "@/types";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import clsx from "clsx";
import { useState, useRef, useEffect } from "react";

export default function MessageBubble({
    message,
    onImageClick,
    showAvatar,
    avatarUrl,
    onReaction,
    isMe: propsIsMe
}: {
    message: Message;
    onImageClick?: (url: string) => void;
    showAvatar?: boolean;
    avatarUrl?: string;
    onReaction?: (messageId: string, emoji: string) => void;
    isMe?: boolean;
}) {
    const { user } = useAuth();
    // Use passed isMe prop if available, otherwise fall back to internal check (though internal check is flaky for mixed IDs)
    const isOwn = propsIsMe !== undefined ? propsIsMe : String(message.senderId) === String(user?.uid);
    const [showPicker, setShowPicker] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowPicker(false);
            }
        };

        if (showPicker) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showPicker]);

    const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

    const renderContent = () => {
        switch (message.type) {
            case "image":
                // Use proxy for reliable image serving (bypasses Google Drive 403/Reference issues)
                const imageUrl = message.media?.fileId
                    ? `/api/image?id=${message.media.fileId}`
                    : message.media?.viewLink;

                return (
                    <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={imageUrl}
                            alt="Sent image"
                            className="w-full h-auto max-w-full rounded-lg cursor-pointer object-cover"
                            referrerPolicy="no-referrer"
                            onClick={() => imageUrl && onImageClick?.(imageUrl)}
                        />
                        {message.text && <p className="mt-1 whitespace-pre-wrap">{message.text}</p>}
                    </div>
                );
            case "video":
                return (
                    <div>
                        <video controls className="max-w-xs rounded-lg">
                            <source src={message.media?.viewLink} type={message.media?.mimeType} />
                            Your browser does not support the video tag.
                        </video>
                        {message.text && <p className="mt-1 whitespace-pre-wrap">{message.text}</p>}
                    </div>
                );
            default:
                return <p className="whitespace-pre-wrap">{message.text}</p>;
        }
    };



    const renderReactions = () => {
        if (!message.reactions || Object.keys(message.reactions).length === 0) return null;

        return (
            <div className={clsx("absolute -bottom-5 flex gap-1 right-0")}>
                {Object.entries(message.reactions).map(([emoji, userIds]) => {
                    const count = userIds.length;
                    const iReacted = user && userIds.includes(user.uid);

                    return (
                        <button
                            key={emoji}
                            onClick={() => onReaction?.(message.id, emoji)}
                            className={clsx(
                                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs shadow-sm border transaction-all hover:scale-110",
                                iReacted ? "bg-blue-100 border-blue-200" : "bg-white border-gray-200"
                            )}
                        >
                            <span>{emoji}</span>
                            {count > 1 && <span className="text-gray-500 font-medium">{count}</span>}
                        </button>
                    );
                })}
            </div>
        );
    };

    const Avatar = () => (
        <div className="flex-shrink-0 w-8 h-8 mr-2 mt-1">
            {showAvatar && (
                avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover border border-gray-100"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs ring-2 ring-white">
                        {message.sender?.displayName?.charAt(0).toUpperCase() || "?"}
                    </div>
                )
            )}
            {!showAvatar && <div className="w-8 mr-2" />}
        </div>
    );

    return (
        <div className={clsx("flex group relative", isOwn ? "justify-end" : "justify-start", showAvatar ? "mt-2" : "")}>
            {!isOwn && <Avatar />}

            <div className="relative">
                {/* Reaction Picker Popover */}
                {showPicker && (
                    <div
                        ref={pickerRef}
                        className={clsx(
                            "absolute flex gap-1 bg-white rounded-full shadow-lg border border-gray-200 p-1.5 z-50 animate-in fade-in zoom-in duration-200",
                            isOwn ? "top-full right-0 mt-2" : "top-full left-0 mt-2"
                        )}
                    >
                        {REACTION_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    onReaction?.(message.id, emoji);
                                    setShowPicker(false);
                                }}
                                className="hover:bg-gray-100 p-1.5 rounded-full text-xl leading-none transition-transform hover:scale-125"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <div
                    className={clsx(
                        "rounded-2xl px-4 py-2 shadow-sm relative",
                        isOwn
                            ? "bg-blue-600 text-white rounded-tr-sm"
                            : "bg-white text-gray-900 rounded-tl-sm"
                    )}
                >
                    {renderContent()}
                    <div
                        className={clsx(
                            "mt-1 text-xs flex items-center justify-end gap-1",
                            isOwn ? "text-blue-100" : "text-gray-400"
                        )}
                    >
                        <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isOwn && message.readBy && message.readBy.length > 1 && (
                            /* Simple clean double-check icon */
                            <svg className="w-4 h-4 ml-1 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M0 0h24v24H0V0z" fill="none" />
                                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.41 11.93 6 13.34l5.66 5.66 12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
                            </svg>
                        )}
                    </div>
                </div>

                {/* Add Reaction Button Trigger */}
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    className={clsx(
                        "absolute -bottom-6 p-1 text-gray-400 hover:text-yellow-500 opacity-0 group-hover:opacity-100 transition-all duration-200",
                        isOwn ? "right-0" : "right-0"
                    )}
                    title="Add reaction"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>

                {/* Render Existing Reactions */}
                {renderReactions()}
            </div>


        </div>
    );
}
