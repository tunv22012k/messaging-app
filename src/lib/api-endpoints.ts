export const API_ENDPOINTS = {
    auth: {
        login: '/login',
        register: '/register',
        logout: '/logout',
        user: '/user',
        updateProfile: '/user/profile',
        google: `${process.env.NEXT_PUBLIC_API_URL}/auth/google/redirect`,
    },
    bookings: {
        list: '/bookings',
        detail: (id: string | number) => `/bookings/${id}`,
        initiate: '/bookings/initiate',
        confirm: (id: string | number) => `/bookings/${id}/confirm`,
        cancel: (id: string | number) => `/bookings/${id}/cancel`,
    },
    venues: {
        list: '/venues',
        detail: (id: string | number) => `/venues/${id}`,
        bookings: (id: string | number) => `/venues/${id}/bookings`,
        pendingSlots: (id: string | number) => `/venues/${id}/pending-slots`,
        reviews: (id: string | number) => `/venues/${id}/reviews`,
    },
    marketplace: {
        items: '/marketplace',
        purchase: (id: string | number) => `/marketplace/${id}/purchase`,
    },
    chats: {
        list: '/chats',
        detail: (id: string | number) => `/chats/${id}`,
        messages: (chatId: string | number) => `/chats/${chatId}/messages`,
        read: (chatId: string | number) => `/chats/${chatId}/read`,
        react: (messageId: string | number) => `/messages/${messageId}/react`,
        drive: '/api/drive', // Internal API route in Next.js
    },
    users: {
        list: '/users',
        search: '/users/search',
        detail: (id: string | number) => `/users/${id}`,
    },
    notifications: {
        list: '/notifications',
        unreadCount: '/messages/unread-count',
        markRead: (id: string | number) => `/notifications/${id}/read`,
        markAllRead: '/notifications/read-all',
    }
};
