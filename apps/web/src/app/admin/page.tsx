'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Me = {
    id: string;
    email: string;
    phone: string | null;
    role: string;
};

type Student = {
    id: string;
    createdAt: string;
    email: string;
    phone: string | null;
    role: string;
};

type CourseCategory = {
    id: string;
    code: string;
    name: string;
};

type Instructor = {
    id: string;
    createdAt: string;
    email: string;
    phone: string | null;
    role: string;
    firstName: string | null;
    lastName: string | null;
    specializations: CourseCategory[];
};

type ContractItem = {
    path: string;
    fileName: string;
    size: number;
    updatedAt: string;
};

type ContractPreview = {
    path: string;
    fileName: string;
    size: number;
    updatedAt: string;
    content: string;
};

export default function AdminPage() {
    const router = useRouter();

    const [me, setMe] = useState<Me | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [courseCategories, setCourseCategories] = useState<CourseCategory[]>([]);
    const [instructors, setInstructors] = useState<Instructor[]>([]);

    const [newInstructorEmail, setNewInstructorEmail] = useState('');
    const [newInstructorPhone, setNewInstructorPhone] = useState('');
    const [newInstructorPassword, setNewInstructorPassword] = useState('');
    const [newInstructorFirstName, setNewInstructorFirstName] = useState('');
    const [newInstructorLastName, setNewInstructorLastName] = useState('');
    const [selectedCategoryCodes, setSelectedCategoryCodes] = useState<string[]>([]);

    const [createInstructorError, setCreateInstructorError] = useState('');
    const [createInstructorOk, setCreateInstructorOk] = useState('');

    const [contracts, setContracts] = useState<ContractItem[]>([]);
    const [selectedContract, setSelectedContract] = useState<ContractPreview | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [error, setError] = useState('');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordOk, setPasswordOk] = useState('');


    const load = async () => {
        if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

        const meRes = await fetch(`${API_URL}/me`, {credentials: 'include'});

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
            fetch(`${API_URL}/admin/students`, {credentials: 'include'}),
            fetch(`${API_URL}/admin/instructors`, {credentials: 'include'}),
            fetch(`${API_URL}/admin/contracts`, {credentials: 'include'}),
            fetch(`${API_URL}/admin/course-categories`, {credentials: 'include'}),
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
        const categoriesData = (await categoriesRes.json()) as CourseCategory[];

        setStudents(studentsData);
        setInstructors(instructorsData);
        setContracts(contractsData);
        set
    };

    useEffect(() => {
        load().catch((e) => setError(e instanceof Error ? e.message : 'Błąd'));
    }, []);

    const previewContract = async (contractPath: string) => {
        try {
            setError('');
            setLoadingPreview(true);

            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const res = await fetch(`${API_URL}/admin/contracts/view?path=${encodeURIComponent(contractPath)}`, {
                credentials: 'include',
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                const msg = body?.message ? String(body.message) : 'Nie udało się pobrać umowy.';
                throw new Error(msg);
            }

            const data = (await res.json()) as ContractPreview;
            setSelectedContract(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd podglądu umowy');
        } finally {
            setLoadingPreview(false);
        }
    };

    const downloadContract = async (contractPath: string) => {
        try {
            setError('');

            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const res = await fetch(`${API_URL}/admin/contracts/download?path=${encodeURIComponent(contractPath)}`, {
                credentials: 'include',
            });

            if (!res.ok) {
                throw new Error('Nie udało się pobrać pliku.');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = contractPath.split('/').pop() ?? 'umowa.txt';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd pobierania pliku');
        }
    };

    const changePassword = async () => {
        try {
            setPasswordError('');
            setPasswordOk('');

            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const res = await fetch(`${API_URL}/me/password`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
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

    const createInstructor = async () => {
        try {
            setCreateInstructorError('');
            setCreateInstructorOk('');

            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const res = await fetch(`${API_URL}/admin/instructors`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({
                    email: newInstructorEmail.trim().toLowerCase(),
                    phone: newInstructorPhone.trim(),
                    password: newInstructorPassword,
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
            setCreateInstructorOk('Instruktor został utworzony.');
        } catch (e) {
            setCreateInstructorError(e instanceof Error ? e.message : 'Błąd tworzenia instruktora');
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
                </div>
            </div>

            <main className="hero">
                <section className="shell">
                    <div className="hero-inner">
                        <p className="kicker">Panel administratora</p>
                        <h1 className="headline">
                            Zarządzanie <span className="accent">kursantami i umowami</span>
                        </h1>

                        {error ? <div className="alert show">{error}</div> : <div className="alert"/>}

                        <div className="forms" style={{gridTemplateColumns: '1fr', gap: 24}}>
                            <section className="formcard active">
                                <h2>Konto administratora</h2>
                                <p>Zalogowany użytkownik: {me?.email ?? '...'}</p>
                            </section>

                            <section className="formcard active">
                                <h2>Zmiana hasła</h2>
                                <p>Możesz zmienić hasło konta administratora.</p>

                                {passwordError ? <div className="alert show">{passwordError}</div> :
                                    <div className="alert"/>}
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

                                <button className="submit navy" type="button" onClick={createInstructor}>
                                    Utwórz instruktora
                                </button>
                            </section>

                            <section className="formcard active">
                                <h2>Kursanci</h2>
                                <p>Liczba kont kursantów: {students.length}</p>

                                <div style={{overflowX: 'auto'}}>
                                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                        <thead>
                                        <tr>
                                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Data</th>
                                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Email</th>
                                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Telefon</th>
                                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Rola</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {students.map((student) => (
                                            <tr key={student.id}>
                                                <td style={{
                                                    padding: '10px 8px',
                                                    borderTop: '1px solid rgba(255,255,255,.12)'
                                                }}>
                                                    {new Date(student.createdAt).toLocaleString('pl-PL')}
                                                </td>
                                                <td style={{
                                                    padding: '10px 8px',
                                                    borderTop: '1px solid rgba(255,255,255,.12)'
                                                }}>
                                                    {student.email}
                                                </td>
                                                <td style={{
                                                    padding: '10px 8px',
                                                    borderTop: '1px solid rgba(255,255,255,.12)'
                                                }}>
                                                    {student.phone ?? '—'}
                                                </td>
                                                <td style={{
                                                    padding: '10px 8px',
                                                    borderTop: '1px solid rgba(255,255,255,.12)'
                                                }}>
                                                    {student.role}
                                                </td>
                                            </tr>
                                        ))}

                                        {students.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    style={{
                                                        padding: '12px 8px',
                                                        borderTop: '1px solid rgba(255,255,255,.12)'
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

                            <section className="formcard active">
                                <h2>Instruktorzy</h2>
                                <p>Liczba kont instruktorów: {instructors.length}</p>

                                <div style={{overflowX: 'auto'}}>
                                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                                        <thead>
                                        <tr>
                                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Data</th>
                                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Email</th>
                                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Telefon</th>
                                            <th style={{textAlign: 'left', padding: '10px 8px'}}>Rola</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {instructors.map((instructor) => (
                                            <tr key={instructor.id}>
                                                <td style={{
                                                    padding: '10px 8px',
                                                    borderTop: '1px solid rgba(255,255,255,.12)'
                                                }}>
                                                    {new Date(instructor.createdAt).toLocaleString('pl-PL')}
                                                </td>
                                                <td style={{
                                                    padding: '10px 8px',
                                                    borderTop: '1px solid rgba(255,255,255,.12)'
                                                }}>
                                                    {instructor.email}
                                                </td>
                                                <td style={{
                                                    padding: '10px 8px',
                                                    borderTop: '1px solid rgba(255,255,255,.12)'
                                                }}>
                                                    {instructor.phone ?? '—'}
                                                </td>
                                                <td style={{
                                                    padding: '10px 8px',
                                                    borderTop: '1px solid rgba(255,255,255,.12)'
                                                }}>
                                                    {instructor.role}
                                                </td>
                                            </tr>
                                        ))}

                                        {instructors.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    style={{
                                                        padding: '12px 8px',
                                                        borderTop: '1px solid rgba(255,255,255,.12)'
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

                            <section className="formcard active">
                                <h2>Umowy</h2>
                                <p>Liczba plików umów: {contracts.length}</p>

                                <div style={{display: 'grid', gap: 12}}>
                                    {contracts.map((contract) => (
                                        <div
                                            key={contract.path}
                                            style={{
                                                border: '1px solid rgba(255,255,255,.12)',
                                                borderRadius: 16,
                                                padding: 14,
                                            }}
                                        >
                                            <div style={{marginBottom: 8, fontWeight: 700}}>{contract.fileName}</div>
                                            <div style={{fontSize: 14, opacity: 0.85, marginBottom: 8}}>
                                                Ścieżka: {contract.path}
                                            </div>
                                            <div style={{fontSize: 14, opacity: 0.85, marginBottom: 12}}>
                                                Ostatnia
                                                zmiana: {new Date(contract.updatedAt).toLocaleString('pl-PL')} |
                                                Rozmiar:{' '}
                                                {contract.size} B
                                            </div>

                                            <div style={{display: 'flex', gap: 10, flexWrap: 'wrap'}}>
                                                <button
                                                    className="submit navy"
                                                    type="button"
                                                    onClick={() => previewContract(contract.path)}
                                                    disabled={loadingPreview}
                                                    style={{width: 'auto', paddingInline: 18}}
                                                >
                                                    Podgląd
                                                </button>

                                                <button
                                                    className="submit"
                                                    type="button"
                                                    onClick={() => downloadContract(contract.path)}
                                                    style={{width: 'auto', paddingInline: 18}}
                                                >
                                                    Pobierz
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {contracts.length === 0 ? <p>Brak plików umów w folderze storage.</p> : null}
                                </div>
                            </section>

                            <section className="formcard active">
                                <h2>Podgląd umowy</h2>
                                <p>{selectedContract ? selectedContract.fileName : 'Wybierz umowę z listy.'}</p>

                                <div
                                    style={{
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                        fontSize: 14,
                                        lineHeight: 1.6,
                                        border: '1px solid rgba(255,255,255,.12)',
                                        borderRadius: 16,
                                        padding: 16,
                                        minHeight: 260,
                                        maxHeight: 560,
                                        overflow: 'auto',
                                    }}
                                >
                                    {loadingPreview
                                        ? 'Wczytywanie...'
                                        : selectedContract?.content || 'Brak wybranej umowy do podglądu.'}
                                </div>
                            </section>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}