"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { User } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { usePresence } from "@/hooks/usePresence";
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

const PER_PAGE = 20;

export default function PeoplePage() {
    const { user } = useAuth();
    const router = useRouter();
    const { isUserOnline } = usePresence();
    const [users, setUsers] = useState<User[]>([]);
    const [existingChatIds, setExistingChatIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [hasMore, setHasMore] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to first page on new search
            setUsers([]); // Clear users for new search
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch existing chats (only once on mount)
    useEffect(() => {
        if (!user) return;
        const token = localStorage.getItem('auth_token');

        fetch('http://localhost:8000/api/chats', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(chatsData => {
                const chatIds = new Set<string>();
                chatsData.forEach((chatUser: any) => {
                    const theirUid = chatUser.google_id || String(chatUser.id);
                    if (user.uid) {
                        const chatId = [user.uid, theirUid].sort().join('_');
                        chatIds.add(chatId);
                    }
                });
                setExistingChatIds(chatIds);
            })
            .catch(err => console.error("Failed to fetch chats", err));
    }, [user]);

    // Fetch users with pagination
    const fetchUsers = useCallback(async (page: number, search: string, append: boolean = false) => {
        if (!user) return;

        const token = localStorage.getItem('auth_token');
        const url = new URL('http://localhost:8000/api/users');
        url.searchParams.set('page', String(page));
        url.searchParams.set('per_page', String(PER_PAGE));
        if (search) {
            url.searchParams.set('search', search);
        }

        try {
            const res = await fetch(url.toString(), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            const mappedUsers = data.data.map((u: any) => ({
                uid: u.google_id || String(u.id),
                id: u.id,
                displayName: u.name,
                email: u.email,
                avatar: u.avatar,
                createdAt: new Date(u.created_at).getTime(),
                lastSeen: new Date(u.updated_at).getTime(),
                connections: [],
            }));

            if (append) {
                setUsers(prev => [...prev, ...mappedUsers]);
            } else {
                setUsers(mappedUsers);
            }

            setHasMore(data.meta.has_more);
            setTotalUsers(data.meta.total);
            setCurrentPage(data.meta.current_page);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    }, [user]);

    // Initial load and search
    useEffect(() => {
        if (!user) return;
        setLoading(true);
        fetchUsers(1, debouncedSearch, false).finally(() => setLoading(false));
    }, [user, debouncedSearch, fetchUsers]);

    // Load more handler
    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        await fetchUsers(currentPage + 1, debouncedSearch, true);
        setLoadingMore(false);
    };

    // No client-side filtering needed - search is server-side
    const filteredUsers = users;

    const handleConnect = (targetUser: User) => {
        if (!user) return;
        const chatId = [user.uid, targetUser.uid].sort().join("_");
        router.push(`/chat/${chatId}`);
    };

    const hasExistingChat = (targetUser: User): boolean => {
        if (!user) return false;
        const chatId = [user.uid, targetUser.uid].sort().join("_");
        return existingChatIds.has(chatId);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 md:p-10 relative">
            {/* Loading Overlay - only covers content, not header */}
            <LoadingOverlay isLoading={loading} message="Đang tải người dùng..." fullScreen={false} />

            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-blue-600 bg-clip-text text-transparent">
                                Kết nối mọi người
                            </h1>
                            <p className="text-gray-500 mt-2 text-lg">
                                Tìm và kết nối với những người dùng khác trong cộng đồng
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative w-full md:w-96">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo tên hoặc email..."
                                className="block w-full rounded-2xl border-0 bg-white/80 backdrop-blur-sm py-4 pl-12 pr-4 text-sm text-gray-900 shadow-lg shadow-gray-200/50 ring-1 ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-6 mt-6">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            <span><strong className="text-gray-700">{totalUsers}</strong> người dùng</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span><strong className="text-gray-700">{users.filter(u => isUserOnline(u.uid)).length}</strong> đang online</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span><strong className="text-gray-700">{existingChatIds.size}</strong> đã kết nối</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span className="text-gray-400">Hiển thị: <strong className="text-gray-700">{users.length}</strong></span>
                        </div>
                    </div>
                </div>

                {/* Empty State */}
                {filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Không tìm thấy người dùng</h3>
                        <p className="text-gray-500">Thử tìm kiếm với từ khóa khác</p>
                    </div>
                ) : (
                    /* Two Sections: Connected and Not Connected */
                    <div className="space-y-12">
                        {/* Connected Users Section */}
                        {(() => {
                            const connectedUsers = filteredUsers.filter(u => hasExistingChat(u));
                            if (connectedUsers.length === 0) return null;

                            return (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg shadow-green-200/50">
                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Đã kết nối</h2>
                                            <p className="text-sm text-gray-500">{connectedUsers.length} người bạn</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {connectedUsers.map((u) => {
                                            const isOnline = isUserOnline(u.uid);
                                            return (
                                                <div
                                                    key={u.uid}
                                                    className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-lg shadow-gray-200/50 border border-green-100 hover:shadow-xl hover:shadow-green-100/50 hover:border-green-200 transition-all duration-300 hover:-translate-y-1"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                                            <div className="relative flex-shrink-0">
                                                                <img
                                                                    src={u.avatar || `https://ui-avatars.com/api/?name=${u.displayName}&background=random`}
                                                                    alt={u.displayName || "User"}
                                                                    className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white shadow-md group-hover:ring-green-100 transition-all"
                                                                />
                                                                {isOnline ? (
                                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white shadow-sm flex items-center justify-center">
                                                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-300 rounded-full border-3 border-white shadow-sm"></div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-green-600 transition-colors">
                                                                    {u.displayName}
                                                                </h3>
                                                                <p className="text-sm text-gray-500 truncate">{u.email}</p>
                                                                <div className="mt-1">
                                                                    {isOnline ? (
                                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                            Đang hoạt động
                                                                        </span>
                                                                    ) : u.lastSeen ? (
                                                                        <span className="text-xs text-gray-400">
                                                                            Hoạt động {formatDistanceToNow(new Date(u.lastSeen), { addSuffix: true, locale: vi })}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-5">
                                                        <button
                                                            onClick={() => handleConnect(u)}
                                                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold text-sm shadow-md shadow-green-200/50 hover:shadow-lg hover:shadow-green-300/50 hover:from-emerald-600 hover:to-green-600 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                            </svg>
                                                            Nhắn tin
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })()}

                        {/* Not Connected Users Section */}
                        {(() => {
                            const notConnectedUsers = filteredUsers.filter(u => !hasExistingChat(u));
                            if (notConnectedUsers.length === 0) return null;

                            return (
                                <section>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow-lg shadow-blue-200/50">
                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Chưa kết nối</h2>
                                            <p className="text-sm text-gray-500">{notConnectedUsers.length} người dùng</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {notConnectedUsers.map((u) => {
                                            const isOnline = isUserOnline(u.uid);
                                            return (
                                                <div
                                                    key={u.uid}
                                                    className="group relative bg-white/80 backdrop-blur-sm p-6 rounded-3xl shadow-lg shadow-gray-200/50 border border-white/50 hover:shadow-xl hover:shadow-blue-100/50 hover:border-blue-100 transition-all duration-300 hover:-translate-y-1"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                                            <div className="relative flex-shrink-0">
                                                                <img
                                                                    src={u.avatar || `https://ui-avatars.com/api/?name=${u.displayName}&background=random`}
                                                                    alt={u.displayName || "User"}
                                                                    className="h-16 w-16 rounded-2xl object-cover ring-2 ring-white shadow-md group-hover:ring-blue-100 transition-all"
                                                                />
                                                                {isOnline ? (
                                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white shadow-sm flex items-center justify-center">
                                                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                                                    </div>
                                                                ) : (
                                                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-300 rounded-full border-3 border-white shadow-sm"></div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                                                    {u.displayName}
                                                                </h3>
                                                                <p className="text-sm text-gray-500 truncate">{u.email}</p>
                                                                <div className="mt-1">
                                                                    {isOnline ? (
                                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                            Đang hoạt động
                                                                        </span>
                                                                    ) : u.lastSeen ? (
                                                                        <span className="text-xs text-gray-400">
                                                                            Hoạt động {formatDistanceToNow(new Date(u.lastSeen), { addSuffix: true, locale: vi })}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-5">
                                                        <button
                                                            onClick={() => handleConnect(u)}
                                                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold text-sm shadow-md shadow-blue-200/50 hover:shadow-lg hover:shadow-blue-300/50 hover:from-blue-600 hover:to-indigo-600 transition-all flex items-center justify-center gap-2"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                                            </svg>
                                                            Kết nối
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })()}

                        {/* Load More Button */}
                        {hasMore && (
                            <div className="flex justify-center pt-8">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="px-8 py-3 rounded-2xl bg-white shadow-lg shadow-gray-200/50 border border-gray-200 text-gray-700 font-semibold hover:shadow-xl hover:border-blue-200 hover:text-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                                >
                                    {loadingMore ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            Đang tải...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            Xem thêm ({totalUsers - users.length} người còn lại)
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
