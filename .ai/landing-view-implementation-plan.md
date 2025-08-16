# Plan implementacji widoku Landing

## 1. Przegląd
Widok Landing to publiczna, lekka strona startowa dostępna dla niezalogowanych użytkowników. Celem jest szybkie przedstawienie wartości produktu i skierowanie użytkownika do logowania/rejestracji. Strona powinna być bardzo szybka (minimum JS), dostępna, responsywna (desktop-first) i wspierać i18n (PL/EN) z automatycznym wyborem na podstawie preferencji użytkownika oraz możliwością manualnej zmiany.

## 2. Routing widoku
- Ścieżka: `/`
- Plik strony: `src/pages/index.astro`
- Layout: `src/layouts/Layout.astro`

## 3. Struktura komponentów
```
src/pages/index.astro
  └── <Layout>
      └── <LandingHero />  (Astro)
          ├── <AuthButtons />         (Astro; linki do /auth/login, /auth/signup)
          ├── <LanguageSelector />    (React island – shadcn/ui Select; opcjonalnie Astro fallback)
          └── <FooterLinks />         (Astro; link do polityki itp.)
```

## 4. Szczegóły komponentów
### LandingHero
- Opis: Sekcja hero z tytułem, podtytułem, lekką animacją CSS oraz przyciskami akcji.
- Główne elementy: `section` z grid/flex, nagłówek `h1`, opis `p`, kontener przycisków, dekoracyjna animacja CSS (np. gradient/puls/shine).
- Obsługiwane interakcje: brak logiki poza kliknięciami w przyciski akcji; fokusowalność i kolejność tab.
- Obsługiwana walidacja: brak (treści statyczne). A11y: kontrast, `aria-hidden` dla elementów czysto dekoracyjnych.
- Typy: używa `LandingCopy` (ViewModel tekstów) i `LanguageCode`.
- Propsy: `{ copy: LandingCopy }`.

### AuthButtons
- Opis: Zestaw CTA: „Zaloguj” i „Zarejestruj”. Minimalny JS; linki kierują do ścieżek auth.
- Główne elementy: dwa linki (`a[href]`) stylowane przyciskami. Preferowane klasy Tailwind; alternatywnie `src/components/ui/button.tsx` jako wyspa React (nieobowiązkowe dla Landing, by ograniczyć JS).
- Obsługiwane interakcje: kliknięcia prowadzą do `/auth/login` i `/auth/signup`.
- Obsługiwana walidacja: brak.
- Typy: używa `LandingCopy` dla etykiet przycisków.
- Propsy: `{ copy: Pick<LandingCopy, "ctaLogin" | "ctaSignup"> }`.

### LanguageSelector
- Opis: Selektor języka PL/EN. Ustawia preferencję w `localStorage`, aktualizuje `document.documentElement.lang`, emituje zdarzenie niestandardowe dla ewentualnej warstwy i18n. UI oparte na shadcn/ui (Select) jako wyspa React. Zapewnić Astro fallback (prosty `select`) gdy JS wyłączony.
- Główne elementy: `select` lub shadcn `Select` z dwoma opcjami: „Polski (PL)” i „English (EN)”.
- Obsługiwane interakcje: `change` → zapis do `localStorage`, aktualizacja `lang`, ewentualnie odświeżenie kopii Landing.
- Obsługiwana walidacja: dozwolone tylko kody z `LanguageCode`.
- Typy: `LanguageCode`, `LanguageSelectorProps`.
- Propsy: `{ value: LanguageCode; onChange?: (lang: LanguageCode) => void }`.

### FooterLinks
- Opis: Stopka z linkiem do polityki prywatności/regulaminu (placeholder jeśli docelowa strona nie istnieje) i informacją o dostępności językowej.
- Główne elementy: `footer`, linki w `nav` lub `ul/li`.
- Obsługiwane interakcje: kliknięcie linku do polityki (np. `/privacy` lub zewnętrzny URL).
- Obsługiwana walidacja: brak.
- Typy: używa `LandingCopy` dla etykiet.
- Propsy: `{ copy: Pick<LandingCopy, "policy" | "languageLabel"> }`.

## 5. Typy
- LanguageCode: `'pl' | 'en'` – obsługiwane języki UI Landing.
- LandingCopy: ViewModel treści Landing dla aktywnego języka:
  - `title: string`
  - `subtitle: string`
  - `ctaLogin: string`
  - `ctaSignup: string`
  - `languageLabel: string`
  - `policy: string`

- LanguageSelectorProps:
  - `value: LanguageCode`
  - `onChange?: (lang: LanguageCode) => void`

- I18nDictionary: mapa język → `LandingCopy`:
  - `[lang in LanguageCode]: LandingCopy`

## 6. Zarządzanie stanem
- Źródło prawdy języka: `localStorage['app.lang']` (persist), domyślnie wykryty z `navigator.language` w przeglądarce (`pl` gdy zaczyna się od `pl-`, inaczej `en`).
- SSR: strona renderowana neutralnie (np. EN), a po hydracji wyspa `LanguageSelector` aktualizuje `document.documentElement.lang` i ewentualnie wymienia teksty na PL/EN poprzez warunkowe renderowanie w Astro z inline skryptem inicjalizacyjnym.
- Custom hook: `usePreferredLanguage()` (React) – odczyt/zapis do `localStorage`, nasłuch `storage` dla synchronizacji między kartami.
  - Zwraca: `{ language: LanguageCode, setLanguage: (l: LanguageCode) => void }`.

## 7. Integracja API
- Brak wywołań API w widoku Landing.
- Linki do istniejących ścieżek auth: `/auth/login`, `/auth/signup` (zgodnie z planem UI).

## 8. Interakcje użytkownika
- Klik „Zaloguj” → nawigacja do `/auth/login`.
- Klik „Zarejestruj” → nawigacja do `/auth/signup`.
- Zmiana języka w `LanguageSelector` → zapis preferencji, aktualizacja atrybutu `lang`, zaktualizowanie tekstów na stronie (bez przeładowania).

## 9. Warunki i walidacja
- LanguageSelector: akceptowane tylko wartości z `LanguageCode`. Przy wartości spoza zakresu – ignoruj i przywróć poprzednią.
- A11y/kontrast: upewnić się, że kolory i animacje nie naruszają `prefers-reduced-motion`; dekoracje mają `aria-hidden`.
- SSR vs klient: skrypt inicjujący powinien być odporny na brak `window`/`localStorage` (try/catch, feature detection).

## 10. Obsługa błędów
- `localStorage` niedostępny (tryb prywatny/ograniczenia): fallback do pamięci w runtime (state w hooku) i brak persistencji.
- Nieobsługiwany `navigator.language`: fallback do `en`.
- Brak docelowej strony polityki: link tymczasowo wskazuje `#` lub dokument w `public/`; dodać `rel="nofollow"` jeśli zewnętrzne.
- Konflikty stylów: ograniczyć animacje do klasy scopingowej (np. `.landing-hero`) i trzymać keyframes w `src/styles/global.css` z unikalną nazwą.

## 11. Kroki implementacji
1. Utwórz minimalny słownik i18n dla Landing:
   - Plik: `src/lib/i18n.ts` (lub `src/lib/i18n-landing.ts`) z typami: `LanguageCode`, `I18nDictionary`, `getInitialLanguage()` i `landingCopy` (PL/EN).
2. Dodaj hook `usePreferredLanguage` w `src/lib`:
   - Odczyt/zapis do `localStorage` z kluczem `app.lang` i walidacją wartości.
3. Zaimplementuj `LanguageSelector` w `src/components/Landing/LanguageSelector.tsx`:
   - shadcn/ui Select; props: `{ value, onChange }`.
   - Po zmianie: `setLanguage`, aktualizacja `document.documentElement.lang`.
   - Dostarcz fallback bez JS (prosty `<select>` w Astro w `index.astro`).
4. Zaimplementuj `AuthButtons` w `src/components/Landing/AuthButtons.astro`:
   - Dwa linki z klasami Tailwind; dostępne etykiety z `copy`.
5. Zaimplementuj `FooterLinks` w `src/components/Landing/FooterLinks.astro`:
   - Link do polityki (tymczasowo `/#privacy` lub `/privacy` jeżeli dostępne).
6. Zaimplementuj `LandingHero` w `src/components/Landing/LandingHero.astro`:
   - Struktura semantyczna (`section`, `h1`, `p`, kontener przycisków, miejsce na selektor języka).
   - Dodaj klasę z animacją tła/gradientu; definicję animacji zapisz w `src/styles/global.css` (np. `@keyframes heroGradientPulse`).
7. Strona `src/pages/index.astro`:
   - Użyj `Layout.astro`.
   - Załaduj kopię `copy` zgodnie z początkowym językiem (prosty inline skrypt do inicjacji języka przed malowaniem lub warunkowe klasy `data-lang`).
   - Renderuj: `<LandingHero copy={copy} />`, `<AuthButtons copy={copy} />`, `<LanguageSelector />`, `<FooterLinks copy={copy} />` (wg hierarchii sekcji).
8. A11y i responsywność:
   - Dodaj `lang` na `<html>`; dopasuj focus rings; sprawdź kontrast.
   - Obsłuż `prefers-reduced-motion`: wyłącz/ogranicz animacje.
9. Testy manualne:
   - Sprawdź brak błędów w konsoli, poprawność SSR/CSR, zachowanie selektora języka, nawigację przycisków.
10. Lint/format i przegląd:
   - Uruchom lintera i popraw ewentualne uwagi.

---

Notatki zgodności z PRD/UI planem:
- Zgodność z UI planem sekcji 2.1 Landing: ścieżka `/`, CTA „Zaloguj / Zarejestruj”, selektor języka, link do polityki, desktop-first, i18n wg `navigator.language`.
- Brak integracji z API; strona publiczna; gating pozostałych widoków przez middleware/guard poza zakresem Landing.


