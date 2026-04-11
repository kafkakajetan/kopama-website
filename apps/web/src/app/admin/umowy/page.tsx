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

export default function AdminContractsPage() {

    const router = useRouter();

    const [contracts, setContracts] = useState<ContractItem[]>([]);
    const [error, setError] = useState('');

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

    useEffect(() => {
        loadContracts().catch((e) =>
            setError(e instanceof Error ? e.message : 'Błąd'),
        );
    }, []);

    return (
        <div className="forms" style={{ gridTemplateColumns: '1fr', gap: 24 }}>
            <section className="formcard active">
                <h2>Umowy</h2>
                <p>Liczba dodanych umów: {contracts.length}</p>

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
            </section>
        </div>
    );
}