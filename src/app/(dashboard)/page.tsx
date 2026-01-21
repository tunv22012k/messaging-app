"use client";

import { useAuth } from "@/context/AuthContext";
import { VENUES, Venue } from "@/data/venues";
import { useEffect, useState } from "react";
import Link from "next/link";

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180);
}

export default function DashboardPage() {
    const { user } = useAuth();
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [sortedVenues, setSortedVenues] = useState<(Venue & { distance?: number })[]>(VENUES);
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });
                    setLoadingLocation(false);
                },
                (err) => {
                    console.error("Error getting location", err);
                    setError("Could not get your location. Showing default list.");
                    setLoadingLocation(false);
                    // Default to Da Nang center if needed, or just keep original order
                }
            );
        } else {
            setError("Geolocation is not supported by your browser.");
            setLoadingLocation(false);
        }
    }, []);

    useEffect(() => {
        if (userLocation) {
            const venuesWithDistance = VENUES.map(venue => {
                const distance = getDistanceFromLatLonInKm(
                    userLocation.lat,
                    userLocation.lng,
                    venue.location.lat,
                    venue.location.lng
                );
                return { ...venue, distance };
            });

            // Sort by distance
            venuesWithDistance.sort((a, b) => a.distance - b.distance);
            setSortedVenues(venuesWithDistance);
        }
    }, [userLocation]);

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'football': return 'bg-green-100 text-green-700';
            case 'badminton': return 'bg-orange-100 text-orange-700';
            case 'tennis': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="flex h-full flex-col bg-gray-50 p-6 md:p-10 overflow-y-auto">
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Nearby Venues</h1>
                    <p className="mt-2 text-gray-600">
                        {loadingLocation ? "Finding your location..." :
                            userLocation ? "Showing venues closest to you." : "Explore our sports venues."}
                    </p>
                </div>
                {error && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        {error}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedVenues.map((venue) => (
                    <Link
                        key={venue.id}
                        href={`/map/${venue.id}`} // Link to detail page
                        className="group flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
                    >
                        <div className="h-48 bg-gray-200 relative">
                            {/* Placeholder for image */}
                            <img
                                src={venue.image || `https://placehold.co/600x400?text=${venue.type}`}
                                alt={venue.name}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute top-4 left-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getTypeColor(venue.type)}`}>
                                    {venue.type}
                                </span>
                            </div>
                            {venue.distance !== undefined && (
                                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm">
                                    <span className="text-xs font-bold text-gray-800">
                                        {venue.distance < 1
                                            ? `${(venue.distance * 1000).toFixed(0)}m away`
                                            : `${venue.distance.toFixed(1)} km away`}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="p-5 flex flex-col flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                {venue.name}
                            </h3>

                            <div className="flex items-start gap-1 mb-2 text-sm text-gray-600">
                                <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>
                                    {venue.address}
                                    {venue.distance !== undefined && (
                                        <span className="text-blue-600 font-medium ml-1">
                                            ({venue.distance < 1
                                                ? `${(venue.distance * 1000).toFixed(0)}m`
                                                : `${venue.distance.toFixed(1)} km`})
                                        </span>
                                    )}
                                </span>
                            </div>

                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                {venue.description}
                            </p>

                            <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-400 font-medium uppercase">Price</span>
                                    <span className="font-semibold text-gray-900">{venue.price}</span>
                                </div>
                                <span className="text-blue-600 text-sm font-bold bg-blue-50 px-3 py-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    Book Now
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
