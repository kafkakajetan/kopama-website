'use client';

import { useEffect, useState } from 'react';

type CourseCategory = {
    id: string;
    code: string;
    name: string;
};

type CreateEnrollmentPayload = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    pesel: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    courseCategoryId: string;
    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ZapisPage() {
    const [categories, setCategories] = useState<CourseCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    const [form, setForm] = useState<CreateEnrollmentPayload>({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        pesel: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        postalCode: '',
        courseCategoryId: '',
        acceptedTerms: false,
        acceptedPrivacy: false,
    });

    useEffect(() => {
        const load = async () => {
            try {
                setError('');
                setSuccess('');
                if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL w apps/web/.env.local');

                const res = await fetch(`${API_URL}/course-categories`, { cache: 'no-store' });
                if (!res.ok) throw new Error(`Nie udało się pobrać kategorii (HTTP ${res.status})`);

                const data = (await res.json()) as CourseCategory[];
                setCategories(data);

                if (data.length && !form.courseCategoryId) {
                    setForm((p) => ({ ...p, courseCategoryId: data[0].id }));
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Błąd pobierania kategorii');
            } finally {
                setLoading(false);
            }
        };

        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const set = <K extends keyof CreateEnrollmentPayload>(key: K, value: CreateEnrollmentPayload[K]) => {
        setForm((p) => ({ ...p, [key]: value }));
    };

    const onSubmit = async (ev: React.FormEvent) => {
        ev.preventDefault();

        try {
            setError('');
            setSuccess('');
            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL w apps/web/.env.local');

            const res = await fetch(`${API_URL}/enrollments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                const msg =
                    body?.message
                        ? Array.isArray(body.message)
                            ? body.message.join('\n')
                            : String(body.message)
                        : `Błąd zapisu (HTTP ${res.status})`;
                throw new Error(msg);
            }

            setSuccess('Zapis przyjęty. Następny krok: płatność (dodamy w kolejnym etapie).');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd zapisu');
        }
    };

    return (
        <main style={{ maxWidth: 760, margin: '40px auto', padding: 16 }}>
            <h1>Zapis na kurs</h1>

            {loading && <p>Ładowanie…</p>}
            {error && <p style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>{error}</p>}
            {success && <p style={{ color: 'green' }}>{success}</p>}

            {!loading && (
                <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gap: 6 }}>
                        <label>Kategoria kursu</label>
                        <select
                            value={form.courseCategoryId}
                            onChange={(e) => set('courseCategoryId', e.target.value)}
                            required
                        >
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} ({c.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ display: 'grid', gap: 6 }}>
                            <label>Imię</label>
                            <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required />
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                            <label>Nazwisko</label>
                            <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ display: 'grid', gap: 6 }}>
                            <label>Email</label>
                            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                            <label>Telefon</label>
                            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ display: 'grid', gap: 6 }}>
                            <label>PESEL</label>
                            <input value={form.pesel} onChange={(e) => set('pesel', e.target.value)} required />
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                            <label>Kod pocztowy</label>
                            <input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} required />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                        <label>Adres (ulica i numer)</label>
                        <input value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} required />
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                        <label>Adres cd. (opcjonalnie)</label>
                        <input value={form.addressLine2 ?? ''} onChange={(e) => set('addressLine2', e.target.value)} />
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                        <label>Miasto</label>
                        <input value={form.city} onChange={(e) => set('city', e.target.value)} required />
                    </div>

                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                            type="checkbox"
                            checked={form.acceptedTerms}
                            onChange={(e) => set('acceptedTerms', e.target.checked)}
                            required
                        />
                        Akceptuję regulamin
                    </label>

                    <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                            type="checkbox"
                            checked={form.acceptedPrivacy}
                            onChange={(e) => set('acceptedPrivacy', e.target.checked)}
                            required
                        />
                        Akceptuję politykę prywatności
                    </label>

                    <button type="submit">Zapisz się</button>
                </form>
            )}
        </main>
    );
}