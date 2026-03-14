import Link from 'next/link';

export default function StartPage() {
    return (
        <>
            <div className="nav">
                <Link className="brand" href="/start">
                    <div className="logo">K</div>
                    <div className="title">
                        <strong>KopaMa – Panel</strong>
                        <span>Logowanie / Zapis na kurs</span>
                    </div>
                </Link>

                <div className="nav-actions">
                    <Link className="pill beige" href="/zapis">
                        Zapisz się na kurs
                    </Link>
                    <a className="pill navy" href="https://kopama.pl/">
                        Wróć na kopama.pl
                    </a>
                </div>
            </div>

            <main className="hero">
                <section className="shell">
                    <div className="hero-inner">
                        <div className="startIntro">
                            <p className="kicker">Zintegrowany system rejestracji i obsługi kursanta</p>

                            <h1 className="headline">
                                Z Nami <span className="accent">Nauka</span>
                                <br />
                                Nabiera <span className="accent">TEMPA.</span>
                            </h1>

                            <p className="subline">
                                Kup kurs online w kilka minut. Po potwierdzeniu płatności utworzymy konto kursanta i prześlemy umowę w PDF
                                oraz link do ePUAP i link do przesłania podpisanej umowy w panelu.
                            </p>
                        </div>

                        <div className="startWrap">
                            <div className="startChoice">
                                {/* LEWA: LOGOWANIE */}
                                <section className="startCard">
                                    <span className="startBadge">Dla kursantów</span>

                                    <div className="startCardBody">
                                        <h2 className="startTitle">Zaloguj się do panelu</h2>
                                        <p className="startDesc">
                                            Jeśli kupiłeś już kurs i masz aktywne konto, zaloguj się, aby przejść do panelu kursanta.
                                        </p>

                                        <div className="startDivider" />

                                        <span className="startCtaHint">
        Nie pamiętasz dostępu? Skorzystaj z opcji odzyskiwania hasła (dodamy w module logowania).
      </span>
                                    </div>

                                    <div className="startCtaRow">
                                        <Link className="submit navy" href="/logowanie">
                                            Przejdź do logowania
                                        </Link>
                                    </div>
                                </section>

                                {/* PRAWA: ZAPIS */}
                                <section className="startCard startCardPrimary">
                                    <span className="startBadge">Rekomendowane</span>

                                    <div className="startCardBody">
                                        <h2 className="startTitle">Zapisz się na kurs</h2>
                                        <p className="startDesc">
                                            Wybierz wariant kursu, uzupełnij dane i opłać zamówienie przez Przelewy24. Konto kursanta tworzymy automatycznie po płatności.
                                        </p>

                                        <ul className="startSteps">
                                            <li>Wybór kursu i uzupełnienie danych</li>
                                            <li>Płatność online (Przelewy24)</li>
                                            <li>E-mail: umowa PDF + link do ePUAP + link do uploadu umowy</li>
                                            <li>Po utworzeniu konta: dostęp do panelu kursanta</li>
                                        </ul>

                                        <span className="startCtaHint">
        Czas wypełnienia: ok. 2–3 min. Dane są weryfikowane po stronie systemu.
      </span>
                                    </div>

                                    <div className="startCtaRow">
                                        <Link className="submit beige" href="/zapis">
                                            Przejdź do zapisu
                                        </Link>
                                    </div>
                                </section>
                            </div>

                            <p className="startFootnote">
                                Po opłaceniu kursu prosimy o podpisanie umowy (ePUAP lub wydruk) i przesłanie podpisanego dokumentu przez panel.
                                Dopiero wtedy biuro może rozpocząć pełną obsługę Twojego kursu.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        </>
    );
}