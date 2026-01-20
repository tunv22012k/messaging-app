"use client";

import { useEffect, useState } from "react";

interface LastSeenProps {
    date: number; // timestamp
    format?: 'short' | 'long';
    className?: string;
}

export default function LastSeen({ date, format = 'long', className = "" }: LastSeenProps) {
    const [text, setText] = useState("");

    useEffect(() => {
        const updateTime = () => {
            const now = Date.now();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);

            if (format === 'short') {
                if (minutes < 1) setText("1m");
                else if (minutes < 60) setText(`${minutes}m`);
                else {
                    const hours = Math.floor(minutes / 60);
                    if (hours < 24) setText(`${hours}h`);
                    else setText(`${Math.floor(hours / 24)}d`);
                }
            } else {
                // Long format
                if (minutes < 1) setText("Just now");
                else if (minutes < 60) setText(`Last seen ${minutes}m ago`);
                else {
                    const hours = Math.floor(minutes / 60);
                    if (hours < 24) setText(`Last seen ${hours}h ago`);
                    else setText(`Last seen ${Math.floor(hours / 24)}d ago`);
                }
            }
        };

        updateTime();
        // Update every minute (or 30s to be safe)
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, [date, format]);

    return <span className={className}>{text}</span>;
}
