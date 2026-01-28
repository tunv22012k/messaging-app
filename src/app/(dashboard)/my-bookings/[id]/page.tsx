"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { APP_ROUTES } from "@/lib/routes";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import LoadingOverlay from "@/components/ui/LoadingOverlay";

interface BookingDetail {
    id: number;
    venueName: string;
    venueAddress?: string;
    venueImage?: string;
    courtName: string;
    date: string;
    startTime: string;
    endTime: string;
    price: number;
    status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'upcoming';
    transferStatus: 'none' | 'available' | 'transferred';
    qrCode?: string; // If API provides it
    extras?: { name: string; price: number; quantity?: number }[];
    paymentCode?: string;
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [transferLoading, setTransferLoading] = useState(false);

    useEffect(() => {
        if (!id) return;

        // Mocking fetching single booking from list API for now as there might not be a detail endpoint
        // Or if there is, use it. Assuming we can fetch by ID.
        // If no direct detail endpoint, filtering from list is a backup.
        // But for "Nhượng sân", we likely need an interaction with specific booking.

        api.get(`${API_ENDPOINTS.bookings.list}`) // Ideally: API_ENDPOINTS.bookings.detail(id)
            .then(res => {
                // API now returns paginated response: { data: [...], current_page: ... }
                const bookingsList = res.data.data ? res.data.data : (Array.isArray(res.data) ? res.data : []);

                // Find the specific booking
                const found = bookingsList.find((b: any) => b.id.toString() === id);

                if (found) {
                    setBooking({
                        id: found.id,
                        venueName: found.court?.venue?.name || "Unknown Venue",
                        venueAddress: found.court?.venue?.address || "Đang cập nhật",
                        venueImage: found.court?.venue?.image,
                        courtName: found.court?.name || "Unknown Court",
                        date: found.date,
                        startTime: found.start_time.slice(0, 5),
                        endTime: found.end_time.slice(0, 5),
                        price: Number(found.total_price),
                        status: found.status,
                        transferStatus: found.transfer_status || 'none',
                        extras: found.extras || [],
                        paymentCode: found.payment_code
                    });
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [id]);

    const handleTransfer = async () => {
        if (!booking) return;
        setTransferLoading(true);

        try {
            await api.post(API_ENDPOINTS.bookings.transfer(booking.id));

            setBooking(prev => prev ? { ...prev, transferStatus: 'available' } : null);
            alert("Đã đăng tin nhượng sân thành công!");
        } catch (error) {
            console.error("Transfer failed", error);
            alert("Có lỗi xảy ra, vui lòng thử lại sau.");
        } finally {
            setTransferLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Check if we found the booking OR if we are still loading
    const showContent = !loading && booking;

    const getStatusLabel = (status: BookingDetail['status']) => {
        switch (status) {
            case 'confirmed': return 'Đã đặt';
            case 'pending': return 'Chờ thanh toán';
            case 'completed': return 'Hoàn thành';
            case 'cancelled': return 'Đã hủy';
            case 'upcoming': return 'Sắp đến giờ';
            default: return status;
        }
    };

    const getStatusColor = (status: BookingDetail['status']) => {
        switch (status) {
            case 'confirmed': return 'bg-green-500 text-white';
            case 'pending': return 'bg-orange-500 text-white';
            case 'completed': return 'bg-slate-500 text-white';
            case 'cancelled': return 'bg-red-500 text-white';
            case 'upcoming': return 'bg-yellow-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    return (
        <div className="min-h-full bg-slate-50/50 p-4 md:p-8">
            <div className="max-w-3xl mx-auto">
                {/* Header Navigation */}
                <div className="mb-8 flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all text-slate-500 hover:text-slate-900">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-bold text-slate-900">Chi tiết đặt sân</h1>
                </div>

                <div className="relative min-h-[400px]">
                    <LoadingOverlay
                        isLoading={loading}
                        fullScreen={false}
                        message="Đang tải chi tiết đặt sân"
                    />

                    {/* Content */}
                    <div className={`transition-all duration-300 ${loading ? 'opacity-50 blur-sm pointer-events-none' : 'opacity-100'}`}>
                        {showContent ? (
                            <div className="grid gap-6">
                                {/* Main Ticket Card */}
                                <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                                    {/* Sporty decorative elements */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                                    <div className="flex flex-col md:flex-row gap-8 relative">
                                        {/* Left: Venue Image & Basic Info */}
                                        <div className="md:w-1/3 space-y-4">
                                            <div className="aspect-square rounded-2xl bg-slate-100 overflow-hidden relative shadow-inner">
                                                {booking.venueImage ? (
                                                    <img src={booking.venueImage} className="w-full h-full object-cover" alt={booking.venueName} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-5xl">🏟️</div>
                                                )}
                                                <div className="absolute top-3 right-3">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${getStatusColor(booking.status)}`}>
                                                        {getStatusLabel(booking.status)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-center md:text-left">
                                                <h3 className="font-bold text-slate-900 leading-tight">{booking.venueName}</h3>
                                                <div className="flex items-start justify-center md:justify-start gap-1 mt-1 text-slate-500">
                                                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <p className="text-xs">{booking.venueAddress}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Booking Details */}
                                        <div className="md:w-2/3 flex flex-col justify-between">
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Sân</p>
                                                    <p className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                        {booking.courtName}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Ngày</p>
                                                        <p className="text-xl font-bold text-slate-900">
                                                            {new Date(booking.date).toLocaleDateString('vi-VN')}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Thời gian</p>
                                                        <p className="text-xl font-bold text-slate-900">
                                                            {booking.startTime} - {booking.endTime}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="pt-6 border-t border-dashed border-slate-200 space-y-3">
                                                    {/* Payment Detail Summary */}
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-[1fr_40px_100px] gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                                                            <div>Dịch vụ</div>
                                                            <div className="text-center">SL</div>
                                                            <div className="text-right">Tiền</div>
                                                        </div>

                                                        <div className="space-y-3 mb-4">
                                                            {/* Slot */}
                                                            {/* Slot */}
                                                            <div className="grid grid-cols-[1fr_40px_100px] gap-2 text-sm items-center px-1">
                                                                <div className="text-slate-500">Giá sân</div>
                                                                <div className="text-center text-slate-400 text-xs font-medium bg-slate-50 rounded py-1">x1</div>
                                                                <div className="text-right font-semibold text-slate-900">
                                                                    {formatCurrency(booking.price - (booking.extras?.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) || 0))}
                                                                </div>
                                                            </div>

                                                            {/* Extras */}
                                                            {booking.extras?.map((extra, index) => (
                                                                <div key={index} className="grid grid-cols-[1fr_40px_100px] gap-2 text-sm items-center px-1">
                                                                    <div className="text-slate-500">{extra.name}</div>
                                                                    <div className="text-center text-slate-400 text-xs font-medium bg-slate-50 rounded py-1">
                                                                        x{extra.quantity || 1}
                                                                    </div>
                                                                    <div className="text-right font-semibold text-slate-900">
                                                                        {formatCurrency(extra.price * (extra.quantity || 1))}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="flex justify-between items-end pt-4 border-t border-slate-100 mt-4 px-1">
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Tổng thanh toán</p>
                                                            <p className="text-3xl font-black text-blue-600 tracking-tight">
                                                                {formatCurrency(booking.price)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* QR Code Section - Optional */}
                                    <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col items-center justify-center gap-4">
                                        <p className="text-xs text-slate-400 text-center font-medium">Mã thanh toán</p>
                                        <div className="w-64 h-16 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 border-dashed">
                                            <span className="text-slate-900 text-sm font-mono tracking-widest">{booking.paymentCode}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                {(booking.status === 'confirmed' || booking.status === 'upcoming') && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={handleTransfer}
                                            disabled={booking.status === 'upcoming' || booking.transferStatus !== 'none' || transferLoading}
                                            className={`
                                                py-4 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2
                                                ${booking.status === 'upcoming'
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-none shadow-none'
                                                    : booking.transferStatus === 'none'
                                                        ? 'bg-white text-purple-600 border-2 border-purple-100 hover:border-purple-200 hover:bg-purple-50 shadow-purple-100'
                                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                }
                                            `}
                                        >
                                            {transferLoading ? (
                                                <span className="animate-spin w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full" />
                                            ) : booking.transferStatus === 'available' ? (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    ĐANG NHƯỢNG SÂN
                                                </>
                                            ) : booking.status === 'upcoming' ? (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    SẮP ĐẾN GIỜ
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                    </svg>
                                                    NHƯỢNG SÂN
                                                </>
                                            )}
                                        </button>

                                        <button className="py-4 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            </svg>
                                            HỦY ĐẶT SÂN
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            !loading && <div className="text-center py-20 text-slate-500">Không tìm thấy thông tin đặt sân.</div>
                        )}
                    </div>
                </div>
            </div>
            <div className="h-6 md:h-12" />
        </div>
    );
}

