"use client";

import { use, Suspense, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { MOCK_BOOKINGS } from "@/data/bookings";
import Image from "next/image";

function BookingDetailContent({ bookingId }: { bookingId: string }) {
    const router = useRouter();
    const booking = MOCK_BOOKINGS.find(b => b.id === bookingId);

    if (!booking) {
        notFound();
    }

    const [showPassModal, setShowPassModal] = useState(false);
    const [passNote, setPassNote] = useState("");
    const [isPassed, setIsPassed] = useState(booking.isForTransfer);
    const [transferStatus, setTransferStatus] = useState(booking.transferStatus);

    // Simple check if booking is in past (simplified for demo)
    const isPast = new Date(booking.date) < new Date(new Date().setHours(0, 0, 0, 0));

    const handlePassBooking = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate API call
        setIsPassed(true);
        setTransferStatus('available');
        setShowPassModal(false);
        alert("Booking posted to Marketplace!");
    };

    const handleConfirmTransfer = () => {
        // Simulate confirming the transfer to another user
        setTransferStatus('transferred');
        alert("Transfer confirmed! Ownership transferred to new user.");
    };

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
        <div className="h-full bg-gray-50 flex flex-col overflow-y-auto relative">
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
                <h1 className="text-xl font-bold text-gray-900">Booking Details</h1>
            </div>

            <div className="max-w-xl mx-auto w-full p-6 space-y-6">

                {/* Status Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${booking.status === 'confirmed' ? 'bg-green-100 text-green-600' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                        {booking.status === 'confirmed' && (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        {booking.status === 'pending' && (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1 capitalize">{booking.status}</h2>
                    <p className="text-gray-500 text-sm">Booking ID: #{booking.id.toUpperCase()}</p>

                    {isPassed && (
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                            </span>
                            Listed on Marketplace ({transferStatus})
                        </div>
                    )}
                </div>

                {/* Transfer Request Action (Simulated) */}
                {/* For demo purposes, let's pretend booking 'b1' has a request if it's been passed */}
                {isPassed && transferStatus === 'available' && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex justify-between items-center">
                        <div className="text-sm text-blue-800">
                            <strong>Waiting for requests...</strong>
                            <p>Your booking is visible on the marketplace.</p>
                        </div>
                        <button
                            onClick={() => setTransferStatus('requested')} // Dev tool to simulate a request coming in
                            className="text-xs bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded"
                        >
                            [Dev: Sim Request]
                        </button>
                    </div>
                )}

                {isPassed && transferStatus === 'requested' && (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center shrink-0 text-green-700 font-bold">
                                U
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-green-900">Transfer Request</h4>
                                <p className="text-green-800 text-sm mb-3">User "Nguyen Van B" wants to take this slot.</p>
                                <button
                                    onClick={handleConfirmTransfer}
                                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
                                >
                                    Confirm Transfer
                                </button>
                            </div>
                        </div>
                    </div>
                )}


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
                            <span className="text-gray-500">Total Price</span>
                            <span className="text-xl font-bold text-blue-600">{formatCurrency(booking.price)}</span>
                        </div>

                        {/* Pass Booking Button */}
                        {!isPassed && !isPast && booking.status === 'confirmed' && (
                            <button
                                onClick={() => setShowPassModal(true)}
                                className="w-full mt-4 py-3 border-2 border-purple-100 text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                Pass Booking
                            </button>
                        )}
                    </div>
                </div>

                {/* QR Code for Check-in */}
                {booking.status === 'confirmed' && !isPassed && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                        <p className="text-sm font-medium text-gray-500 mb-4">SHOW THIS QR CODE AT VENUE</p>
                        <div className="w-48 h-48 bg-gray-900 rounded-lg mx-auto mb-4 flex items-center justify-center text-white/20">
                            {/* Placeholder QR */}
                            <svg className="w-full h-full p-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h3v2h-3v-2zm-3 2h2v2h-2v-2zm3 2h3v2h-3v-2zM3 3h6v6H3zm10 0h6v6h-6zM3 13h6v6H3zm14 3h3v3h-3z" />
                            </svg>
                        </div>
                        <p className="text-xs text-gray-400 font-mono">{booking.id.toUpperCase()}-CHECKIN-TOKEN</p>
                    </div>
                )}

                {booking.status === 'pending' && (
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors">
                        Complete Payment
                    </button>
                )}

            </div>

            {/* Pass Booking Modal */}
            {showPassModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Pass this Booking</h3>
                        <p className="text-gray-500 text-sm mb-4">
                            Post this slot to the marketplace. You can add a note for potential takers.
                        </p>

                        <form onSubmit={handlePassBooking}>
                            <textarea
                                value={passNote}
                                onChange={(e) => setPassNote(e.target.value)}
                                placeholder="E.g., Busy with work, selling at original price..."
                                className="w-full h-24 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-sm mb-4"
                                required
                            />

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPassModal(false)}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors"
                                >
                                    Post
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
    const { bookingId } = use(params);

    return (
        <Suspense fallback={<div className="p-10 text-center">Loading booking details...</div>}>
            <BookingDetailContent bookingId={bookingId} />
        </Suspense>
    );
}
