'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const adminNavItems = [
    { href: '/admin', label: 'Panel główny' },
    { href: '/admin/dodaj-instruktora', label: 'Dodaj instruktora' },
    { href: '/admin/kursanci', label: 'Lista kursantów' },
    { href: '/admin/instruktorzy', label: 'Lista instruktorów' },
    { href: '/admin/umowy', label: 'Umowy' },
];

type Props = {
    children: ReactNode;
};

export function AdminShell({ children }: Props) {
    const pathname = usePathname();
    const router = useRouter();

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
        <div className="admin-page">
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
                        <p className="kicker">Panel administratora</p>
                        <h1 className="headline">
                            Zarządzanie <span className="accent">systemem</span>
                        </h1>

                        <nav className="admin-subnav" aria-label="Nawigacja administratora">
                            {adminNavItems.map((item) => {
                                const isActive = pathname === item.href;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`admin-subnav-link ${isActive ? 'active' : ''}`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="admin-content">{children}</div>
                    </div>
                </section>
            </main>
        </div>
    );
}