'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminPage() {
    const router = useRouter();

    const [me, setMe] = useState<Me | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [drivingCategories, setDrivingCategories] = useState<DrivingCategory[]>([]);
    const [instructors, setInstructors] = useState<Instructor[]>([]);

    const [contracts, setContracts] = useState<ContractItem[]>([]);
    const [error, setError] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordOk, setPasswordOk] = useState('');

    const load = async () => {
        if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

        const meRes = await fetch(`${API_URL}/me`, { credentials: 'include' });

        if (meRes.status === 401) {
            router.push('/logowanie');
            return;
        }

        if (!meRes.ok) {
            throw new Error('Nie udało się pobrać danych użytkownika.');
        }

        const meData = (await meRes.json()) as Me;

        if (meData.role !== 'ADMIN') {
            router.push('/panel');
            return;
        }

        setMe(meData);

        const [studentsRes, instructorsRes, contractsRes, categoriesRes] = await Promise.all([
            fetch(`${API_URL}/admin/students`, { credentials: 'include' }),
            fetch(`${API_URL}/admin/instructors`, { credentials: 'include' }),
            fetch(`${API_URL}/admin/contracts`, { credentials: 'include' }),
            fetch(`${API_URL}/admin/driving-categories`, { credentials: 'include' }),
        ]);

        if (studentsRes.status === 403 || contractsRes.status === 403) {
            router.push('/panel');
            return;
        }

        if (!studentsRes.ok) {
            throw new Error('Nie udało się pobrać listy kursantów.');
        }

        if (!contractsRes.ok) {
            throw new Error('Nie udało się pobrać listy umów.');
        }

        if (!categoriesRes.ok) {
            throw new Error('Nie udało się pobrać kategorii kursów.');
        }

        if (!instructorsRes.ok) {
            throw new Error('Nie udało się pobrać listy instruktorów.');
        }

        const studentsData = (await studentsRes.json()) as Student[];
        const instructorsData = (await instructorsRes.json()) as Instructor[];
        const contractsData = (await contractsRes.json()) as ContractItem[];
        const drivingCategoriesData = (await categoriesRes.json()) as DrivingCategory[];

        setStudents(studentsData);
        setInstructors(instructorsData);
        setContracts(contractsData);
        setDrivingCategories(drivingCategoriesData);
    };

    useEffect(() => {
        load().catch((e) => setError(e instanceof Error ? e.message : 'Błąd'));
    }, []);

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

    const logout = async () => {
        try {
            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            });

            router.push('/logowanie');
        } catch {
            router.push('/logowanie');
        }
    };

    return (
        <>
            <div className="admin-page">


                <main className="hero">
                    <section className="shell">
                        <div className="hero-inner">
                            <h1 className="headline">
                                Zarządzanie <span className="accent">kursantami i umowami</span>
                            </h1>

                            {error ? <div className="alert show">{error}</div> : <div className="alert" />}

                            <div className="forms" style={{ gridTemplateColumns: '1fr', gap: 24 }}>
                                <section className="formcard active">
                                    <h2>Konto administratora</h2>
                                    <p>Zalogowany użytkownik: {me?.email ?? '...'}</p>
                                </section>

                                <section className="formcard active">
                                    <h2>Zmiana hasła</h2>
                                    <p>Możesz zmienić hasło konta administratora.</p>

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

                                    <button className="submit navy" type="button" onClick={changePassword}>
                                        Zmień hasło
                                    </button>
                                </section>

                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}