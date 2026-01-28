export const APP_ROUTES = {
    home: '/',
    login: '/login',
    register: '/register',
    profile: '/profile',
    map: {
        index: '/map',
        detail: (venueId: string | number) => `/map/${venueId}`,
    },
    bookings: {
        myBookings: '/my-bookings',
        viewDetail: (bookingId: string | number) => `/my-bookings/${bookingId}`,
        detail: (venueId: string | number) => `/booking/${venueId}`,
        payment: (venueId: string | number, bookingId: string | number) => `/booking/${venueId}/payment?bookingId=${bookingId}`,
        success: (venueId: string | number, bookingId: string | number) => `/booking/${venueId}/success?bookingId=${bookingId}`,
        success_param: (venueId: string | number) => `/booking/${venueId}/success`, // for route matching if needed
    },
    marketplace: '/marketplace',
    people: '/people',
    chat: {
        index: '/chat',
        detail: (chatId: string) => `/chat/${chatId}`,
    },
    auth: {
        callback: '/auth/callback',
    }
};
