'use client';

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminAddInstructorPage() {
    const router = useRouter();

    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [drivingCategories, setDrivingCategories] = useState<DrivingCategory[]>([]);
    const [newInstructorEmail, setNewInstructorEmail] = useState('');
    const [newInstructorPhone, setNewInstructorPhone] = useState('');
    const [newInstructorPassword, setNewInstructorPassword] = useState('');
    const [newInstructorFirstName, setNewInstructorFirstName] = useState('');
    const [newInstructorLastName, setNewInstructorLastName] = useState('');
    const [selectedDrivingCategoryCodes, setSelectedDrivingCategoryCodes] = useState<string[]>([]);

    const [createInstructorError, setCreateInstructorError] = useState('');
    const [createInstructorOk, setCreateInstructorOk] = useState('');
    const [error, setError] = useState('');

    const loadDrivingCategories = async () => {
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

        const categoriesRes = await fetch(`${API_URL}/admin/driving-categories`, {
            credentials: 'include',
        });

        if (categoriesRes.status === 403) {
            router.push('/panel');
            return;
        }

        if (!categoriesRes.ok) {
            throw new Error('Nie udało się pobrać kategorii kursów.');
        }

        const drivingCategoriesData = (await categoriesRes.json()) as DrivingCategory[];
        setDrivingCategories(drivingCategoriesData);
    };

    useEffect(() => {
        loadDrivingCategories().catch((e) => setError(e instanceof Error ? e.message : 'Błąd'));
    }, []);

    const createInstructor = async () => {
        try {
            setCreateInstructorError('');
            setCreateInstructorOk('');

            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const res = await fetch(`${API_URL}/admin/instructors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: newInstructorEmail.trim().toLowerCase(),
                    phone: newInstructorPhone.trim(),
                    password: newInstructorPassword,
                    firstName: newInstructorFirstName.trim(),
                    lastName: newInstructorLastName.trim(),
                    drivingCategoryCodes: selectedDrivingCategoryCodes,
                }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                const msg = body?.message ? String(body.message) : 'Nie udało się utworzyć instruktora.';
                throw new Error(msg);
            }

            const created = (await res.json()) as Instructor;

            setInstructors((prev) => [created, ...prev]);
            setNewInstructorEmail('');
            setNewInstructorPhone('');
            setNewInstructorPassword('');
            setNewInstructorFirstName('');
            setNewInstructorLastName('');
            setSelectedDrivingCategoryCodes([]);
            setCreateInstructorOk('Instruktor został utworzony.');
        } catch (e) {
            setCreateInstructorError(e instanceof Error ? e.message : 'Błąd tworzenia instruktora');
        }
    };

    const toggleDrivingCategory = (code: string) => {
        setSelectedDrivingCategoryCodes((prev) =>
            prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
        );
    };

    return (
        <div className="forms" style={{gridTemplateColumns: '1fr', gap: 24}}>
            <section className="formcard active">
                <h2>Dodaj instruktora</h2>
                <p>Administrator może utworzyć nowe konto instruktora.</p>

                {createInstructorError ? <div className="alert show">{createInstructorError}</div> :
                    <div className="alert"/>}
                {createInstructorOk ? (
                    <div
                        className="alert show"
                        style={{
                            background: 'rgba(16,185,129,.10)',
                            borderColor: 'rgba(16,185,129,.28)',
                            color: '#065F46',
                        }}
                    >
                        {createInstructorOk}
                    </div>
                ) : null}

                <label>Imię</label>
                <input
                    value={newInstructorFirstName}
                    onChange={(e) => setNewInstructorFirstName(e.target.value)}
                    type="text"
                />

                <label>Nazwisko</label>
                <input
                    value={newInstructorLastName}
                    onChange={(e) => setNewInstructorLastName(e.target.value)}
                    type="text"
                />

                <label>Email</label>
                <input
                    value={newInstructorEmail}
                    onChange={(e) => setNewInstructorEmail(e.target.value)}
                    type="email"
                    autoComplete="off"
                />

                <label>Telefon (+48 i 9 cyfr)</label>
                <input
                    value={newInstructorPhone}
                    onChange={(e) => setNewInstructorPhone(e.target.value)}
                    placeholder="+48123123123"
                />

                <label>Hasło</label>
                <input
                    value={newInstructorPassword}
                    onChange={(e) => setNewInstructorPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                />

                <div className="category-section">
                    <div className="category-section-header">
                        <label style={{margin: 0}}>Kategorie prawa jazdy</label>
                        <span className="category-counter">
                                                Wybrane: {selectedDrivingCategoryCodes.length}
                                            </span>
                    </div>

                    <div className="category-grid">
                        {drivingCategories.map((category) => {
                            const isSelected = selectedDrivingCategoryCodes.includes(category.code);

                            return (
                                <label
                                    key={category.code}
                                    className={`category-tile ${isSelected ? 'selected' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleDrivingCategory(category.code)}
                                    />

                                    <span className="category-check">✓</span>

                                    <div className="category-code">{category.code}</div>

                                    <div className="category-name">{category.name}</div>

                                    <div className="category-meta">
                                        {category.description
                                            ? category.description
                                            : category.minAge
                                                ? `Minimalny wiek: ${category.minAge} lat`
                                                : 'Brak dodatkowego opisu'}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>

                <button className="submit navy" type="button" onClick={createInstructor}>
                    Utwórz instruktora
                </button>
            </section>
        </div>
    );
}