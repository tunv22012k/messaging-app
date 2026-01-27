"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { APP_ROUTES } from "@/lib/routes";

interface Booking {
    id: number;
    venueId: number;
    venueName: string;
    venueImage?: string;
    courtName: string;
    date: string;
    time: string; // From formatter or start_time/end_time
    price: number;
    status: 'confirmed' | 'pending' | 'completed' | 'cancelled';
    transferStatus?: string;
}

export default function MyBookingsPage() {
    const [activeTab, setActiveTab] = useState("upcoming");
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            setLoading(false);
            return; // Or redirect
        }

        api.get(API_ENDPOINTS.bookings.list)
            .then(res => {
                const data = res.data as any[];
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
                setBookings(mapped);
            })
            .catch(err => {
                console.error(err);
            })
            .finally(() => setLoading(false));
    }, []);

    const filteredBookings = bookings.filter(booking => {
        if (activeTab === "upcoming") {
            return ["confirmed", "pending"].includes(booking.status) && booking.status !== "completed" && booking.status !== "cancelled";
        }
        return booking.status === activeTab;
    });

    const getStatusColor = (status: Booking['status']) => {
        switch (status) {
            case "confirmed": return "bg-green-100 text-green-700 border-green-200";
            case "pending": return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "completed": return "bg-gray-100 text-gray-600 border-gray-200";
            case "cancelled": return "bg-red-100 text-red-600 border-red-200";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 p-6 overflow-y-auto w-full">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {["upcoming", "completed", "cancelled"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors
                                ${activeTab === tab
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                    : "bg-white text-gray-600 hover:bg-gray-100 border border-transparent"
                                }
                            `}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Booking List */}
                <div className="space-y-4">
                    {filteredBookings.length > 0 ? (
                        filteredBookings.map((booking) => (
                            <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col md:flex-row gap-5 items-start md:items-center hover:shadow-md transition-shadow">
                                {/* Image Placeholder */}
                                <div className="w-full md:w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl">
                                    🏟️
                                </div>

                                <div className="flex-1 w-full relative">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{booking.venueName}</h3>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getStatusColor(booking.status)}`}>
                                                {booking.status}
                                            </span>
                                            {booking.transferStatus === 'available' && (
                                                <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200 uppercase tracking-wide">
                                                    On Marketplace
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-gray-600 text-sm mb-3 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{booking.courtName}</span>
                                            <span className="text-gray-300">|</span>
                                            <span>{booking.date}</span>
                                            <span className="text-gray-300">|</span>
                                            <span>{booking.time}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-end mt-2">
                                        <span className="text-gray-900 font-bold">
                                            {formatCurrency(booking.price)}
                                        </span>
                                        {/* Action Buttons */}
                                        <div className="flex gap-2">
                                            <Link
                                                href={APP_ROUTES.bookings.detail(booking.venueId)}
                                                className="font-bold text-gray-800 hover:text-blue-600 text-lg transition-colors"
                                            >
                                                Book Again
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
                            <p className="text-gray-500 text-lg mb-4">You haven't made any bookings yet.</p>
                            <Link href={APP_ROUTES.map.index} className="text-blue-600 font-medium hover:underline">
                                Find a court to book
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
