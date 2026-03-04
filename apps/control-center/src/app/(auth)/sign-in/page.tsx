"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Sparkles, ArrowRight, Github } from "lucide-react";
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

    const handleGoogleSignIn = async () => {
        try {
            await authClient.signIn.social({
                provider: "google",
            });
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#090d18] p-4 text-white">
            {/* Background Glows */}
            <div className="pointer-events-none absolute left-1/4 top-1/4 -z-10 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />
            <div className="pointer-events-none absolute right-1/4 bottom-1/4 -z-10 h-96 w-96 rounded-full bg-blue-500/10 blur-[100px]" />

            <main className="w-full max-w-md">
                <div className="mb-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-semibold tracking-tight">Welcome Back</h2>
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
                                className="mt-2 w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none ring-cyan-500 transition hover:bg-white/10 focus:ring-1"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-zinc-500" htmlFor="password">Password</label>
                                <a href="#" className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300">Forgot Password?</a>
                            </div>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-2 w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none ring-cyan-500 transition hover:bg-white/10 focus:ring-1"
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

                    <div className="relative my-8">
                        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/5" />
                        <span className="relative mx-auto flex w-fit bg-[#0c1221] px-3 text-[10px] font-semibold text-zinc-600">Or connect with</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleGoogleSignIn}
                            className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 py-3 text-sm font-semibold transition hover:bg-white/10"
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </button>
                        <button className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 py-3 text-sm font-semibold transition hover:bg-white/10">
                            <Github className="h-4 w-4" />
                            GitHub
                        </button>
                    </div>

                    <p className="mt-8 text-center text-xs text-zinc-500">
                        Don't have an account? <Link href="/sign-up" className="font-semibold text-cyan-400 hover:text-cyan-300">Sign up</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
