"use client";

import { useState, FormEvent, KeyboardEvent, useRef, useEffect } from "react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

interface ChatInputProps {
    onSendMessage: (text: string) => void;
    onSendMedia: (mediaData: any) => void;
    onTyping?: (isTyping: boolean) => void;
    disabled?: boolean;
}

export default function ChatInput({ onSendMessage, onSendMedia, onTyping, disabled }: ChatInputProps) {
    const [text, setText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showEmojiPicker]);

    // Auto-resize textarea
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height
            // Set new height, capped at ~80px (approx 3 lines) to allow scrolling
            // 24px line-height * 3 lines + padding
            const newHeight = Math.min(textarea.scrollHeight, 80);
            textarea.style.height = `${newHeight}px`;
        }
    }, [text]);

    const handleSubmit = (e?: FormEvent) => {
        e?.preventDefault();
        if (!text.trim()) return;
        onSendMessage(text);
        setText("");
        setShowEmojiPicker(false);
        if (isTyping) {
            setIsTyping(false);
            onTyping?.(false);
        }

        // Reset height immediately after send
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);

        // Simple verification for typing status (could be debounced in parent or here)
        if (!isTyping) {
            setIsTyping(true);
            onTyping?.(true);
        }

        // If empty, stop typing immediately
        if (e.target.value === "" && isTyping) {
            setIsTyping(false);
            onTyping?.(false);
        }
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setText((prev) => prev + emojiData.emoji);
        // We keep the picker open for multiple emojis

        if (!isTyping) {
            setIsTyping(true);
            onTyping?.(true);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/drive", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            console.log("Upload API Response Data:", data);

            onSendMedia({
                fileId: data.id,
                viewLink: data.webViewLink,
                thumbnailLink: data.thumbnailLink || null,
                mimeType: file.type,
            });

        } catch (error) {
            console.error("Error uploading:", error);
            alert("Failed to upload media");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2 border-t bg-white p-4">
            {/* Emoji Picker Popup */}
            {showEmojiPicker && (
                <div
                    ref={pickerRef}
                    className="absolute bottom-full right-15 mb-2 z-50 shadow-xl rounded-lg"
                >
                    <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        theme={Theme.LIGHT}
                        skinTonesDisabled
                        searchDisabled={false}
                        width={300}
                        height={400}
                    />
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,video/*"
            />

            <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full p-2 mb-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                title="Gửi ảnh/video"
            >
                {uploading ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"></div>
                ) : (
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                )}
            </button>

            <div className="relative flex-1 bg-gray-50 rounded-3xl border border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden">
                <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập tin nhắn..."
                    disabled={disabled || uploading}
                    rows={1}
                    className="w-full bg-transparent px-4 py-3 pr-10 focus:outline-none disabled:opacity-50 resize-none overflow-y-auto block max-h-[80px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-400"
                    style={{ minHeight: '44px' }}
                />

                {/* Emoji Toggle Button */}
                <button
                    type="button"
                    className="absolute right-2 bottom-1.5 rounded-full p-1 text-gray-500 hover:text-yellow-500 transition-colors"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Chèn biểu cảm"
                >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>
            </div>

            <button
                type="submit"
                disabled={!text.trim() || disabled || uploading}
                className="rounded-full bg-blue-600 p-2 mb-1 text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
                <svg className="h-5 w-5 translate-x-0.3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </button>
        </form>
    );
}
