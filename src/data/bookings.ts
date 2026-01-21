export interface Booking {
    id: string;
    venueName: string;
    venueImage?: string;
    courtName: string;
    date: string;
    time: string;
    price: number;
    status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
    createdAt: string;
    // Transfer fields
    isForTransfer?: boolean;
    transferNote?: string;
    transferPrice?: number;
    transferStatus?: 'available' | 'requested' | 'transferred';
    requestedBy?: string;
}

export const MOCK_BOOKINGS: Booking[] = [
    {
        id: "b1",
        venueName: "Sân Cầu Lông Quân Khu 5",
        venueImage: "https://images.unsplash.com/photo-1626224583764-84786c713044?auto=format&fit=crop&q=80&w=800",
        courtName: "Sân 1",
        date: "2026-01-21",
        time: "18:00 - 19:00",
        price: 100000,
        status: "confirmed",
        createdAt: "2026-01-20T10:00:00Z"
    },
    {
        id: "b2",
        venueName: "Sân Bóng Đá Tuyên Sơn",
        venueImage: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&q=80&w=800",
        courtName: "Sân A",
        date: "2026-01-25",
        time: "17:00 - 18:30",
        price: 300000,
        status: "pending",
        createdAt: "2026-01-21T09:30:00Z"
    },
    {
        id: "b3",
        venueName: "Sân Tennis Công Viên 29/3",
        venueImage: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&q=80&w=800",
        courtName: "Sân Chính",
        date: "2026-01-10",
        time: "06:00 - 07:00",
        price: 150000,
        status: "completed",
        createdAt: "2026-01-08T15:00:00Z"
    },
    {
        id: "b4",
        venueName: "Sân Cầu Lông Chi Lăng",
        venueImage: "https://images.unsplash.com/photo-1626224583764-84786c713044?auto=format&fit=crop&q=80&w=800",
        courtName: "Sân 3",
        date: "2026-01-28",
        time: "19:00 - 20:00",
        price: 120000,
        status: "confirmed",
        createdAt: "2026-01-18T10:00:00Z",
        isForTransfer: true,
        transferStatus: 'available',
        transferNote: "Mình bận đột xuất, cần để lại sân. Giá gốc!",
        transferPrice: 120000
    }
];
