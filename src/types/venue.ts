export interface Venue {
    id: number | string;
    name: string;
    type: 'badminton' | 'football' | 'tennis';
    lat?: number;
    lng?: number;
    location?: { // Kept for backward compatibility if needed, but backend uses flat lat/lng
        lat: number;
        lng: number;
    };
    address: string;
    price: number;
    pricing_type: string;
    image?: string;
    description: string;
    courts?: {
        id: number | string;
        name: string;
    }[];
    extras?: {
        id: number | string;
        name: string;
        price: number;
    }[];
    reviews?: {
        id: number | string;
        userName: string;
        userAvatar?: string;
        rating: number;
        comment: string;
        date: string;
    }[];
}
