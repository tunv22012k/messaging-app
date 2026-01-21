"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function SuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const venueName = searchParams.get("venueName");
    const total = searchParams.get("total");
    const date = searchParams.get("date");
    const courtName = searchParams.get("courtName");

    // Convert slot times from "07:00,08:00" string if needed, or just count
    const slotCount = searchParams.get("slotCount");

    const formattedTotal = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(total) || 0);

    return (
        <div className="min-h-full bg-gray-50 flex flex-col items-center py-10 px-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Successful!</h1>
                <p className="text-gray-500 mb-8">Your booking has been confirmed. A confirmation email has been sent.</p>

                <div className="bg-gray-50 rounded-xl p-6 text-left mb-8">
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Venue</span>
                            <span className="font-medium text-gray-900">{venueName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Court</span>
                            <span className="font-medium text-gray-900">{courtName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Date</span>
                            <span className="font-medium text-gray-900">{date}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Slots</span>
                            <span className="font-medium text-gray-900">{slotCount} slots booked</span>
                        </div>
                        <div className="border-t border-gray-200 my-2 pt-2 flex justify-between text-base font-bold">
                            <span className="text-gray-900">Total Paid</span>
                            <span className="text-blue-600">{formattedTotal}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={() => router.push('/map')}
                    className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-xl transition-colors"
                >
                    Back to Map
                </button>
            </div>
        </div>
    );
}

export default function BookingSuccessPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
