"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface BookingInfo {
    id: number;
    court: {
        id: number;
        name: string;
        venue: {
            id: number;
            name: string;
            address: string;
            image: string;
        };
    };
    date: string;
    start_time: string;
    end_time: string;
    total_price: number;
    status: string;
    payment_code: string;
    created_at: string;
}

export default function SuccessPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');

    const [booking, setBooking] = useState<BookingInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!bookingId) {
            router.push(`/booking/${venueId}`);
            return;
        }

        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/login');
            return;
        }

        fetch(`http://localhost:8000/api/bookings/${bookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Không tìm thấy đơn đặt sân');
                return res.json();
            })
            .then((data: BookingInfo) => {
                if (data.status !== 'confirmed') {
                    router.push(`/booking/${venueId}`);
                    return;
                }
                setBooking(data);
            })
            .catch(err => {
                console.error(err);
                router.push(`/booking/${venueId}`);
            })
            .finally(() => setIsLoading(false));
    }, [bookingId, venueId, router]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    if (!booking) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 py-8 px-4">
            <div className="max-w-lg mx-auto">
                {/* Success Animation */}
                <div className="text-center mb-8">
                    <div className="relative inline-block">
                        <div className="w-28 h-28 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200 animate-bounce">
                            <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        {/* Decorative rings */}
                        <div className="absolute inset-0 -m-4 border-4 border-emerald-200/50 rounded-full animate-ping"></div>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 mt-6 mb-2">
                        Đặt sân thành công!
                    </h1>
                    <p className="text-slate-500">Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi</p>
                </div>

                {/* Booking Details Card */}
                <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden mb-6">
                    {/* Venue Header */}
                    <div className="relative h-40">
                        {booking.court.venue.image ? (
                            <img
                                src={booking.court.venue.image}
                                alt={booking.court.venue.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center">
                                <span className="text-6xl opacity-50">🏟️</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-4 left-4 right-4">
                            <h2 className="text-xl font-bold text-white">{booking.court.venue.name}</h2>
                            <p className="text-white/80 text-sm">{booking.court.name}</p>
                        </div>
                    </div>

                    {/* Booking Info */}
                    <div className="p-6">
                        {/* Booking Code */}
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 mb-6 text-center border border-emerald-100">
                            <p className="text-sm text-slate-500 mb-1">Mã đơn đặt sân</p>
                            <p className="text-2xl font-bold font-mono text-emerald-700 tracking-wider">
                                {booking.payment_code}
                            </p>
                        </div>

                        {/* Details Grid */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Ngày</p>
                                    <p className="font-semibold text-slate-800">
                                        {new Date(booking.date).toLocaleDateString('vi-VN', {
                                            weekday: 'long',
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Thời gian</p>
                                    <p className="font-semibold text-slate-800">{booking.start_time} - {booking.end_time}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">Địa chỉ</p>
                                    <p className="font-semibold text-slate-800">{booking.court.venue.address}</p>
                                </div>
                            </div>
                        </div>

                        {/* Total Amount */}
                        <div className="mt-6 pt-6 border-t border-dashed border-slate-200">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 font-medium">Tổng thanh toán</span>
                                <span className="text-2xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                                    {formatCurrency(booking.total_price)}
                                </span>
                            </div>
                            <p className="text-right text-xs text-slate-400 mt-1">Đã thanh toán</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <Link
                        href="/my-bookings"
                        className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        Xem lịch đặt sân của tôi
                    </Link>

                    <Link
                        href="/map"
                        className="flex items-center justify-center gap-2 w-full bg-white border-2 border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Tìm sân khác trên bản đồ
                    </Link>

                    <button
                        onClick={() => router.push(`/booking/${venueId}`)}
                        className="w-full text-indigo-600 font-medium py-2 hover:text-indigo-700 transition-colors text-sm"
                    >
                        Đặt thêm khung giờ tại sân này
                    </button>
                </div>

                {/* Reminder */}
                <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-amber-800">Lưu ý quan trọng</p>
                            <p className="text-xs text-amber-600 mt-1">
                                Vui lòng đến trước giờ đặt 10 phút. Mang theo mã đơn hàng hoặc CMND/CCCD để check-in tại sân.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
