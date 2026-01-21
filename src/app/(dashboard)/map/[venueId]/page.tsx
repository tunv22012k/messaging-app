"use client";

import { use, useEffect, useState, useMemo } from "react";
import { VENUES, Venue } from "@/data/venues";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";

export default function VenueDetailPage({ params }: { params: Promise<{ venueId: string }> }) {
    const { venueId } = use(params);
    const venue = VENUES.find(v => v.id === venueId);

    if (!venue) {
        notFound();
    }

    const router = useRouter();
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
    const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
    const [isBooked, setIsBooked] = useState(false);

    // Default to the first court if available
    const [selectedCourtId, setSelectedCourtId] = useState<string>(venue.courts[0]?.id || "");

    // Review State
    const [reviews, setReviews] = useState(venue.reviews);
    const [newReview, setNewReview] = useState({ rating: 5, comment: "" });

    // Import auth to get user name (mocking for now if needed, but better to use real)
    // Actually I should move the import to top level, but for this edit I'll assume context is available or valid
    // I need to import { useAuth } from "@/context/AuthContext" at top level.
    // I will mock the user name here for simplicity if I can't easily add import in this block.
    // Wait, I can add import in a separate tool call if needed, but let's try to assume "User" if not available.
    // Let's rely on a mock "You" for now to avoid compilation errors if useAuth isn't imported.
    // Ah, I *can* use `useAuth` if I added the import. I'll add the import in a separate step or just use "Guest" for now.

    const handleReviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const review = {
            id: Date.now().toString(),
            userName: "You", // In real app, get from auth
            rating: newReview.rating,
            comment: newReview.comment,
            date: new Date().toISOString().split('T')[0]
        };
        setReviews([review, ...reviews]);
        setNewReview({ rating: 5, comment: "" });
    };

    const handleSlotToggle = (slotId: string) => {
        setSelectedSlotIds(prev =>
            prev.includes(slotId)
                ? prev.filter(id => id !== slotId)
                : [...prev, slotId]
        );
    };

    const handleExtraToggle = (extraId: string) => {
        setSelectedExtraIds(prev =>
            prev.includes(extraId)
                ? prev.filter(id => id !== extraId)
                : [...prev, extraId]
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const totalPrice = useMemo(() => {
        // Find slot in any court (IDs should be unique enough, or we search in selectedCourt)
        // Flatten all slots from all courts for easier finding
        const allSlots = venue.courts.flatMap(c => c.slots);

        const slotsTotal = allSlots
            .filter(slot => selectedSlotIds.includes(slot.id))
            .reduce((sum, slot) => sum + slot.price, 0);

        const extrasTotal = venue.extras
            .filter(extra => selectedExtraIds.includes(extra.id))
            .reduce((sum, extra) => sum + extra.price, 0);

        // Extras are charged once per booking in this simple model, 
        // or per slot? Usually per booking or per hour. 
        // Let's assume per booking for simplicity unless specified otherwise.

        return slotsTotal + extrasTotal;
    }, [selectedSlotIds, selectedExtraIds, venue]);

    const handleBook = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSlotIds.length === 0) {
            alert("Please select at least one time slot.");
            return;
        }

        const court = venue.courts.find(c => c.id === selectedCourtId);

        const queryParams = new URLSearchParams({
            venueId: venue.id,
            venueName: venue.name,
            courtName: court?.name || "Unknown Court",
            date: bookingDate,
            total: totalPrice.toString(),
            slotCount: selectedSlotIds.length.toString(),
            // Pass minimal data in URL to avoid length limits
            // In a real app, we'd POST to an API and get a session ID
        });

        router.push(`/payment?${queryParams.toString()}`);
    };

    // Helper to check if slot is in the past
    const isSlotPast = (date: string, startTime: string) => {
        const now = new Date();
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);

        const slotDate = new Date(date);
        slotDate.setHours(0, 0, 0, 0);

        // If date is in past
        if (slotDate < today) return true;

        // If date is today, check time
        if (slotDate.getTime() === today.getTime()) {
            const [hours, minutes] = startTime.split(':').map(Number);
            const slotTime = new Date(today);
            slotTime.setHours(hours, minutes, 0, 0);
            return slotTime < now;
        }

        return false;
    };

    const availableSlots = useMemo(() => {
        const court = venue.courts.find(c => c.id === selectedCourtId);
        if (!court) return [];
        return court.slots.filter(s => s.date === bookingDate);
    }, [venue, selectedCourtId, bookingDate]);

    return (
        <div className="h-full bg-gray-50 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* 1. Venue Info Card (Left Top) */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="h-48 bg-gray-200 relative">
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
                                <p className="text-gray-500 text-sm flex items-center mt-1">
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {venue.address}
                                </p>
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded capitalize">
                                {venue.type}
                            </span>
                        </div>
                        <p className="text-gray-700">{venue.description}</p>
                    </div>
                </div>

                {/* 2. Booking Form (Mobile: Middle, Desktop: Right Column) */}
                <div className="lg:col-span-1 lg:row-start-1 lg:row-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
                        {!isBooked ? (
                            <form onSubmit={handleBook} className="space-y-6">
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-4">Book Venue</h3>

                                    {/* Date Selection */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                                            value={bookingDate}
                                            onChange={e => setBookingDate(e.target.value)}
                                        />
                                    </div>

                                    {/* Court Selection */}
                                    {venue.courts.length > 0 && (
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Court</label>

                                            {venue.courts.length > 3 ? (
                                                <div className="relative">
                                                    <select
                                                        value={selectedCourtId}
                                                        onChange={(e) => setSelectedCourtId(e.target.value)}
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2.5 appearance-none bg-white"
                                                    >
                                                        {venue.courts.map(court => (
                                                            <option key={court.id} value={court.id}>
                                                                {court.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg overflow-x-auto">
                                                    {venue.courts.map(court => (
                                                        <button
                                                            key={court.id}
                                                            type="button"
                                                            onClick={() => setSelectedCourtId(court.id)}
                                                            className={`
                                                                flex-1 py-1.5 px-3 text-sm font-medium rounded-md whitespace-nowrap transition-all
                                                                ${selectedCourtId === court.id
                                                                    ? 'bg-white text-blue-700 shadow-sm'
                                                                    : 'text-gray-500 hover:text-gray-700'
                                                                }
                                                            `}
                                                        >
                                                            {court.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Slot Selection */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Available Slots</label>
                                        {availableSlots.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {availableSlots.map(slot => {
                                                    const isPast = isSlotPast(slot.date, slot.startTime);
                                                    const isDisabled = slot.isBooked || isPast;

                                                    return (
                                                        <button
                                                            key={slot.id}
                                                            type="button"
                                                            disabled={isDisabled}
                                                            onClick={() => handleSlotToggle(slot.id)}
                                                            className={`
                                                                relative text-sm py-2 px-3 rounded-lg border transition-all text-center
                                                                ${isDisabled
                                                                    ? slot.isBooked
                                                                        ? 'bg-red-50 text-red-300 border-red-100 cursor-not-allowed' // Booked
                                                                        : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' // Past
                                                                    : selectedSlotIds.includes(slot.id)
                                                                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' // Selected
                                                                        : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300' // Available
                                                                }
                                                            `}
                                                        >
                                                            <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
                                                            <div className="text-xs opacity-75">
                                                                {isDisabled
                                                                    ? (slot.isBooked ? 'Booked' : 'Expired')
                                                                    : formatCurrency(slot.price)}
                                                            </div>

                                                            {/* Booked Mask (Optional extra visual) */}
                                                            {slot.isBooked && (
                                                                <div className="absolute inset-0 bg-red-100/10 rounded-lg"></div>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-red-500">No slots available for this date.</p>
                                        )}
                                    </div>

                                    {/* Extras Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Extra Options</label>
                                        {venue.extras.length > 0 ? (
                                            <div className="space-y-2">
                                                {venue.extras.map(extra => (
                                                    <label key={extra.id} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                        <div className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                                checked={selectedExtraIds.includes(extra.id)}
                                                                onChange={() => handleExtraToggle(extra.id)}
                                                            />
                                                            <span className="ml-2 text-sm text-gray-700">{extra.name}</span>
                                                        </div>
                                                        <span className="text-xs font-semibold text-gray-500">{formatCurrency(extra.price)}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400">No extra options available.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Total Price & Action */}
                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-gray-600 font-medium">Total Price</span>
                                        <span className="text-2xl font-bold text-blue-600">{formatCurrency(totalPrice)}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200"
                                        >
                                            Book Now
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => router.back()}
                                            className="px-4 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition"
                                        >
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-green-50 text-green-800 p-6 rounded-xl text-center">
                                <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="text-2xl font-bold mb-2">Booking Success!</h3>
                                <p className="mb-6 opacity-80">
                                    You have booked <strong>{venue.name}</strong> on {new Date(bookingDate).toLocaleDateString()}.
                                </p>
                                <div className="space-y-3">
                                    <Link
                                        href="/map"
                                        className="block w-full bg-white border border-green-200 text-green-700 px-4 py-2 rounded-lg font-medium hover:bg-green-100 transition"
                                    >
                                        Back to Map
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setIsBooked(false);
                                            setSelectedSlotIds([]);
                                            setSelectedExtraIds([]);
                                        }}
                                        className="block w-full text-sm text-green-600 hover:underline"
                                    >
                                        Book another slot
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Reviews Section (Left Bottom) */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Reviews & Ratings</h3>
                        <span className="text-sm text-gray-500">{reviews.length} reviews</span>
                    </div>

                    {/* Review List */}
                    <div className="space-y-6 mb-8">
                        {reviews.length > 0 ? (
                            reviews.map(review => (
                                <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0 last:pb-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                                                {review.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{review.userName}</div>
                                                <div className="text-xs text-gray-500">{review.date}</div>
                                            </div>
                                        </div>
                                        <div className="flex bg-yellow-50 px-2 py-1 rounded-lg">
                                            {[...Array(5)].map((_, i) => (
                                                <svg key={i} className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                No reviews yet. Be the first to review!
                            </div>
                        )}
                    </div>

                    {/* Add Review Form */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-4">Write a Review</h4>
                        <form onSubmit={handleReviewSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                                            className="focus:outline-none transition-transform hover:scale-110"
                                        >
                                            <svg className={`w-8 h-8 ${star <= newReview.rating ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                                <textarea
                                    required
                                    rows={3}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-3 text-sm"
                                    placeholder="Share your experience..."
                                    value={newReview.comment}
                                    onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition shadow-sm"
                                >
                                    Post Review
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
