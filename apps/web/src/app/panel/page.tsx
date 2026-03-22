'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Me = { id: string; email: string; phone: string | null; role: string };

export default function PanelPage() {
    const router = useRouter();
    const [me, setMe] = useState<Me | null>(null);
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordOk, setPasswordOk] = useState('');

    const load = async () => {
        if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

        const res = await fetch(`${API_URL}/me`, { credentials: 'include' });

        if (res.status === 401) {
            router.push('/logowanie');
            return;
        }

        if (!res.ok) throw new Error('Nie udało się pobrać danych użytkownika.');

        const data = (await res.json()) as Me;

        if (data.role === 'ADMIN') {
            router.push('/admin');
            return;
        }

        setMe(data);
        setEmail(data.email);
        setPhone(data.phone ?? '');
    };

    useEffect(() => {
        load().catch((e) => setError(e instanceof Error ? e.message : 'Błąd'));
    }, []);

    const save = async () => {
        try {
            setError('');
            setOk('');
            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const res = await fetch(`${API_URL}/me`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    phone: phone.trim(),
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                const msg = body?.message ? String(body.message) : 'Nie udało się zapisać zmian.';
                throw new Error(msg);
            }

            const data = (await res.json()) as Me;
            setMe(data);
            setEmail(data.email);
            setPhone(data.phone ?? '');
            setOk('Zapisano zmiany.');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd zapisu');
        }
    };

    const changePassword = async () => {
        try {
            setPasswordError('');
            setPasswordOk('');

            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const res = await fetch(`${API_URL}/me/password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    currentPassword,
                    newPassword,
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                const msg = body?.message ? String(body.message) : 'Nie udało się zmienić hasła.';
                throw new Error(msg);
            }

            setCurrentPassword('');
            setNewPassword('');
            setPasswordOk('Hasło zostało zmienione.');
        } catch (e) {
            setPasswordError(e instanceof Error ? e.message : 'Błąd zmiany hasła');
        }
    };

    return (
        <>
            <div className="nav">
                <Link className="brand" href="/start">
                    <div className="logo">K</div>
                    <div className="title">
                        <strong>KopaMa – Panel</strong>
                        <span>Panel kursanta</span>
                    </div>
                </Link>

                <div className="nav-actions">
                    <Link className="pill beige" href="/start">
                        Start
                    </Link>
                </div>
            </div>

            <main className="hero">
                <section className="shell">
                    <div className="hero-inner">
                        <p className="kicker">Panel kursanta</p>
                        <h1 className="headline">
                            Twoje <span className="accent">dane</span>
                        </h1>

                        <div className="forms" style={{ gridTemplateColumns: '1fr' }}>
                            <section className="formcard active">
                                <h2>Dane kontaktowe</h2>
                                <p>Możesz edytować email i numer telefonu.</p>

                                {error ? <div className="alert show">{error}</div> : <div className="alert" />}
                                {ok ? (
                                    <div
                                        className="alert show"
                                        style={{
                                            background: 'rgba(16,185,129,.10)',
                                            borderColor: 'rgba(16,185,129,.28)',
                                            color: '#065F46',
                                        }}
                                    >
                                        {ok}
                                    </div>
                                ) : null}

                                <label>Email</label>
                                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />

                                <label>Telefon (+48 i 9 cyfr)</label>
                                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+48123123123" />

                                <button className="submit navy" type="button" onClick={save} disabled={!me}>
                                    Zapisz zmiany
                                </button>
                            </section>
                            <section className="formcard active">
                                <h2>Zmiana hasła</h2>
                                <p>Podaj obecne hasło i ustaw nowe.</p>

                                {passwordError ? <div className="alert show">{passwordError}</div> : <div className="alert" />}
                                {passwordOk ? (
                                    <div
                                        className="alert show"
                                        style={{
                                            background: 'rgba(16,185,129,.10)',
                                            borderColor: 'rgba(16,185,129,.28)',
                                            color: '#065F46',
                                        }}
                                    >
                                        {passwordOk}
                                    </div>
                                ) : null}

                                <label>Obecne hasło</label>
                                <input
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    type="password"
                                    autoComplete="current-password"
                                />

                                <label>Nowe hasło</label>
                                <input
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    type="password"
                                    autoComplete="new-password"
                                />

                                <button className="submit navy" type="button" onClick={changePassword} disabled={!me}>
                                    Zmień hasło
                                </button>
                            </section>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}