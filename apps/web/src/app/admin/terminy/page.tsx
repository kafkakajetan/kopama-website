'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Me = {
    id: string;
    email: string;
    phone: string | null;
    role: string;
};

type CourseCategory = {
    id: string;
    code: string;
    name: string;
};

type CourseStartSlot = {
    id: string;
    startDate: string;
    isActive: boolean;
    notes: string | null;
    courseCategoryId: string;
    courseCategory: {
        id: string;
        code: string;
        name: string;
    };
};

export default function AdminCourseStartSlotsPage() {
    const router = useRouter();

    const [categories, setCategories] = useState<CourseCategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [notes, setNotes] = useState('');
    const [slots, setSlots] = useState<CourseStartSlot[]>([]);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');

    const selectedCategory = useMemo(
        () => categories.find((item) => item.id === selectedCategoryId) ?? null,
        [categories, selectedCategoryId],
    );

    const load = async () => {
        if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

        const meRes = await fetch(`${API_URL}/me`, { credentials: 'include' });
        if (meRes.status === 401) {
            router.push('/logowanie');
            return;
        }
        if (!meRes.ok) throw new Error('Nie udało się pobrać danych użytkownika.');

        const me = (await meRes.json()) as Me;
        if (me.role !== 'ADMIN') {
            router.push('/panel');
            return;
        }

        const categoriesRes = await fetch(`${API_URL}/course-categories`, {
            credentials: 'include',
        }).catch(() => null);

        if (!categoriesRes || !categoriesRes.ok) {
            throw new Error('Nie udało się pobrać kategorii kursów.');
        }

        const categoriesData = (await categoriesRes.json()) as CourseCategory[];
        setCategories(categoriesData);

        if (!selectedCategoryId && categoriesData.length > 0) {
            setSelectedCategoryId(categoriesData[0].id);
        }
    };

    const loadSlots = async (courseCategoryId: string) => {
        if (!API_URL || !courseCategoryId) return;

        const res = await fetch(
            `${API_URL}/admin/course-start-slots?courseCategoryId=${encodeURIComponent(courseCategoryId)}`,
            { credentials: 'include' },
        );

        if (!res.ok) {
            throw new Error('Nie udało się pobrać terminów.');
        }

        const data = (await res.json()) as CourseStartSlot[];
        setSlots(data);
    };

    useEffect(() => {
        load().catch((e) => setError(e instanceof Error ? e.message : 'Błąd'));
    }, []);

    useEffect(() => {
        if (!selectedCategoryId) return;
        loadSlots(selectedCategoryId).catch((e) =>
            setError(e instanceof Error ? e.message : 'Błąd'),
        );
    }, [selectedCategoryId]);

    const addSlot = async () => {
        try {
            setError('');
            setOk('');

            if (!selectedCategoryId) {
                setError('Wybierz kategorię kursu.');
                return;
            }

            if (!startDate) {
                setError('Wybierz datę rozpoczęcia kursu.');
                return;
            }

            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const res = await fetch(`${API_URL}/admin/course-start-slots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    courseCategoryId: selectedCategoryId,
                    startDate,
                    notes: notes.trim() || undefined,
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                const msg = body?.message ? String(body.message) : 'Nie udało się dodać terminu.';
                throw new Error(msg);
            }

            setStartDate('');
            setNotes('');
            setOk('Termin został zapisany.');
            await loadSlots(selectedCategoryId);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd zapisu terminu');
        }
    };

    const removeSlot = async (id: string) => {
        try {
            setError('');
            setOk('');

            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const res = await fetch(`${API_URL}/admin/course-start-slots/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!res.ok) {
                throw new Error('Nie udało się usunąć terminu.');
            }

            setOk('Termin został usunięty.');
            await loadSlots(selectedCategoryId);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd usuwania terminu');
        }
    };

    return (
        <div className="forms" style={{ gridTemplateColumns: '1fr', gap: 24 }}>
            <section className="formcard active">
                <h2>Terminy rozpoczęcia kursu</h2>
                <p>Dodaj dostępne terminy, które pojawią się w formularzu zapisu.</p>

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

                <label>Kategoria kursu</label>
                <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                >
                    <option value="">Wybierz kategorię</option>
                    {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name} ({category.code})
                        </option>
                    ))}
                </select>

                <label>Termin rozpoczęcia kursu</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                />

                <label>Notatka (opcjonalnie)</label>
                <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={120}
                    placeholder="Np. grupa wieczorowa"
                />

                <button className="submit navy" type="button" onClick={addSlot}>
                    Dodaj termin
                </button>
            </section>

            <section className="formcard active">
                <h2>Dostępne terminy</h2>
                <p>
                    {selectedCategory
                        ? `Lista terminów dla: ${selectedCategory.name}`
                        : 'Wybierz kategorię kursu.'}
                </p>

                <div style={{ display: 'grid', gap: 12 }}>
                    {slots.map((slot) => (
                        <div
                            key={slot.id}
                            style={{
                                border: '1px solid rgba(255,255,255,.12)',
                                borderRadius: 14,
                                padding: 14,
                            }}
                        >
                            <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                {new Date(slot.startDate).toLocaleDateString('pl-PL')}
                            </div>

                            <div style={{ opacity: 0.85, marginBottom: 10 }}>
                                {slot.notes || 'Brak notatki'}
                            </div>

                            <button
                                className="submit"
                                type="button"
                                onClick={() => removeSlot(slot.id)}
                                style={{ width: 'auto', paddingInline: 18 }}
                            >
                                Usuń termin
                            </button>
                        </div>
                    ))}

                    {slots.length === 0 ? <p>Brak terminów dla wybranej kategorii.</p> : null}
                </div>
            </section>
        </div>
    );
}