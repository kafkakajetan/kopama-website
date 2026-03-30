'use client';

import {useRouter} from "next/navigation";
import {useEffect, useState} from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminContractsPage() {

    const router = useRouter();

    const [contracts, setContracts] = useState<ContractItem[]>([]);
    const [contractPreviews, setContractPreviews] = useState<Record<string, ContractPreview>>({});
    const [openedContractPath, setOpenedContractPath] = useState<string | null>(null);
    const [loadingPreviewPath, setLoadingPreviewPath] = useState<string | null>(null);
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

    const previewContract = async (contractPath: string) => {
        if (openedContractPath === contractPath) {
            setOpenedContractPath(null);
            return;
        }

        setError('');
        setOpenedContractPath(contractPath);

        if (contractPreviews[contractPath]) {
            return;
        }

        try {
            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL');

            setLoadingPreviewPath(contractPath);

            const res = await fetch(`${API_URL}/admin/contracts/view?path=${encodeURIComponent(contractPath)}`, {
                credentials: 'include',
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                const msg = body?.message ? String(body.message) : 'Nie udało się pobrać umowy.';
                throw new Error(msg);
            }

            const data = (await res.json()) as ContractPreview;
            setContractPreviews((prev) => ({
                ...prev,
                [contractPath]: data,
            }));
        } catch (e) {
            setOpenedContractPath(null);
            setError(e instanceof Error ? e.message : 'Błąd podglądu umowy');
        } finally {
            setLoadingPreviewPath((prev) => (prev === contractPath ? null : prev));
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

    useEffect(() => {
        loadContracts().catch((e) =>
            setError(e instanceof Error ? e.message : 'Błąd'),
        );
    }, []);

    return (
        <div className="forms" style={{ gridTemplateColumns: '1fr', gap: 24 }}>
            <section className="formcard active">
                <h2>Umowy</h2>
                <p>Liczba plików umów: {contracts.length}</p>

                <div style={{ display: 'grid', gap: 12 }}>
                    {contracts.map((contract) => {
                        const isOpen = openedContractPath === contract.path;
                        const isLoading = loadingPreviewPath === contract.path;
                        const preview = contractPreviews[contract.path];

                        return (
                            <div
                                key={contract.path}
                                className={`contract-card ${isOpen ? 'open' : ''}`}
                            >
                                <div style={{ marginBottom: 8, fontWeight: 700 }}>{contract.fileName}</div>

                                <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 8 }}>
                                    Ścieżka: {contract.path}
                                </div>

                                <div style={{ fontSize: 14, opacity: 0.85, marginBottom: 12 }}>
                                    Ostatnia zmiana: {new Date(contract.updatedAt).toLocaleString('pl-PL')} | Rozmiar:{' '}
                                    {contract.size} B
                                </div>

                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    <button
                                        className="submit navy"
                                        type="button"
                                        onClick={() => previewContract(contract.path)}
                                        disabled={isLoading}
                                        style={{ width: 'auto', paddingInline: 18 }}
                                    >
                                        {isOpen ? 'Zamknij podgląd' : 'Podgląd'}
                                    </button>

                                    <button
                                        className="submit"
                                        type="button"
                                        onClick={() => downloadContract(contract.path)}
                                        style={{ width: 'auto', paddingInline: 18 }}
                                    >
                                        Pobierz
                                    </button>
                                </div>

                                {isOpen ? (
                                    <div className="contract-preview">
                                        <div className="contract-preview-header">
                                            <strong>Podgląd umowy</strong>
                                            <span>
                                                                    {preview
                                                                        ? `${preview.fileName} • ${preview.size} B`
                                                                        : 'Wczytywanie treści...'}
                                                                </span>
                                        </div>

                                        <div className="contract-preview-body">
                                            {isLoading
                                                ? 'Wczytywanie...'
                                                : preview?.content || 'Brak treści podglądu.'}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}

                    {contracts.length === 0 ? <p>Brak plików umów w folderze storage.</p> : null}
                </div>
            </section>
        </div>
    );
}