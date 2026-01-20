export interface User {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
    createdAt: number; // timestamp
    lastSeen?: number; // timestamp
}

export interface Chat {
    id: string;
    type: 'private' | 'group';
    participantIds: string[];
    participants: {
        [uid: string]: {
            displayName: string | null;
            photoURL: string | null;
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
    reactions?: { [emoji: string]: string[] }; // emoji -> array of userIds
}

export interface PresenceStatus {
    state: 'online' | 'offline';
    last_changed: number;
}
