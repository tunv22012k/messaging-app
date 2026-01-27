"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { APP_ROUTES } from "@/lib/routes";

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

// Skeleton data to render the structure while loading
const skeletonBooking: BookingInfo = {
    id: 0,
    court: {
        id: 0,
        name: 'Sân ...',
        venue: {
            id: 0,
            name: 'Đang tải thông tin...',
            address: '...',
            image: ''
        }
    },
    date: new Date().toISOString(),
    start_time: '--:--',
    end_time: '--:--',
    total_price: 0,
    status: 'loading',
    payment_code: '......',
    created_at: ''
};

export default function SuccessPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');

    const [booking, setBooking] = useState<BookingInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!bookingId) {
            router.push(APP_ROUTES.bookings.detail(venueId));
            return;
        }

        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push(APP_ROUTES.login);
            return;
        }

        // Fetch immediately
        api.get<BookingInfo>(API_ENDPOINTS.bookings.detail(bookingId))
            .then(res => {
                const data = res.data;
                if (data.status !== 'confirmed') {
                    // Not confirmed?
                    router.push(APP_ROUTES.bookings.detail(venueId));
                    return;
                }
                setBooking(data);
            })
            .catch(err => {
                console.error(err);
                router.push(APP_ROUTES.bookings.detail(venueId));
            })
            .finally(() => setIsLoading(false));
    }, [bookingId, venueId, router]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Use skeleton data if real data isn't ready, to allow rendering layout for sticking/blurring
    const displayData = booking || skeletonBooking;

    return (
        <div className="h-[calc(100vh-64px)] overflow-y-auto bg-[#E0E7FF] flex items-start md:items-center justify-center p-4 py-8 md:py-4 font-sans">
            <div className="w-full max-w-4xl relative drop-shadow-2xl my-auto md:my-0">

                {/* 
                    Loading Overlay: 
                    Positioned absolutely within this relative container.
                    It will center itself over the ticket.
                */}
                <LoadingOverlay isLoading={isLoading} fullScreen={false} message="Đang tải vé..." />

                {/* Main Ticket Container - Blurred when loading */}
                <div className={`flex flex-col md:flex-row bg-white rounded-3xl overflow-hidden min-h-[500px] transition-all duration-300 ${isLoading ? 'blur-sm opacity-60 pointer-events-none' : ''}`}>

                    {/* Left Section: Main Info (Width 65%) */}
                    <div className="flex-1 p-6 md:p-10 flex flex-col relative">
                        {/* Venue Header */}
                        <div className="flex flex-row items-center md:items-start gap-4 md:gap-6 mb-6 md:mb-8">
                            <div className="w-20 h-20 md:w-32 md:h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-md bg-slate-100">
                                {displayData.court.venue.image ? (
                                    <img
                                        src={displayData.court.venue.image}
                                        alt={displayData.court.venue.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                                        {displayData.court.venue.name.charAt(0)}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <span className={`inline-block bg-emerald-100 text-emerald-700 text-[10px] md:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide mb-2 ${isLoading ? 'opacity-0' : ''}`}>
                                    Thanh toán thành công
                                </span>
                                <h2 className="text-xl md:text-3xl font-extrabold text-slate-800 leading-tight mb-2">
                                    {displayData.court.venue.name}
                                </h2>
                                <p className="text-slate-500 text-xs md:text-sm flex items-start gap-1">
                                    <svg className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span className="line-clamp-2 md:line-clamp-none">{displayData.court.venue.address}</span>
                                </p>
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4 md:gap-x-12 mb-8">
                            <div>
                                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Ngày đặt</p>
                                <p className="text-lg md:text-xl font-bold text-slate-800">
                                    {isLoading ? '...' : new Date(displayData.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </p>
                                <p className="text-xs md:text-sm text-slate-400 font-medium">
                                    {isLoading ? '...' : new Date(displayData.date).toLocaleDateString('vi-VN', { weekday: 'long' })}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Thời gian</p>
                                <p className="text-lg md:text-xl font-bold text-slate-800">{displayData.start_time} - {displayData.end_time}</p>
                                <p className={`text-xs md:text-sm text-emerald-600 font-medium ${isLoading ? 'opacity-0' : ''}`}>Đã xác nhận</p>
                            </div>
                            <div>
                                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Sân đấu</p>
                                <p className="text-lg md:text-xl font-bold text-slate-800">{displayData.court.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tổng tiền</p>
                                <p className="text-xl md:text-2xl font-black text-indigo-600">{formatCurrency(displayData.total_price)}</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-auto flex flex-col md:flex-row gap-3 md:gap-4">
                            <Link
                                href={APP_ROUTES.bookings.myBookings}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 flex items-center justify-center gap-2 group"
                            >
                                Quản lý lịch đặt
                            </Link>
                            <Link
                                href={APP_ROUTES.map.index}
                                className="w-full bg-white border-2 border-slate-200 text-slate-700 px-6 py-4 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                            >
                                Trang chủ
                            </Link>
                        </div>
                    </div>

                    {/* Divider Section (The "Cut") */}
                    <div className="relative flex items-center justify-center w-full h-8 md:w-8 md:h-auto md:flex-col bg-white overflow-hidden md:overflow-visible flex-shrink-0">
                        {/* Custom dashed line: Horizontal on mobile, Vertical on md */}
                        <div className="w-[90%] border-t-2 md:w-0 md:h-[90%] md:border-t-0 md:border-l-2 border-dashed border-slate-300"></div>

                        {/* Notches for Mobile (Left/Right) */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#E0E7FF] shadow-inner md:hidden"></div>
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#E0E7FF] shadow-inner md:hidden"></div>

                        {/* Notches for Desktop (Top/Bottom) */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#E0E7FF] shadow-inner hidden md:block"></div>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-8 h-8 rounded-full bg-[#E0E7FF] shadow-inner hidden md:block"></div>
                    </div>

                    {/* Right Section: Code/Stub (Width 30%) */}
                    <div className="w-full md:w-[32%] bg-slate-50 p-6 md:p-10 flex flex-col items-center justify-center border-l md:border-l-0 border-slate-100 relative">

                        <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.25em] mb-4 md:mb-6 text-center">
                            Mã vé điện tử
                        </h3>

                        {/* Barcode / QR Simulation */}
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 w-full max-w-xs md:max-w-full mb-4 md:mb-6 relative overflow-hidden group">
                            {/* Simple simulated barcode using CSS borders */}
                            <div className="flex items-end justify-between h-12 md:h-16 opacity-80 mb-2 px-2">
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`bg-slate-800 rounded-sm`}
                                        style={{
                                            width: Math.random() > 0.5 ? '4px' : '2px',
                                            height: `${30 + Math.random() * 70}%`
                                        }}
                                    ></div>
                                ))}
                            </div>
                            <p className="text-center font-mono font-bold text-base md:text-lg text-slate-800 tracking-widest break-all">
                                {displayData.payment_code}
                            </p>
                            {/* Shine effect */}
                            {!isLoading && <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/50 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>}
                        </div>

                        <div className="text-center">
                            <p className="text-xs text-slate-400 mb-2">Quét mã tại quầy lễ tân</p>
                            <button
                                onClick={() => router.push(APP_ROUTES.bookings.detail(venueId))}
                                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300"
                            >
                                + Đặt thêm giờ
                            </button>
                        </div>

                        {/* Decorative 'Hole' Punch for Ticket Feel - Desktop only right, Mobile top/bottom handled by divider */}
                        <div className="absolute top-1/2 right-4 w-4 h-4 bg-white border border-slate-200 rounded-full shadow-inner opacity-50 hidden md:block"></div>
                    </div>
                </div>
            </div>
            {/* Background noise texture via CSS could be added here for more paper feel */}
        </div>
    );
}
