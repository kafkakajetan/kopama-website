'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Image from "next/image";

type PriceRule = {
    customerType: 'PUBLIC' | 'KOPAMA_STUDENT';
    priceZloty: string;
    currency: string;
};

type CourseCategory = { id: string; code: string; name: string };

type CourseStartSlot = {
    id: string;
    startDate: string;
    courseCategoryId: string;
};

type OfferItem = {
    id: string;
    code: string;
    name: string;
    language: 'PL' | 'EN';
    type: 'COURSE' | 'EXTRA_HOUR' | 'EXAM_CAR' | 'TRAINING_PACKAGE' | 'OTHER';
    unit: 'PACKAGE' | 'HOUR' | 'SERVICE';
    isActive: boolean;
    courseCategory?: CourseCategory | null;
    priceRules: PriceRule[];
};

type CreateEnrollmentPayload = {
    offerItemCode: string;
    courseCategoryId: string;

    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    pesel: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode: string;

    birthDate: string;
    courseMode: 'STATIONARY' | 'ELEARNING';
    courseStartDate: string;

    hasOtherDrivingLicense: boolean;
    otherDrivingLicenseCategory: string;
    otherDrivingLicenseNumber: string;

    hasTramPermit: boolean;
    tramPermitNumber: string;

    wantsCashPayment: boolean;

    guardianSameAddress: boolean;

    guardianPesel: string;
    guardianFirstName: string;
    guardianLastName: string;
    guardianPhone: string;
    guardianAddressLine1: string;
    guardianAddressLine2?: string;
    guardianCity: string;
    guardianPostalCode: string;

    acceptedTerms: boolean;
    acceptedPrivacy: boolean;
    acceptedSalesTerms: boolean;
};

type CourseLanguage = 'PL' | 'EN';

type MockPayResult = {
    ok: true;
    enrollmentId: string;
    email: string;
    userCreated: boolean;
    tempPassword?: string;
    contractKey: string;
};

type CreateEnrollmentResult = {
    id: string;
    email: string;
    userCreated?: boolean;
    tempPassword?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

function formatPLN(priceZloty: string): string {
    const n = Number.parseFloat(priceZloty);
    if (Number.isNaN(n)) return `${priceZloty} PLN`;
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(n);
}

function digitsOnly(value: string): string {
    return value.replace(/\D/g, '');
}

function addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + months);
    if (d.getDate() !== day) d.setDate(0);
    return d;
}

function toDateInputValue(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function slotDateToInputValue(value: string): string {
    return value.slice(0, 10);
}

function formatCourseStartDateLabel(value: string): string {
    return new Date(value).toLocaleDateString('pl-PL', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

function isMinorOnDate(birth: Date, on: Date): boolean {
    const adultAt = addMonths(birth, 18 * 12);
    return on.getTime() < adultAt.getTime();
}

function formatPostalCode(value: string): string {
    const d = digitsOnly(value).slice(0, 5);
    if (d.length <= 2) return d;
    return `${d.slice(0, 2)}-${d.slice(2)}`;
}

function sanitizeCity(value: string): string {
    return value
        .replace(/[^A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż \-]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trimStart();
}

function formatPhonePl(value: string): string {
    const d = digitsOnly(value).slice(0, 9);
    return `+48${d}`;
}

function getPublicPrice(offer: OfferItem): string | null {
    const rule = offer.priceRules.find((r) => r.customerType === 'PUBLIC');
    return rule?.priceZloty ?? null;
}

function sanitizeEmail(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, '');
}

function Stepper({ current }: { current: 1 | 2 | 3 | 4 | 5}) {
    const steps: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];
    return (
        <ol className="kpProgress" aria-label="Postęp">
            {steps.map((s) => {
                const cls = s < current ? 'kpStep done' : s === current ? 'kpStep active' : 'kpStep';
                return (
                    <li key={s} className={cls}>
                        <span className="kpDot">{s}</span>
                    </li>
                );
            })}
        </ol>
    );
}

export default function ZapisPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [enrollmentId, setEnrollmentId] = useState<string>('');
    const [mockPay, setMockPay] = useState<MockPayResult | null>(null);
    const [cashAccount, setCashAccount] = useState<{
        email: string;
        userCreated: boolean;
        tempPassword?: string;
    } | null>(null);
    const [courseLanguage, setCourseLanguage] = useState<CourseLanguage>('PL');

    const [offers, setOffers] = useState<OfferItem[]>([]);
    const courseOffers = useMemo(
        () =>
            offers.filter(
                (o) => o.isActive && o.type === 'COURSE' && o.language === courseLanguage,
            ),
        [offers, courseLanguage],
    );

    const [availableStartSlots, setAvailableStartSlots] = useState<CourseStartSlot[]>([]);

    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

    const [form, setForm] = useState<CreateEnrollmentPayload>({
        offerItemCode: '',
        courseCategoryId: '',

        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        pesel: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        postalCode: '',

        birthDate: '',
        courseMode: 'STATIONARY',
        courseStartDate: '',

        hasOtherDrivingLicense: false,
        otherDrivingLicenseCategory: '',
        otherDrivingLicenseNumber: '',

        hasTramPermit: false,
        tramPermitNumber: '',

        wantsCashPayment: false,

        guardianSameAddress: false,
        guardianPesel: '',
        guardianFirstName: '',
        guardianLastName: '',
        guardianPhone: '',
        guardianAddressLine1: '',
        guardianAddressLine2: '',
        guardianCity: '',
        guardianPostalCode: '',

        acceptedTerms: false,
        acceptedPrivacy: false,
        acceptedSalesTerms: false,
    });

    const birth = form.birthDate ? new Date(form.birthDate) : null;
    const minor = birth && !Number.isNaN(birth.getTime()) ? isMinorOnDate(birth, new Date()) : false;
    const minCourseStart = birth ? addMonths(birth, 16 * 12 + 9) : null;
    const minCourseStartStr = minCourseStart ? toDateInputValue(minCourseStart) : '';

    useEffect(() => {
        const load = async () => {
            try {
                setError('');
                if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL w apps/web/.env.local')

                const res = await fetch(`${API_URL}/offers`, { cache: 'no-store' });
                if (!res.ok) throw new Error(`Nie udało się pobrać oferty (HTTP ${res.status})`);

                const data = (await res.json()) as OfferItem[];
                setOffers(data);

                const firstCourse = data.find(
                    (o) => o.isActive && o.type === 'COURSE' && o.language === 'PL',
                );
                if (!firstCourse) throw new Error('Brak aktywnych kursów w ofercie (OfferItem type=COURSE).');
                if (!firstCourse.courseCategory?.id) throw new Error(`Kurs "${firstCourse.name}" nie ma przypisanej kategorii.`);

                setForm((p) => ({
                    ...p,
                    offerItemCode: firstCourse.code,
                    courseCategoryId: firstCourse.courseCategory!.id,
                }));
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Błąd pobierania danych');
            } finally {
                setLoading(false);
            }
        };

        void load();
    }, []);

    const selectedOffer = useMemo(
        () => courseOffers.find((o) => o.code === form.offerItemCode) ?? null,
        [courseOffers, form.offerItemCode],
    );

    const isElearning = form.courseMode === 'ELEARNING';
    const isBAfterB1 = selectedOffer?.courseCategory?.code === 'B_AFTER_B1';
    const shouldShowOtherDrivingLicenseFields =
        isBAfterB1 || form.hasOtherDrivingLicense;

    useEffect(() => {
        if (courseOffers.length === 0) {
            setForm((prev) => ({
                ...prev,
                offerItemCode: '',
                courseCategoryId: '',
                courseStartDate: '',
            }));
            return;
        }

        const selected = courseOffers.find((o) => o.code === form.offerItemCode);
        if (selected?.courseCategory?.id) return;

        const first = courseOffers[0];
        if (!first.courseCategory?.id) return;

        setForm((prev) => ({
            ...prev,
            offerItemCode: first.code,
            courseCategoryId: first.courseCategory!.id,
            courseStartDate: '',
        }));
    }, [courseOffers, form.offerItemCode]);

    useEffect(() => {
        if (!form.offerItemCode) {
            setAvailableStartSlots([]);
            return;
        }

        loadStartSlots(form.offerItemCode).catch((e) =>
            setError(e instanceof Error ? e.message : 'Błąd pobierania terminów'),
        );
    }, [form.offerItemCode]);

    const filteredStartSlots = useMemo(() => {
        if (!minCourseStartStr) return availableStartSlots;

        return availableStartSlots.filter((slot) => {
            return slotDateToInputValue(slot.startDate) >= minCourseStartStr;
        });
    }, [availableStartSlots, minCourseStartStr]);

    useEffect(() => {
        const availableValues = filteredStartSlots.map((slot) =>
            slotDateToInputValue(slot.startDate),
        );

        if (availableValues.length === 0) {
            if (form.courseStartDate !== '') {
                set('courseStartDate', '');
            }
            return;
        }

        if (!availableValues.includes(form.courseStartDate)) {
            set('courseStartDate', '');
        }
    }, [filteredStartSlots, form.courseStartDate]);

    useEffect(() => {
        if (isElearning && form.courseStartDate) {
            set('courseStartDate', '');
        }
    }, [isElearning, form.courseStartDate]);

    const set = <K extends keyof CreateEnrollmentPayload>(key: K, value: CreateEnrollmentPayload[K]) => {
        setForm((p) => ({ ...p, [key]: value }));
    };

    const pickOffer = (offer: OfferItem) => {
        const catId = offer.courseCategory?.id;
        if (!catId) {
            setError(`Wybrany kurs "${offer.name}" nie ma przypisanej kategorii.`);
            return;
        }

        setError('');
        setForm((p) => ({
            ...p,
            offerItemCode: offer.code,
            courseCategoryId: catId,
            courseStartDate: '',
        }));
    };

    const loadStartSlots = async (offerItemCode: string) => {
        if (!API_URL || !offerItemCode) {
            setAvailableStartSlots([]);
            return;
        }

        const res = await fetch(
            `${API_URL}/course-start-slots/public?offerItemCode=${encodeURIComponent(offerItemCode)}`,
            { cache: 'no-store' },
        );

        if (!res.ok) {
            setAvailableStartSlots([]);
            return;
        }

        const data = (await res.json()) as CourseStartSlot[];
        setAvailableStartSlots(data);
    };

    const validateStep = (s: 1 | 2 | 3 | 4 | 5): string | null => {
        if (s === 1) {
            if (!form.offerItemCode) return 'Wybierz kurs.';
            return null;
        }

        if (s === 2) {
            if (!form.firstName || !form.lastName) return 'Uzupełnij imię i nazwisko.';
            if (!/^\+48\d{9}$/.test(form.phone)) return 'Telefon musi mieć format +48 i 9 cyfr.';
            if (!/^\d{11}$/.test(form.pesel)) return 'PESEL musi mieć 11 cyfr.';
            if (!/^\d{2}-\d{3}$/.test(form.postalCode)) return 'Kod pocztowy musi mieć format 00-000.';
            if (!isElearning && !form.courseStartDate) {
                return 'Wybierz termin rozpoczęcia kursu.';
            }
            if (!/^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż \-]{2,}$/.test(form.city)) return 'Nieprawidłowa nazwa miasta.';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) return 'Podaj poprawny adres e-mail.';
            if (!form.addressLine1 || !form.city || !form.postalCode) return 'Uzupełnij adres.';

            if (form.hasOtherDrivingLicense) {
                if (!form.otherDrivingLicenseCategory.trim()) {
                    return 'Podaj kategorię posiadanego prawa jazdy.';
                }
                if (!form.otherDrivingLicenseNumber.trim()) {
                    return 'Podaj numer posiadanego prawa jazdy.';
                }
            }

            if (form.hasTramPermit) {
                if (!form.tramPermitNumber.trim()) {
                    return 'Podaj numer uprawnień do kierowania tramwajem.';
                }
            }

            if (!form.acceptedTerms || !form.acceptedPrivacy) {
                return 'Zaakceptuj regulamin i politykę prywatności.';
            }

            return null;
        }

        if (s === 3) {
            if (!form.acceptedSalesTerms) return 'Zaakceptuj regulamin sprzedaży.';
            return null;
        }

        return null;
    };

    const next = () => {
        const msg = validateStep(step);
        if (msg) return setError(msg);
        setError('');
        setStep((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : prev === 3 ? 4 : 5));
    };

    const back = () => {
        setError('');
        setStep((prev) => (prev === 4 ? 3 : prev === 3 ? 2 : 1));
    };

    const submit = async () => {
        const msg = validateStep(3);
        if (msg) return setError(msg);

        try {
            setError('');
            if (!API_URL) throw new Error('Brak NEXT_PUBLIC_API_URL w apps/web/.env.local');

            const payload: Record<string, unknown> = {
                ...form,
                hasOtherDrivingLicense: isBAfterB1 || form.hasOtherDrivingLicense,
                otherDrivingLicenseCategory: isBAfterB1
                    ? 'B1'
                    : form.otherDrivingLicenseCategory.trim().toUpperCase(),
                otherDrivingLicenseNumber: form.otherDrivingLicenseNumber.trim(),
                tramPermitNumber: form.tramPermitNumber.trim(),
                pesel: digitsOnly(form.pesel).slice(0, 11),
                email: sanitizeEmail(form.email),
                postalCode: formatPostalCode(form.postalCode),
            };

            if (isElearning) {
                delete payload.courseStartDate;
            }

            if (!isElearning) {
                payload.courseStartDate = form.courseStartDate;
            }

            if (!isBAfterB1 && !form.hasOtherDrivingLicense) {
                delete payload.otherDrivingLicenseCategory;
                delete payload.otherDrivingLicenseNumber;
            }

            if (!form.hasTramPermit) {
                delete payload.tramPermitNumber;
            }

            if (!minor) {
                delete payload.guardianSameAddress;
                delete payload.guardianPesel;
                delete payload.guardianFirstName;
                delete payload.guardianLastName;
                delete payload.guardianPhone;
                delete payload.guardianAddressLine1;
                delete payload.guardianAddressLine2;
                delete payload.guardianCity;
                delete payload.guardianPostalCode;
            }

            const res = await fetch(`${API_URL}/enrollments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => null);
                const msg =
                    body?.message
                        ? Array.isArray(body.message)
                            ? body.message.join('\n')
                            : String(body.message)
                        : `Błąd zapisu (HTTP ${res.status})`;
                throw new Error(msg);
            }

            const createdRaw: unknown = await res.json();
            const created =
                createdRaw &&
                typeof createdRaw === 'object' &&
                'id' in createdRaw &&
                typeof (createdRaw as { id: unknown }).id === 'string'
                    ? (createdRaw as CreateEnrollmentResult)
                    : null;

            if (!created) throw new Error('Nie udało się odczytać id zapisu.');

            setEnrollmentId(created.id);

            if (form.wantsCashPayment) {
                setMockPay(null);
                setCashAccount({
                    email: created.email,
                    userCreated: created.userCreated === true,
                    tempPassword:
                        typeof created.tempPassword === 'string'
                            ? created.tempPassword
                            : undefined,
                });
                setStep(5);
                return;
            }

            setStep(4);

            const payRes = await fetch(`${API_URL}/enrollments/${created.id}/mock-pay`, {
                method: 'POST',
            });

            if (!payRes.ok) {
                const body = await payRes.json().catch(() => null);
                const msg =
                    body?.message
                        ? Array.isArray(body.message)
                            ? body.message.join('\n')
                            : String(body.message)
                        : `Błąd symulacji płatności (HTTP ${payRes.status})`;
                throw new Error(msg);
            }

            const payRaw: unknown = await payRes.json();
            const pay =
                payRaw &&
                typeof payRaw === 'object' &&
                'ok' in payRaw &&
                (payRaw as { ok: unknown }).ok === true
                    ? (payRaw as MockPayResult)
                    : null;

            if (!pay) throw new Error('Nieprawidłowa odpowiedź z mock-pay.');

            setMockPay(pay);
            setStep(5);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Błąd zapisu');
        }
    };

    return (
        <>
            <div className="nav">
                <Link className="brand" href="/start">
                    <Image src="/logo.png" alt="logo" height={100} width={200}/>
                </Link>

                <div className="nav-actions">
                    <Link className="pill navy" href="/start">
                        Wróć
                    </Link>
                    <a className="pill beige" href="https://kopama.pl/">
                        kopama.pl
                    </a>
                </div>
            </div>

            <main className="hero">
                <section className="shell">
                    <div className="hero-inner">
                        <h4 className="kicker">Zakup kursu online</h4>
                        <h1 className="headline">
                            Zapis na <span className="accent">kurs</span>
                        </h1>
                        <h4 className="subline">Wypełnij formularz, a następnie przejdź do płatności Przelewy24.</h4>

                        {loading ? (
                            <div className="wizPanel">
                                <p>Ładowanie…</p>
                            </div>
                        ) : (
                            <div className="wizPanel">
                                <Stepper current={step} />

                                <div className="wizHeader">
                                    <h2 className="wizTitle">
                                        {step === 1 && '1) Wybór kursu'}
                                        {step === 2 && '2) Dane kursanta'}
                                        {step === 3 && '3) Podsumowanie'}
                                        {step === 4 && '4) Płatność'}
                                        {step === 5 && '5) Zakończenie'}
                                    </h2>
                                    <p className="wizMeta">Krok {step} z 5</p>
                                </div>

                                {error && <p style={{ color: 'crimson', whiteSpace: 'pre-wrap', marginTop: 0 }}>{error}</p>}

                                {step === 1 && (
                                    <>
                                        <h2 className="wizMeta" style={{ marginTop: 0 }}>
                                            Wybierz wariant kursu. Cena dotyczy płatności online.
                                        </h2>

                                        <div style={{ display: 'flex', gap: 12, margin: '12px 0 20px' }}>
                                            <button
                                                type="button"
                                                className={`pill ${courseLanguage === 'PL' ? 'navy' : 'beige'}`}
                                                onClick={() => setCourseLanguage('PL')}
                                            >
                                                po polsku
                                            </button>

                                            <button
                                                type="button"
                                                className={`pill ${courseLanguage === 'EN' ? 'navy' : 'beige'}`}
                                                onClick={() => setCourseLanguage('EN')}
                                            >
                                                in English
                                            </button>
                                        </div>

                                        <div className="offerGrid">
                                            {courseOffers.map((o) => {
                                                const price = getPublicPrice(o);
                                                const selected = o.code === form.offerItemCode;
                                                return (
                                                    <button
                                                        key={o.id}
                                                        type="button"
                                                        className={`offerTile ${selected ? 'selected' : ''}`}
                                                        onClick={() => pickOffer(o)}
                                                        aria-pressed={selected}
                                                    >
                                                        <p className="offerName">{o.name}</p>
                                                        <p className="offerPrice">{price ? formatPLN(price) : 'Brak ceny'}</p>
                                                        <p className="offerHint">Kliknij, aby wybrać</p>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        <div className="wizActions">
                                            <div />
                                            <div className="wizActionsRight">
                                                <button type="button" className="pill navy" onClick={next}>
                                                    Dalej
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {step === 2 && (
                                    <>
                                        <div className="wizGrid2">
                                            <div>
                                                <label>Imię</label>
                                                <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
                                            </div>
                                            <div>
                                                <label>Nazwisko</label>
                                                <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
                                            </div>
                                        </div>

                                        <div className="wizGrid2">
                                            <div>
                                                <label>Email</label>
                                                <input
                                                    type="email"
                                                    value={form.email}
                                                    onChange={(e) => set('email', sanitizeEmail(e.target.value))}
                                                    autoComplete="email"
                                                    inputMode="email"
                                                    placeholder="np. jan.kowalski@example.com"
                                                />
                                            </div>
                                            <div>
                                                <label>Telefon</label>
                                                <input
                                                    value={form.phone.startsWith('+48') ? form.phone.slice(3) : digitsOnly(form.phone).slice(0, 9)}
                                                    onChange={(e) => set('phone', formatPhonePl(e.target.value))}
                                                    inputMode="numeric"
                                                    autoComplete="tel"
                                                    placeholder="123456789"
                                                    maxLength={9}
                                                />
                                            </div>
                                        </div>

                                        <div className="wizGrid2">
                                            <div>
                                                <label>Data urodzenia</label>
                                                <input
                                                    type="date"
                                                    value={form.birthDate}
                                                    onChange={(e) => set('birthDate', e.target.value)}
                                                    max={toDateInputValue(new Date())}
                                                />
                                            </div>
                                            <div>
                                                <label>Tryb kursu</label>
                                                <div className="kpSelectWrap">
                                                    <select
                                                        className="kpSelect"
                                                        value={form.courseMode}
                                                        onChange={(e) => set('courseMode', e.target.value as 'STATIONARY' | 'ELEARNING')}
                                                    >
                                                        <option value="STATIONARY">Kurs stacjonarny</option>
                                                        <option value="ELEARNING">Kurs e-learning</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label>Termin rozpoczęcia kursu</label>
                                            <div className="kpSelectWrap">
                                                <select
                                                    className="kpSelect"
                                                    value={form.courseStartDate}
                                                    onChange={(e) => set('courseStartDate', e.target.value)}
                                                    disabled={isElearning || filteredStartSlots.length === 0}
                                                >
                                                    <option value="">
                                                        {isElearning
                                                            ? 'Termin nie dotyczy kursu e-learning'
                                                            : filteredStartSlots.length > 0
                                                                ? 'Wybierz termin kursu'
                                                                : 'Brak dostępnych terminów'}
                                                    </option>

                                                    {filteredStartSlots.map((slot) => (
                                                        <option
                                                            key={slot.id}
                                                            value={slotDateToInputValue(slot.startDate)}
                                                        >
                                                            {new Date(slot.startDate).toLocaleDateString('pl-PL')}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {isElearning ? (
                                                <p className="kpSelectHint">
                                                    Dla kursu e-learning termin rozpoczęcia nie jest wymagany na tym etapie.
                                                </p>
                                            ) : filteredStartSlots.length === 0 ? (
                                                <p className="kpSelectHint">
                                                    Brak dostępnych terminów dla wybranego kursu.
                                                </p>
                                            ) : null}
                                        </div>

                                        <div className="wizGrid2">
                                            <div>
                                                <label>PESEL</label>
                                                <input
                                                    value={form.pesel}
                                                    onChange={(e) => set('pesel', digitsOnly(e.target.value).slice(0, 11))}
                                                    inputMode="numeric"
                                                    maxLength={11}
                                                    placeholder="11 cyfr"
                                                />
                                            </div>
                                            <div>
                                                <label>Kod pocztowy</label>
                                                <input
                                                    value={formatPostalCode(form.postalCode)}
                                                    onChange={(e) => set('postalCode', formatPostalCode(e.target.value))}
                                                    inputMode="numeric"
                                                    autoComplete="postal-code"
                                                    placeholder="00-000"
                                                    maxLength={6}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label>Adres (ulica i numer)</label>
                                            <input value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} />
                                        </div>

                                        <div>
                                            <label>Adres cd. (opcjonalnie)</label>
                                            <input value={form.addressLine2 ?? ''} onChange={(e) => set('addressLine2', e.target.value)} />
                                        </div>

                                        <div>
                                            <label>Miasto</label>
                                            <input
                                                value={form.city}
                                                onChange={(e) => set('city', sanitizeCity(e.target.value))}
                                                autoComplete="address-level2"
                                                placeholder="np. Warszawa"
                                            />
                                        </div>

                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                                gap: 12,
                                                marginTop: 16,
                                            }}
                                        >
                                            <label className="check" style={{ margin: 0 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={isBAfterB1 || form.hasOtherDrivingLicense}
                                                    disabled={isBAfterB1}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        set('hasOtherDrivingLicense', checked);
                                                        if (!checked) {
                                                            set('otherDrivingLicenseCategory', '');
                                                            set('otherDrivingLicenseNumber', '');
                                                        }
                                                    }}
                                                />
                                                {isBAfterB1
                                                    ? 'Posiadam już prawo jazdy kategorii B1'
                                                    : 'Posiadam już prawo jazdy innej kategorii'}
                                                {!isBAfterB1 && (
                                                    <span style={{ marginLeft: 6, color: '#8a8a8a' }}>(opcjonalnie)</span>
                                                )}
                                            </label>

                                            <label className="check" style={{ margin: 0 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.hasTramPermit}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        set('hasTramPermit', checked);
                                                        if (!checked) {
                                                            set('tramPermitNumber', '');
                                                        }
                                                    }}
                                                />
                                                Posiadam uprawnienia do kierowania tramwajem
                                                {!isBAfterB1 && (
                                                    <span style={{ marginLeft: 6, color: '#8a8a8a' }}>(opcjonalnie)</span>
                                                )}
                                            </label>
                                        </div>

                                        {shouldShowOtherDrivingLicenseFields && (
                                            <div className="wizGrid2" style={{ marginTop: 10 }}>
                                                <div>
                                                    <label>Kategoria posiadanego prawa jazdy</label>
                                                    <input
                                                        value={isBAfterB1 ? 'B1' : form.otherDrivingLicenseCategory}
                                                        onChange={(e) => set('otherDrivingLicenseCategory', e.target.value.toUpperCase())}
                                                        placeholder="np. B, C, D"
                                                        disabled={isBAfterB1}
                                                    />
                                                </div>
                                                <div>
                                                    <label>{isBAfterB1 ? 'Numer prawa jazdy kategorii B1' : 'Numer prawa jazdy'}</label>
                                                    <input
                                                        value={form.otherDrivingLicenseNumber}
                                                        onChange={(e) => set('otherDrivingLicenseNumber', e.target.value)}
                                                        placeholder="Wpisz numer prawa jazdy"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {form.hasTramPermit && (
                                            <div style={{ marginTop: 10 }}>
                                                <label>Numer uprawnień do kierowania tramwajem</label>
                                                <input
                                                    value={form.tramPermitNumber}
                                                    onChange={(e) => set('tramPermitNumber', e.target.value)}
                                                    placeholder="Wpisz numer uprawnień"
                                                />
                                            </div>
                                        )}

                                        <div
                                            style={{
                                                marginTop: 14,
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                                gap: 12,
                                            }}
                                        >
                                            <label
                                                className="check"
                                                style={{
                                                    margin: 0,
                                                    border: '1px solid #d32f2f',
                                                    borderRadius: 12,
                                                    padding: '12px 14px',
                                                    background: '#fff5f5',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.acceptedTerms}
                                                    onChange={(e) => set('acceptedTerms', e.target.checked)}
                                                />
                                                Akceptuję regulamin
                                            </label>

                                            <label
                                                className="check"
                                                style={{
                                                    margin: 0,
                                                    border: '1px solid #d32f2f',
                                                    borderRadius: 12,
                                                    padding: '12px 14px',
                                                    background: '#fff5f5',
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.acceptedPrivacy}
                                                    onChange={(e) => set('acceptedPrivacy', e.target.checked)}
                                                />
                                                Akceptuję politykę prywatności
                                            </label>
                                        </div>

                                        {minor && (
                                            <div style={{ marginTop: 12 }}>
                                                <p className="wizMeta" style={{ marginTop: 0 }}>
                                                    Uwaga: osoba niepełnoletnia. Umowa wymaga podpisu opiekuna prawnego.
                                                </p>

                                                <div className="wizGrid2">
                                                    <div>
                                                        <label>PESEL opiekuna</label>
                                                        <input
                                                            value={form.guardianPesel}
                                                            onChange={(e) => set('guardianPesel', digitsOnly(e.target.value).slice(0, 11))}
                                                            inputMode="numeric"
                                                            maxLength={11}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label>Telefon opiekuna</label>
                                                        <input
                                                            value={form.guardianPhone.startsWith('+48') ? form.guardianPhone.slice(3) : digitsOnly(form.guardianPhone).slice(0, 9)}
                                                            onChange={(e) => set('guardianPhone', formatPhonePl(e.target.value))}
                                                            inputMode="numeric"
                                                            maxLength={9}
                                                            placeholder="123456789"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="wizGrid2">
                                                    <div>
                                                        <label>Imię opiekuna</label>
                                                        <input value={form.guardianFirstName} onChange={(e) => set('guardianFirstName', e.target.value)} />
                                                    </div>
                                                    <div>
                                                        <label>Nazwisko opiekuna</label>
                                                        <input value={form.guardianLastName} onChange={(e) => set('guardianLastName', e.target.value)} />
                                                    </div>
                                                </div>

                                                <label className="check" style={{ margin: '10px 0 0' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={form.guardianSameAddress}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            set('guardianSameAddress', checked);
                                                            if (checked) {
                                                                set('guardianAddressLine1', form.addressLine1);
                                                                set('guardianAddressLine2', form.addressLine2 ?? '');
                                                                set('guardianCity', form.city);
                                                                set('guardianPostalCode', form.postalCode);
                                                            }
                                                        }}
                                                    />
                                                    Dane adresowe opiekuna takie same jak kursanta
                                                </label>

                                                <div className="wizGrid2" style={{ marginTop: 10 }}>
                                                    <div>
                                                        <label>Adres opiekuna (ulica i numer)</label>
                                                        <input
                                                            value={form.guardianAddressLine1}
                                                            onChange={(e) => set('guardianAddressLine1', e.target.value)}
                                                            disabled={form.guardianSameAddress}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label>Adres cd. (opcjonalnie)</label>
                                                        <input
                                                            value={form.guardianAddressLine2 ?? ''}
                                                            onChange={(e) => set('guardianAddressLine2', e.target.value)}
                                                            disabled={form.guardianSameAddress}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="wizGrid2">
                                                    <div>
                                                        <label>Miasto opiekuna</label>
                                                        <input
                                                            value={form.guardianCity}
                                                            onChange={(e) => set('guardianCity', sanitizeCity(e.target.value))}
                                                            disabled={form.guardianSameAddress}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label>Kod pocztowy opiekuna</label>
                                                        <input
                                                            value={formatPostalCode(form.guardianPostalCode)}
                                                            onChange={(e) => set('guardianPostalCode', formatPostalCode(e.target.value))}
                                                            inputMode="numeric"
                                                            maxLength={6}
                                                            placeholder="00-000"
                                                            disabled={form.guardianSameAddress}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ marginTop: 16 }}>
                                            <label className="check" style={{ margin: 0 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.wantsCashPayment}
                                                    onChange={(e) => set('wantsCashPayment', e.target.checked)}
                                                />
                                                Chciałbym uiścić płatność gotówką
                                            </label>
                                        </div>

                                        <div className="wizActions">
                                            <button type="button" className="pill beige" onClick={back}>
                                                Wstecz
                                            </button>
                                            <div className="wizActionsRight">
                                                <button type="button" className="pill navy" onClick={next}>
                                                    Dalej
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {step === 3 && (
                                    <>
                                        <p className="wizMeta" style={{ marginTop: 0 }}>
                                            Sprawdź dane. Przed zakończeniem zapisu wymagamy akceptacji regulaminu sprzedaży.
                                        </p>

                                        <div className="wizGrid2">
                                            <div>
                                                <p className="wizMeta"><strong>Kurs:</strong> {selectedOffer?.name ?? form.offerItemCode}</p>
                                                <p className="wizMeta"><strong>Email:</strong> {form.email}</p>
                                                <p className="wizMeta"><strong>Termin:</strong> {form.courseStartDate ? formatCourseStartDateLabel(form.courseStartDate) : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="wizMeta"><strong>Imię i nazwisko:</strong> {form.firstName} {form.lastName}</p>
                                                <p className="wizMeta"><strong>Telefon:</strong> {form.phone}</p>
                                                <p className="wizMeta">
                                                    <strong>Sposób płatności:</strong> {form.wantsCashPayment ? 'gotówka' : 'online'}
                                                </p>
                                            </div>
                                        </div>

                                        {form.hasOtherDrivingLicense && (
                                            <div style={{ marginTop: 10 }}>
                                                <p className="wizMeta">
                                                    <strong>Prawo jazdy innej kategorii:</strong> tak
                                                </p>
                                                <p className="wizMeta">
                                                    <strong>Kategoria:</strong> {form.otherDrivingLicenseCategory}
                                                </p>
                                                <p className="wizMeta">
                                                    <strong>Numer prawa jazdy:</strong> {form.otherDrivingLicenseNumber}
                                                </p>
                                            </div>
                                        )}

                                        {form.hasTramPermit && (
                                            <div style={{ marginTop: 10 }}>
                                                <p className="wizMeta">
                                                    <strong>Uprawnienia do kierowania tramwajem:</strong> tak
                                                </p>
                                                <p className="wizMeta">
                                                    <strong>Numer uprawnień:</strong> {form.tramPermitNumber}
                                                </p>
                                            </div>
                                        )}

                                        <div style={{ marginTop: 10 }}>
                                            <label className="check" style={{ margin: 0 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.acceptedSalesTerms}
                                                    onChange={(e) => set('acceptedSalesTerms', e.target.checked)}
                                                />
                                                Potwierdzam zapoznanie się z regulaminem sprzedaży
                                            </label>
                                        </div>

                                        <div className="wizActions">
                                            <button type="button" className="pill beige" onClick={back}>
                                                Wstecz
                                            </button>
                                            <div className="wizActionsRight">
                                                <button type="button" className="pill navy" onClick={submit}>
                                                    {form.wantsCashPayment ? 'Zakończ zapis' : 'Przejdź do płatności'}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {step === 4 && (
                                    <>
                                        <p className="wizMeta" style={{ marginTop: 0 }}>
                                            Zapis został utworzony. W kolejnym kroku przekierujemy Cię do płatności Przelewy24.
                                        </p>
                                        {enrollmentId && (
                                            <p className="wizMeta">
                                                ID zapisu: <strong>{enrollmentId}</strong>
                                            </p>
                                        )}

                                        <div className="wizActions">
                                            <button type="button" className="pill beige" onClick={() => setStep(3)}>
                                                Wstecz
                                            </button>
                                            <div className="wizActionsRight">
                                                <button type="button" className="pill navy" disabled>
                                                    Płatność (wkrótce)
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {step === 5 && (
                                    <>
                                        {form.wantsCashPayment ? (
                                            <>
                                                <p className="wizMeta" style={{ marginTop: 0 }}>
                                                    Zapis został zakończony. Wybrano płatność gotówką, więc etap płatności online został pominięty.
                                                </p>

                                                {cashAccount?.userCreated && cashAccount.tempPassword ? (
                                                    <p className="wizMeta">
                                                        Dane do logowania: <strong>{cashAccount.email}</strong> / <strong>{cashAccount.tempPassword}</strong>
                                                    </p>
                                                ) : (
                                                    <p className="wizMeta">
                                                        Konto kursanta jest powiązane z emailem: <strong>{cashAccount?.email ?? form.email}</strong>
                                                    </p>
                                                )}

                                                <p className="wizMeta">
                                                    Po zalogowaniu kursant będzie mógł dodać umowę w panelu.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="wizMeta" style={{ marginTop: 0 }}>
                                                    Płatność została potwierdzona. Możesz teraz zalogować się do panelu kursanta lub wrócić na stronę główną.
                                                </p>

                                                {mockPay?.userCreated && mockPay.tempPassword ? (
                                                    <p className="wizMeta">
                                                        Dane testowe do logowania: <strong>{mockPay.email}</strong> / <strong>{mockPay.tempPassword}</strong>
                                                    </p>
                                                ) : (
                                                    <p className="wizMeta">
                                                        Email konta: <strong>{mockPay?.email}</strong>
                                                    </p>
                                                )}
                                            </>
                                        )}

                                        <div className="wizActions">
                                            <Link className="pill beige" href="/start">
                                                Wróć na stronę główną
                                            </Link>

                                            <div className="wizActionsRight">
                                                <Link className="pill navy" href="/logowanie">
                                                    Zaloguj się do panelu
                                                </Link>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </>
    );
}