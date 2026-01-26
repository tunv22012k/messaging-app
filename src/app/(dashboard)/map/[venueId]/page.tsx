"use client";

import { use, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";

// Types matching Backend Response (simplified)
interface Booking {
    court_id: number;
    start_time: string; // H:i
    end_time: string;
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
    user: { name: string };
    rating: number;
    comment: string;
    created_at: string;
}

interface Venue {
    id: number;
    name: string;
    type: string;
    address: string;
    description: string;
    price_info: string;
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
    const [bookings, setBookings] = useState<Booking[]>([]); // Bookings for selected date

    // Form State
    const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]); // Format: "courtId_startTime"
    const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
    const [isBooked, setIsBooked] = useState(false);

    // Default court selection for tabs (if many courts)
    const [selectedCourtId, setSelectedCourtId] = useState<string>("");

    // Review State (Local only for now, can implement POST later)
    const [newReview, setNewReview] = useState({ rating: 5, comment: "" });

    // Fetch Venue
    useEffect(() => {
        fetch(`http://localhost:8000/api/venues/${venueId}`)
            .then(res => {
                if (!res.ok) throw new Error("Venue not found");
                return res.json();
            })
            .then((data: Venue) => {
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

    // Fetch Bookings when Date changes
    useEffect(() => {
        if (!venueId) return;

        fetch(`http://localhost:8000/api/venues/${venueId}/bookings?date=${bookingDate}`)
            .then(res => res.json())
            .then(data => setBookings(data))
            .catch(err => console.error("Failed to fetch bookings", err));
    }, [venueId, bookingDate]);

    // Generate Available Slots Logic
    const availableSlots = useMemo(() => {
        if (!venue || !selectedCourtId) return [];

        const court = venue.courts.find(c => String(c.id) === selectedCourtId);
        if (!court) return [];

        // Generate hours from 6:00 to 22:00
        const slots = [];
        for (let hour = 6; hour < 22; hour++) {
            const startTime = `${hour.toString().padStart(2, '0')}:00`;
            const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;

            // Simpler check: Does any booking overlap strictly?
            // Backend returns H:i:s, assume H:i prefix match or standard formatted strings
            // Ideally parse time. For simplicity, string compare if H:i format matches

            const isBooked = bookings.some(b => {
                if (String(b.court_id) !== selectedCourtId) return false;

                // Convert to comparable values (minutes from midnight)
                const [bh, bm] = b.start_time.split(':').map(Number);
                const [eh, em] = b.end_time.split(':').map(Number);
                const bStart = bh * 60 + bm;
                const bEnd = eh * 60 + em;

                const slotStart = hour * 60;
                const slotEnd = (hour + 1) * 60;

                // Overlap: Start < End AND End > Start
                return bStart < slotEnd && bEnd > slotStart;
            });

            // Parse price info (rough heuristic or fixed)
            // Use fake fixed price for all slots if price_info is text
            // "80,000 VND/h" -> 80000
            const price = parseInt(venue.price_info.replace(/\D/g, '')) || 100000;

            slots.push({
                id: `${selectedCourtId}_${startTime}`,
                courtId: selectedCourtId,
                startTime,
                endTime,
                price,
                isBooked
            });
        }
        return slots;
    }, [venue, selectedCourtId, bookings]);


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
        const slotsTotal = availableSlots
            .filter(s => selectedSlotIds.includes(s.id))
            .reduce((sum, s) => sum + s.price, 0);

        const extrasTotal = (venue?.extras || [])
            .filter(e => selectedExtraIds.includes(String(e.id)))
            .reduce((sum, e) => sum + Number(e.price), 0);

        return slotsTotal + extrasTotal;
    }, [availableSlots, selectedSlotIds, selectedExtraIds, venue]);

    const handleBook = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedSlotIds.length === 0) {
            alert("Please select at least one time slot.");
            return;
        }

        const token = localStorage.getItem('auth_token');
        if (!token) {
            alert("Please login to book.");
            return;
        }

        // Create booking for the FIRST selected slot (Simplification: 1 slot = 1 booking request)
        // Or loop?
        // Let's assume user picks 1 slot or we create multiple bookings.
        // For MVP, if multiple slots selected, we probably want 1 booking if contiguous?
        // But our Backend Booking model is 1 booking per row (start-end).
        // Let's create multiple bookings for now to be safe and simple.

        setIsBooked(false); // Reset state

        try {
            for (const slotId of selectedSlotIds) {
                const slot = availableSlots.find(s => s.id === slotId);
                if (!slot) continue;

                const res = await fetch('http://localhost:8000/api/bookings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        court_id: slot.courtId,
                        date: bookingDate,
                        start_time: slot.startTime,
                        end_time: slot.endTime,
                        total_price: slot.price
                    })
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.message || 'Booking failed');
                }
            }

            // If all success
            setIsBooked(true);
            setBookings([]); // Trigger refresh?
            // Force refresh bookings
            fetch(`http://localhost:8000/api/venues/${venueId}/bookings?date=${bookingDate}`)
                .then(res => res.json())
                .then(data => setBookings(data));

            setSelectedSlotIds([]); // Clear selection

        } catch (err: any) {
            alert(`Booking failed: ${err.message}`);
        }
    };

    const handleReviewSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Review submission not implemented in Phase 1.");
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

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error || !venue) {
        return (
            <div className="flex h-full items-center justify-center flex-col gap-4">
                <h2 className="text-xl font-bold text-gray-800">Venue Not Found</h2>
                <button onClick={() => router.back()} className="text-blue-600 hover:underline">Go Back</button>
            </div>
        );
    }

    // UI Render matches original effectively
    return (
        <div className="h-full bg-gray-50 p-6 overflow-y-auto w-full">
            <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* 1. Venue Info Card */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="h-48 bg-gray-200 relative">
                        {/* Placeholder or Image */}
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                            <span className="text-4xl">🏟️</span>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
                                <p className="text-gray-500 text-sm mt-1">{venue.address}</p>
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded capitalize">
                                {venue.type}
                            </span>
                        </div>
                        <p className="text-gray-700">{venue.description}</p>
                    </div>
                </div>

                {/* 2. Booking Form */}
                <div className="lg:col-span-1 lg:row-start-1 lg:row-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
                        {!isBooked ? (
                            <form onSubmit={handleBook} className="space-y-6">
                                <div>
                                    <h3 className="font-bold text-gray-900 mb-4">Book Venue</h3>

                                    {/* Date */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            required
                                            className="w-full rounded-lg border-gray-300 p-2 border"
                                            value={bookingDate}
                                            onChange={e => setBookingDate(e.target.value)}
                                        />
                                    </div>

                                    {/* Court Selection */}
                                    {venue.courts.length > 0 && (
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Court</label>
                                            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg overflow-x-auto">
                                                {venue.courts.map(court => (
                                                    <button
                                                        key={court.id}
                                                        type="button"
                                                        onClick={() => setSelectedCourtId(String(court.id))}
                                                        className={`
                                                             flex-1 py-1.5 px-3 text-sm font-medium rounded-md whitespace-nowrap transition-all
                                                             ${selectedCourtId === String(court.id)
                                                                ? 'bg-white text-blue-700 shadow-sm'
                                                                : 'text-gray-500 hover:text-gray-700'
                                                            }
                                                         `}
                                                    >
                                                        {court.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Slots */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Available Slots</label>
                                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                                            {availableSlots.map(slot => {
                                                const isPast = isSlotPast(bookingDate, slot.startTime);
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
                                                                    ? 'bg-red-50 text-red-300 border-red-100'
                                                                    : 'bg-gray-100 text-gray-400 border-gray-200'
                                                                : selectedSlotIds.includes(slot.id)
                                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                                                    : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                                                            }
                                                        `}
                                                    >
                                                        <div className="font-medium">{slot.startTime} - {slot.endTime}</div>
                                                        <div className="text-xs opacity-75">
                                                            {isDisabled
                                                                ? (slot.isBooked ? 'Booked' : 'Expired')
                                                                : formatCurrency(slot.price)}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Extras */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Extras</label>
                                        <div className="space-y-2">
                                            {venue.extras.map(extra => (
                                                <label key={extra.id} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 text-blue-600 rounded"
                                                            checked={selectedExtraIds.includes(String(extra.id))}
                                                            onChange={() => handleExtraToggle(String(extra.id))}
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">{extra.name}</span>
                                                    </div>
                                                    <span className="text-xs font-semibold text-gray-500">{formatCurrency(Number(extra.price))}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Total */}
                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-gray-600 font-medium">Total Price</span>
                                        <span className="text-2xl font-bold text-blue-600">{formatCurrency(totalPrice)}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-lg"
                                        >
                                            Book Now
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => router.back()}
                                            className="px-4 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="bg-green-50 text-green-800 p-6 rounded-xl text-center">
                                <h3 className="text-2xl font-bold mb-2">Booking Success!</h3>
                                <p className="mb-6">You have successfully booked this venue.</p>
                                <button
                                    onClick={() => {
                                        setIsBooked(false);
                                        setSelectedSlotIds([]);
                                    }}
                                    className="block w-full text-sm text-green-600 hover:underline"
                                >
                                    Book another slot
                                </button>
                                <Link href="/my-bookings" className="block mt-4 text-green-700 font-bold underline">
                                    Go to My Bookings
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Reviews */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Reviews ({venue.reviews.length})</h3>
                    <div className="space-y-6">
                        {venue.reviews.map(review => (
                            <div key={review.id} className="border-b border-gray-100 pb-6 last:border-0">
                                <div className="font-bold">{review.user?.name || 'User'}</div>
                                <div className="text-yellow-400 text-sm">{'⭐'.repeat(review.rating)}</div>
                                <p className="text-gray-600 mt-1">{review.comment}</p>
                            </div>
                        ))}
                        {venue.reviews.length === 0 && <p className="text-gray-500">No reviews yet.</p>}
                    </div>
                </div>

            </div>
        </div>
    );
}
