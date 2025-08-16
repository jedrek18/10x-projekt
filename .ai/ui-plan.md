# Architektura UI dla Fiszki AI (MVP)

## 1. Przegląd struktury UI

**Cel produktu:** szybkie przejście od surowego tekstu do gotowych fiszek i nauki zgodnie z harmonogramem SRS. Aplikacja web, desktop-first, z minimalnym kontem (email+hasło).

**Kluczowe wymagania z PRD (esencja dla UI):**

* Generacja z tekstu 1000–10000 znaków; suwak 10–50 (domyślnie 30); strumieniowanie wyników; akcje na liście dopiero po zakończeniu batcha. (FR-001–FR-006, US-001–US-003, US-022)
* Walidacje front ≤200 i back ≤500, liczniki znaków w czasie rzeczywistym. (FR-005, FR-017, US-002, US-007)
* Propozycje **nie** są zapisywane na backendzie; cache lokalny (LocalStorage) 24 h z auto-przywróceniem i auto-czyszczeniem po zapisie/TTL; jedna aktywna sesja propozycji. (FR-007–FR-008, US-004, notatki)
* Akcje hurtowe: zapisz zaakceptowane/wszystkie, odrzuć wszystkie, zaznacz/odznacz wszystkie. (FR-006, US-003)
* „Moje fiszki” z paginacją 25/str., sort: najnowsze → najstarsze; edycja/usuwanie po zapisie. (FR-009, US-006, US-020, US-026)
* Manualne dodawanie fiszki przez modal. (FR-010, US-007)
* Nauka: kolejka dnia = due → do 10 nowych (limit z ustawień), cel dzienny 20, ocena kart jak w Anki. (FR-011–FR-013, FR-012, US-008–US-010)
* CTA „Rozpocznij naukę teraz” po zapisie. (FR-014, US-008)
* Auth: rejestracja/login, 7-dniowe sesje, wielosesyjność; zmiana hasła i usunięcie konta. (FR-015–FR-016, US-011–US-013, US-018)
* Dostęp tylko dla zalogowanych do generacji, zapisu i nauki; gość: landing + auth. (FR-024)
* Telemetria i KPI (generation/save + źródło: manual/ai/ai\_edited). (FR-018, FR-023, US-014, US-030)
* A11y: widoczne stany ładowania, aria-live, skróty klawiaturowe; tryb wysokiego kontrastu; nawigacja klawiaturą. (FR-021–FR-022, FR-019, FR-021, US-019)
* Stany błędów/offline: informowanie, odporność w nauce (outbox ocen), brak automatycznych powtórzeń generacji. (FR-020, US-015, US-029)

**Globalne założenia UX/A11y/Security:**

* **Desktop-first**, responsywność na tablet; LTR.
* **i18n:** PL/EN (UI), treści fiszek bez wymuszania języka.
* **A11y:** focus-visible, aria-live dla toastów/banerów, pełna klawiszologia w Proposals i Study; „Pomoc/skróty” pod `?`/`h`.
* **Security:** widoki chronione za AuthGuard; token JWT w pamięci przeglądarki; twarde bramkowanie operacji zapisu/nauki/generacji; obsługa 401 (wymuszenie logowania, bez utraty stanu lokalnego).
* **Odporność/offline:** globalny baner offline; nauka działa na ostatniej kolejce (cache w IndexedDB); oceny kolejkowane (outbox).

---

## 2. Lista widoków

### 2.1 Landing

* **Ścieżka:** `/`
* **Główny cel:** prezentacja wartości i wejście do logowania/rejestracji.
* **Kluczowe informacje:** krótki opis, CTA „Zaloguj / Zarejestruj”.
* **Kluczowe komponenty:** Hero z animacją CSS, przyciski auth, selektor języka, link do polityki.
* **UX/A11y/Security:** proste, szybkie; dostępne z klawiatury; brak dostępu do sekcji chronionych; i18n przełączane wg `navigator.language`.

---

### 2.2 Autoryzacja (Logowanie/Rejestracja)

* **Ścieżki:** `/auth/login`, `/auth/signup`
* **Główny cel:** uzyskać sesję 7-dniową.
* **Kluczowe informacje:** pola email/hasło, walidacje, komunikaty błędów.
* **Kluczowe komponenty:** Formularz login/signup, link do zmiany hasła (MVP: tylko „zmiana” po zalogowaniu), toast wyników.
* **UX/A11y/Security:** maskowanie hasła, menedżery haseł, informacja o 7-dniowej sesji; po sukcesie redirect do „Moje fiszki” lub powrót do akcji źródłowej (deep-link).
* **API użyte:** `POST /api/auth/signin`, `POST /api/auth/signup`.

---

### 2.3 Generate (Wejście do generacji)

* **Ścieżka:** `/generate`
* **Główny cel:** wkleić tekst i uruchomić generację propozycji.
* **Kluczowe informacje:** licznik znaków (1000–10000), suwak 10–50 (domyślnie 30), komunikaty walidacji.
* **Kluczowe komponenty:**

  * **TextAreaWithCounter** (walidacja, licznik graphemów)
  * **SliderProposalsCount** (10–50, pamiętany lokalnie)
  * **GenerateButton / CancelButton**
  * **GenerationStatus** (skeletony od startu; po 5 s bez eventu – fallback REST ze spinnerem)
  * **OneActiveSessionGuard** (modal potwierdzenia, że nowa generacja skasuje poprzednią sesję propozycji)
* **UX/A11y/Security:** blokada „Generuj” gdy <1000 lub >10000; aria-live dla błędów; skrót `Ctrl+Enter` do startu; dostęp tylko dla zalogowanych (gość → redirect do `/auth/login` z powrotem).
* **API użyte:** `POST /api/ai/generate` (SSE z fallbackiem).
* **Powiązane FR/US:** FR-001–FR-004, FR-021–FR-022, FR-024; US-001, US-022, US-024.

---

### 2.4 Proposals (Przegląd propozycji)

* **Ścieżka:** `/proposals`
* **Główny cel:** przejrzeć batch, zaakceptować/edytować/usunąć, wykonać akcje hurtowe, zapisać.
* **Kluczowe informacje:** lista pozycji w kolejności napływu, liczba odebranych, status batcha, zaznaczenia.
* **Kluczowe komponenty:**

  * **ProposalList** (progressive reveal, skeletony → elementy; akcje odblokowane po `done`)
  * **ProposalCard** (front/back, liczniki, przyciski: Accept, Edit, Delete)
  * **ProposalEditor** (modal/inline z walidacją; edycja ⇒ auto-accept i `source=ai_edited`)
  * **BulkActionsBar** (Zaznacz/odznacz wszystkie; Zapisz zaakceptowane; Zapisz wszystkie; Odrzuć wszystkie)
  * **LocalCacheBadge** (info o przywróceniu z cache i TTL)
  * **SaveResultModal** (sukces + CTA „Idź do nauki”)
  * **DuplicatesBanner** (wyniki `skipped` z powodami)
* **UX/A11y/Security:** nawigacja klawiaturą po kartach; skróty (Enter = Accept, `e` = Edit, `Del` = Delete; z modyfikatorami dla hurtowych); aria-live dla toasts; czyszczenie LocalStorage po zapisie/TTL; brak utrwalania propozycji na backendzie; dostęp tylko dla zalogowanych.
* **API użyte:** `POST /api/flashcards:batch-save` (z `Idempotency-Key`), opcjonalnie `POST /api/events` (manualne logi), side-effect telemetry po stronie serwera.
* **Powiązane FR/US:** FR-004–FR-009, FR-017–FR-018, FR-023–FR-025; US-002–US-005, US-017, US-030.

---

### 2.5 Flashcards (Moje fiszki)

* **Ścieżka:** `/flashcards?page=:n`
* **Główny cel:** przeglądać, edytować i usuwać zapisane fiszki; dodać manualnie.
* **Kluczowe informacje:** lista 25/str., sort malejąco po `created_at`; chip źródła (ai/ai\_edited/manual); licznik X–Y z Z; CTA „Rozpocznij naukę teraz”.
* **Kluczowe komponenty:**

  * **FlashcardTable/List** (w wierszu: front, chip źródła, data, akcje Edit/Delete)
  * **Pagination** (pełna dla ≤7 stron; prefetch sąsiednich)
  * **ManualAddModal** (front/back z walidacją)
  * **EditFlashcardModal** (walidacja)
  * **DeleteUndoSnackbar** (5 s, optymistycznie; faktyczne DELETE po czasie)
  * **StudyNowCTA** (aktywny/disabled z tooltipem, stan z `/api/srs/queue`)
* **UX/A11y/Security:** Undo usuwania z zachowaniem fokusu; widoczne stany ładowania i błędów; dostęp tylko dla zalogowanych; brak filtrów/szukania w MVP.
* **API użyte:**

  * `GET /api/flashcards` (lista + nagłówki paginacji)
  * `POST /api/flashcards` (manual add)
  * `PATCH /api/flashcards/{id}` (edycja)
  * `DELETE /api/flashcards/{id}` (soft delete)
  * `GET /api/srs/queue` (określenie stanu CTA)
* **Powiązane FR/US:** FR-009–FR-010, FR-014, FR-017, FR-020; US-006–US-007, US-020, US-026–US-028, US-008 (CTA).

---

### 2.6 Study (Tryb nauki)

* **Ścieżka:** `/study`
* **Główny cel:** przerobić kolejkę dnia (due → do 10 nowych); oceniać karty; monitorować cel dzienny.
* **Kluczowe informacje:** liczba due/new wybranych; pasek celu (20 domyślnie, możliwość jednorazowego zwiększenia); stan offline; podpowiedzi skrótów.
* **Kluczowe komponenty:**

  * **StudyQueueLoader** (pobiera kolejkę; cache w IndexedDB \~30 min)
  * **StudyCard** (front, reveal back po Space/Enter; układ klawiszologii)
  * **RatingPanel** (0=Again, 1=Hard, 2=Good, 3=Easy; skróty `1–4`)
  * **GoalProgressBar** (cap 100% z etykietą „100%+”)
  * **IncreaseGoalAction** (przycisk → PATCH /progress/{date})
  * **OfflineOutboxIndicator** (kolejkowanie ocen do wysyłki)
* **UX/A11y/Security:** pełna nawigacja klawiaturą; aria-live na zmianę stanu; „bezpieczne” działanie offline (cache kolejki + outbox ocen); przy 401 — nie gubimy ocen: wymuszamy logowanie i dosyłamy po sukcesie.
* **API użyte:**

  * `GET /api/srs/queue` (kolejka dnia)
  * `POST /api/srs/review` (ocena; z outboxem i retry)
  * `PATCH /api/progress/{date}` (zwiększenie celu)
  * (Niewystawione w UI w MVP, ale obsługiwane serwerowo: `POST /api/srs/promote-new` wg logiki kolejki)
* **Powiązane FR/US:** FR-011–FR-013, FR-029; US-008–US-010, US-029.

---

### 2.7 Settings

* **Ścieżka:** `/settings`
* **Główny cel:** zmienić parametry użytkownika wpływające na naukę i dostępność UI.
* **Kluczowe informacje:** `daily_goal` (1–200), `new_limit` (0–50), język UI, tryb wysokiego kontrastu.
* **Kluczowe komponenty:**

  * **UserSettingsForm** (daily goal, new limit; walidacje)
  * **I18nSelector** (PL/EN)
  * **HighContrastToggle**
* **UX/A11y/Security:** walidacje server-side + czytelne błędy; podgląd skrótów klawiaturowych; dostęp tylko dla zalogowanych.
* **API użyte:** `GET /api/user-settings`, `PATCH /api/user-settings`.
* **Powiązane FR/US:** FR-019 (języki UI), FR-012 (limit nowych), US-009 (limity), US-019 (A11y).

---

### 2.8 Account

* **Ścieżka:** `/account`
* **Główny cel:** operacje na koncie: zmiana hasła, wylogowanie, usunięcie konta.
* **Kluczowe informacje:** ostrzeżenia o unieważnieniu sesji, konsekwencje usunięcia danych.
* **Kluczowe komponenty:**

  * **ChangePasswordForm** (obecne hasło, nowe ×2)
  * **SignOutButton**
  * **DeleteAccountModal** (fraza „USUŃ”, ponowne hasło, cooldown 30 s z licznikem)
* **UX/A11y/Security:** silne komunikaty ostrzegawcze; po zmianie hasła — force logout na wszystkich urządzeniach; dostęp tylko dla zalogowanych.
* **API użyte:** `POST /api/auth/change-password`, `POST /api/auth/signout`, `DELETE /api/auth/account`.
* **Powiązane FR/US:** FR-015–FR-016, US-011–US-013, US-018.

---

### 2.9 Globalne „pomocnicze” widoki/warstwy

* **Pomoc/Skróty:** globalny modal (`?`/`h`) z listą skrótów dla Proposals i Study.
* **Błędy/Status:**

  * **GlobalErrorBoundary** (500)
  * **NotFound** (`/404`)
  * **NetworkBanner** (offline/timeout/503)
  * **AuthGuard** (przekierowania z zachowaniem intencji)
* **Telemetria/KPI (admin-only):** dostępne w `Admin`.

---

### 2.10 Admin (Panel administratora)

* **Ścieżka:** `/admin` (opcjonalne sub-ścieżki: `/admin/kpi`, `/admin/audit-logs`)
* **Główny cel:** przegląd metryk KPI i logów audytowych w celu weryfikacji działania systemu i liczenia KPI.
* **Kluczowe informacje:**

  * Karty KPI: `generated_total`, `saved_manual_total`, `saved_ai_total`, `saved_ai_edited_total` (wg US-014/US-030).
  * Tabela logów audytowych: kolumny `created_at`, `action`, `acted_by`, `card_id`, `target_user_id`, `details` (skrót JSON), paginacja 25/str.
  * Filtry: `action`, `user_id` (acted_by/target), `card_id`.
* **Kluczowe komponenty:**

  * **AdminGuard** (sprawdza uprawnienia admina; `403` → komunikat/redirect)
  * **KpiTotalsCards** (4 kafelki + opcjonalny wskaźnik akceptowalności AI = (ai + ai_edited) / generated_total, gdy `generated_total > 0`)
  * **AuditLogTable** (kolumny jak wyżej; zawijanie; kopiowanie ID)
  * **AuditLogFilters** (selecty/inputs dla `action`, `user_id`, `card_id`)
  * **Pagination** (na podstawie `X-Total-Count`/`Link` lub parametrów `limit/offset`)
* **UX/A11y/Security:** widok wyłącznie dla adminów; jasna obsługa `403`. Karty czytelnie opisane. Tabela dostępna klawiaturą. Odświeżanie ręczne lub interwał (opcjonalnie).
* **API użyte:** `GET /api/admin/kpi-totals`, `GET /api/admin/audit-logs`.
* **Powiązane FR/US:** US-014 (telemetria i etykiety), US-030 (liczniki KPI), sekcja 2.8 Admin w planie API.

---

## 3. Mapa podróży użytkownika

**Główny przepływ (od tekstu do nauki):**

1. **Login** → redirect do **Moje fiszki** (`/flashcards`), CTA „Rozpocznij naukę teraz” (disabled, jeśli brak due/new).
2. Użytkownik przechodzi do **Generate** → wkleja tekst (licznik) → ustawia suwak → **Generuj**.

   * Skeletony + licznik napływu; po 5 s bez SSE fallback REST.
3. Po `done` UI przenosi do **Proposals** (lub sekcja w tej samej ścieżce) → przegląd, edycje (walidacje), akceptacje/odrzucenia, ewentualne akcje hurtowe.
4. **Zapis**: `Zapisz zaakceptowane` lub `Zapisz wszystkie` → modal sukcesu z **„Idź do nauki”**.
5. **Study**: kolejka dnia (due → do 10 nowych), reveal/back, ocena `1–4` z auto-advance, pasek celu (20).

   * Brak due/new? CTA wraca do **Moje fiszki** lub **Generate**.
6. (Opcjonalnie) **Settings**: korekta `daily_goal`/`new_limit`, język/kontrast.

**Przepływ alternatywny — manualne dodanie:**

* Z **Moje fiszki** otwórz **ManualAddModal** → walidacje → zapis → karta trafia do puli nowych (zachowując limity) → CTA do **Study**.

**Przepływ utrzymania kolekcji:**

* **Moje fiszki**: edycja (walidacje), usuwanie (Undo 5 s), paginacja. CTA „Rozpocznij naukę teraz” odświeża się po `GET /api/srs/queue`.

**Punkty bólu i jak UI je adresuje:**

* *Niepewność jakości AI* → szybki przegląd, edycja inline z licznikami, akcje hurtowe, banner o duplikatach.
* *Latencja generacji* → skeletony, licznik progress, fallback REST, możliwość anulowania bez utraty dotychczas odebranych.
* *Zgubienie postępu przy błędach sieci* → outbox ocen, cache kolejki, toasty z jasnymi krokami („zaloguj ponownie”).
* *Brak kontroli nad dziennym obciążeniem* → widoczny pasek celu + jednorazowe zwiększenie celu na dziś.
* *Wielosesyjność i 401* → przechowywanie intencji i powrót do akcji po logowaniu.

---

## 4. Układ i struktura nawigacji

**Top-level (po zalogowaniu, stała nawigacja):**

* **Moje fiszki** (`/flashcards`) — domyślny start po loginie
* **Generuj** (`/generate`)
* **Nauka** (`/study`) — również stała CTA „Rozpocznij naukę teraz” (enabled/disabled)
* **Ustawienia** (`/settings`)
* **Konto** (`/account`)
* (Prawy górny róg) **język PL/EN**, **tryb wysokiego kontrastu**, **status online/offline**

**Stany nav:**

* **Gość:** tylko **Landing** i **Auth**; wejścia na ścieżki chronione → redirect do `/auth/login` z powrotem po sukcesie.
* **Wskazanie kontekstu:** aktywna zakładka, breadcrumbs nie są potrzebne (płaska struktura).
* **Dostępność:** wszystkie elementy nav i CTA fokusowalne; widoczny focus ring; skróty (`g` → Generate, `f` → Flashcards, `s` → Study).

---

## 5. Kluczowe komponenty

* **AuthGuard / RequireSession** — gate’uje widoki chronione, pamięta intencję powrotu po logowaniu.
* **TextAreaWithCounter** — walidacja 1000–10000; liczy graphem-safe (unikod).
* **SliderProposalsCount** — 10–50; pamiętany w LocalStorage.
* **GenerationStatus** — skeletony, licznik napływu, fallback REST, Cancel (AbortController).
* **ProposalList / ProposalCard** — lista propozycji, stany accepted/edited/deleted, skróty klawiaturowe.
* **ProposalEditor** — edycja z licznikami i komunikatami walidacji; auto-accept na zapisie.
* **BulkActionsBar** — akcje hurtowe + widoczny stan zaznaczeń; blokady do `done`.
* **LocalCacheController** — odczyt/zapis propozycji/ustawień suwaka z TTL=24 h; czyszczenie po zapisie/TTL.
* **SaveResultModal & DuplicatesBanner** — wynik batch-save, lista `skipped`.
* **FlashcardTable/List** — paginowana lista, chip źródła (ai/ai\_edited/manual), akcje w wierszu.
* **ManualAddModal / EditFlashcardModal** — formularze z walidacjami i licznikami.
* **DeleteUndoSnackbar** — 5 s na cofnięcie; opóźniony DELETE.
* **StudyQueueLoader** — pobiera i cache’uje kolejkę; sygnalizuje offline/expired cache.
* **StudyCard** — front → reveal back; Space/Enter; wspiera `prefers-reduced-motion`.
* **RatingPanel** — 0/1/2/3 z opisami; klawisze `1–4`; aria-labels.
* **GoalProgressBar & IncreaseGoalAction** — praca z celem dziennym; cap i etykieta „100%+”.
* **OfflineBanner & OutboxIndicator** — stan sieci i kolejka ocen do wysyłki.
* **I18nSelector & HighContrastToggle** — preferencje UI.
* **Toast/Alert system** — aria-live; typy: info/sukces/ostrzeżenie/błąd.
* **GlobalErrorBoundary / NotFound** — obsługa 500 i 404.
* **StudyNowCTA** — stała w nav i na „Moje fiszki”; stan na podstawie `/api/srs/queue`.

---

### (W ramach widoków — mapowanie API, FR i US)

Każdy widok powyżej zawiera:

* **API użyte** — listę endpointów REST/SSE wymaganych do realizacji widoku i jego interakcji.
* **Powiązane FR/US** — bezpośrednie odniesienia do wymagań i historyjek z PRD, które dany widok i komponenty realizują.

**Uzupełnienie zgodności UI ↔ API (przekrojowo):**

* **Generacja:** `/api/ai/generate` (SSE/REST), telemetry `generation` (server-side).
* **Zapis batcha:** `/api/flashcards:batch-save` (z `Idempotency-Key`), telemetry `save` (server-side). UI prezentuje `saved` i `skipped`.
* **CRUD fiszek:** `/api/flashcards` (GET/POST), `/api/flashcards/{id}` (PATCH/DELETE), soft-delete + Undo.
* **Nauka/SRS:** `/api/srs/queue` (kolejka), `/api/srs/review` (oceny), `/api/progress/{date}` (cel dzienny).
* **Ustawienia:** `/api/user-settings` (GET/PATCH).
* **Konto:** auth endpoints (signin/signup/signout/change-password/delete).

**Stany brzegowe i błędy (przekrojowo):**

* **Walidacje treści:** blokady przy przekroczeniach; liczniki wskazują o ile znaków; błędy `422` z czytelnymi polami.
* **Duplikaty przy zapisie:** `409 conflict` → banner z mikro-oznaczeniem „duplikat”.
* **SSE timeout/upstream `503`:** fallback REST + baner „Trwa generowanie fiszek”.
* **`401` w nauce/zapisie:** zachowaj stan lokalny (propozycje/outbox), wymuś login, po sukcesie dokończ akcję.
* **Offline:** globalny baner; generacja/zapis zablokowane (tooltipy), nauka działa na cache; outbox wysyła po powrocie online.
* **Idempotencja:** przy ponownym `batch-save` z tym samym kluczem UI nie duplikuje wyników (komunikat „zapis już wykonany”).

**Pełne pokrycie historyjek użytkownika:**

* **US-001–US-005, US-017, US-022:** Generate + Proposals (+ telemetry, cache, akcje).
* **US-006–US-007, US-020, US-026–US-028:** Flashcards (+ CRUD, paginacja, Undo).
* **US-008–US-010, US-029:** Study (+ kolejka, ratingi, cel dzienny, offline).
* **US-011–US-013, US-018:** Auth + Account.
* **US-014, US-023, US-030:** Telemetria/oznaczanie źródeł (UI chipy + serwerowe logi).
* **US-015, US-019, US-021:** Błędy/komunikaty/A11y.
* **US-016, FR-002:** Brak ograniczeń językowych treści fiszek (UI prezentuje jak jest).
* **US-024–US-025:** Gating dostępu + idempotencja zapisu.

**Mapowanie wymagań na elementy UI (przykłady kluczowe):**

* **FR-001/021:** TextAreaWithCounter + blokada „Generuj”.
* **FR-003:** SliderProposalsCount.
* **FR-004/022:** ProposalList (skeletony, licznik odebranych).
* **FR-005/017:** ProposalEditor/ManualAddModal/EditFlashcardModal (walidacje + liczniki).
* **FR-006:** BulkActionsBar.
* **FR-008:** LocalCacheController (TTL=24 h).
* **FR-009/020/026:** FlashcardTable/List + Pagination.
* **FR-011–FR-013/012:** StudyQueueLoader + StudyCard + RatingPanel + GoalProgressBar.
* **FR-014:** SaveResultModal z CTA.
* **FR-015–FR-016/024:** AuthGuard + Account.
* **FR-018/023/030:** chipy źródła + bannery wyników zapisu (UI), logi po stronie serwera.
* **FR-020/029:** NetworkBanner + OfflineOutboxIndicator.
