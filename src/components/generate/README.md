# Komponenty Generate

Ten katalog zawiera komponenty do widoku generowania fiszek z tekstu źródłowego.

## Struktura komponentów

```
generate/
├── GenerateView.tsx           # Główny komponent formularza
├── RequireSession.tsx         # Guard dla zalogowanych użytkowników
├── TextAreaWithCounter.tsx    # Pole tekstowe z licznikiem znaków
├── SliderProposalsCount.tsx   # Suwak liczby propozycji
├── ControlsBar.tsx            # Pasek kontrolny z przyciskami
├── GenerateButton.tsx         # Przycisk generowania
├── CancelButton.tsx           # Przycisk anulowania
├── GenerationStatus.tsx       # Status generacji z progresem
├── OneActiveSessionGuard.tsx  # Modal potwierdzenia sesji
├── ErrorBanner.tsx            # Wyświetlanie błędów
├── NetworkStatus.tsx          # Status połączenia sieciowego
└── README.md                  # Ta dokumentacja
```

## Funkcjonalności

### GenerateView

- Główny komponent zarządzający stanem formularza
- Integracja z API AI (SSE + REST fallback)
- Walidacja tekstu źródłowego (1000-10000 znaków)
- Obsługa skrótów klawiaturowych (Ctrl+Enter)
- Kontrola pojedynczej aktywnej sesji propozycji

### TextAreaWithCounter

- Pole tekstowe z licznikiem graphem
- Walidacja długości w czasie rzeczywistym
- Komunikaty błędów z aria-live
- Obsługa skrótu Ctrl+Enter

### SliderProposalsCount

- Suwak wyboru liczby propozycji (10-50)
- Wartość zapisywana w localStorage
- Kolorowy gradient na suwaku

### GenerationStatus

- Wyświetlanie postępu generacji
- Skeletony podczas ładowania
- Wskaźnik trybu SSE/REST
- Komunikaty o fallbacku

### OneActiveSessionGuard

- Modal potwierdzenia rozpoczęcia nowej generacji
- Ostrzeżenie o utracie niezapisanych propozycji
- Czyszczenie cache po potwierdzeniu

### ErrorBanner

- Wyświetlanie różnych typów błędów
- Akcje "Spróbuj ponownie" i "Zamknij"
- Konfiguracja w zależności od typu błędu

### NetworkStatus

- Monitorowanie stanu połączenia sieciowego
- Blokada przycisku generowania w trybie offline

## Custom Hooks

### useAiGeneration

```tsx
const { start, abort } = useAiGeneration();

start(command, {
  onProposal: (proposal) => {
    /* obsługa nowej propozycji */
  },
  onProgress: (count) => {
    /* aktualizacja licznika */
  },
  onDone: (returnedCount, requestId) => {
    /* zakończenie */
  },
  onError: (message) => {
    /* obsługa błędu */
  },
});
```

### useGraphemeCounter

```tsx
const count = useGraphemeCounter("Hello 👋"); // 7
```

### useLocalStorage

```tsx
const [value, setValue] = useLocalStorage("key", defaultValue);
```

## Dostępność

- `aria-busy` podczas generacji
- `aria-live="polite"` dla dynamicznych aktualizacji
- `aria-describedby` i `aria-invalid` dla pól formularza
- Obsługa klawiatury (Ctrl+Enter, Tab, Escape)

## Optymalizacje

- `React.memo` dla komponentów
- `useMemo` dla kosztownych obliczeń
- `useCallback` dla funkcji obsługi zdarzeń
- Lazy loading dla ciężkich komponentów

## Integracja z API

### Endpoint

- `POST /api/ai/generate`

### Żądanie

```typescript
{
  source_text: string; // 1000-10000 znaków
  max_proposals: number; // 10-50
}
```

### SSE Events

- `proposal` - nowa propozycja fiszki
- `progress` - aktualizacja licznika
- `done` - zakończenie generacji
- `error` - błąd generacji

### Fallback REST

- Po 5 sekundach braku zdarzeń SSE
- Symulacja progresu w trybie REST
- Automatyczne przełączenie

## Stany błędów

- `validation_failed` - błąd walidacji
- `unauthorized` - brak autoryzacji
- `too_many_requests` - przekroczenie limitu
- `request_timeout` - timeout żądania
- `upstream_unavailable` - niedostępność serwera
- `generation_failed` - błąd generacji

## Local Storage

- `generate:max_proposals` - liczba propozycji
- `proposals:session` - sesja propozycji (TTL 24h)
- `auth:intendedPath` - ścieżka powrotu po logowaniu

## Testowanie

```bash
# Sprawdzenie typów
npm run type-check

# Linting
npm run lint

# Build
npm run build
```
