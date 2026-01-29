"use client";

import { useAuth } from "@/context/AuthContext";
import { Venue } from "@/types/venue";
import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_ROUTES } from "@/lib/routes";
import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

export default function DashboardPage() {
    const { user } = useAuth();
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [venues, setVenues] = useState<(Venue & { distance?: number })[]>([]);
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [loadingVenues, setLoadingVenues] = useState(false); // Only true when fetching
    const [error, setError] = useState<string | null>(null);

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);

    // 1. Fetch Location first
    useEffect(() => {
        const fetchLocation = async () => {
            try {
                // Attempt 1: IP-based Location (Silent)
                const res = await fetch('https://ipwho.is/');
                if (!res.ok) throw new Error('IP Location failed');
                const data = await res.json();

                if (data.success && data.latitude && data.longitude) {
                    setUserLocation({ lat: data.latitude, lng: data.longitude });
                    // Provide defaults if missing
                } else {
                    throw new Error('Invalid IP data');
                }
            } catch (e) {
                // Attempt 2: Native Geolocation
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        if ("geolocation" in navigator) {
                            navigator.geolocation.getCurrentPosition(resolve, reject);
                        } else {
                            reject(new Error("Geolocation not supported"));
                        }
                    });
                    setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                } catch (err) {
                    console.error("Location access denied or failed", err);
                    setError("Không tìm thấy vị trí. Hiển thị danh sách mặc định.");
                }
            } finally {
                setLoadingLocation(false);
            }
        };

        fetchLocation();
    }, []);

    // 2. Fetch Venues when Page changes OR Location is finalized (initial load)
    useEffect(() => {
        // Wait for location check to finish before first fetch
        if (loadingLocation) return;

        const fetchVenues = async () => {
            setLoadingVenues(true);
            try {
                const params: any = { page, limit: 12 };
                if (userLocation) {
                    params.lat = userLocation.lat;
                    params.lng = userLocation.lng;
                }

                const res = await api.get(API_ENDPOINTS.venues.list, { params });

                // Handle Laravel Pagination Response
                const data = res.data?.data || [];
                const meta = res.data; // Assumption: Accessing root response for pagination meta if wrapped

                if (page === 1) {
                    setVenues(data);
                } else {
                    setVenues(prev => [...prev, ...data]);
                }

                // Check if more pages exist
                setHasMore(res.data?.next_page_url !== null);
                setInitialLoadComplete(true);

            } catch (err) {
                console.error("Failed to fetch venues", err);
                setError("Không thể tải danh sách sân.");
            } finally {
                setLoadingVenues(false);
            }
        };

        fetchVenues();
    }, [page, loadingLocation, userLocation]); // Re-run when page changes or location is ready

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 100) {
            if (hasMore && !loadingVenues) {
                setPage(prev => prev + 1);
            }
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'football': return 'bg-green-100 text-green-700';
            case 'badminton': return 'bg-orange-100 text-orange-700';
            case 'tennis': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getAverageRating = (reviews: Venue['reviews']) => {
        if (!reviews || reviews.length === 0) return null;
        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return (sum / reviews.length).toFixed(1);
    };

    return (
        <div
            className="flex h-full flex-col bg-gray-50 p-6 md:p-10 overflow-y-auto"
            onScroll={handleScroll}
        >
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sân thể thao gần đây</h1>
                    <p className="mt-2 text-slate-500">
                        {loadingLocation ? "Đang tìm vị trí của bạn..." :
                            userLocation ? "Hiển thị các sân gần bạn nhất." : "Khám phá các sân thể thao của chúng tôi."}
                    </p>
                </div>
                {error && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        {error}
                    </span>
                )}
            </div>

            {!initialLoadComplete ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-96 bg-gray-200 rounded-3xl animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {venues.map((venue) => {
                            const avgRating = getAverageRating(venue.reviews);
                            const reviewCount = venue.reviews ? venue.reviews.length : 0;

                            return (
                                <Link
                                    key={venue.id}
                                    href={APP_ROUTES.bookings.detail(venue.id)}
                                    className="group flex flex-col bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className="h-52 bg-slate-100 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-slate-200 animate-pulse group-hover:animate-none transition-all" />
                                        <img
                                            src={venue.image || `https://placehold.co/600x400?text=${venue.type}`}
                                            alt={venue.name}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute top-4 left-4">
                                            <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${getTypeColor(venue.type)}`}>
                                                {venue.type}
                                            </span>
                                        </div>
                                        {venue.distance !== undefined && (
                                            <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-white/50">
                                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {venue.distance < 1
                                                        ? `${(venue.distance * 1000).toFixed(0)}m`
                                                        : `${venue.distance.toFixed(1)} km`}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 flex flex-col flex-1 relative">
                                        <div className="mb-1">
                                            <div className="flex items-center gap-1 mb-2">
                                                <div className="flex text-sm gap-0.5" title={`Đánh giá: ${avgRating || 0}/5`}>
                                                    {[1, 2, 3, 4, 5].map((star) => {
                                                        const ratingValue = Number(avgRating || 0);
                                                        const fillPercentage = Math.max(0, Math.min(100, (ratingValue - (star - 1)) * 100));
                                                        return (
                                                            <div key={star} className="relative w-4 h-4">
                                                                {/* Base Star (Back - Gray) */}
                                                                <svg className="w-full h-full text-gray-300 fill-current" viewBox="0 0 20 20">
                                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                </svg>
                                                                {/* Overlay Star (Front - Yellow) */}
                                                                <div className="absolute inset-0 overflow-hidden" style={{ width: `${fillPercentage}%` }}>
                                                                    <svg className="w-4 h-4 text-amber-400 fill-current max-w-none" viewBox="0 0 20 20">
                                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                    </svg>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {avgRating ? (
                                                    <span className="text-xs font-bold text-slate-600 ml-1 mt-0.5">
                                                        {avgRating} <span className="text-slate-400 font-normal">({reviewCount})</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 ml-1.5 mt-0.5">Chưa có đánh giá</span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-1" title={venue.name}>
                                                {venue.name}
                                            </h3>
                                        </div>

                                        <div className="flex items-start gap-1.5 mb-3 text-sm text-slate-500">
                                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="truncate flex-1 font-medium">{venue.address}</span>
                                        </div>

                                        {venue.description && (
                                            <p className="text-sm text-slate-500 mb-4 line-clamp-1">
                                                {venue.description}
                                            </p>
                                        )}

                                        <div className="mt-auto pt-5 border-t border-slate-100/60">
                                            <span className="w-full flex items-center justify-center gap-2 text-center text-white text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 rounded-xl shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 group-hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                                                Đặt sân ngay
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                </svg>
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                    {hasMore && (
                        <div className="flex justify-center py-8">
                            <span className="text-slate-500 text-sm font-medium">
                                {loadingVenues ? "Đang tải..." : "Đang tải thêm sân..."}
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
