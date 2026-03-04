"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Sparkles, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import Link from "next/link";

export default function SignInPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await authClient.signIn.email({
                email,
                password,
            });

            if (authError) {
                throw new Error(authError.message);
            }

            router.push("/dashboard");
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
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground">Welcome Back</h2>
                    <p className="mt-2 text-sm text-zinc-400">Sign in to manage your AI workflows</p>
                </div>

                <div className="rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur-xl">
                    <form className="space-y-5" onSubmit={handleSignIn}>
                        <div>
                            <label className="text-xs font-semibold text-zinc-500" htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-2 w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none ring-brand-purple transition hover:bg-white/10 focus:ring-1"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-zinc-500" htmlFor="password">Password</label>
                                <Link href="/forgot-password" village-ignore className="text-[10px] font-semibold text-brand-purple hover:text-brand-purple/80">Forgot Password?</Link>
                            </div>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-2 w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none ring-brand-purple transition hover:bg-white/10 focus:ring-1"
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
                            {loading ? "Signing in..." : "Continue"}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </form>


                    <p className="mt-8 text-center text-xs text-zinc-500">
                        Don't have an account? <Link href="/sign-up" className="font-semibold text-brand-purple hover:text-brand-purple/80">Sign up</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
