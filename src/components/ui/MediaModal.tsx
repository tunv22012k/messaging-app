"use client";

import { useEffect, useState } from "react";
import LoadingOverlay from "./LoadingOverlay";

interface MediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    src: string;
    type: 'image' | 'video';
    mimeType?: string;
}

export default function MediaModal({ isOpen, onClose, src, type, mimeType }: MediaModalProps) {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            setLoading(false);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-50"
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Content Container */}
            <div
                className="relative max-w-7xl max-h-screen w-full h-full p-4 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
            >
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    </div>
                )}

                {type === 'image' ? (
                    <img
                        src={src}
                        alt="Full screen media"
                        className={`max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                        onLoad={() => setLoading(false)}
                        onError={() => setLoading(false)}
                    />
                ) : (
                    <video
                        controls
                        autoPlay
                        className={`max-w-full max-h-full rounded-lg shadow-2xl ${loading ? 'opacity-0' : 'opacity-100'}`}
                        onLoadedData={() => setLoading(false)}
                        onError={() => setLoading(false)}
                    >
                        <source src={src} type={mimeType} />
                        Your browser does not support the video tag.
                    </video>
                )}
            </div>
        </div>
    );
}
