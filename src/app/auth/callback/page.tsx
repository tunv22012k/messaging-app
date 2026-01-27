"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { APP_ROUTES } from "@/lib/routes";

export default function AuthCallback() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { loginWithToken } = useAuth();

    useEffect(() => {
        const token = searchParams.get("token");

        if (token) {
            loginWithToken(token).then(() => {
                router.push(APP_ROUTES.home);
            }).catch((err) => {
                console.error("Login failed", err);
                router.push(`${APP_ROUTES.login}?error=auth_failed`);
            });
        } else {
            router.push(`${APP_ROUTES.login}?error=no_token`);
        }
    }, [searchParams, loginWithToken, router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
        </div>
    );
}
