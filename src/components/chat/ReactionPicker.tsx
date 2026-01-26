import React from 'react';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

interface ReactionPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    position: 'left' | 'right';
}

export default function ReactionPicker({ onSelect, onClose, position }: ReactionPickerProps) {
    // Click outside handler could be added but for simplicity we rely on onClose prop or layout handling

    return (
        <div
            className={`absolute bottom-full mb-2 ${position === 'left' ? 'left-0' : 'right-0'} z-50 bg-white rounded-full shadow-lg border border-gray-100 p-1 flex gap-1 animate-in fade-in zoom-in duration-200`}
            onMouseLeave={onClose}
        >
            {REACTIONS.map(emoji => (
                <button
                    key={emoji}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(emoji);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 rounded-full transition-colors transform hover:scale-125 hover:-translate-y-1 active:scale-95 duration-200"
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}
