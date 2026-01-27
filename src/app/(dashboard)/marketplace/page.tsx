"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { APP_ROUTES } from "@/lib/routes";

interface MarketplaceItem {
    id: number;
    venueName: string;
    venueImage?: string; // Optional
    courtName: string;
    date: string;
    time: string;
    price: number;
    transferPrice: number;
    transferNote?: string;
    status: string;
}

export default function MarketplacePage() {
    const router = useRouter();
    const [activeFilter, setActiveFilter] = useState("all");
    const [listings, setListings] = useState<MarketplaceItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(API_ENDPOINTS.marketplace.items)
            .then(res => {
                const data = res.data as any[];
                const mapped: MarketplaceItem[] = data.map(b => ({
                    id: b.id,
                    venueName: b.court?.venue?.name || "Unknown Venue",
                    venueImage: b.court?.venue?.image,
                    courtName: b.court?.name || "Unknown Court",
                    date: b.date,
                    time: `${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)}`,
                    price: Number(b.total_price),
                    transferPrice: Number(b.transfer_price),
                    transferNote: b.transfer_note,
                    status: b.transfer_status
                }));
                setListings(mapped);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handlePurchase = async (id: number) => {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            alert("Please login to purchase");
            return;
        }

        if (!confirm("Are you sure you want to purchase this transfer?")) return;

        try {
            const res = await api.post(API_ENDPOINTS.marketplace.purchase(id));

            if (res.status === 200 || res.status === 201) {
                alert("Purchase successful! Check My Bookings.");
                // Remove from list
                setListings(prev => prev.filter(item => item.id !== id));
            } else {
                alert("Purchase failed");
            }
        } catch (e: any) {
            const message = e.response?.data?.message || "Error purchasing";
            alert(message);
        }
    };

    const filteredListings = listings.filter(item => {
        if (activeFilter === "all") return true;
        // Filter logic if needed
        return true;
    });

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="h-full bg-gray-50 p-6 overflow-y-auto w-full">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
                        <p className="text-gray-500 text-sm mt-1">Find and buy transferred bookings from other players.</p>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        {["all", "badminton", "football", "tennis"].map(type => (
                            <button
                                key={type}
                                onClick={() => setActiveFilter(type)}
                                className={`
                            px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all
                            ${activeFilter === type
                                        ? "bg-gray-900 text-white shadow-sm"
                                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                    }
                        `}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Listings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredListings.map(item => (
                        <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
                            <div className="h-40 bg-gray-200 relative overflow-hidden">
                                {/* Image */}
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-gray-100">
                                    <span className="text-3xl">🎫</span>
                                </div>
                                {item.transferPrice < item.price && (
                                    <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                                        Save {Math.round(((item.price - item.transferPrice) / item.price) * 100)}%
                                    </div>
                                )}
                            </div>

                            <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{item.venueName}</h3>
                                </div>

                                <div className="text-sm text-gray-600 space-y-1 mb-4">
                                    <Link href={APP_ROUTES.bookings.detail(item.id)} className="flex items-center gap-2 font-medium hover:text-blue-600">
                                        {item.courtName}
                                    </Link>
                                    <div className="flex items-center gap-2">
                                        <span>📅 {item.date}</span>
                                        <span>⏰ {item.time}</span>
                                    </div>
                                </div>

                                {item.transferNote && (
                                    <div className="bg-blue-50 text-blue-700 text-xs p-3 rounded-lg mb-4 italic">
                                        "{item.transferNote}"
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <div>
                                        <div className="text-xs text-gray-400 line-through">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                                        </div>
                                        <div className="text-lg font-bold text-gray-900">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.transferPrice)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handlePurchase(item.id)}
                                        className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition shadow-sm active:scale-95"
                                    >
                                        Buy Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredListings.length === 0 && (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-4">🛒</div>
                        <h3 className="text-lg font-bold text-gray-900">No Listings Available</h3>
                        <p className="text-gray-500">Check back later for transferred bookings.</p>
                    </div>
                )}

            </div>
        </div>
    );
}
