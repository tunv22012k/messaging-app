"use client";

import Image from "next/image";
import Link from "next/link";
import { MOCK_BOOKINGS } from "@/data/bookings";

export default function MyBookingsPage() {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'bg-green-100 text-green-700 border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'completed': return 'bg-gray-100 text-gray-600 border-gray-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="h-full bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex-none">
                <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto space-y-4">
                    {MOCK_BOOKINGS.map(booking => (
                        <Link
                            key={booking.id}
                            href={`/my-bookings/${booking.id}`}
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
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)} capitalize`}>
                                        {booking.status}
                                    </span>
                                </div>

                                <div className="flex justify-between items-end mt-4">
                                    <div className="flex items-center text-gray-700 text-sm">
                                        <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {booking.time}
                                    </div>
                                    <div className="font-bold text-gray-900">
                                        {formatCurrency(booking.price)}
                                    </div>
                                </div>
                            </div>

                            {/* Actions (Optional) */}
                            {booking.status === 'confirmed' && (
                                <div className="p-4 md:p-5 flex items-center border-t md:border-t-0 md:border-l border-gray-100 bg-gray-50/50">
                                    <button className="w-full md:w-auto text-sm text-blue-600 font-medium hover:text-blue-800">
                                        View Ticket
                                    </button>
                                </div>
                            )}
                        </Link>
                    ))}

                    {MOCK_BOOKINGS.length === 0 && (
                        <div className="text-center py-10">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No bookings found</h3>
                            <p className="text-gray-500 mb-6">You haven't made any bookings yet.</p>
                            <Link
                                href="/map"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                            >
                                Find a Venue
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
