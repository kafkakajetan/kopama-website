'use client';

import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Me = {
    role: 'ADMIN' | 'STUDENT' | 'INSTRUCTOR';
};

type ContractItem = {
    id: string;
    originalFileName: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    source: 'STUDENT' | 'ADMIN';
    enrollment: {
        id: string;
        firstName: string;
        lastName: string;
        courseMode: 'STATIONARY' | 'ELEARNING';
        courseCategory: {
            name: string;
        };
    };
};

type ContractTarget = {
    id: string;
    createdAt: string;
    firstName: string;
    lastName: string;
    courseMode: 'STATIONARY' | 'ELEARNING';
    courseCategory: {
        name: string;
    };
};

export default function AdminContractsPage() {

    const router = useRouter();

    const [contracts, setContracts] = useState<ContractItem[]>([]);
    const [error, setError] = useState('');
    const [targets, setTargets] = useState<ContractTarget[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [targetQuery, setTargetQuery] = useState('');
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
    const [uploading, setUploading] = useState(false);

    const loadContracts = async () => {
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

        const contractsRes = await fetch(`${API_URL}/admin/contracts`, {
            credentials: 'include',
        });

        if (contractsRes.status === 403) {
            router.push('/panel');
            return;
        }

        if (!contractsRes.ok) {
            throw new Error('Nie udało się pobrać listy umów.');
        }

        const contractsData = (await contractsRes.json()) as ContractItem[];
        setContracts(contractsData);
    };

    const loadContractTargets = async () => {
        if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

        const res = await fetch(`${API_URL}/admin/contracts/targets`, {
            credentials: 'include',
        });

        if (!res.ok) {
            throw new Error('Nie udało się pobrać listy zapisów.');
        }

        const data = (await res.json()) as ContractTarget[];
        setTargets(data);
    };

    const downloadContract = async (contractId: string, fileName: string) => {
        try {
            setError('');

            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const res = await fetch(`${API_URL}/admin/contracts/download?id=${encodeURIComponent(contractId)}`, {
                credentials: 'include',
            });

            if (!res.ok) {
                throw new Error('Nie udało się pobrać pliku.');
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd pobierania pliku');
        }
    };

    const uploadAdminContract = async (file: File | null) => {
        try {
            setError('');

            if (!file) return;
            if (!selectedEnrollmentId) {
                throw new Error('Wybierz kursanta i zapis.');
            }
            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            const formData = new FormData();
            formData.append('file', file);

            setUploading(true);

            const res = await fetch(
                `${API_URL}/contracts/admin/enrollments/${selectedEnrollmentId}/upload`,
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

            setIsAddModalOpen(false);
            setTargetQuery('');
            setSelectedEnrollmentId('');
            await loadContracts();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd uploadu umowy');
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        Promise.all([loadContracts(), loadContractTargets()]).catch((e) =>
            setError(e instanceof Error ? e.message : 'Błąd'),
        );
    }, []);

    const filteredTargets = targets.filter((target) => {
        const q = targetQuery.trim().toLowerCase();
        if (!q) return true;

        const haystack = [
            target.firstName,
            target.lastName,
            target.courseCategory.name,
            target.courseMode === 'ELEARNING' ? 'elearning' : 'stacjonarny',
        ]
            .join(' ')
            .toLowerCase();

        return haystack.includes(q);
    });

    return (
        <div className="forms" style={{ gridTemplateColumns: '1fr', gap: 24 }}>
            <section className="formcard active">
                <h2>Umowy</h2>
                <p>Liczba dodanych umów: {contracts.length}</p>

                <div style={{ marginBottom: 16 }}>
                    <button
                        className="submit navy"
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        style={{ width: 'auto', paddingInline: 18 }}
                    >
                        Dodaj umowę
                    </button>
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                    {contracts.map((contract) => (
                        <div
                            key={contract.id}
                            className="contract-card"
                        >
                            <div style={{ marginBottom: 8, fontWeight: 700, fontSize: 18 }}>
                                {contract.enrollment.firstName} {contract.enrollment.lastName}
                            </div>

                            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 6 }}>
                                <strong>Kategoria:</strong> {contract.enrollment.courseCategory.name}
                            </div>

                            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 6 }}>
                                <strong>Tryb kursu:</strong>{' '}
                                {contract.enrollment.courseMode === 'ELEARNING'
                                    ? 'e-learning'
                                    : 'stacjonarny'}
                            </div>

                            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 6 }}>
                                <strong>Plik:</strong> {contract.originalFileName}
                            </div>

                            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 12 }}>
                                <strong>Dodano:</strong> {new Date(contract.createdAt).toLocaleString('pl-PL')} |{' '}
                                <strong>Rozmiar:</strong> {contract.sizeBytes} B |{' '}
                                <strong>Źródło:</strong> {contract.source === 'STUDENT' ? 'kursant' : 'admin'}
                            </div>

                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button
                                    className="submit"
                                    type="button"
                                    onClick={() => downloadContract(contract.id, contract.originalFileName)}
                                    style={{ width: 'auto', paddingInline: 18 }}
                                >
                                    Pobierz
                                </button>
                            </div>
                        </div>
                    ))}

                    {contracts.length === 0 ? <p>Brak dodanych umów.</p> : null}
                </div>
                {isAddModalOpen ? (
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,.45)',
                            display: 'grid',
                            placeItems: 'center',
                            zIndex: 1000,
                            padding: 20,
                        }}
                    >
                        <div
                            style={{
                                width: '100%',
                                maxWidth: 760,
                                maxHeight: '85vh',
                                overflow: 'auto',
                                background: '#f3f4f6',
                                borderRadius: 20,
                                padding: 24,
                                color: '#111827',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 12,
                                    marginBottom: 16,
                                }}
                            >
                                <h3 style={{ margin: 0 }}>Dodaj umowę</h3>
                                <button
                                    type="button"
                                    className="submit"
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        setTargetQuery('');
                                        setSelectedEnrollmentId('');
                                    }}
                                    style={{ width: 'auto', paddingInline: 16 }}
                                >
                                    Zamknij
                                </button>
                            </div>

                            <label>Wyszukaj kursanta</label>
                            <input
                                value={targetQuery}
                                onChange={(e) => setTargetQuery(e.target.value)}
                                placeholder="Wpisz imię lub nazwisko"
                                style={{ marginBottom: 16 }}
                            />

                            <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
                                {filteredTargets.map((target) => (
                                    <label
                                        key={target.id}
                                        style={{
                                            display: 'block',
                                            border: selectedEnrollmentId === target.id
                                                ? '2px solid #0f3fb8'
                                                : '1px solid #d1d5db',
                                            borderRadius: 14,
                                            padding: 14,
                                            background: '#fff',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="selectedEnrollment"
                                            value={target.id}
                                            checked={selectedEnrollmentId === target.id}
                                            onChange={() => setSelectedEnrollmentId(target.id)}
                                            style={{ marginRight: 10 }}
                                        />
                                        <strong>{target.firstName} {target.lastName}</strong>
                                        <div style={{ fontSize: 14, marginTop: 6 }}>
                                            {target.courseCategory.name} •{' '}
                                            {target.courseMode === 'ELEARNING' ? 'e-learning' : 'stacjonarny'}
                                        </div>
                                        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                                            Zapis: {new Date(target.createdAt).toLocaleString('pl-PL')}
                                        </div>
                                    </label>
                                ))}

                                {filteredTargets.length === 0 ? (
                                    <div style={{ fontSize: 14, opacity: 0.75 }}>
                                        Brak pasujących zapisów.
                                    </div>
                                ) : null}
                            </div>

                            <label
                                className="submit navy"
                                style={{
                                    display: 'inline-block',
                                    width: 'auto',
                                    paddingInline: 18,
                                    cursor: !selectedEnrollmentId || uploading ? 'default' : 'pointer',
                                    opacity: !selectedEnrollmentId || uploading ? 0.7 : 1,
                                }}
                            >
                                {uploading ? 'Wgrywanie...' : 'Wybierz PDF i dodaj'}
                                <input
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    style={{ display: 'none' }}
                                    disabled={!selectedEnrollmentId || uploading}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        void uploadAdminContract(file);
                                        e.currentTarget.value = '';
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                ) : null}
            </section>
        </div>
    );
}