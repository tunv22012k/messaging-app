"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import LoadingOverlay from "@/components/ui/LoadingOverlay";

interface BookingInfo {
    id: number;
    court: {
        id: number;
        name: string;
        venue: {
            id: number;
            name: string;
            address: string;
            image: string;
        };
    };
    date: string;
    start_time: string;
    end_time: string;
    total_price: number;
    status: string;
    payment_code: string;
    pending_expires_at: string;
}

export default function PaymentPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookingId = searchParams.get('bookingId');

    const [booking, setBooking] = useState<BookingInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    // Fetch booking details
    useEffect(() => {
        if (!bookingId) {
            setError('Không tìm thấy thông tin đặt sân');
            setIsLoading(false);
            return;
        }

        const token = localStorage.getItem('auth_token');
        if (!token) {
            router.push('/login');
            return;
        }

        fetch(`http://localhost:8000/api/bookings/${bookingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        })
            .then(res => {
                if (!res.ok) throw new Error('Không tìm thấy đơn đặt sân');
                return res.json();
            })
            .then((data: BookingInfo) => {
                if (data.status !== 'pending') {
                    // Already confirmed or cancelled
                    if (data.status === 'confirmed') {
                        router.push(`/booking/${venueId}/success?bookingId=${bookingId}`);
                    } else {
                        setError('Đơn đặt sân đã hết hạn hoặc bị hủy');
                    }
                    return;
                }
                setBooking(data);

                // Calculate time left
                const expiresAt = new Date(data.pending_expires_at).getTime();
                const now = Date.now();
                const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
                setTimeLeft(diff);
            })
            .catch(err => {
                console.error(err);
                setError(err.message || 'Lỗi tải thông tin đặt sân');
            })
            .finally(() => setIsLoading(false));
    }, [bookingId, venueId, router]);

    // Countdown timer
    useEffect(() => {
        if (timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleTimeout();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const handleTimeout = useCallback(() => {
        // Booking expired, redirect back
        alert('Hết thời gian giữ chỗ. Vui lòng đặt lại.');
        router.push(`/booking/${venueId}`);
    }, [router, venueId]);

    const handleConfirm = async () => {
        if (!bookingId) return;

        setIsConfirming(true);
        const token = localStorage.getItem('auth_token');

        try {
            const res = await fetch(`http://localhost:8000/api/bookings/${bookingId}/confirm`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Xác nhận thất bại');
            }

            // Success - redirect to success page
            router.push(`/booking/${venueId}/success?bookingId=${bookingId}`);
        } catch (err: any) {
            alert(err.message);
            setIsConfirming(false);
        }
    };

    const handleCancel = async () => {
        if (!bookingId) return;

        if (!confirm('Bạn có chắc muốn hủy đặt sân?')) return;

        setIsCancelling(true);
        const token = localStorage.getItem('auth_token');

        try {
            const res = await fetch(`http://localhost:8000/api/bookings/${bookingId}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Hủy thất bại');
            }

            router.push(`/booking/${venueId}`);
        } catch (err: any) {
            alert(err.message);
            setIsCancelling(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    // Error State
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50 to-orange-50 flex items-center justify-center p-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 max-w-md text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-400 to-orange-400 rounded-2xl flex items-center justify-center">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Có lỗi xảy ra</h2>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <Link
                        href={`/booking/${venueId}`}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Quay lại đặt sân
                    </Link>
                </div>
            </div>
        );
    }

    const isExpiringSoon = timeLeft < 60;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pt-8 pb-32 px-4 relative">
            {/* Loading Overlay - on top of content */}
            <LoadingOverlay isLoading={isLoading} message="Đang tải thông tin thanh toán..." fullScreen={false} />

            {/* Content - blurred when loading */}
            <div className={`max-w-lg mx-auto transition-all duration-300 ${isLoading ? 'opacity-40 blur-sm pointer-events-none' : ''}`}>
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                        Thanh toán đặt sân
                    </h1>
                    <p className="text-slate-500">Quét mã QR để hoàn tất thanh toán</p>
                </div>

                {booking && (
                    <>
                        {/* Timer Warning */}
                        <div className={`mb-6 p-4 rounded-2xl text-center ${isExpiringSoon ? 'bg-rose-50 border-2 border-rose-200' : 'bg-amber-50 border-2 border-amber-200'}`}>
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <svg className={`w-5 h-5 ${isExpiringSoon ? 'text-rose-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className={`font-medium ${isExpiringSoon ? 'text-rose-700' : 'text-amber-700'}`}>
                                    Thời gian giữ chỗ
                                </span>
                            </div>
                            <div className={`text-4xl font-extrabold ${isExpiringSoon ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`}>
                                {formatTime(timeLeft)}
                            </div>
                            <p className={`text-sm mt-1 ${isExpiringSoon ? 'text-rose-500' : 'text-amber-500'}`}>
                                {isExpiringSoon ? 'Sắp hết thời gian!' : 'Vui lòng thanh toán trước khi hết giờ'}
                            </p>
                        </div>

                        {/* QR Code Card */}
                        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl p-6 sm:p-8 mb-6">
                            {/* Booking Info */}
                            <div className="mb-6 pb-6 border-b border-slate-100">
                                <div className="flex items-start gap-4">
                                    {booking.court.venue.image ? (
                                        <img
                                            src={booking.court.venue.image}
                                            alt={booking.court.venue.name}
                                            className="w-20 h-20 rounded-xl object-cover"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
                                            <span className="text-3xl">🏟️</span>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-800 text-lg">{booking.court.venue.name}</h3>
                                        <p className="text-sm text-slate-500">{booking.court.name}</p>
                                        <div className="flex items-center gap-2 mt-2 text-sm text-indigo-600 font-medium">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>{new Date(booking.date).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-600">
                                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span>{booking.start_time} - {booking.end_time}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="text-center mb-6">
                                <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border-2 border-slate-100">
                                    <QRCodeSVG
                                        value={`SPORTSBOOKING:${booking.payment_code}:${booking.total_price}`}
                                        size={200}
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>
                                <p className="mt-4 text-sm text-slate-500">
                                    Mã thanh toán: <span className="font-mono font-bold text-slate-700">{booking.payment_code}</span>
                                </p>
                            </div>

                            {/* Amount */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 mb-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 font-medium">Số tiền thanh toán</span>
                                    <span className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                        {formatCurrency(booking.total_price)}
                                    </span>
                                </div>
                            </div>

                            {/* Demo Notice */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm text-blue-800 font-medium">Chế độ Demo</p>
                                        <p className="text-xs text-blue-600 mt-1">
                                            Trong chế độ demo, bạn có thể nhấn nút "Đã thanh toán" bên dưới để xác nhận đặt sân mà không cần quét QR thực.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3">
                                <button
                                    onClick={handleConfirm}
                                    disabled={isConfirming || timeLeft === 0}
                                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold py-4 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isConfirming ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Đang xác nhận...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Đã thanh toán
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleCancel}
                                    disabled={isCancelling}
                                    className="w-full bg-white border-2 border-slate-200 text-slate-600 font-semibold py-3 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isCancelling ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                                            Đang hủy...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                            Hủy đặt sân
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Payment Instructions */}
                        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5">
                            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Hướng dẫn thanh toán
                            </h4>
                            <ol className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                                    <span>Mở ứng dụng ngân hàng hoặc ví điện tử</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                                    <span>Quét mã QR hiển thị phía trên</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                                    <span>Xác nhận thanh toán trên ứng dụng</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                                    <span>Nhấn "Đã thanh toán" để hoàn tất</span>
                                </li>
                            </ol>
                        </div>
                        {/* Bottom Spacer */}
                        <div className="h-6"></div>
                    </>
                )}

                {/* Placeholder when no booking data yet (during loading) */}
                {!booking && !error && (
                    <div className="space-y-6">
                        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse"></div>
                        <div className="h-96 bg-slate-100 rounded-3xl animate-pulse"></div>
                        <div className="h-40 bg-slate-100 rounded-2xl animate-pulse"></div>
                    </div>
                )}
            </div>
        </div>
    );
}

