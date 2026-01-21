"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { VENUES, Venue } from "@/data/venues";
import Link from "next/link";

const containerStyle = {
    width: '100%',
    height: 'calc(100vh - 64px)' // Full height minus header/sidebar offset if needed
};

const DEFAULT_CENTER = {
    lat: 16.0544,
    lng: 108.2022
};

const OPTIONS = {
    minZoom: 10,
    maxZoom: 18,
};

const LIBRARIES: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

export default function MapPage() {
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
    const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    // Get User Location on Mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setMapCenter({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.log("Error getting location for map center, using default:", error);
                }
            );
        }
    }, []);

    const filteredVenues = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const lowerQuery = searchQuery.toLowerCase();
        return VENUES.filter(venue =>
            venue.name.toLowerCase().includes(lowerQuery) ||
            venue.address.toLowerCase().includes(lowerQuery)
        );
    }, [searchQuery]);

    const handleSearchSelect = (venue: Venue) => {
        setSearchQuery(venue.name);
        setIsSearchOpen(false);
        setSelectedVenue(venue);
        map?.panTo(venue.location);
        map?.setZoom(15);
    };

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    const getIcon = (type: string) => {
        // Simple colored markers
        switch (type) {
            case 'badminton': return "http://maps.google.com/mapfiles/ms/icons/blue-dot.png";
            case 'football': return "http://maps.google.com/mapfiles/ms/icons/green-dot.png";
            case 'tennis': return "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png";
            default: return undefined;
        }
    };

    if (loadError) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-100 p-4">
                <div className="text-center text-red-500 bg-white p-6 rounded-lg shadow-md max-w-md">
                    <h3 className="font-bold text-lg mb-2">Error Loading Map</h3>
                    <p>{loadError.message}</p>
                    <p className="text-sm text-gray-500 mt-2">Make sure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set in .env.local</p>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="h-full w-full relative">
            <div className="absolute top-4 left-4 z-10 w-full max-w-xs sm:max-w-md">
                <div className="relative">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search local venues..."
                            className="w-full px-4 py-3 pl-10 rounded-lg shadow-md border-0 ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchOpen(true);
                            }}
                            onFocus={() => setIsSearchOpen(true)}
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        {searchQuery && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setIsSearchOpen(false);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {isSearchOpen && filteredVenues.length > 0 && (
                        <ul className="absolute w-full mt-2 bg-white rounded-lg shadow-xl max-h-60 overflow-y-auto border border-gray-100 divide-y divide-gray-50">
                            {filteredVenues.map((venue) => (
                                <li
                                    key={venue.id}
                                    onClick={() => handleSearchSelect(venue)}
                                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="font-medium text-gray-800">{venue.name}</div>
                                    <div className="text-xs text-gray-500 truncate">{venue.address}</div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {isSearchOpen && searchQuery && filteredVenues.length === 0 && (
                        <div className="absolute w-full mt-2 bg-white rounded-lg shadow-md p-4 text-center text-gray-500 text-sm">
                            No venues found
                        </div>
                    )}
                </div>
            </div>

            <GoogleMap
                mapContainerStyle={containerStyle}
                center={mapCenter}
                zoom={13}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={OPTIONS}
            >
                {VENUES.map((venue) => (
                    <Marker
                        key={venue.id}
                        position={venue.location}
                        onClick={() => setSelectedVenue(venue)}
                        icon={{
                            url: getIcon(venue.type)!,
                        }}
                    />
                ))}

                {selectedVenue && (
                    <InfoWindow
                        position={selectedVenue.location}
                        onCloseClick={() => setSelectedVenue(null)}
                    >
                        <div className="p-2 min-w-[200px]">
                            <h3 className="font-bold text-gray-800 text-lg mb-1">{selectedVenue.name}</h3>
                            <div className="text-sm text-gray-600 mb-2">
                                <span className="capitalize font-medium text-blue-600 border border-blue-200 bg-blue-50 px-1.5 py-0.5 rounded text-xs mr-2">
                                    {selectedVenue.type}
                                </span>
                                <span>{selectedVenue.price}</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-3">{selectedVenue.address}</p>

                            <Link
                                href={`/map/${selectedVenue.id}`}
                                className="block w-full text-center bg-blue-600 text-white py-1.5 px-3 rounded hover:bg-blue-700 transition active:scale-95"
                            >
                                Book Now
                            </Link>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div>
    );
}
