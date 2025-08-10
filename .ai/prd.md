# Dokument wymagań produktu (PRD) - Fiszki AI (MVP)

## 1. Przegląd produktu

Celem MVP jest umożliwienie szybkiego tworzenia i nauki fiszek edukacyjnych dzięki generowaniu propozycji przez AI z wklejonego tekstu oraz integracji z gotowym algorytmem spaced repetition. Produkt webowy (desktop-first) dla osób uczących się. Minimalna rejestracja konta służy do trwałego przechowywania fiszek i stanu nauki.

Kluczowe założenia:

* Generowanie fiszek z tekstu użytkownika o długości 1000–10000 znaków.
* Format fiszki: front do 200 znaków, back do 500 znaków, jeden koncept na fiszkę, tylko tekst.
* Propozycje AI przeglądane i akceptowane/edytowane/odrzucane przed zapisem, przy czym zapisywane są tylko zaakceptowane.
* Nauka oparta o bibliotekę Open Spaced Repetition, stan i harmonogram liczone po stronie backendu.
* Minimalne konto: email + hasło; sesje trwają 7 dni; wielosesyjność dozwolona.

## 2. Problem użytkownika

Manualne tworzenie wysokiej jakości fiszek jest czasochłonne i zniechęca do stosowania metody powtórek rozłożonych w czasie. Użytkownicy chcą szybko przejść od materiału źródłowego do praktycznych fiszek, a następnie uczyć się zgodnie z rekomendowanym harmonogramem. Problemem jest również utrzymanie jakości i spójności fiszek (jeden koncept, zwięzły front i back).

## 3. Wymagania funkcjonalne

FR-001 Generowanie z tekstu: użytkownik wkleja tekst 1000–10000 znaków; aplikacja sprawdza długość, a w przypadku naruszenia limitu blokuje generację i wyświetla komunikat z licznikami znaków.
FR-002 Język: język generowanych fiszek podąża za językiem źródła; brak wymuszania; decyzja pozostawiona modelowi.
FR-003 Ilość propozycji: suwak 10–50 określa maksymalną liczbę fiszek do wygenerowania; jeśli model zwróci więcej, system obcina do 50; jeśli mniej, system akceptuje bez dogenerowywania.
FR-004 Przegląd propozycji: widok listy z progressive reveal (strumieniowanie) i skeletonami podczas ładowania; akcje na liście dostępne dopiero po zakończeniu całego batcha.
FR-005 Akcje per fiszka: akceptuj, edytuj, usuń. Edycja wymaga walidacji front/back i blokuje zapis, jeśli przekroczono limity.
FR-006 Akcje hurtowe: zapisz zaakceptowane, zapisz wszystkie, odrzuć wszystkie, zaznacz/odznacz wszystkie.
FR-007 Trwałość propozycji: propozycje nie są utrwalane w backendzie; zapisywane są tylko fiszki zaakceptowane.
FR-008 LocalStorage: propozycje, decyzje i ustawienia suwaka są cache’owane lokalnie i automatycznie przywracane; TTL 24 h; czyszczenie po zapisie lub po TTL.
FR-009 Moje fiszki: lista z paginacją serwerową 25/stronę; sortowanie najnowsze → najstarsze; edycja i usuwanie fiszek po zapisie; brak filtrowania/szukania w MVP.
FR-010 Manualne dodawanie: modal tworzenia fiszki (front/back) z walidacją limitów znaków; po zapisie fiszka trafia do Moje fiszki.
FR-011 Nauka i SRS: backend utrzymuje stan spaced repetition per fiszka, oblicza due/ease/interval/reps/lapses i kolejny termin; interfejs prezentuje kolejkę do nauki.
FR-012 Przepływ nauki: najpierw wszystkie zaległe powtórki, następnie do limitu 10 nowych kart; cel dzienny 20; jeśli zaległych > 20, użytkownik może dokończyć nadwyżkę lub jednorazowo zwiększyć cel; nowe zapisane fiszki trafiają do dzisiejszej puli nowych bez przekroczenia limitu, nadwyżka do kolejki później.
FR-013 Ocena w nauce: skala ocen w stylu Anki; wynik oceny aktualizuje harmonogram po stronie backendu.
FR-014 CTA po zapisie: po zapisie zaakceptowanych fiszek wyświetlany jest przycisk Rozpocznij naukę teraz.
FR-015 Konta: rejestracja i logowanie email + hasło; brak weryfikacji email; zmiana hasła i usunięcie konta dostępne w MVP.
FR-016 Sesje: sesje przeglądarkowe 7 dni; wielosesyjność dozwolona; zmiana hasła unieważnia wszystkie aktywne sesje.
FR-017 Walidacja: limity front/back są walidowane na FE, BE i w DB; przekroczenia blokują akceptację/edycję; widoczny licznik znaków.
FR-018 Telemetria i KPI: backend rejestruje zdarzenie generation (liczba propozycji), a przy zapisie zapisuje akcję z etykietą źródła manual/ai/ai\_edited. Metryki globalne bez okna czasowego.
FR-019 Języki UI: podstawowo EN i PL; treści fiszek i wprowadzany tekst mogą być w dowolnym języku zgodnie z wejściem.
FR-020 Błędy i stany wyjątkowe: informowanie o błędach sieci, time-out generacji, konflikt edycji; bez powtórnej generacji automatycznej.
FR-021 Dostępność: widoczne stany ładowania, komunikaty o błędach, klawiszologia dla akcji bazowych; minimalne wymogi dostępności (nawigacja klawiaturą na liście propozycji i w nauce).

## 4. Granice produktu

Zakres poza MVP:

* Własny, zaawansowany algorytm powtórek; stosujemy gotową bibliotekę Open Spaced Repetition.
* Import plików w różnych formatach (PDF, DOCX, itp.).
* Współdzielenie/zapraszanie do zestawów fiszek.
* Integracje z platformami edukacyjnymi.
* Aplikacje mobilne natywne; na start tylko web.

Założenia i ograniczenia:

* Brak weryfikacji email i mechanizmu resetu hasła zapomniałem w MVP.
* Brak deduplikacji propozycji w batchu w MVP (kwestia otwarta do decyzji).
* Brak twardych limitów kosztowych/latency w UI; ryzyko kosztów po stronie operacyjnej.
* Wejścia mieszane językowo pozostają bez heurystyk; decyzja o języku po stronie modelu.
* Brak dashboardu; telemetria gromadzona wyłącznie w backendzie.

Ryzyka:

* Jakość i spójność wygenerowanych fiszek wpływa na KPI akceptacji.
* Koszty inferencji i wahania latencji.
* Brak resetu hasła może zwiększyć obciążenie wsparcia.
* Potencjalne duplikaty frontów w propozycjach.

## 5. Historyjki użytkowników

US-001
Tytuł: Generacja propozycji fiszek z wklejonego tekstu
Opis: Jako uczący się chcę wkleić tekst źródłowy i otrzymać do 10–50 propozycji fiszek, aby szybko stworzyć talię.
Kryteria akceptacji:

* Po wklejeniu tekstu aplikacja pokazuje licznik znaków i blokuje generację, jeśli <1000 lub >10000, z komunikatem wskazującym aktualną liczbę znaków.
* Suwak pozwala wybrać maksymalną liczbę propozycji 10–50.
* Po rozpoczęciu generacji pojawiają się skeletony i strumieniowanie propozycji; akcje na liście są wyłączone do zakończenia batcha.
* Jeśli model zwróci > wybranego limitu, lista jest obcięta do 50; jeśli < limitu, system nie dogenerowuje.

US-002
Tytuł: Przegląd i decyzje per fiszka
Opis: Jako uczący się chcę akceptować, edytować lub usuwać pojedyncze propozycje.
Kryteria akceptacji:

* Dla każdej fiszki dostępne są akcje akceptuj/edytuj/usuń.
* Edycja wymusza walidację front ≤200 i back ≤500; przy przekroczeniu blokuje zapis i pokazuje licznik.
* Po akceptacji fiszka jest oznaczona jako do zapisu; usunięte znikają z listy propozycji.
* Edycja zaakceptowanej propozycji zmienia etykietę źródła na ai\_edited.

US-003
Tytuł: Akcje hurtowe na propozycjach
Opis: Jako uczący się chcę szybko przetworzyć wiele propozycji jednocześnie.
Kryteria akceptacji:

* Dostępne są: zapisz zaakceptowane, zapisz wszystkie, odrzuć wszystkie, zaznacz/odznacz wszystkie.
* Przy zapisz wszystkie system zapisuje także te nieoznaczone wcześniej jako zaakceptowane.
* Po odrzuć wszystkie lista propozycji jest pusta, localStorage zostaje wyczyszczony.

US-004
Tytuł: Trwałość propozycji i decyzji lokalnie
Opis: Jako uczący się chcę, aby po odświeżeniu strony moje propozycje i decyzje wróciły.
Kryteria akceptacji:

* Propozycje, decyzje i pozycja suwaka są zapisywane w localStorage z TTL 24 h.
* Po ponownym otwarciu widoku w ciągu 24 h stan zostaje przywrócony.
* Po zapisie lub po 24 h cache jest automatycznie czyszczony.

US-005
Tytuł: Zapis zaakceptowanych fiszek
Opis: Jako uczący się chcę zapisać zaakceptowane fiszki do bazy i zacząć naukę.
Kryteria akceptacji:

* Zapis utrwala tylko zaakceptowane propozycje; propozycje same w sobie nie są utrwalane.
* Po udanym zapisie widoczny jest przycisk Rozpocznij naukę teraz.
* Zapis ustawia źródło fiszki na ai lub ai\_edited w zależności od edycji.

US-006
Tytuł: Moje fiszki – przegląd, edycja, usuwanie
Opis: Jako uczący się chcę zarządzać zapisanymi fiszkami.
Kryteria akceptacji:

* Widok listy z paginacją serwerową 25/stronę i sortowaniem najnowsze → najstarsze.
* Edycja i usuwanie dostępne dla zapisanych fiszek; walidacja front/back jak w propozycjach.
* Brak filtrowania i wyszukiwania w MVP.

US-007
Tytuł: Ręczne dodawanie fiszki
Opis: Jako uczący się chcę dodać pojedynczą fiszkę ręcznie przez modal.
Kryteria akceptacji:

* Modal zawiera pola front i back z licznikami znaków.
* Walidacja front ≤200 i back ≤500 na FE i BE; przy naruszeniu blokada zapisu.
* Po zapisie fiszka pojawia się w Moje fiszki.

US-008
Tytuł: Rozpoczęcie nauki po zapisie
Opis: Jako uczący się chcę natychmiast przejść do nauki po zapisie nowych fiszek.
Kryteria akceptacji:

* Po zapisie pojawia się CTA Rozpocznij naukę teraz.
* Kliknięcie CTA otwiera tryb nauki rozpoczynając od zaległych.

US-009
Tytuł: Nauka – kolejkowanie i limity
Opis: Jako uczący się chcę, aby system najpierw pokazywał zaległe, a potem do 10 nowych, przy celu dziennym 20.
Kryteria akceptacji:

* Kolejka dnia zawiera wszystkie due; następnie do 10 nowych.
* Gdy due > 20, użytkownik może dokończyć nadwyżkę lub jednorazowo zwiększyć cel na dziś.
* Nowe zapisane fiszki trafiają do dzisiejszej puli nowych bez przekroczenia limitu; reszta do kolejki później.

US-010
Tytuł: Ocena kart w trakcie nauki
Opis: Jako uczący się chcę oceniać odpowiedzi w skali podobnej do Anki, by dostosować harmonogram.
Kryteria akceptacji:

* Dostępny zestaw ocen z biblioteki Open Spaced Repetition.
* Po ocenie backend aktualizuje ease/interval/reps/lapses i termin kolejnej powtórki.
* Zmiany są widoczne natychmiast w kolejce i spójne między urządzeniami.

US-011
Tytuł: Rejestracja i logowanie
Opis: Jako użytkownik chcę założyć konto email+hasło i logować się, by przechowywać fiszki oraz stan nauki.
Kryteria akceptacji:

* Formularz rejestracji i logowania z walidacją podstawową haseł.
* Brak weryfikacji email i resetu zapomniałem hasła w MVP.
* Po zalogowaniu powstaje sesja 7-dniowa w przeglądarce.

US-012
Tytuł: Bezpieczny dostęp i sesje
Opis: Jako użytkownik chcę, by moje sesje były utrzymywane i żebym mógł zarządzać bezpieczeństwem konta.
Kryteria akceptacji:

* Sesja trwa 7 dni; wygasła sesja wymaga ponownego logowania.
* Wielosesyjność dozwolona; zmiana hasła unieważnia wszystkie aktywne sesje.
* Endpointy zapisu fiszek i nauki wymagają uwierzytelnienia.

US-013
Tytuł: Zmiana hasła i usunięcie konta
Opis: Jako użytkownik chcę zmienić hasło oraz móc usunąć konto wraz z danymi.
Kryteria akceptacji:

* Formularz zmiany hasła wymaga podania obecnego hasła.
* Po zmianie hasła wszystkie sesje są unieważniane.
* Usunięcie konta kasuje użytkownika, fiszki i stan SRS; użytkownik jest wylogowany.

US-014
Tytuł: Telemetria zdarzeń i etykiety
Opis: Jako zespół produktu chcemy zliczać akceptacje i źródła fiszek, by mierzyć KPI.
Kryteria akceptacji:

* Zdarzenie generation rejestruje liczbę zwróconych propozycji w batchu.
* Zapis fiszki rejestruje akcję z etykietą manual/ai/ai\_edited.
* Dane agregowane globalnie bez okna czasowego.

US-015
Tytuł: Stany błędów i odporność
Opis: Jako użytkownik chcę zrozumiałych komunikatów w razie błędów generacji, sieci czy walidacji.
Kryteria akceptacji:

* Błąd generacji pokazuje komunikat i pozwala ponowić proces bez utraty lokalnego stanu.
* Błędy walidacji front/back blokują zapis i wskazują konkretne przekroczenia.
* W przypadku utraty połączenia lokalny cache pozostaje nienaruszony.

US-016
Tytuł: Obsługa mieszanych języków wejścia
Opis: Jako użytkownik chcę, by system obsłużył tekst zawierający dowolne języki bez błędu.
Kryteria akceptacji:

* Generacja nie jest blokowana przy wykryciu fragmentów w różnych językach.
* Język wynikowych fiszek wynika z decyzji modelu; system prezentuje wynik bez dodatkowych transformacji.
* Brak automatycznej translacji w MVP.

US-017
Tytuł: Brak deduplikacji propozycji w MVP
Opis: Jako użytkownik akceptuję, że identyczne fronty mogą się pojawić, ale chcę móc je ręcznie usunąć.
Kryteria akceptacji:

* System nie scala duplikatów automatycznie.
* Użytkownik może usunąć zbędne pozycje pojedynczo lub hurtowo.

US-018
Tytuł: Wylogowanie
Opis: Jako użytkownik chcę się wylogować z aplikacji z każdego urządzenia.
Kryteria akceptacji:

* Akcja wyloguj kończy bieżącą sesję w przeglądarce.
* Po zmianie hasła wszystkie sesje zostają unieważnione, co wymusza ponowne logowanie na innych urządzeniach.

US-019
Tytuł: Dostępność i sterowanie klawiaturą
Opis: Jako użytkownik chcę poruszać się po liście propozycji i ocen w nauce klawiaturą.
Kryteria akceptacji:

* Fokus i skróty klawiaturowe dla akcji akceptuj/edytuj/usuń oraz ocen w nauce.
* Widoczne wskaźniki fokusu i komunikaty ARIA dla stanów ładowania i błędów.

US-020
Tytuł: Sortowanie w Moje fiszki
Opis: Jako użytkownik chcę widzieć najnowsze fiszki jako pierwsze.
Kryteria akceptacji:

* Lista Moje fiszki domyślnie sortuje po dacie utworzenia malejąco.
* Zmiany edycyjne nie zmieniają porządku w MVP.

US-021
Tytuł: Ochrona długości wejścia przed generacją
Opis: Jako użytkownik chcę jasnego komunikatu, gdy wkleiłem za mało/za dużo tekstu.
Kryteria akceptacji:

* Widoczny licznik znaków przy polu wejściowym.
* Blokada przy <1000 lub >10000 znaków z informacją o liczbie brakujących/przekroczonych znaków.

US-022
Tytuł: Widoki ładowania i postęp
Opis: Jako użytkownik chcę wiedzieć, że generacja trwa.
Kryteria akceptacji:

* Skeletony są widoczne od startu generacji do końca batcha.
* Progres strumieniowania pokazuje liczbę odebranych propozycji.

US-023
Tytuł: Oznaczanie źródła fiszek
Opis: Jako zespół chcemy wiedzieć, które fiszki pochodzą z AI, z edycją, a które manualnie.
Kryteria akceptacji:

* Fiszka zapisana z propozycji bez edycji ma etykietę ai.
* Fiszka zapisana po edycji propozycji ma etykietę ai\_edited.
* Fiszka utworzona ręcznie ma etykietę manual.

US-024
Tytuł: Dostęp tylko dla zalogowanych do zapisu i nauki
Opis: Jako właściciel danych chcę, by zapisywanie fiszek i nauka wymagały zalogowania.
Kryteria akceptacji:

* Niezalogowany użytkownik może widzieć landing i formularze auth.
* Wejście do generacji, zapis i nauka przekierowują do logowania, jeśli brak sesji.
* Po udanym logowaniu użytkownik wraca do poprzednio żądanej akcji.

US-025
Tytuł: Stabilność i idempotencja zapisu
Opis: Jako użytkownik chcę uniknąć duplikatów zapisów po odświeżeniu.
Kryteria akceptacji:

* Backend zapewnia idempotentny endpoint zapisu batcha.
* Powtórne wysłanie tego samego batcha nie tworzy duplikatów.

US-026
Tytuł: Paginalne pobieranie Moje fiszki
Opis: Jako użytkownik chcę przewidywalnego czasu ładowania listy.
Kryteria akceptacji:

* Serwer zwraca 25 elementów na stronę wraz z informacją o liczbie stron/elementów.
* Nawigacja między stronami nie resetuje aktualnych filtrów/sortowania (w MVP tylko sort domyślny).

US-027
Tytuł: Edycja po zapisie
Opis: Jako użytkownik chcę poprawić zapisaną fiszkę.
Kryteria akceptacji:

* Edycja w Moje fiszki podlega tym samym limitom znaków co w propozycjach.
* Zmiany są aktualizowane w DB i mają wpływ na przyszły harmonogram SRS.

US-028
Tytuł: Usuwanie fiszki
Opis: Jako użytkownik chcę trwale usunąć fiszkę.
Kryteria akceptacji:

* Usunięta fiszka znika z listy i nie pojawia się w kolejnych sesjach nauki.
* Przy usuwaniu karty due z kolejki nauki kolejka jest aktualizowana natychmiast.

US-029
Tytuł: Minimalna dostępność API podczas nauki
Opis: Jako użytkownik nie chcę utracić postępu przy chwilowym błędzie sieci.
Kryteria akceptacji:

* Oceny są kolejkowane lokalnie i wysyłane z retry w tle przy ponownym połączeniu.
* W przypadku permanentnego błędu użytkownik otrzymuje informację o konieczności ponownego zalogowania.

US-030
Tytuł: Widoczność liczników KPI w logach
Opis: Jako zespół chcę potwierdzić prawidłowe liczenie KPI.
Kryteria akceptacji:

* Log zdarzenia generation zawiera rozmiar batcha i identyfikator żądania.
* Log zdarzenia zapisu zawiera liczbę zapisanych fiszek z podziałem na etykiety.

## 6. Metryki sukcesu

KPI-001 Akceptowalność AI: co najmniej 75% propozycji AI przyjętych (zaakceptowane od razu + zaakceptowane po edycji) podzielone przez wszystkie wygenerowane propozycje; liczone globalnie bez okna czasowego, na podstawie zdarzeń generation i zapisów.
KPI-002 Udział AI w tworzeniu: co najmniej 75% zapisanych fiszek pochodzi z AI (ai + ai\_edited) względem wszystkich zapisów (ai + ai\_edited + manual); liczone globalnie bez okna czasowego.
Wskaźniki operacyjne: liczba generacji, liczba zapisów.
