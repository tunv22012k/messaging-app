"use client";

import { use, Suspense, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { MOCK_BOOKINGS } from "@/data/bookings";
import Image from "next/image";

function MarketplaceDetailContent({ bookingId }: { bookingId: string }) {
    const router = useRouter();
    const booking = MOCK_BOOKINGS.find(b => b.id === bookingId);

    const [isRequesting, setIsRequesting] = useState(false);
    const [hasRequested, setHasRequested] = useState(false);

    if (!booking) {
        notFound();
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleRequestTransfer = () => {
        setIsRequesting(true);
        // Simulate API call
        setTimeout(() => {
            setIsRequesting(false);
            setHasRequested(true);
            // In a real app, update booking.transferStatus = 'requested' and booking.requestedBy = 'currentUser'
            alert("Request sent! The owner needs to confirm the transfer.");
        }, 1000);
    };

    return (
        <div className="h-full bg-gray-50 flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <h1 className="text-xl font-bold text-gray-900">Transfer Details</h1>
            </div>

            <div className="max-w-xl mx-auto w-full p-6 space-y-6">
                {/* Venue Info */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="relative h-48 bg-gray-200">
                        {booking.venueImage ? (
                            <Image
                                src={booking.venueImage}
                                alt={booking.venueName}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                            <h3 className="text-white font-bold text-lg">{booking.venueName}</h3>
                        </div>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-blue-900 mb-1">Owner's Note</h4>
                            <p className="text-blue-800 text-sm italic">"{booking.transferNote}"</p>
                        </div>

                        <div className="flex justify-between border-b border-gray-100 pb-4">
                            <span className="text-gray-500">Court</span>
                            <span className="font-medium text-gray-900">{booking.courtName}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-4">
                            <span className="text-gray-500">Date</span>
                            <span className="font-medium text-gray-900">{booking.date}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-100 pb-4">
                            <span className="text-gray-500">Time</span>
                            <span className="font-medium text-gray-900">{booking.time}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-gray-500">Transfer Price</span>
                            <span className="text-2xl font-bold text-green-600">{formatCurrency(booking.transferPrice || booking.price)}</span>
                        </div>

                        <button
                            onClick={handleRequestTransfer}
                            disabled={isRequesting || hasRequested}
                            className={`w-full py-3 px-4 rounded-xl font-bold transition-colors ${hasRequested
                                    ? 'bg-green-100 text-green-800 cursor-default'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            {isRequesting ? 'Sending Request...' : hasRequested ? 'Request Sent' : 'Request Transfer'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MarketplaceDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
    const { bookingId } = use(params);
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MarketplaceDetailContent bookingId={bookingId} />
        </Suspense>
    );
}
