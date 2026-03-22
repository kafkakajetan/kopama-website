'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function LogowaniePage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setError('');
            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                const msg = body?.message ? String(body.message) : 'Nieprawidłowy email lub hasło.';
                throw new Error(msg);
            }

            const meRes = await fetch(`${API_URL}/me`, { credentials: 'include' });
            if (!meRes.ok) {
                throw new Error('Nie udało się pobrać danych użytkownika po logowaniu.');
            }

            const me = (await meRes.json()) as { role: string };

            if (me.role === 'ADMIN') {
                router.push('/admin');
                return;
            }

            router.push('/panel');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Błąd logowania');
        }
    };

    return (
        <>
            <div className="nav">
                <Link className="brand" href="/start">
                    <div className="logo">K</div>
                    <div className="title">
                        <strong>KopaMa – Panel</strong>
                        <span>Logowanie</span>
                    </div>
                </Link>

                <div className="nav-actions">
                    <Link className="pill beige" href="/start">
                        Wróć
                    </Link>
                </div>
            </div>

            <main className="hero">
                <section className="shell">
                    <div className="hero-inner">
                        <p className="kicker">Panel kursanta</p>
                        <h1 className="headline">
                            <span className="accent">Logowanie</span>
                        </h1>

                        <div className="forms" style={{ gridTemplateColumns: '1fr' }}>
                            <section className="formcard active">
                                <h2>Zaloguj się</h2>
                                <p>Wpisz dane konta utworzonego po zakupie kursu.</p>

                                {error ? <div className="alert show">{error}</div> : <div className="alert" />}

                                <form onSubmit={submit}>
                                    <label>Email</label>
                                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />

                                    <label>Hasło</label>
                                    <input
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        type="password"
                                        autoComplete="current-password"
                                    />

                                    <button className="submit navy" type="submit">
                                        Zaloguj się
                                    </button>
                                </form>
                            </section>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}