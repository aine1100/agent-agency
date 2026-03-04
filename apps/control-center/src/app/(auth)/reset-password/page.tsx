"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await authClient.resetPassword({
                newPassword: password,
            });

            if (authError) {
                throw new Error(authError.message);
            }

            setSuccess(true);
            setTimeout(() => {
                router.push("/sign-in");
            }, 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#090d18] p-4 text-white">
            {/* Background Glows */}
            <div className="pointer-events-none absolute left-1/4 top-1/4 -z-10 h-96 w-96 rounded-full bg-brand-purple/10 blur-[100px]" />
            <div className="pointer-events-none absolute right-1/4 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-brand-purple/5 blur-[100px]" />

            <main className="w-full max-w-md">
                <div className="mb-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-purple shadow-lg shadow-brand-purple/20">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground">New Password</h2>
                    <p className="mt-2 text-sm text-zinc-400">Set a secure password for your account</p>
                </div>

                <div className="rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur-xl">
                    {!success ? (
                        <form className="space-y-5" onSubmit={handleReset}>
                            <div>
                                <label className="text-xs font-semibold text-zinc-500" htmlFor="password">New Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none ring-brand-purple transition hover:bg-white/10 focus:ring-1 text-white"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-500" htmlFor="confirm">Confirm Password</label>
                                <input
                                    id="confirm"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="mt-2 w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none ring-brand-purple transition hover:bg-white/10 focus:ring-1 text-white"
                                    placeholder="••••••••"
                                />
                            </div>

                            {error && (
                                <p className="text-xs font-medium text-rose-400">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-50"
                            >
                                {loading ? "Updating..." : "Reset Password"}
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-6">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">Success</h3>
                            <p className="mt-2 text-sm text-zinc-400 px-4">
                                Your password has been updated. Redirecting to login...
                            </p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
