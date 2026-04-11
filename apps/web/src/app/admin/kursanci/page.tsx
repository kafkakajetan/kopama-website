'use client';

import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Me = {
    role: 'ADMIN' | 'STUDENT' | 'INSTRUCTOR';
};

type Student = {
    id: string;
    createdAt: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    status: 'DRAFT' | 'PAYMENT_PENDING' | 'CASH_PENDING' | 'PAID' | 'CANCELED';
    wantsCashPayment: boolean;
    courseCategory: {
        name: string;
    } | null;
};

export default function AdminStudentsPage() {

    const router = useRouter();

    const [students, setStudents] = useState<Student[]>([]);
    const [error, setError] = useState('');

    const loadStudents = async () => {
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

        const studentsRes = await fetch(`${API_URL}/admin/students`, {
            credentials: 'include',
        });

        if (studentsRes.status === 403) {
            router.push('/panel');
            return;
        }

        if (!studentsRes.ok) {
            throw new Error('Nie udało się pobrać listy kursantów.');
        }

        const studentsData = (await studentsRes.json()) as Student[];
        setStudents(studentsData);
    };

    useEffect(() => {
        let cancelled = false;

        const run = async () => {
            try {
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

                const studentsRes = await fetch(`${API_URL}/admin/students`, {
                    credentials: 'include',
                });

                if (studentsRes.status === 403) {
                    router.push('/panel');
                    return;
                }

                if (!studentsRes.ok) {
                    throw new Error('Nie udało się pobrać listy kursantów.');
                }

                const studentsData = (await studentsRes.json()) as Student[];

                if (!cancelled) {
                    setStudents(studentsData);
                }
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
        <div className="forms" style={{gridTemplateColumns: '1fr', gap: 24}}>
            <section className="formcard active">
                <h2>Kursanci</h2>
                <p>Liczba kont kursantów: {students.length}</p>

                <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                        <tr>
                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Data</th>
                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Imię</th>
                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Nazwisko</th>
                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Kategoria kursu</th>
                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Telefon</th>
                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Mail</th>
                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Status płatności</th>
                        </tr>
                        </thead>
                        <tbody>
                        {students.map((student) => (
                            <tr key={student.id}>
                                <td
                                    style={{
                                        padding: '10px 8px',
                                        borderTop: '1px solid rgba(255,255,255,.12)',
                                    }}
                                >
                                    {new Date(student.createdAt).toLocaleString('pl-PL')}
                                </td>
                                <td style={{padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.12)'}}>
                                    {student.firstName}
                                </td>
                                <td style={{padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.12)'}}>
                                    {student.lastName}
                                </td>
                                <td style={{padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.12)'}}>
                                    {student.courseCategory?.name ?? '—'}
                                </td>
                                <td style={{padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.12)'}}>
                                    {student.phone ?? '—'}
                                </td>
                                <td style={{padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.12)'}}>
                                    {student.email}
                                </td>
                                <td style={{padding: '10px 8px', borderTop: '1px solid rgba(255,255,255,.12)'}}>
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            padding: '6px 10px',
                                            borderRadius: 999,
                                            fontWeight: 400,
                                            fontSize: '12px',
                                            color:
                                                student.status === 'PAID'
                                                    ? '#166534'
                                                    : student.status === 'CASH_PENDING'
                                                        ? '#b42318'
                                                        : '#b54708',
                                            background:
                                                student.status === 'PAID'
                                                    ? '#dcfce7'
                                                    : student.status === 'CASH_PENDING'
                                                        ? '#fee4e2'
                                                        : '#ffedd5',
                                        }}
                                    >
                                        {student.status === 'PAID'
                                            ? 'OPŁACONY'
                                            : student.status === 'CASH_PENDING'
                                                ? 'GOTÓWKA'
                                                : 'TRWA'}
                                    </span>
                                </td>
                            </tr>
                        ))}

                        {students.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    style={{
                                        padding: '12px 8px',
                                        borderTop: '1px solid rgba(255,255,255,.12)',
                                    }}
                                >
                                    Brak kursantów.
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