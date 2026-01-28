"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { APP_ROUTES } from "@/lib/routes";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import LoadingOverlay from "@/components/ui/LoadingOverlay";

interface Booking {
    id: number;
    venueId: number;
    venueName: string;
    venueImage?: string;
    courtName: string;
    date: string;
    time: string;
    price: number;
    status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'upcoming';
    transferStatus?: string;
}

export default function MyBookingsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initialize tab from URL or default to 'upcoming'
    const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "upcoming");
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true); // Initial loading for tab
    const [loadingMore, setLoadingMore] = useState(false); // Loading for pagination
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastElementRef = useCallback((node: HTMLDivElement | null) => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    const getStatusForTab = (tab: string) => {
        if (tab === "upcoming") return "confirmed,pending,upcoming";
        return tab;
    };

    const fetchBookings = async (pageNum: number, tab: string, isReset: boolean) => {
        try {
            if (isReset) setLoading(true);
            else setLoadingMore(true);

            const status = getStatusForTab(tab);
            const res = await api.get(API_ENDPOINTS.bookings.list, {
                params: {
                    limit: 10,
                    page: pageNum,
                    status: status
                }
            });

            const data = res.data.data as any[];
            const mapped: Booking[] = data.map(b => ({
                id: b.id,
                venueId: b.court?.venue?.id,
                venueName: b.court?.venue?.name || "Unknown Venue",
                venueImage: b.court?.venue?.image,
                courtName: b.court?.name || "Unknown Court",
                date: b.date,
                time: `${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)}`,
                price: Number(b.total_price),
                status: b.status,
                transferStatus: b.transfer_status
            }));

            setBookings(prev => isReset ? mapped : [...prev, ...mapped]);
            setHasMore(res.data.current_page < res.data.last_page);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Reset and fetch when tab changes
    useEffect(() => {
        setPage(1);
        setHasMore(true);
        setBookings([]);
        fetchBookings(1, activeTab, true);
    }, [activeTab]);

    // Fetch more when page changes (but not on initial reset which is handled by above effect)
    useEffect(() => {
        if (page > 1) {
            fetchBookings(page, activeTab, false);
        }
    }, [page]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getStatusInfo = (status: Booking['status']) => {
        switch (status) {
            case "confirmed":
                return {
                    label: "ĐÃ ĐẶT",
                    desktopClass: "bg-emerald-50 text-emerald-700 border border-emerald-100",
                    mobileClass: "bg-white/90 text-emerald-700 backdrop-blur-md shadow-sm border border-white/50",
                    dotClass: "bg-emerald-500"
                };
            case "pending":
                return {
                    label: "CHỜ THANH TOÁN",
                    desktopClass: "bg-orange-50 text-orange-700 border border-orange-100",
                    mobileClass: "bg-white/90 text-orange-700 backdrop-blur-md shadow-sm border border-white/50",
                    dotClass: "bg-orange-500"
                };
            case "completed":
                return {
                    label: "HOÀN THÀNH",
                    desktopClass: "bg-slate-50 text-slate-700 border border-slate-100",
                    mobileClass: "bg-white/90 text-slate-700 backdrop-blur-md shadow-sm border border-white/50",
                    dotClass: "bg-slate-500"
                };
            case "cancelled":
                return {
                    label: "ĐÃ HỦY",
                    desktopClass: "bg-red-50 text-red-700 border border-red-100",
                    mobileClass: "bg-white/90 text-red-700 backdrop-blur-md shadow-sm border border-white/50",
                    dotClass: "bg-red-500"
                };
            case "upcoming":
                return {
                    label: "SẮP ĐẾN GIỜ",
                    desktopClass: "bg-amber-50 text-amber-700 border border-amber-100",
                    mobileClass: "bg-white/90 text-amber-700 backdrop-blur-md shadow-sm border border-white/50",
                    dotClass: "bg-amber-500"
                };
            default:
                return {
                    label: status,
                    desktopClass: "bg-gray-50 text-gray-700 border border-gray-100",
                    mobileClass: "bg-white/90 text-gray-700 backdrop-blur-md shadow-sm border border-white/50",
                    dotClass: "bg-gray-500"
                };
        }
    };

    return (
        <div className="min-h-full bg-slate-50/50 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                {/* 
                  Only show overlay if it's the INITIAL load of a tab.
                  Background loading (pagination) will show bottom spinner.
                */}
                <LoadingOverlay
                    isLoading={loading}
                    fullScreen={false}
                    message="Đang tải lịch đặt sân"
                />

                <header className="mb-10">
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        LỊCH ĐẶT SÂN
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Quản lý lịch trình thể thao của bạn</p>
                </header>

                <div className="relative min-h-[400px]">
                    <div className={`transition-all duration-300 ${loading ? 'opacity-50 blur-sm pointer-events-none' : 'opacity-100'}`}>
                        {/* Custom Tab Navigation */}
                        <div className="flex p-1.5 bg-slate-100 rounded-xl w-fit mb-8">
                            {[
                                { id: "upcoming", label: "Chờ diễn ra" },
                                { id: "completed", label: "Hoàn thành" },
                                { id: "cancelled", label: "Đã hủy" }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        const params = new URLSearchParams(searchParams);
                                        params.set("tab", tab.id);
                                        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
                                    }}
                                    className={`
                                        relative px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200
                                        ${activeTab === tab.id
                                            ? "bg-white text-blue-700 shadow-sm shadow-slate-200"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                        }
                                    `}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-5">
                            {bookings.length > 0 ? (
                                bookings.map((booking, index) => {
                                    const statusInfo = getStatusInfo(booking.status);
                                    const isUpcoming = activeTab === "upcoming";

                                    // Verify if this is the last element to attach ref
                                    const isLast = index === bookings.length - 1;

                                    return (
                                        <div
                                            key={booking.id}
                                            ref={isLast ? lastElementRef : null}
                                            className="group bg-white rounded-2xl p-0 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 relative overflow-hidden"
                                        >
                                            <div className="flex flex-col md:flex-row">
                                                {/* Left: Identifiers & Image */}
                                                <div className="w-full md:w-48 bg-slate-100 md:border-r border-slate-100 relative overflow-hidden h-40 md:h-auto">
                                                    {booking.venueImage ? (
                                                        <img src={booking.venueImage} className="w-full h-full object-cover" alt={booking.venueName} />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-4xl">
                                                            🏟️
                                                        </div>
                                                    )}
                                                    {/* Overlay Gradient */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:hidden" />

                                                    {/* Mobile Status Badge Overlay */}
                                                    <div className="absolute top-3 right-3 md:hidden flex flex-col items-end gap-1.5">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide ${statusInfo.mobileClass}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}></span>
                                                            {statusInfo.label}
                                                        </span>
                                                        {booking.transferStatus === 'available' && (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide bg-purple-500/90 text-white backdrop-blur-md shadow-sm border border-white/20">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                                                NHƯỢNG SÂN
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="absolute bottom-3 left-4 md:hidden">
                                                        <span className="text-white font-bold text-lg shadow-black/50 drop-shadow-md">{booking.courtName}</span>
                                                    </div>
                                                </div>

                                                {/* Center: Details */}
                                                <div className="flex-1 p-6 flex flex-col justify-center">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                                                {booking.venueName}
                                                            </h3>
                                                            <div className="hidden md:block mt-1">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded border border-slate-200 text-xs font-semibold text-slate-600 bg-slate-50">
                                                                    {booking.courtName}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="hidden md:flex flex-col items-end gap-1.5 shrink-0 ml-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide whitespace-nowrap ${statusInfo.desktopClass}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`}></span>
                                                                {statusInfo.label}
                                                            </span>
                                                            {booking.transferStatus === 'available' && (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-100">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                                                                    NHƯỢNG SÂN
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Ngày</p>
                                                                <p className="text-sm font-bold text-slate-800">
                                                                    {new Date(booking.date).toLocaleDateString('vi-VN')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Giờ</p>
                                                                <p className="text-sm font-bold text-slate-800">{booking.time}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Price & Actions */}
                                                <div className="p-6 md:w-56 border-t md:border-t-0 md:border-l border-dashed border-slate-200 flex flex-col justify-center bg-slate-50/50">
                                                    <div className="text-right mb-4">
                                                        <p className="text-[10px] uppercase font-bold text-slate-400">Tổng thanh toán</p>
                                                        <p className="text-2xl font-black text-slate-900 tracking-tight">
                                                            {formatCurrency(booking.price)}
                                                        </p>
                                                    </div>

                                                    {isUpcoming ? (
                                                        <Link
                                                            href={APP_ROUTES.bookings.viewDetail(booking.id)}
                                                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all text-center active:scale-95 flex items-center justify-center gap-2"
                                                        >
                                                            <span>XEM CHI TIẾT</span>
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </Link>
                                                    ) : (
                                                        <div className="flex flex-col gap-3">
                                                            <Link
                                                                href={APP_ROUTES.bookings.viewDetail(booking.id)}
                                                                className="w-full py-3 bg-white border-2 border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-600 text-sm font-bold rounded-xl shadow-sm transition-all text-center active:scale-95 flex items-center justify-center gap-2"
                                                            >
                                                                <span>XEM CHI TIẾT</span>
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </Link>
                                                            <Link
                                                                href={APP_ROUTES.bookings.detail(booking.venueId)}
                                                                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-900/10 transition-all text-center active:scale-95 flex items-center justify-center gap-2"
                                                            >
                                                                <span>ĐẶT LẠI</span>
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                            </Link>
                                                        </div>
                                                    )}

                                                    {booking.transferStatus === 'available' && (
                                                        <div className="mt-2 text-center">
                                                            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider flex items-center justify-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
                                                                Đang nhượng sân
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                !loading && (
                                    <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100">
                                        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <svg className="w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Chưa có lịch đặt nào</h3>
                                        <p className="text-slate-500 mb-8">Hãy bắt đầu hành trình thể thao của bạn ngay hôm nay!</p>
                                        <Link
                                            href={APP_ROUTES.map.index}
                                            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all hover:-translate-y-1"
                                        >
                                            TÌM SÂN NGAY
                                        </Link>
                                    </div>
                                )
                            )}

                            {/* Loading more spinner */}
                            {loadingMore && (
                                <div className="flex justify-center p-4">
                                    <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <div className="h-6 md:h-12" />
        </div>
    );
}
