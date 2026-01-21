"use client";

import Image from "next/image";
import Link from "next/link";
import { MOCK_BOOKINGS } from "@/data/bookings";

export default function MarketplacePage() {
    // Filter bookings that are available for transfer
    const availableBookings = MOCK_BOOKINGS.filter(
        b => b.isForTransfer && b.transferStatus === 'available'
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="h-full bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex-none">
                <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
                <p className="text-sm text-gray-500">Find and book transferred slots from other users.</p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto space-y-4">
                    {availableBookings.map(booking => (
                        <Link
                            key={booking.id}
                            href={`/marketplace/${booking.id}`}
                            className="block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row transition-shadow hover:shadow-md cursor-pointer group"
                        >
                            {/* Image */}
                            <div className="md:w-48 h-32 md:h-auto relative bg-gray-200">
                                {booking.venueImage ? (
                                    <Image
                                        src={booking.venueImage}
                                        alt={booking.venueName}
                                        fill
                                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{booking.venueName}</h3>
                                        <p className="text-gray-500 text-sm">{booking.courtName} • {booking.date}</p>
                                        {booking.transferNote && (
                                            <div className="mt-2 text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-100 inline-block font-style-italic">
                                                "{booking.transferNote}"
                                            </div>
                                        )}
                                    </div>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium border bg-blue-100 text-blue-700 border-blue-200">
                                        Available
                                    </span>
                                </div>

                                <div className="flex justify-between items-end mt-4">
                                    <div className="flex items-center text-gray-700 text-sm">
                                        <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {booking.time}
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className="font-bold text-gray-900 text-lg">
                                            {formatCurrency(booking.transferPrice || booking.price)}
                                        </div>
                                        {booking.transferPrice && booking.transferPrice < booking.price && (
                                            <span className="text-xs text-gray-400 line-through">
                                                {formatCurrency(booking.price)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {availableBookings.length === 0 && (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No bookings available</h3>
                            <p className="text-gray-500">There are no bookings listed for transfer right now.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
