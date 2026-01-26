export interface User {
    uid: string;
    displayName: string | null;
    email: string | null;
    avatar: string | null;
    createdAt: number; // timestamp
    lastSeen?: number; // timestamp
    connections?: string[]; // Array of connected user UIDs
    lastMessage?: string;
    lastMessageSenderId?: string;
    lastMessageReadAt?: string | null;
    google_id?: string;
    id?: number;
}

export interface Chat {
    id: string;
    type: 'private' | 'group';
    participantIds: string[];
    participants: {
        [uid: string]: {
            displayName: string | null;
            avatar: string | null;
        };
    };
    lastMessage?: {
        text: string;
        senderId: string;
        timestamp: number;
        readBy: string[];
    };
    updatedAt: number;
    groupName?: string;
}

export interface Message {
    id: string;
    senderId: string;
    text: string;
    createdAt: number;
    type: 'text' | 'image' | 'video';
    media?: {
        fileId: string;
        viewLink: string;
        thumbnailLink?: string;
        mimeType: string;
    };
    readBy?: string[];
    readAt?: string | null;
    reactions?: MessageReaction[];
    sender?: User; // Add sender relationship for detailed info
}

export interface MessageReaction {
    id: number;
    message_id: number;
    user_id: number;
    reaction: string;
    created_at: string;
    updated_at: string;
}

export interface PresenceStatus {
    state: 'online' | 'offline';
    last_changed: number;
}
