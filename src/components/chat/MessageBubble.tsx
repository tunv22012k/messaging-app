import { Message } from "@/types";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import clsx from "clsx";
import { useState, useRef, useEffect } from "react";

export default function MessageBubble({
    message,
    onMediaClick,
    showAvatar,
    avatarUrl,
    onReaction,
    isMe: propsIsMe
}: {
    message: Message;
    onMediaClick?: (src: string, type: 'image' | 'video', mimeType?: string) => void;
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
                            alt="Ảnh đã gửi"
                            className="w-full h-auto max-w-full rounded-lg cursor-pointer object-cover hover:opacity-90 transition-opacity"
                            referrerPolicy="no-referrer"
                            onClick={() => imageUrl && onMediaClick?.(imageUrl, 'image')}
                        />
                        {message.text && <p className="mt-1 whitespace-pre-wrap">{message.text}</p>}
                    </div>
                );
            case "video":
                return (
                    <div>
                        <div
                            className="relative max-w-xs rounded-lg overflow-hidden cursor-pointer group"
                            onClick={() => message.media?.viewLink && onMediaClick?.(message.media.viewLink, 'video', message.media?.mimeType)}
                        >
                            <video className="w-full h-full object-cover">
                                <source src={message.media?.viewLink} type={message.media?.mimeType} />
                                Trình duyệt của bạn không hỗ trợ thẻ video.
                            </video>

                            {/* Play Overlay */}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                                    <svg className="w-6 h-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        {message.text && <p className="mt-1 whitespace-pre-wrap">{message.text}</p>}
                    </div>
                );
            default:
                return <p className="whitespace-pre-wrap">{message.text}</p>;
        }
    };



    const renderReactions = () => {
        if (!message.reactions || message.reactions.length === 0) return null;

        // Group reactions by emoji
        const params = message.reactions.reduce((acc, curr) => {
            if (!acc[curr.reaction]) acc[curr.reaction] = [];
            acc[curr.reaction].push(curr.user_id);
            return acc;
        }, {} as Record<string, number[]>);

        return (
            <div className={clsx(
                "absolute -bottom-3 flex gap-1 z-10",
                isOwn ? "right-0" : "left-0"
            )}>
                {Object.entries(params).map(([emoji, userIds]) => {
                    const count = userIds.length;
                    const iReacted = userIds.some(uid =>
                        String(uid) === String(user?.uid) ||
                        String(uid) === String(user?.id) ||
                        String(uid) === String(user?.google_id)
                    );

                    return (
                        <button
                            key={emoji}
                            onClick={() => onReaction?.(message.id, emoji)}
                            className={clsx(
                                "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs shadow-sm border transition-all hover:scale-110",
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

    // Position for the reaction trigger button
    // Should be outside the bubble to avoid overlap
    const triggerPosition = isOwn ? "left-0 -ml-8" : "right-0 -mr-8";

    return (
        <div className={clsx("flex group relative mb-2", isOwn ? "justify-end" : "justify-start", showAvatar ? "mt-2" : "")}>
            {!isOwn && <Avatar />}

            <div className="relative">
                {/* Reaction Picker Popover */}
                {showPicker && (
                    <div
                        ref={pickerRef}
                        className={clsx(
                            "absolute flex gap-1 bg-white rounded-full shadow-xl border border-gray-100 p-1.5 z-50 animate-in fade-in zoom-in duration-200",
                            isOwn ? "top-full right-0 mt-2" : "top-full left-0 mt-2"
                        )}
                        style={{ minWidth: "max-content" }}
                    >
                        {REACTION_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReaction?.(message.id, emoji);
                                    setShowPicker(false);
                                }}
                                className="hover:bg-gray-100 p-2 rounded-full text-xl leading-none transition-transform hover:scale-125 hover:-translate-y-1"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}

                <div
                    className={clsx(
                        "rounded-2xl px-4 py-2 shadow-sm relative border border-transparent",
                        isOwn
                            ? "bg-blue-600 text-white rounded-tr-sm"
                            : "bg-white text-gray-900 rounded-tl-sm border-gray-200"
                    )}
                >
                    {renderContent()}
                    <div
                        className={clsx(
                            "mt-1 text-[10px] flex items-center justify-end gap-1 opacity-70",
                            isOwn ? "text-blue-100" : "text-gray-400"
                        )}
                    >
                        <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isOwn && message.readBy && message.readBy.length > 1 && (
                            /* Simple clean double-check icon */
                            <svg className="w-3.5 h-3.5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M0 0h24v24H0V0z" fill="none" />
                                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.41 11.93 6 13.34l5.66 5.66 12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
                            </svg>
                        )}
                    </div>
                </div>

                {/* Add Reaction Button Trigger */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowPicker(!showPicker);
                    }}
                    className={clsx(
                        "absolute top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200",
                        isOwn ? "-left-10" : "-right-10"
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
