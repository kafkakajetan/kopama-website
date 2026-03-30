'use client';

import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminInstructorsPage() {

    const router = useRouter();

    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [error, setError] = useState('');

    const loadInstructors = async () => {
        if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

        const meRes = await fetch(`${API_URL}/me`, {
            credentials: 'include',
        });

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

        const instructorsRes = await fetch(`${API_URL}/admin/instructors`, {
            credentials: 'include',
        });

        if (instructorsRes.status === 403) {
            router.push('/panel');
            return;
        }

        if (!instructorsRes.ok) {
            throw new Error('Nie udało się pobrać listy instruktorów.');
        }

        const instructorsData = (await instructorsRes.json()) as Instructor[];
        setInstructors(instructorsData);
    };

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            try {
                await loadInstructors();
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'Błąd');
                }
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
    }, [router]);

    return (
        <div className="forms" style={{ gridTemplateColumns: '1fr', gap: 24 }}>
            <section className="formcard active">
                <h2>Instruktorzy</h2>
                <p>Liczba kont instruktorów: {instructors.length}</p>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Data</th>
                            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Imię i nazwisko</th>
                            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Email</th>
                            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Telefon</th>
                            <th style={{ textAlign: 'left', padding: '10px 8px' }}>Kategorie</th>
                        </tr>
                        </thead>
                        <tbody>
                        {instructors.map((instructor) => (
                            <tr key={instructor.id}>
                                <td
                                    style={{
                                        padding: '10px 8px',
                                        borderTop: '1px solid rgba(255,255,255,.12)',
                                    }}
                                >
                                    {new Date(instructor.createdAt).toLocaleString('pl-PL')}
                                </td>
                                <td
                                    style={{
                                        padding: '10px 8px',
                                        borderTop: '1px solid rgba(255,255,255,.12)',
                                    }}
                                >
                                    {[instructor.firstName, instructor.lastName].filter(Boolean).join(' ') || '—'}
                                </td>
                                <td
                                    style={{
                                        padding: '10px 8px',
                                        borderTop: '1px solid rgba(255,255,255,.12)',
                                    }}
                                >
                                    {instructor.email}
                                </td>
                                <td
                                    style={{
                                        padding: '10px 8px',
                                        borderTop: '1px solid rgba(255,255,255,.12)',
                                    }}
                                >
                                    {instructor.phone ?? '—'}
                                </td>
                                <td
                                    style={{
                                        padding: '10px 8px',
                                        borderTop: '1px solid rgba(255,255,255,.12)',
                                    }}
                                >
                                    {instructor.drivingCategories.map((item) => item.code).join(', ') || '—'}
                                </td>
                            </tr>
                        ))}

                        {instructors.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    style={{
                                        padding: '12px 8px',
                                        borderTop: '1px solid rgba(255,255,255,.12)',
                                    }}
                                >
                                    Brak instruktorów.
                                </td>
                            </tr>
                        ) : null}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}