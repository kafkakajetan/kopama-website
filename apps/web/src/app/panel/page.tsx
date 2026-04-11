'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Me = { id: string; email: string; phone: string | null; role: string };

type UploadedContract = {
    id: string;
    originalFileName: string;
    createdAt: string;
    sizeBytes: number;
    storageKey: string;
};

type EnrollmentItem = {
    id: string;
    createdAt: string;
    status: 'DRAFT' | 'PAYMENT_PENDING' | 'PAID' | 'CANCELED';
    wantsCashPayment: boolean;
    courseMode: 'STATIONARY' | 'ELEARNING';
    firstName: string;
    lastName: string;
    courseCategory: {
        code: string;
        name: string;
    };
    uploadedContracts: UploadedContract[];
};

export default function PanelPage() {
    const router = useRouter();
    const [me, setMe] = useState<Me | null>(null);
    const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
    const [uploadingEnrollmentId, setUploadingEnrollmentId] = useState<string | null>(null);
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

        const enrollmentsRes = await fetch(`${API_URL}/me/enrollments`, {
            credentials: 'include',
        });

        if (!enrollmentsRes.ok) {
            throw new Error('Nie udało się pobrać zapisów kursanta.');
        }

        const enrollmentsData = (await enrollmentsRes.json()) as EnrollmentItem[];
        setEnrollments(enrollmentsData);
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

    const uploadContract = async (
        enrollmentId: string,
        file: File | null,
    ) => {
        try {
            setError('');
            setOk('');

            if (!file) return;
            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const formData = new FormData();
            formData.append('file', file);

            setUploadingEnrollmentId(enrollmentId);

            const res = await fetch(
                `${API_URL}/contracts/enrollments/${enrollmentId}/upload`,
                {
                    method: 'POST',
                    credentials: 'include',
                    body: formData,
                },
            );

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                const msg = body?.message
                    ? Array.isArray(body.message)
                        ? body.message.join('\n')
                        : String(body.message)
                    : 'Nie udało się wgrać umowy.';
                throw new Error(msg);
            }

            setOk('Umowa została dodana.');

            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd uploadu umowy');
        } finally {
            setUploadingEnrollmentId(null);
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
            <div className="nav">
                <Link className="brand" href="/start">
                    <div className="logo">K</div>
                    <div className="title">
                        <strong>KopaMa – Panel</strong>
                        <span>Administrator</span>
                    </div>
                </Link>

                <div className="nav-actions">
                    <Link className="pill beige" href="/start">
                        Start
                    </Link>
                    <button className="pill" type="button" onClick={logout}>
                        Wyloguj
                    </button>
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
                            <section className="formcard active">
                                <h2>Twoje zapisy i umowy</h2>
                                <p>Do każdego zapisu możesz dodać podpisaną umowę w formacie PDF.</p>

                                <div style={{ display: 'grid', gap: 16 }}>
                                    {enrollments.map((enrollment) => (
                                        <div
                                            key={enrollment.id}
                                            style={{
                                                border: '1px solid rgba(255,255,255,.12)',
                                                borderRadius: 16,
                                                padding: 16,
                                            }}
                                        >
                                            <div style={{ marginBottom: 8, fontWeight: 700 }}>
                                                {enrollment.courseCategory.name}
                                            </div>

                                            <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 6 }}>
                                                Tryb kursu: {enrollment.courseMode === 'ELEARNING' ? 'e-learning' : 'stacjonarny'}
                                            </div>

                                            <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 12 }}>
                                                Data zapisu: {new Date(enrollment.createdAt).toLocaleString('pl-PL')}
                                            </div>

                                            <label
                                                className="submit navy"
                                                style={{
                                                    display: 'inline-block',
                                                    width: 'auto',
                                                    paddingInline: 18,
                                                    cursor: uploadingEnrollmentId === enrollment.id ? 'default' : 'pointer',
                                                    opacity: uploadingEnrollmentId === enrollment.id ? 0.7 : 1,
                                                }}
                                            >
                                                {uploadingEnrollmentId === enrollment.id ? 'Wgrywanie...' : 'Wgraj podpisaną umowę'}
                                                <input
                                                    type="file"
                                                    accept="application/pdf,.pdf"
                                                    style={{ display: 'none' }}
                                                    disabled={uploadingEnrollmentId === enrollment.id}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] ?? null;
                                                        void uploadContract(enrollment.id, file);
                                                        e.currentTarget.value = '';
                                                    }}
                                                />
                                            </label>

                                            <div style={{ marginTop: 14 }}>
                                                <strong>Dodane umowy:</strong>
                                            </div>

                                            <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                                                {enrollment.uploadedContracts.length > 0 ? (
                                                    enrollment.uploadedContracts.map((contract) => (
                                                        <div
                                                            key={contract.id}
                                                            style={{
                                                                padding: '10px 12px',
                                                                borderRadius: 12,
                                                                background: 'rgba(255,255,255,.04)',
                                                                fontSize: 14,
                                                            }}
                                                        >
                                                            {contract.originalFileName} •{' '}
                                                            {new Date(contract.createdAt).toLocaleString('pl-PL')}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ fontSize: 14, opacity: 0.75 }}>
                                                        Brak dodanych umów.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {enrollments.length === 0 ? (
                                        <div style={{ fontSize: 14, opacity: 0.75 }}>
                                            Brak zapisów przypisanych do tego konta.
                                        </div>
                                    ) : null}
                                </div>
                            </section>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}