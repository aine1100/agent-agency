"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Sparkles, ArrowRight, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await authClient.signUp.email({
                email,
                password,
                name,
            });

            if (authError) {
                throw new Error(authError.message);
            }

            router.push("/sign-in");
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
                        <UserPlus className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-semibold tracking-tight text-foreground">Create Account</h2>
                    <p className="mt-2 text-sm text-zinc-400">Join Agency Agents and start orchestrating</p>
                </div>

                <div className="rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur-xl">
                    <form className="space-y-5" onSubmit={handleSignUp}>
                        <div>
                            <label className="text-xs font-semibold text-zinc-500" htmlFor="name">Full Name</label>
                            <input
                                id="name"
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="mt-2 w-full rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm outline-none ring-brand-purple transition hover:bg-white/10 focus:ring-1"
                                placeholder="Johnny Silverhand"
                            />
                        </div>

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
                            <label className="text-xs font-semibold text-zinc-500" htmlFor="password">Password</label>
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
                            {loading ? "Creating account..." : "Get Started"}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </form>


                    <p className="mt-8 text-center text-xs text-zinc-500">
                        Already have an account? <Link href="/sign-in" className="font-semibold text-brand-purple hover:text-brand-purple/80">Sign in</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
