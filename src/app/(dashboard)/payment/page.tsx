"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import Image from "next/image";

function PaymentContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const venueId = searchParams.get("venueId");
    const total = searchParams.get("total");
    const date = searchParams.get("date");
    const courtName = searchParams.get("courtName");
    const slotCount = searchParams.get("slotCount");

    const [isProcessing, setIsProcessing] = useState(false);

    const handlePaymentConfirm = () => {
        setIsProcessing(true);
        // Simulate API call or processing delay
        setTimeout(() => {
            // Redirect to success page with all params to display receipt
            const params = new URLSearchParams(searchParams.toString());
            router.push(`/booking-success?${params.toString()}`);
        }, 1500);
    };

    if (!venueId) return <div>Invalid payment session.</div>;

    const formattedTotal = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(total) || 0);

    return (
        <div className="min-h-full bg-gray-50 flex flex-col items-center py-10 px-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Required</h1>
                <p className="text-gray-500 mb-6">Please scan the QR code to complete your booking.</p>

                <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100 inline-block">
                    {/* Placeholder for QR Code */}
                    <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center mb-2 mx-auto relative overflow-hidden">
                        {/* You can replace this with a real QR code image later */}
                        <svg className="w-full h-full text-gray-800" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h3v2h-3v-2zm-3 2h2v2h-2v-2zm3 2h3v2h-3v-2zM3 3h6v6H3zm10 0h6v6h-6zM3 13h6v6H3zm14 3h3v3h-3z" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-xs font-mono text-gray-500">
                            QR CODE
                        </div>
                    </div>
                    <div className="text-sm font-medium text-blue-800">Bank: MB Bank</div>
                    <div className="text-lg font-bold text-blue-900">0123456789</div>
                    <div className="text-xs text-blue-600">Account: SPORT BOOKING APP</div>
                </div>

                <div className="border-t border-gray-100 pt-4 mb-6">
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-500">Date</span>
                        <span className="font-medium">{date}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span className="text-gray-500">Court</span>
                        <span className="font-medium">{courtName}</span>
                    </div>
                    <div className="flex justify-between mb-4">
                        <span className="text-gray-500">Slots</span>
                        <span className="font-medium">{slotCount} selected</span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-bold text-gray-900">
                        <span>Total</span>
                        <span>{formattedTotal}</span>
                    </div>
                </div>

                <button
                    onClick={handlePaymentConfirm}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </>
                    ) : (
                        "I have Paid"
                    )}
                </button>
                <button
                    onClick={() => router.back()}
                    className="mt-4 text-gray-500 text-sm hover:text-gray-700"
                >
                    Cancel Transaction
                </button>
            </div>
        </div>
    );
}

export default function PaymentPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PaymentContent />
        </Suspense>
    );
}
