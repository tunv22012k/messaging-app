"use client";

import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import LoadingOverlay from "@/components/ui/LoadingOverlay";
import echo from "@/lib/echo";
import api from "@/lib/axios";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { APP_ROUTES } from "@/lib/routes";

// Types matching Backend Response (simplified)
interface Booking {
    court_id: number;
    start_time: string; // H:i
    end_time: string;
}

interface PendingSlot {
    id: number;
    court_id: number;
    user_id: number;
    start_time: string;
    end_time: string;
    pending_expires_at: string;
}

interface Court {
    id: number;
    name: string;
    type: string;
}

interface VenueExtra {
    id: number;
    name: string;
    price: number;
}

interface VenueReview {
    id: number;
    user: { name: string; avatar?: string };
    rating: number;
    comment: string;
    created_at: string;
}

interface Slot {
    id: string;
    courtId: string;
    startTime: string;
    endTime: string;
    price: number;
    isBooked: boolean;
    isPending: boolean;
    isOwnPending: boolean;
    pendingBookingId: number | null;
}

interface Venue {
    id: number;
    name: string;
    type: string;
    address: string;
    description: string;
    price: number;
    pricing_type: string;
    image: string;
    courts: Court[];
    extras: VenueExtra[];
    reviews: VenueReview[];
}

export default function VenueDetailPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const router = useRouter();

    const [venue, setVenue] = useState<Venue | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
    const [bookings, setBookings] = useState<Booking[]>([]);

    // Form State
    const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
    const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
    const [isBooked, setIsBooked] = useState(false);

    // Default court selection for tabs
    const [selectedCourtId, setSelectedCourtId] = useState<string>("");

    // Review State
    const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
    const [submittingReview, setSubmittingReview] = useState(false);

    // Fetch Venue
    useEffect(() => {
        api.get(API_ENDPOINTS.venues.detail(venueId))
            .then(res => {
                const data = res.data;
                setVenue(data);
                if (data.courts.length > 0) {
                    setSelectedCourtId(String(data.courts[0].id));
                }
            })
            .catch(err => {
                console.error(err);
                setError("Venue not found");
            })
            .finally(() => setIsLoading(false));
    }, [venueId]);

    // Bookings will be fetched together with pending slots in the combined polling below

    // Pending slots from other users
    const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([]);

    // Current user id for identifying own pending bookings
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    // Fetch current user
    useEffect(() => {
        api.get(API_ENDPOINTS.auth.user)
            .then(res => {
                setCurrentUserId(res.data.id);
            })
            .catch(err => console.error('Failed to fetch user', err));
    }, []);

    // Fetch Pending Slots and Bookings - refresh both to keep in sync
    // Real-time updates via WebSocket
    useEffect(() => {
        if (!venueId) return;

        const fetchBookingData = () => {
            // Fetch confirmed bookings
            api.get(`${API_ENDPOINTS.venues.bookings(venueId)}?date=${bookingDate}`)
                .then(res => setBookings(res.data))
                .catch(err => console.error("Failed to fetch bookings", err));

            // Fetch pending slots
            api.get(`${API_ENDPOINTS.venues.pendingSlots(venueId)}?date=${bookingDate}`)
                .then(res => setPendingSlots(res.data))
                .catch(err => console.error("Failed to fetch pending slots", err));
        };

        // Initial fetch
        fetchBookingData();

        // Subscribe to venue channel if echo is available
        if (echo) {
            const channel = echo.channel(`venue.${venueId}`);

            channel.listen('.booking.pending', (e: any) => {
                console.log('Booking update received:', e);
                fetchBookingData();
            });

            return () => {
                channel.stopListening('.booking.pending');
                echo.leave(`venue.${venueId}`);
            };
        }
    }, [venueId, bookingDate]);

    // Generate Available Slots Logic
    const availableSlots: Slot[] = useMemo(() => {
        if (!venue || !selectedCourtId) return [];

        const court = venue.courts.find(c => String(c.id) === selectedCourtId);
        if (!court) return [];

        const slots: Slot[] = [];
        for (let hour = 6; hour < 22; hour++) {
            const startTime = `${hour.toString().padStart(2, '0')}:00`;
            const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

            const isBooked = bookings.some(b => {
                if (String(b.court_id) !== selectedCourtId) return false;

                const [bh, bm] = b.start_time.split(':').map(Number);
                const [eh, em] = b.end_time.split(':').map(Number);
                const bStart = bh * 60 + bm;
                const bEnd = eh * 60 + em;

                const slotStart = hour * 60;
                const slotEnd = (hour + 1) * 60;

                return bStart < slotEnd && bEnd > slotStart;
            });

            // Check if slot is pending by another user
            const pendingSlot = pendingSlots.find(p => {
                if (String(p.court_id) !== selectedCourtId) return false;

                const [ph, pm] = String(p.start_time).split(':').map(Number);
                const [peh, pem] = String(p.end_time).split(':').map(Number);
                const pStart = ph * 60 + pm;
                const pEnd = peh * 60 + pem;

                const slotStart = hour * 60;
                const slotEnd = (hour + 1) * 60;

                return pStart < slotEnd && pEnd > slotStart;
            });

            const isPending = !!pendingSlot;
            const isOwnPending = pendingSlot ? pendingSlot.user_id === currentUserId : false;
            const pendingBookingId = pendingSlot?.id || null;

            const price = venue.price || 100000;

            slots.push({
                id: `${selectedCourtId}_${startTime}`,
                courtId: selectedCourtId,
                startTime,
                endTime,
                price,
                isBooked,
                isPending,
                isOwnPending,
                pendingBookingId
            });
        }
        return slots;
    }, [venue, selectedCourtId, bookings, pendingSlots, currentUserId]);



    const handleSlotToggle = (slotId: string) => {
        setSelectedSlotIds(prev =>
            prev.includes(slotId)
                ? prev.filter(id => id !== slotId)
                : [...prev, slotId]
        );
    };

    const handleExtraUpdate = (extraId: string, delta: number) => {
        setSelectedExtras(prev => {
            const currentQty = prev[extraId] || 0;
            const newQty = Math.max(0, currentQty + delta);

            const next = { ...prev };
            if (newQty === 0) {
                delete next[extraId];
            } else {
                next[extraId] = newQty;
            }
            return next;
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const totalPrice = useMemo(() => {
        const slotsTotal = availableSlots
            .filter(s => selectedSlotIds.includes(s.id))
            .reduce((sum, s) => sum + s.price, 0);

        const extrasTotal = (venue?.extras || [])
            .reduce((sum, e) => {
                const qty = selectedExtras[String(e.id)] || 0;
                return sum + (Number(e.price) * qty);
            }, 0);

        return slotsTotal + extrasTotal;
    }, [availableSlots, selectedSlotIds, selectedExtras, venue]);

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSlotIds.length === 0) {
            alert("Vui lòng chọn ít nhất một khung giờ.");
            return;
        }

        // For now, we only support booking one slot at a time for the payment flow
        if (selectedSlotIds.length > 1) {
            alert("Vui lòng chọn một khung giờ duy nhất để tiến hành thanh toán.");
            return;
        }

        const token = localStorage.getItem('auth_token');
        if (!token) {
            alert("Vui lòng đăng nhập để đặt sân.");
            return;
        }

        try {
            const slotId = selectedSlotIds[0];
            const slot = availableSlots.find(s => s.id === slotId);
            if (!slot) {
                alert("Không tìm thấy thông tin khung giờ.");
                return;
            }

            // Prepare extras
            const extrasPayload = (venue?.extras || [])
                .filter(e => (selectedExtras[String(e.id)] || 0) > 0)
                .map(e => ({
                    name: e.name,
                    price: Number(e.price),
                    quantity: selectedExtras[String(e.id)]
                }));

            // Call initiate API to create pending booking
            const res = await api.post(API_ENDPOINTS.bookings.initiate, {
                court_id: slot.courtId,
                date: bookingDate,
                start_time: slot.startTime,
                end_time: slot.endTime,
                total_price: totalPrice,
                extras: extrasPayload
            });

            const data = res.data;

            // Redirect to payment page
            router.push(APP_ROUTES.bookings.payment(venueId, data.booking.id));

        } catch (err: any) {
            alert(`Đặt sân thất bại: ${err.message}`);
        }
    };

    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('auth_token');
        if (!token) {
            alert("Vui lòng đăng nhập để viết đánh giá.");
            return;
        }

        setSubmittingReview(true);
        try {
            const res = await api.post(API_ENDPOINTS.venues.reviews(venueId), newReview);

            if (res.status === 200 || res.status === 201) {
                if (venue) {
                    const vRes = await api.get(API_ENDPOINTS.venues.detail(venueId));
                    if (vRes.status === 200) {
                        const vData = vRes.data;
                        setVenue(vData);
                    }
                }
                setNewReview({ rating: 5, comment: "" });
            } else {
                alert("Gửi đánh giá thất bại");
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi khi gửi đánh giá");
        } finally {
            setSubmittingReview(false);
        }
    };

    // Helper to check if slot is in the past
    const isSlotPast = (date: string, startTime: string) => {
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        const slotDate = new Date(date);
        slotDate.setHours(0, 0, 0, 0);

        if (slotDate < today) return true;

        if (slotDate.getTime() === today.getTime()) {
            const [hours, minutes] = startTime.split(':').map(Number);
            const slotTime = new Date(today);
            slotTime.setHours(hours, minutes, 0, 0);
            return slotTime < now;
        }

        return false;
    };

    // Error State
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-rose-50 to-orange-50">
                <div className="text-center bg-white/80 backdrop-blur-sm p-10 rounded-3xl shadow-xl border border-white/50 max-w-md mx-4">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-400 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Không tìm thấy sân</h2>
                    <p className="text-slate-500 mb-6">Sân thể thao này không tồn tại hoặc đã bị xóa.</p>
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Quay lại
                    </button>
                </div>
            </div>
        );
    }

    // Calculate Average Rating
    const avgRating = venue && venue.reviews.length > 0
        ? (venue.reviews.reduce((acc, r) => acc + r.rating, 0) / venue.reviews.length).toFixed(1)
        : "N/A";

    // Amenity translations
    const amenityTranslations: Record<string, { label: string; icon: string }> = {
        "Parking": { label: "Bãi đỗ xe", icon: "🚗" },
        "Wifi": { label: "Wifi miễn phí", icon: "📶" },
        "Showers": { label: "Phòng tắm", icon: "🚿" },
        "Canteen": { label: "Căn tin", icon: "🍜" }
    };

    return (
        <div className="min-h-screen relative">
            {/* Fixed Background Layer */}
            <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 -z-10" />

            {/* Loading Overlay - appears on top of content */}
            <LoadingOverlay isLoading={isLoading} message="Đang tải thông tin sân..." fullScreen={false} />

            {/* Content wrapper - blurs when loading */}
            <div className={`transition-all duration-300 ${isLoading ? 'opacity-40 pointer-events-none blur-sm' : ''}`}>
                {/* Hero Section with Venue Image */}
                <div className="relative">
                    <div className="h-56 sm:h-72 md:h-80 lg:h-96 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-transparent to-slate-900/60 z-10"></div>
                        {venue?.image ? (
                            <img
                                src={venue.image}
                                alt={venue.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 flex items-center justify-center">
                                <span className="text-8xl opacity-50">🏟️</span>
                            </div>
                        )}

                        {/* Back Button */}
                        <button
                            onClick={() => router.back()}
                            className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur-sm p-2.5 rounded-xl shadow-lg hover:bg-white transition-all group"
                        >
                            <svg className="w-5 h-5 text-slate-700 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 pb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">

                        {/* Left Column - Venue Info */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Venue Header Card */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-indigo-100/50 border border-white/50 p-6 sm:p-8">
                                {/* Sport Type & Rating Badges */}
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
                                    <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold text-white uppercase tracking-wide shadow-md shadow-indigo-200">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                        </svg>
                                        {venue?.type || 'Loading...'}
                                    </span>
                                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
                                        <span className="text-amber-500 text-sm">★</span>
                                        <span className="font-bold text-amber-700 text-sm">{avgRating}</span>
                                        <span className="text-amber-600/70 text-xs">({venue?.reviews.length || 0} đánh giá)</span>
                                    </div>
                                </div>

                                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
                                    {venue?.name || 'Đang tải...'}
                                </h1>
                                <div className="flex items-center text-slate-500 mb-6">
                                    <svg className="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="text-sm sm:text-base">{venue?.address || ''}</span>
                                </div>

                                {/* Description */}
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                        <span className="w-1.5 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></span>
                                        Mô tả
                                    </h3>
                                    <p className="text-slate-600 leading-relaxed">{venue?.description || ''}</p>
                                </div>

                                {/* Amenities */}
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <span className="w-1.5 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></span>
                                        Tiện ích
                                    </h3>
                                    <div className="flex flex-wrap gap-2 sm:gap-3">
                                        {["Parking", "Wifi", "Showers", "Canteen"].map(amenity => (
                                            <div
                                                key={amenity}
                                                className="flex items-center gap-2 bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2.5 rounded-xl border border-slate-200/50 hover:shadow-md hover:border-indigo-200 transition-all cursor-default"
                                            >
                                                <span className="text-lg">{amenityTranslations[amenity]?.icon}</span>
                                                <span className="text-sm font-medium text-slate-700">{amenityTranslations[amenity]?.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Booking Section - Mobile Only */}
                            <div className="lg:hidden">
                                {venue && (
                                    <BookingCard
                                        venue={venue}
                                        bookingDate={bookingDate}
                                        setBookingDate={setBookingDate}
                                        selectedCourtId={selectedCourtId}
                                        setSelectedCourtId={setSelectedCourtId}
                                        availableSlots={availableSlots}
                                        selectedSlotIds={selectedSlotIds}
                                        handleSlotToggle={handleSlotToggle}
                                        selectedExtras={selectedExtras}
                                        handleExtraUpdate={handleExtraUpdate}
                                        totalPrice={totalPrice}
                                        formatCurrency={formatCurrency}
                                        isSlotPast={isSlotPast}
                                        handleBook={handleBook}
                                        isBooked={isBooked}
                                        setIsBooked={setIsBooked}
                                        setSelectedSlotIds={setSelectedSlotIds}
                                        setSelectedExtras={setSelectedExtras}
                                    />
                                )}
                            </div>

                            {/* Reviews Section */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-indigo-100/50 border border-white/50 p-6 sm:p-8">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <span className="w-1.5 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></span>
                                        Đánh giá & Trải nghiệm
                                    </h3>
                                    <button className="text-indigo-600 text-sm font-semibold hover:text-indigo-700 transition-colors">
                                        Xem tất cả
                                    </button>
                                </div>

                                {/* Write Review Form */}
                                <form onSubmit={handleReviewSubmit} className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 p-5 sm:p-6 rounded-2xl border border-indigo-100/50 mb-8">
                                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Viết đánh giá của bạn
                                    </h4>
                                    <div className="mb-4">
                                        <div className="flex items-center mb-3">
                                            <span className="text-sm text-slate-600 mr-3 font-medium">Đánh giá:</span>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => setNewReview(p => ({ ...p, rating: star }))}
                                                        className={`text-3xl focus:outline-none transition-all hover:scale-125 ${star <= newReview.rating ? 'text-yellow-400 drop-shadow-md' : 'text-slate-300 hover:text-yellow-300'}`}
                                                    >
                                                        ★
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <textarea
                                            className="w-full border-0 bg-white rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-400 outline-none shadow-sm resize-none placeholder:text-slate-400"
                                            rows={4}
                                            placeholder="Chia sẻ trải nghiệm của bạn với mọi người..."
                                            value={newReview.comment}
                                            onChange={e => setNewReview(p => ({ ...p, comment: e.target.value }))}
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={submittingReview}
                                            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {submittingReview ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    Đang gửi...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                                    </svg>
                                                    Gửi đánh giá
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>

                                {/* Review List */}
                                <div className="space-y-5">
                                    {venue?.reviews.map(review => (
                                        <div key={review.id} className="flex gap-4 pb-5 border-b border-slate-100 last:border-0 last:pb-0">
                                            <div className="w-11 h-11 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
                                                {review.user?.avatar ? (
                                                    <img
                                                        src={review.user.avatar}
                                                        alt={review.user.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                                                        {review.user?.name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                                                    <div>
                                                        <h5 className="font-bold text-slate-800">{review.user?.name || 'Người dùng ẩn danh'}</h5>
                                                        <div className="flex items-center text-xs text-slate-400 mt-0.5">
                                                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                            <span>{new Date(review.created_at).toLocaleDateString('vi-VN')}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex text-yellow-400 text-sm">
                                                        {'★'.repeat(review.rating)}
                                                        <span className="text-slate-200">{'★'.repeat(5 - review.rating)}</span>
                                                    </div>
                                                </div>
                                                <p className="text-slate-600 text-sm leading-relaxed bg-gradient-to-r from-slate-50 to-slate-100/50 p-3.5 rounded-xl rounded-tl-none">
                                                    {review.comment}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {(!venue?.reviews || venue.reviews.length === 0) && (
                                        <div className="text-center py-10">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center">
                                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                            </div>
                                            <p className="text-slate-500 font-medium">Chưa có đánh giá nào</p>
                                            <p className="text-slate-400 text-sm mt-1">Hãy là người đầu tiên đánh giá!</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Booking Card (Desktop) */}
                        <div className="hidden lg:block lg:col-span-2">
                            <div className="sticky top-6">
                                {venue && (
                                    <BookingCard
                                        venue={venue}
                                        bookingDate={bookingDate}
                                        setBookingDate={setBookingDate}
                                        selectedCourtId={selectedCourtId}
                                        setSelectedCourtId={setSelectedCourtId}
                                        availableSlots={availableSlots}
                                        selectedSlotIds={selectedSlotIds}
                                        handleSlotToggle={handleSlotToggle}
                                        selectedExtras={selectedExtras}
                                        handleExtraUpdate={handleExtraUpdate}
                                        totalPrice={totalPrice}
                                        formatCurrency={formatCurrency}
                                        isSlotPast={isSlotPast}
                                        handleBook={handleBook}
                                        isBooked={isBooked}
                                        setIsBooked={setIsBooked}
                                        setSelectedSlotIds={setSelectedSlotIds}
                                        setSelectedExtras={setSelectedExtras}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Booking Card Component
interface BookingCardProps {
    venue: Venue;
    bookingDate: string;
    setBookingDate: (date: string) => void;
    selectedCourtId: string;
    setSelectedCourtId: (id: string) => void;
    availableSlots: Slot[];
    selectedSlotIds: string[];
    handleSlotToggle: (slotId: string) => void;
    selectedExtras: Record<string, number>;
    handleExtraUpdate: (extraId: string, delta: number) => void;
    totalPrice: number;
    formatCurrency: (amount: number) => string;
    isSlotPast: (date: string, startTime: string) => boolean;
    handleBook: (e: React.FormEvent) => void;
    isBooked: boolean;
    setIsBooked: (value: boolean) => void;
    setSelectedSlotIds: (ids: string[]) => void;
    setSelectedExtras: (extras: Record<string, number>) => void;
}

function BookingCard({
    venue,
    bookingDate,
    setBookingDate,
    selectedCourtId,
    setSelectedCourtId,
    availableSlots,
    selectedSlotIds,
    handleSlotToggle,
    selectedExtras,
    handleExtraUpdate,
    totalPrice,
    formatCurrency,
    isSlotPast,
    handleBook,
    isBooked,
    setIsBooked,
    setSelectedSlotIds,
    setSelectedExtras
}: BookingCardProps) {
    if (isBooked) {
        return (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl shadow-xl shadow-emerald-100/50 border border-emerald-100 p-6 sm:p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 className="text-2xl font-bold text-emerald-800 mb-2">Đặt sân thành công!</h3>
                <p className="text-emerald-600 mb-6 leading-relaxed">
                    Bạn đã đặt sân <strong>{venue.name}</strong> thành công. Email xác nhận đã được gửi đến bạn.
                </p>
                <div className="space-y-3">
                    <Link
                        href="/map"
                        className="flex items-center justify-center gap-2 w-full bg-white border-2 border-emerald-200 text-emerald-700 px-5 py-3.5 rounded-xl font-bold hover:bg-emerald-50 transition-all shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        Quay lại bản đồ
                    </Link>
                    <button
                        onClick={() => {
                            setIsBooked(false);
                            setSelectedSlotIds([]);
                            setSelectedExtras({});
                        }}
                        className="w-full text-sm text-emerald-600 font-semibold hover:text-emerald-700 py-2 transition-colors"
                    >
                        Đặt thêm khung giờ khác
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl shadow-indigo-100/50 border border-white/50 p-6 sm:p-8">
            <form onSubmit={handleBook} className="space-y-6">
                {/* Header */}
                <div className="text-center pb-5 border-b border-slate-100">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
                        <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Đặt lịch sân
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">Chọn ngày và khung giờ phù hợp</p>
                </div>

                {/* Date Picker */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Chọn ngày
                    </label>
                    <div className="relative">
                        <input
                            type="date"
                            required
                            className="w-full rounded-xl border-2 border-slate-200 p-3.5 pr-10 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-medium text-slate-700 bg-white hover:border-slate-300"
                            value={bookingDate}
                            onChange={e => setBookingDate(e.target.value)}
                        />
                    </div>
                </div>

                {/* Court Selection */}
                {venue.courts.length > 0 && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Chọn sân
                        </label>
                        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl overflow-x-auto">
                            {venue.courts.map(court => (
                                <button
                                    key={court.id}
                                    type="button"
                                    onClick={() => setSelectedCourtId(String(court.id))}
                                    className={`
                                        flex-1 py-2.5 px-4 text-sm font-bold rounded-lg whitespace-nowrap transition-all min-w-[80px]
                                        ${selectedCourtId === String(court.id)
                                            ? 'bg-white text-indigo-600 shadow-md'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                        }
                                    `}
                                >
                                    {court.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Time Slots */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Khung giờ
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                        {availableSlots.map(slot => {
                            const isPast = isSlotPast(bookingDate, slot.startTime);
                            // Own pending slots are clickable (to continue payment)
                            const isDisabled = slot.isBooked || (slot.isPending && !slot.isOwnPending) || isPast;
                            const isSelected = selectedSlotIds.includes(slot.id);

                            // Handle click for own pending slots
                            const handleClick = () => {
                                if (slot.isOwnPending && slot.pendingBookingId && venue) {
                                    // Navigate to payment page for this booking
                                    // Fix: Use router.push via APP_ROUTES if possible, otherwise window.location
                                    // Using window.location to force full reload if necessary, but preferred router.push
                                    window.location.href = APP_ROUTES.bookings.payment(venue.id, slot.pendingBookingId);
                                } else if (!isDisabled) {
                                    handleSlotToggle(slot.id);
                                }
                            };

                            // Determine slot status text and styling
                            let statusText = '';
                            let slotStyle = '';

                            if (slot.isBooked) {
                                statusText = 'Đã đặt';
                                slotStyle = 'bg-rose-50 text-rose-400 border-rose-200 cursor-not-allowed';
                            } else if (slot.isOwnPending) {
                                statusText = 'Bạn đang đặt';
                                slotStyle = 'bg-blue-100 text-blue-700 border-blue-400 cursor-pointer hover:bg-blue-200';
                            } else if (slot.isPending) {
                                statusText = 'Có người đang đặt';
                                slotStyle = 'bg-yellow-100 text-yellow-700 border-yellow-400 cursor-not-allowed';
                            } else if (isPast) {
                                statusText = 'Hết hạn';
                                slotStyle = 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed';
                            }

                            return (
                                <button
                                    key={slot.id}
                                    type="button"
                                    disabled={isDisabled && !slot.isOwnPending}
                                    onClick={handleClick}
                                    className={`
                                        relative text-sm py-3 px-3 rounded-xl border-2 transition-all text-center group
                                        ${statusText
                                            ? slotStyle
                                            : isSelected
                                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-transparent text-white shadow-lg shadow-indigo-200'
                                                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:shadow-md'
                                        }
                                    `}
                                >
                                    <div className={`font-bold text-xs ${slot.isPending && !slot.isOwnPending ? 'text-yellow-800' : slot.isOwnPending ? 'text-blue-800' : ''}`}>
                                        {slot.startTime} - {slot.endTime}
                                    </div>
                                    <div className={`text-[11px] mt-1 ${isSelected ? 'text-indigo-200'
                                        : slot.isOwnPending ? 'text-blue-600 font-medium'
                                            : slot.isPending ? 'text-yellow-600 font-medium'
                                                : 'text-slate-400 group-hover:text-indigo-500'
                                        }`}>
                                        {statusText || formatCurrency(slot.price)}
                                    </div>
                                    {slot.isOwnPending && (
                                        <div className="text-[10px] mt-1 text-blue-500 font-medium">
                                            ► Tiếp tục thanh toán
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Extra Services */}
                {venue.extras.length > 0 && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Dịch vụ thêm
                        </label>
                        <div className="space-y-2">
                            {venue.extras.map(extra => {
                                const quantity = selectedExtras[String(extra.id)] || 0;
                                return (
                                    <div
                                        key={extra.id}
                                        className={`flex items-center justify-between p-3 border-2 rounded-xl transition-all ${quantity > 0
                                            ? 'border-indigo-400 bg-indigo-50/50'
                                            : 'border-slate-100 hover:border-slate-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-slate-700">{extra.name}</span>
                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                                                {formatCurrency(Number(extra.price))}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                                            <button
                                                type="button"
                                                onClick={() => handleExtraUpdate(String(extra.id), -1)}
                                                disabled={quantity === 0}
                                                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                </svg>
                                            </button>
                                            <span className="w-6 text-center font-bold text-sm text-slate-700">
                                                {quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleExtraUpdate(String(extra.id), 1)}
                                                className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-indigo-50 text-indigo-600 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Total & Submit */}
                <div className="border-t-2 border-dashed border-slate-200 pt-6">
                    <div className="flex justify-between items-center mb-5">
                        <span className="text-slate-500 font-medium">Tổng cộng</span>
                        <div className="text-right">
                            <span className="block text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                {formatCurrency(totalPrice)}
                            </span>
                            <span className="text-xs text-slate-400">Đã bao gồm thuế</span>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white font-bold py-4 rounded-xl hover:from-indigo-700 hover:via-purple-700 hover:to-indigo-800 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 transform active:scale-[0.98] duration-200 flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Xác nhận đặt sân
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-4 leading-relaxed">
                        Bằng việc đặt sân, bạn đồng ý với{' '}
                        <a href="#" className="text-indigo-500 hover:underline">Điều khoản dịch vụ</a> của chúng tôi.
                    </p>
                </div>
            </form>
        </div>
    );
}
