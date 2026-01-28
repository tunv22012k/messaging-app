export interface Venue {
    id: string;
    name: string;
    type: 'badminton' | 'football' | 'tennis';
    location: {
        lat: number;
        lng: number;
    };
    address: string;
    price: number;
    pricing_type: string;
    image?: string;
    description: string;
    courts: {
        id: string;
        name: string;
        slots: {
            id: string;
            date: string; // YYYY-MM-DD
            startTime: string;
            endTime: string;
            price: number;
            isBooked: boolean;
        }[];
    }[];
    extras: {
        id: string;
        name: string;
        price: number;
    }[];
    reviews: {
        id: string;
        userName: string;
        userAvatar?: string;
        rating: number;
        comment: string;
        date: string;
    }[];
}

export const VENUES: Venue[] = [
    {
        id: '1',
        name: 'Sân Cầu Lông Quân Khu 5',
        type: 'badminton',
        location: { lat: 16.0372, lng: 108.2120 },
        address: '7 Duy Tân, Hòa Cường Bắc, Hải Châu, Đà Nẵng',
        price: 80000,
        pricing_type: 'hour',
        description: 'Sân tiêu chuẩn thi đấu, thoáng mát, trung tâm thành phố.',
        courts: [
            {
                id: 'c1',
                name: 'Sân 1',
                slots: [
                    { id: 's1', date: '2026-01-21', startTime: '07:00', endTime: '08:00', price: 80000, isBooked: true },
                    { id: 's2', date: '2026-01-21', startTime: '08:00', endTime: '09:00', price: 80000, isBooked: false },
                    { id: 's3', date: '2026-01-21', startTime: '09:00', endTime: '10:00', price: 80000, isBooked: false },
                    { id: 's4', date: '2026-01-21', startTime: '17:00', endTime: '18:00', price: 100000, isBooked: false },
                    { id: 's5', date: '2026-01-21', startTime: '18:00', endTime: '19:00', price: 100000, isBooked: true },
                ]
            },
            {
                id: 'c2',
                name: 'Sân 2',
                slots: [
                    { id: 's6', date: '2026-01-21', startTime: '17:00', endTime: '18:00', price: 100000, isBooked: false },
                    { id: 's7', date: '2026-01-21', startTime: '18:00', endTime: '19:00', price: 100000, isBooked: false },
                ]
            },
            ...Array.from({ length: 8 }, (_, i) => ({
                id: `c${i + 3}`,
                name: `Sân ${i + 3}`,
                slots: [
                    { id: `s${100 + i}_1`, date: '2026-01-21', startTime: '17:00', endTime: '18:00', price: 80000, isBooked: false },
                    { id: `s${100 + i}_2`, date: '2026-01-21', startTime: '18:00', endTime: '19:00', price: 80000, isBooked: false },
                ]
            }))
        ],
        extras: [
            { id: 'e1', name: 'Thuê vợt', price: 20000 },
            { id: 'e2', name: 'Nước suối', price: 10000 },
            { id: 'e3', name: 'Trọng tài', price: 50000 },
        ],
        reviews: [
            { id: 'r1', userName: 'Nguyen Van A', rating: 5, comment: 'Sân đẹp, thoáng mát.', date: '2023-10-20' },
            { id: 'r2', userName: 'Tran Thi B', rating: 4, comment: 'Giá cả hợp lý.', date: '2023-10-21' },
        ]
    },
    {
        id: '2',
        name: 'Sân Bóng Đá Tuyên Sơn',
        type: 'football',
        location: { lat: 16.0336, lng: 108.2238 },
        address: 'Làng thể thao Tuyên Sơn, Hải Châu, Đà Nẵng',
        price: 300000,
        pricing_type: 'match',
        description: 'Cụm sân cỏ nhân tạo lớn nhất Đà Nẵng, dịch vụ tốt.',
        courts: [
            {
                id: 'c1',
                name: 'Sân A',
                slots: [
                    { id: 's1', date: '2026-01-21', startTime: '17:00', endTime: '18:30', price: 300000, isBooked: false },
                    { id: 's2', date: '2026-01-21', startTime: '18:30', endTime: '20:00', price: 350000, isBooked: true },
                    { id: 's3', date: '2026-01-21', startTime: '20:00', endTime: '21:30', price: 300000, isBooked: false },
                ]
            }
        ],
        extras: [
            { id: 'e1', name: 'Áo bib', price: 10000 },
            { id: 'e2', name: 'Trọng tài', price: 100000 },
            { id: 'e3', name: 'Nước bình 20L', price: 20000 },
        ],
        reviews: [
            { id: 'r1', userName: 'Le Van C', rating: 5, comment: 'Sân cỏ chất lượng tốt.', date: '2023-10-22' },
        ]
    },
    {
        id: '3',
        name: 'Sân Tennis Công Viên 29/3',
        type: 'tennis',
        location: { lat: 16.0610, lng: 108.2045 },
        address: 'Công viên 29/3, Thanh Khê, Đà Nẵng',
        price: 150000,
        pricing_type: 'hour',
        description: 'Không gian xanh mát, yên tĩnh, mặt sân cứng.',
        courts: [
            {
                id: 'c1',
                name: 'Sân Chính',
                slots: [
                    { id: 's1', date: '2026-01-21', startTime: '06:00', endTime: '07:00', price: 150000, isBooked: false },
                    { id: 's2', date: '2026-01-21', startTime: '17:00', endTime: '18:00', price: 200000, isBooked: false },
                ]
            }
        ],
        extras: [
            { id: 'e1', name: 'Nhặt bóng', price: 50000 },
        ],
        reviews: []
    },
    {
        id: '4',
        name: 'Sân Cầu Lông Chi Lăng',
        type: 'badminton',
        location: { lat: 16.0718, lng: 108.2215 },
        address: 'SVĐ Chi Lăng, Hải Châu, Đà Nẵng',
        price: 70000,
        pricing_type: 'hour',
        description: 'Sân lâu đời, giá bình dân, cộng đồng chơi đông.',
        courts: [],
        extras: [],
        reviews: []
    },
    {
        id: '5',
        name: 'Sân Bóng Chuyên Việt',
        type: 'football',
        location: { lat: 16.0594, lng: 108.2435 },
        address: 'An Đồn, Sơn Trà, Đà Nẵng',
        price: 350000,
        pricing_type: 'match',
        description: 'Sân mới, cỏ đẹp, gần biển.',
        courts: [],
        extras: [],
        reviews: []
    }
];
