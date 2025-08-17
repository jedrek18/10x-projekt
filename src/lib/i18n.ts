export type LanguageCode = "pl" | "en";

export interface AppCopy {
  // Landing page
  title: string;
  subtitle: string;
  ctaLogin: string;
  ctaSignup: string;
  languageLabel: string;
  policy: string;

  // Auth
  login: string;
  signup: string;
  loginTitle: string;
  signupTitle: string;
  loginSubtitle: string;
  signupSubtitle: string;
  noAccount: string;
  haveAccount: string;
  email: string;
  password: string;
  confirmPassword: string;
  emailRequired: string;
  passwordRequired: string;
  confirmPasswordRequired: string;
  invalidEmail: string;
  invalidEmailFormat: string;
  passwordTooShort: string;
  passwordsMustMatch: string;
  invalidCredentials: string;
  accountCreated: string;
  accountCreatedButLoginFailed: string;
  registrationError: string;
  emailAlreadyExists: string;
  weakPassword: string;
  showPassword: string;
  hidePassword: string;

  // Navigation
  settings: string;
  logout: string;
  user: string;

  // Flashcards
  myFlashcards: string;
  manageFlashcards: string;
  addFlashcard: string;
  addFlashcardDescription: string;
  editFlashcard: string;
  deleteFlashcard: string;
  noFlashcards: string;
  addFirstFlashcard: string;
  front: string;
  back: string;
  frontPlaceholder: string;
  backPlaceholder: string;
  source: string;
  created: string;
  actions: string;
  save: string;
  cancel: string;
  close: string;
  delete: string;
  edit: string;
  undo: string;
  undoDelete: string;
  undoTimeLeft: string;

  // Study
  studyNow: string;
  startStudy: string;
  noCardsToStudy: string;
  checkingCards: string;
  studyQueue: string;
  cardsAvailable: string;
  dueForReview: string;
  newCards: string;
  dailyProgress: string;
  increaseGoal: string;
  increaseDailyGoal: string;
  newDailyGoal: string;
  currentGoal: string;
  goalUpdated: string;
  goalUpdateFailed: string;
  goalUpdateDescription: string;
  goalUpdateErrorDescription: string;
  updating: string;
  updateGoal: string;
  question: string;
  answer: string;
  noAnswerProvided: string;
  showAnswer: string;
  card: string;
  due: string;
  howWellDidYouKnow: string;
  rateYourKnowledge: string;
  again: string;
  againDescription: string;
  hard: string;
  hardDescription: string;
  good: string;
  goodDescription: string;
  easy: string;
  easyDescription: string;
  press: string;
  processingRating: string;
  studySessionComplete: string;
  studySessionCompleteDescription: string;
  manageFlashcards: string;
  generateNewCards: string;
  failedToLoadStudyQueue: string;
  loadingStudyQueue: string;
  initializingStudySession: string;
  tryAgain: string;
  pendingReviews: string;
  pendingReviewsDescription: string;
  rating: string;
  keyboardShortcuts: string;
  keyboardShortcutsDescription: string;
  key: string;
  action: string;
  revealAnswer: string;
  rateAgain: string;
  rateHard: string;
  rateGood: string;
  rateEasy: string;
  showHelp: string;
  progress: string;
  reviewsCompleted: string;

  // Pagination
  showing: string;
  showingItems: string;
  of: string;
  items: string;
  previous: string;
  next: string;
  sorting: string;
  newest: string;
  pageInfo: string;

  // Messages
  loading: string;
  loadingError: string;
  tryAgain: string;
  error: string;
  success: string;
  addFlashcardError: string;
  unexpectedError: string;
  adding: string;
  saving: string;
  flashcardAdded: string;
  flashcardUpdated: string;
  flashcardDeleted: string;
  flashcardRestored: string;

  // Validation
  required: string;
  minLength: string;
  maxLength: string;
  frontRequired: string;
  backRequired: string;
  frontBackDifferent: string;
  integer: string;
  range: string;

  // Sources
  manual: string;
  ai: string;
  aiEdited: string;
  import: string;

  // Generate
  generateTitle: string;
  generateSubtitle: string;
  sourceText: string;
  sourceTextPlaceholder: string;
  sourceTextRequirements: string;
  proposalsCount: string;
  proposalsCountDescription: string;
  generateButton: string;
  generatingButton: string;
  cancelButton: string;
  generateShortcut: string;
  minCharacters: string;
  maxCharacters: string;
  useShortcut: string;
  generationStatus: string;
  streaming: string;
  batch: string;
  receivedProposals: string;
  generatedFlashcards: string;
  receivingProposals: string;
  processingRequest: string;
  streamingDescription: string;
  batchDescription: string;
  fallbackMessage: string;
  activeSessionTitle: string;
  activeSessionDescription: string;
  whatWillHappen: string;
  willHappenList: string;
  recommendation: string;
  recommendationDescription: string;
  continue: string;
  validationFailed: string;
  unauthorized: string;
  unauthorizedDescription: string;
  tooManyRequests: string;
  tooManyRequestsDescription: string;
  connectionProblem: string;
  connectionProblemDescription: string;
  generationFailed: string;
  networkOffline: string;
  networkOfflineDescription: string;
  retry: string;
  dismiss: string;

  // Review Proposals
  reviewProposalsTitle: string;
  reviewProposalsSubtitle: string;
  noProposalsSession: string;
  noProposalsSessionDescription: string;
  selectAll: string;
  selectedOf: string;
  accepted: string;
  deleted: string;
  saveAccepted: string;
  saveAll: string;
  rejectAll: string;
  rejectAllTitle: string;
  rejectAllDescription: string;
  rejectAllConfirm: string;
  noItemsToSave: string;
  noItemsToSaveDescription: string;
  allProposalsDeleted: string;
  allProposalsDeletedDescription: string;
  saveSuccessful: string;
  saveFailed: string;
  networkError: string;
  networkErrorDescription: string;
  allProposalsRejected: string;
  allProposalsRejectedDescription: string;
  errorRejectingProposals: string;
  errorRejectingProposalsDescription: string;
  characters: string;
  acceptedStatus: string;
  editedStatus: string;
  deletedStatus: string;
  pendingStatus: string;
  editProposal: string;
  deleteProposal: string;
  saveEdits: string;
  cancelEdits: string;
  saveCompleted: string;
  saveCompletedDescription: string;
  flashcardSaved: string;
  flashcardsSaved: string;
  flashcardSkipped: string;
  flashcardsSkipped: string;
  skippedDescription: string;
  skippedReason: string;
  andMore: string;
  goToStudy: string;
  flashcardsReadyForStudy: string;
  noFlashcardsSaved: string;
  skippedItemsCanBeReviewed: string;
  cacheRestored: string;
  sessionExpiresIn: string;
  clearCache: string;
  duplicatesBannerTitle: string;
  duplicatesBannerDescription: string;
  clearCacheButton: string;
  flashcardWas: string;
  flashcardsWere: string;
  skipped: string;

  // Settings
  studySettings: string;
  interfacePreferences: string;
  settingsLoadError: string;
  settingsSaveError: string;
  loadingSettings: string;
  settingsSaved: string;
  dailyGoal: string;
  dailyGoalDescription: string;
  dailyGoalError: string;
  newLimit: string;
  newLimitDescription: string;
  newLimitError: string;

  // Account Management
  accountManagement: string;
  accountManagementDescription: string;
  accountInformation: string;
  accountInformationDescription: string;
  lastSignIn: string;
  userId: string;
  sessionActive: string;
  changePassword: string;
  changePasswordDescription: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  currentPasswordRequired: string;
  newPasswordRequired: string;
  newPasswordMinLength: string;
  newPasswordDifferent: string;
  incorrectCurrentPassword: string;
  passwordChanged: string;
  passwordChangedDescription: string;
  changingPassword: string;
  signOut: string;
  signOutDescription: string;
  signOutScope: string;
  thisDeviceOnly: string;
  allDevices: string;
  thisDeviceDescription: string;
  allDevicesDescription: string;
  signingOut: string;
  dangerZone: string;
  dangerZoneDescription: string;
  deleteAccount: string;
  deleteAccountDescription: string;
  deleteAccountConsequences: string;
  deleteAccountConsequencesList: string;
  deleteAccountButton: string;
  deleteAccountModalTitle: string;
  deleteAccountModalDescription: string;
  deleteAccountPassword: string;
  deleteAccountPasswordPlaceholder: string;
  deleteAccountConfirmPhrase: string;
  deleteAccountConfirmPhrasePlaceholder: string;
  deleteAccountConfirmPhraseDescription: string;
  deleteAccountCooldown: string;
  deleteAccountCooldownDescription: string;
  deleteAccountPasswordRequired: string;
  deleteAccountConfirmPhraseError: string;
  deletingAccount: string;
  accountDeleted: string;
  accountDeletedDescription: string;
  checkingSession: string;
  sessionSecureMessage: string;
}

export type I18nDictionary = Record<LanguageCode, AppCopy>;

export const DEFAULT_LANGUAGE: LanguageCode = "en";
export const LOCAL_STORAGE_KEY = "app.lang";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function sanitizeLanguage(value: unknown): LanguageCode | null {
  if (value === "pl" || value === "en") return value;
  return null;
}

export function detectBrowserLanguage(): LanguageCode {
  if (!isBrowser()) return DEFAULT_LANGUAGE;
  try {
    const navLang = (navigator.language || navigator.languages?.[0] || "en").toLowerCase();
    if (navLang.startsWith("pl")) return "pl";
    return "en";
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function getInitialLanguage(): LanguageCode {
  if (!isBrowser()) return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const valid = sanitizeLanguage(stored);
    if (valid) return valid;
  } catch {
    // ignore storage errors
  }
  return detectBrowserLanguage();
}

export const appCopy: I18nDictionary = {
  en: {
    // Landing page
    title: "Master anything with spaced repetition",
    subtitle: "Create flashcards, review efficiently, and track your daily progress.",
    ctaLogin: "Log in",
    ctaSignup: "Sign up",
    languageLabel: "Language",
    policy: "Privacy & Terms",

    // Auth
    login: "Log in",
    signup: "Sign up",
    loginTitle: "Log in",
    signupTitle: "Sign up",
    loginSubtitle: "Enter your credentials to continue",
    signupSubtitle: "Create a new account to get started",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    emailRequired: "Email is required",
    passwordRequired: "Password is required",
    confirmPasswordRequired: "Password confirmation is required",
    invalidEmail: "Invalid email address",
    invalidEmailFormat: "Invalid email format",
    passwordTooShort: "Password must be at least 8 characters",
    passwordsMustMatch: "Passwords must match",
    invalidCredentials: "Invalid email or password",
    accountCreated: "Account created successfully",
    accountCreatedButLoginFailed: "Account created but login failed. Please try logging in.",
    registrationError: "Registration error occurred",
    emailAlreadyExists: "Account with this email already exists",
    weakPassword: "Password is too weak",
    showPassword: "Show password",
    hidePassword: "Hide password",

    // Navigation
    settings: "Settings",
    logout: "Logout",
    user: "User",

    // Flashcards
    myFlashcards: "My Flashcards",
    manageFlashcards: "Manage your flashcards and add new ones",
    addFlashcard: "Add Flashcard",
    addFlashcardDescription: "Create a new flashcard manually. Enter the front and back content.",
    editFlashcard: "Edit Flashcard",
    deleteFlashcard: "Delete Flashcard",
    noFlashcards: "No flashcards",
    addFirstFlashcard: "Add your first flashcard or generate them with AI",
    front: "Front",
    back: "Back",
    frontPlaceholder: "Enter front text...",
    backPlaceholder: "Enter back text...",
    source: "Source",
    created: "Created",
    actions: "Actions",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    edit: "Edit",
    undo: "Undo",
    undoDelete: "Undo Delete",
    undoTimeLeft: "Undo time left",

    // Study
    studyNow: "Study Now",
    startStudy: "Start Study",
    noCardsToStudy: "No cards to study",
    checkingCards: "Checking available cards...",
    studyQueue: "Study Queue",
    cardsAvailable: "cards available",
    dueForReview: "due for review",
    newCards: "new cards",
    dailyProgress: "Daily Progress",
    increaseGoal: "Increase Goal",
    increaseDailyGoal: "Increase Daily Goal",
    newDailyGoal: "New daily goal",
    currentGoal: "Current goal: {goal} reviews per day",
    goalUpdated: "Goal updated",
    goalUpdateFailed: "Failed to update goal",
    goalUpdateDescription: "Daily goal set to {goal} reviews",
    goalUpdateErrorDescription: "An unexpected error occurred",
    updating: "Updating...",
    updateGoal: "Update Goal",
    question: "Question",
    answer: "Answer",
    noAnswerProvided: "No answer provided",
    showAnswer: "Show Answer",
    card: "Card",
    due: "Due",
    howWellDidYouKnow: "How well did you know this?",
    rateYourKnowledge: "Rate your knowledge to schedule the next review",
    again: "Again",
    againDescription: "I didn't know this at all",
    hard: "Hard",
    hardDescription: "I knew this but it was difficult",
    good: "Good",
    goodDescription: "I knew this well",
    easy: "Easy",
    easyDescription: "I knew this very well",
    press: "Press {key}",
    processingRating: "Processing your rating...",
    studySessionComplete: "Study session complete!",
    studySessionCompleteDescription: "You've reviewed all available cards for today.",
    manageFlashcards: "Manage Flashcards",
    generateNewCards: "Generate New Cards",
    failedToLoadStudyQueue: "Failed to load study queue",
    loadingStudyQueue: "Loading study queue...",
    initializingStudySession: "Initializing study session...",
    tryAgain: "Try Again",
    pendingReviews: "Pending reviews",
    pendingReviewsDescription:
      "{count} review{count, plural, one {} other {s}} waiting to be synced when you're back online.",
    rating: "Rating",
    keyboardShortcuts: "Keyboard Shortcuts",
    keyboardShortcutsDescription:
      "Use these keyboard shortcuts to navigate and interact with flashcards more efficiently.",
    key: "Key",
    action: "Action",
    revealAnswer: "Reveal answer",
    rateAgain: "Rate: Again (0)",
    rateHard: "Rate: Hard (1)",
    rateGood: "Rate: Good (2)",
    rateEasy: "Rate: Easy (3)",
    showHelp: "Show this help",
    progress: "Progress",
    reviewsCompleted: "reviews completed",

    // Pagination
    showing: "Showing",
    showingItems: "Showing {start}–{end} of {total} items",
    of: "of",
    items: "items",
    previous: "Previous",
    next: "Next",
    sorting: "Sorting",
    newest: "Newest",
    pageInfo: "Page {page} of {total}",

    // Messages
    loading: "Loading...",
    loadingError: "Loading Error",
    tryAgain: "Try Again",
    error: "Error",
    success: "Success",
    addFlashcardError: "Failed to add flashcard",
    unexpectedError: "An unexpected error occurred",
    adding: "Adding...",
    saving: "Saving...",
    flashcardAdded: "Flashcard added successfully",
    flashcardUpdated: "Flashcard updated successfully",
    flashcardDeleted: "Flashcard deleted successfully",
    flashcardRestored: "Flashcard restored",

    // Validation
    required: "This field is required",
    minLength: "Minimum length is {min} characters",
    maxLength: "Maximum length is {max} characters",
    frontRequired: "Front text is required",
    backRequired: "Back text is required",
    frontBackDifferent: "Front and back must be different",
    integer: "Must be a whole number",
    range: "Must be between {min} and {max}",

    // Sources
    manual: "Manual",
    ai: "AI",
    aiEdited: "AI (edited)",
    import: "Import",

    // Generate
    generateTitle: "Generate flashcards from text",
    generateSubtitle:
      "Paste source text (1000-10000 characters) and generate flashcards with AI. You can set the number of proposals and track generation progress in real-time.",
    sourceText: "Source text",
    sourceTextPlaceholder: "Paste source text here (1000-10000 characters)...",
    sourceTextRequirements: "Requirements:",
    proposalsCount: "Number of proposals",
    proposalsCountDescription: "Choose the number of flashcards to generate. A larger number may take more time.",
    generateButton: "Generate flashcards",
    generatingButton: "Generating...",
    cancelButton: "Cancel",
    generateShortcut: "Ctrl+Enter",
    minCharacters: "Minimum {min} characters",
    maxCharacters: "Maximum {max} characters",
    useShortcut: "Use Ctrl+Enter to quickly start generation",
    generationStatus: "Generation status",
    streaming: "Streaming",
    batch: "Batch",
    receivedProposals: "Received proposals:",
    generatedFlashcards: "Generated flashcards:",
    receivingProposals: "Receiving proposals...",
    processingRequest: "Processing request...",
    streamingDescription: "Flashcards are being generated in real-time",
    batchDescription: "Generation may take a few seconds",
    fallbackMessage: "Streaming unavailable, switched to batch mode...",
    activeSessionTitle: "Active proposal session",
    activeSessionDescription: "Found an active proposal session from a previous generation.",
    whatWillHappen: "What will happen?",
    willHappenList:
      "Starting a new generation will clear previous proposals,Unsaved flashcards will be lost,Proposal session will be reset",
    recommendation: "Recommendation",
    recommendationDescription:
      "Go to the proposals view to review and save generated flashcards before starting a new generation.",
    continue: "Continue",
    validationFailed: "Validation error",
    unauthorized: "Unauthorized",
    unauthorizedDescription: "Your session has expired. You will be redirected to login.",
    tooManyRequests: "Too many requests",
    tooManyRequestsDescription: "Request limit exceeded. Try again in a moment.",
    connectionProblem: "Connection problem",
    connectionProblemDescription: "Server is not responding. Check your connection and try again.",
    generationFailed: "Generation error",
    networkOffline: "No internet connection",
    networkOfflineDescription: "Some features may be unavailable.",
    retry: "Try again",
    dismiss: "Close",

    // Review Proposals
    reviewProposalsTitle: "Review Proposals",
    reviewProposalsSubtitle: "Review and save your generated flashcards",
    noProposalsSession: "No proposals session",
    noProposalsSessionDescription: "Generate some flashcards to get started",
    selectAll: "Select all",
    selectedOf: "{selected} of {total} selected",
    accepted: "accepted",
    deleted: "deleted",
    saveAccepted: "Save accepted ({count})",
    saveAll: "Save all",
    rejectAll: "Reject all",
    rejectAllTitle: "Reject All Proposals",
    rejectAllDescription:
      "Are you sure you want to reject all proposals? This action cannot be undone and will clear all generated flashcards from the session.",
    rejectAllConfirm: "Reject All",
    noItemsToSave: "No items to save",
    noItemsToSaveDescription: "Please accept some proposals before saving.",
    allProposalsDeleted: "All proposals deleted",
    allProposalsDeletedDescription: "All proposals have been deleted.",
    saveSuccessful: "Save successful",
    saveFailed: "Save failed",
    networkError: "Network error",
    networkErrorDescription: "Please check your connection and try again.",
    allProposalsRejected: "All proposals rejected",
    allProposalsRejectedDescription: "All proposals have been rejected and cleared from the session.",
    errorRejectingProposals: "Error",
    errorRejectingProposalsDescription: "Failed to reject all proposals. Please try again.",
    characters: "characters",
    acceptedStatus: "Accepted",
    editedStatus: "Edited",
    deletedStatus: "Deleted",
    pendingStatus: "Pending",
    editProposal: "Edit proposal",
    deleteProposal: "Delete proposal",
    saveEdits: "Save edits",
    cancelEdits: "Cancel edits",
    saveCompleted: "Save completed",
    saveCompletedDescription: "Review the results of saving your flashcards and proceed to study.",
    flashcardSaved: "flashcard saved",
    flashcardsSaved: "flashcards saved",
    flashcardSkipped: "flashcard skipped",
    flashcardsSkipped: "flashcards skipped",
    skippedDescription: "These flashcards were not saved because they already exist or have validation errors.",
    skippedReason: "Reason: {reason}",
    andMore: "...and {count} more flashcards",
    goToStudy: "Go to study",
    flashcardsReadyForStudy: "Your flashcards are now ready for study!",
    noFlashcardsSaved: "No flashcards were saved.",
    skippedItemsCanBeReviewed: "Skipped items can be reviewed and edited if needed.",
    cacheRestored: "Cache restored",
    sessionExpiresIn: "Session expires in {time}",
    clearCache: "Clear cache",
    duplicatesBannerTitle: "{count} {count, plural, one {flashcard was} other {flashcards were}} skipped",
    duplicatesBannerDescription:
      "These flashcards were not saved because they already exist or have validation errors.",
    clearCacheButton: "Clear Cache",
    flashcardWas: "flashcard was",
    flashcardsWere: "flashcards were",
    skipped: "skipped",

    // Settings
    studySettings: "Study Settings",
    interfacePreferences: "Interface Preferences",
    settingsLoadError: "Failed to load settings. Please try again.",
    settingsSaveError: "Failed to save settings. Please try again.",
    loadingSettings: "Loading settings...",
    settingsSaved: "Settings saved successfully",
    dailyGoal: "Daily Goal",
    dailyGoalDescription: "Number of cards to study per day (1-200)",
    dailyGoalError: "Daily goal must be between 1 and 200",
    newLimit: "New Cards Limit",
    newLimitDescription: "Maximum new cards per day (0-50)",
    newLimitError: "New cards limit must be between 0 and 50",

    // Account Management
    accountManagement: "Account Management",
    accountManagementDescription: "Manage your account settings and security",
    accountInformation: "Account Information",
    accountInformationDescription: "Your current account details and session information",
    lastSignIn: "Last Sign In",
    userId: "User ID",
    sessionActive: "Active Session",
    changePassword: "Change Password",
    changePasswordDescription:
      "Update your password to keep your account secure. You will be signed out from all devices after changing your password.",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    currentPasswordRequired: "Current password is required",
    newPasswordRequired: "New password is required",
    newPasswordMinLength: "New password must be at least 8 characters",
    newPasswordDifferent: "New password must be different from current password",
    incorrectCurrentPassword: "Incorrect current password",
    passwordChanged: "Password changed",
    passwordChangedDescription: "Please log in again with your new password.",
    changingPassword: "Changing Password...",
    signOut: "Sign Out",
    signOutDescription:
      "Sign out of your account. You can choose to sign out from this device only or from all devices.",
    signOutScope: "Sign Out Scope",
    thisDeviceOnly: "This device only",
    allDevices: "All devices",
    thisDeviceDescription: "Sign out from this device only. You'll remain signed in on other devices.",
    allDevicesDescription: "Sign out from all devices. You'll need to sign in again on all devices.",
    signingOut: "Signing Out...",
    dangerZone: "Danger Zone",
    dangerZoneDescription: "Irreversible actions that will permanently affect your account",
    deleteAccount: "Delete Account",
    deleteAccountDescription: "Permanently delete your account and all associated data. This action cannot be undone.",
    deleteAccountConsequences:
      "This action cannot be undone. This will permanently delete your account and remove all your data.",
    deleteAccountConsequencesList:
      "All your flashcards will be permanently deleted,Your learning progress will be lost,Your account settings will be removed,You will be signed out from all devices",
    deleteAccountButton: "Delete My Account",
    deleteAccountModalTitle: "Delete Account",
    deleteAccountModalDescription:
      "This action cannot be undone. This will permanently delete your account and remove all your data.",
    deleteAccountPassword: "Your Password",
    deleteAccountPasswordPlaceholder: "Enter your password to confirm",
    deleteAccountConfirmPhrase: 'Type "delete" to confirm',
    deleteAccountConfirmPhrasePlaceholder: "delete",
    deleteAccountConfirmPhraseDescription: 'Type "delete" to confirm you understand this action is irreversible.',
    deleteAccountCooldown: "Please wait {time} seconds before you can delete your account.",
    deleteAccountCooldownDescription: "Please wait for the cooldown to finish",
    deleteAccountPasswordRequired: "Password is required",
    deleteAccountConfirmPhraseError: "Please type 'delete' to confirm deletion",
    deletingAccount: "Deleting Account...",
    accountDeleted: "Account deleted",
    accountDeletedDescription: "Your account has been permanently deleted.",
    checkingSession: "Checking session...",
    sessionSecureMessage: "Your session is active and secure. You can manage your account settings below.",
  },
  pl: {
    // Landing page
    title: "Opanuj dowolny temat z powtórkami rozłożonymi w czasie",
    subtitle: "Twórz fiszki, ucz się efektywnie i śledź dzienny postęp.",
    ctaLogin: "Zaloguj",
    ctaSignup: "Zarejestruj",
    languageLabel: "Język",
    policy: "Prywatność i regulamin",

    // Auth
    login: "Zaloguj się",
    signup: "Załóż konto",
    loginTitle: "Zaloguj się",
    signupTitle: "Załóż konto",
    loginSubtitle: "Wprowadź swoje dane, aby kontynuować",
    signupSubtitle: "Utwórz nowe konto, aby rozpocząć naukę",
    noAccount: "Nie masz konta?",
    haveAccount: "Masz już konto?",
    email: "Email",
    password: "Hasło",
    confirmPassword: "Potwierdź hasło",
    emailRequired: "Email jest wymagany",
    passwordRequired: "Hasło jest wymagane",
    confirmPasswordRequired: "Potwierdzenie hasła jest wymagane",
    invalidEmail: "Nieprawidłowy adres email",
    invalidEmailFormat: "Nieprawidłowy format email",
    passwordTooShort: "Hasło musi mieć co najmniej 8 znaków",
    passwordsMustMatch: "Hasła muszą być identyczne",
    invalidCredentials: "Nieprawidłowy email lub hasło",
    accountCreated: "Konto zostało utworzone",
    accountCreatedButLoginFailed: "Konto zostało utworzone, ale wystąpił problem z logowaniem. Spróbuj się zalogować.",
    registrationError: "Wystąpił błąd podczas rejestracji",
    emailAlreadyExists: "Konto z tym adresem email już istnieje",
    weakPassword: "Hasło jest za słabe",
    showPassword: "Pokaż hasło",
    hidePassword: "Ukryj hasło",

    // Navigation
    settings: "Ustawienia",
    logout: "Wyloguj",
    user: "Użytkownik",

    // Flashcards
    myFlashcards: "Moje fiszki",
    manageFlashcards: "Zarządzaj swoimi fiszkami i dodawaj nowe",
    addFlashcard: "Dodaj fiszkę",
    addFlashcardDescription: "Utwórz nową fiszkę ręcznie. Wprowadź treść z przodu i z tyłu.",
    editFlashcard: "Edytuj fiszkę",
    deleteFlashcard: "Usuń fiszkę",
    noFlashcards: "Brak fiszek",
    addFirstFlashcard: "Dodaj swoją pierwszą fiszkę lub wygeneruj je za pomocą AI",
    front: "Przód",
    back: "Tył",
    frontPlaceholder: "Wprowadź tekst z przodu...",
    backPlaceholder: "Wprowadź tekst z tyłu...",
    source: "Źródło",
    created: "Utworzono",
    actions: "Akcje",
    save: "Zapisz",
    cancel: "Anuluj",
    close: "Zamknij",
    delete: "Usuń",
    edit: "Edytuj",
    undo: "Cofnij",
    undoDelete: "Cofnij usunięcie",
    undoTimeLeft: "Pozostało czasu",

    // Study
    studyNow: "Ucz się teraz",
    startStudy: "Rozpocznij naukę",
    noCardsToStudy: "Brak fiszek do nauki",
    checkingCards: "Sprawdzanie dostępnych fiszek...",
    studyQueue: "Kolejka nauki",
    cardsAvailable: "fiszek dostępnych",
    dueForReview: "do powtórki",
    newCards: "nowych fiszek",
    dailyProgress: "Dzienny postęp",
    increaseGoal: "Zwiększ cel",
    increaseDailyGoal: "Zwiększ dzienny cel",
    newDailyGoal: "Nowy dzienny cel",
    currentGoal: "Obecny cel: {goal} powtórek dziennie",
    goalUpdated: "Cel zaktualizowany",
    goalUpdateFailed: "Nie udało się zaktualizować celu",
    goalUpdateDescription: "Dzienny cel ustawiony na {goal} powtórek",
    goalUpdateErrorDescription: "Wystąpił nieoczekiwany błąd",
    updating: "Aktualizowanie...",
    updateGoal: "Zaktualizuj cel",
    question: "Pytanie",
    answer: "Odpowiedź",
    noAnswerProvided: "Brak odpowiedzi",
    showAnswer: "Pokaż odpowiedź",
    card: "Fiszka",
    due: "Do powtórki",
    howWellDidYouKnow: "Jak dobrze to znałeś?",
    rateYourKnowledge: "Oceń swoją wiedzę, aby zaplanować następną powtórkę",
    again: "Znowu",
    againDescription: "Wcale tego nie znałem",
    hard: "Trudne",
    hardDescription: "Znałem to, ale było trudne",
    good: "Dobrze",
    goodDescription: "Znałem to dobrze",
    easy: "Łatwe",
    easyDescription: "Znałem to bardzo dobrze",
    press: "Naciśnij {key}",
    processingRating: "Przetwarzanie oceny...",
    studySessionComplete: "Sesja nauki zakończona!",
    studySessionCompleteDescription: "Przejrzałeś wszystkie dostępne fiszki na dziś.",
    manageFlashcards: "Zarządzaj fiszkami",
    generateNewCards: "Generuj nowe fiszki",
    failedToLoadStudyQueue: "Nie udało się załadować kolejki nauki",
    loadingStudyQueue: "Ładowanie kolejki nauki...",
    initializingStudySession: "Inicjalizacja sesji nauki...",
    tryAgain: "Spróbuj ponownie",
    pendingReviews: "Oczekujące powtórki",
    pendingReviewsDescription:
      "{count} powtórk{count, plural, one {a} other {i}} oczekuje na synchronizację gdy będziesz online.",
    rating: "Ocena",
    keyboardShortcuts: "Skróty klawiaturowe",
    keyboardShortcutsDescription:
      "Użyj tych skrótów klawiaturowych, aby efektywniej nawigować i wchodzić w interakcję z fiszkami.",
    key: "Klawisz",
    action: "Akcja",
    revealAnswer: "Pokaż odpowiedź",
    rateAgain: "Ocena: Znowu (0)",
    rateHard: "Ocena: Trudne (1)",
    rateGood: "Ocena: Dobrze (2)",
    rateEasy: "Ocena: Łatwe (3)",
    showHelp: "Pokaż pomoc",
    progress: "Postęp",
    reviewsCompleted: "powtórek ukończonych",

    // Pagination
    showing: "Pokazano",
    showingItems: "Pokazuję {start}–{end} z {total} elementów",
    of: "z",
    items: "elementów",
    previous: "Poprzednia",
    next: "Następna",
    sorting: "Sortowanie",
    newest: "Najnowsze",
    pageInfo: "Strona {page} z {total}",

    // Messages
    loading: "Ładowanie...",
    loadingError: "Błąd ładowania",
    tryAgain: "Spróbuj ponownie",
    error: "Błąd",
    success: "Sukces",
    addFlashcardError: "Nie udało się dodać fiszki",
    unexpectedError: "Wystąpił nieoczekiwany błąd",
    adding: "Dodawanie...",
    saving: "Zapisywanie...",
    flashcardAdded: "Fiszka została dodana",
    flashcardUpdated: "Fiszka została zaktualizowana",
    flashcardDeleted: "Fiszka została usunięta",
    flashcardRestored: "Fiszka została przywrócona",

    // Validation
    required: "To pole jest wymagane",
    minLength: "Minimalna długość to {min} znaków",
    maxLength: "Maksymalna długość to {max} znaków",
    frontRequired: "Tekst z przodu jest wymagany",
    backRequired: "Tekst z tyłu jest wymagany",
    frontBackDifferent: "Przód i tył muszą być różne",
    integer: "Musi być liczbą całkowitą",
    range: "Musi być między {min} a {max}",

    // Sources
    manual: "Ręczne",
    ai: "AI",
    aiEdited: "AI (edytowane)",
    import: "Import",

    // Generate
    generateTitle: "Generuj fiszki z tekstu",
    generateSubtitle:
      "Wklej tekst źródłowy (1000-10000 znaków) i wygeneruj fiszki z pomocą AI. Możesz ustawić liczbę propozycji i śledzić postęp generacji w czasie rzeczywistym.",
    sourceText: "Tekst źródłowy",
    sourceTextPlaceholder: "Wklej tutaj tekst źródłowy (1000-10000 znaków)...",
    sourceTextRequirements: "Wymagania:",
    proposalsCount: "Liczba propozycji",
    proposalsCountDescription: "Wybierz liczbę fiszek do wygenerowania. Większa liczba może zająć więcej czasu.",
    generateButton: "Generuj fiszki",
    generatingButton: "Generowanie...",
    cancelButton: "Anuluj",
    generateShortcut: "Ctrl+Enter",
    minCharacters: "Minimum {min} znaków",
    maxCharacters: "Maksimum {max} znaków",
    useShortcut: "Użyj Ctrl+Enter aby szybko uruchomić generację",
    generationStatus: "Status generacji",
    streaming: "Streaming",
    batch: "Batch",
    receivedProposals: "Otrzymane propozycje:",
    generatedFlashcards: "Generowane fiszki:",
    receivingProposals: "Otrzymuję propozycje...",
    processingRequest: "Przetwarzam żądanie...",
    streamingDescription: "Fiszki są generowane w czasie rzeczywistym",
    batchDescription: "Generowanie może potrwać kilka sekund",
    fallbackMessage: "Strumieniowanie niedostępne, przełączono na tryb batch...",
    activeSessionTitle: "Aktywna sesja propozycji",
    activeSessionDescription: "Znaleziono aktywną sesję propozycji z poprzedniej generacji.",
    whatWillHappen: "Co się stanie?",
    willHappenList:
      "Rozpoczęcie nowej generacji wyczyści poprzednie propozycje,Niezapisane fiszki zostaną utracone,Sesja propozycji zostanie zresetowana",
    recommendation: "Zalecenie",
    recommendationDescription:
      "Przejdź do widoku propozycji, aby przejrzeć i zapisać wygenerowane fiszki, zanim rozpoczniesz nową generację.",
    continue: "Kontynuuj",
    validationFailed: "Błąd walidacji",
    unauthorized: "Brak autoryzacji",
    unauthorizedDescription: "Twoja sesja wygasła. Zostaniesz przekierowany do logowania.",
    tooManyRequests: "Zbyt wiele żądań",
    tooManyRequestsDescription: "Przekroczono limit żądań. Spróbuj ponownie za chwilę.",
    connectionProblem: "Problem z połączeniem",
    connectionProblemDescription: "Serwer nie odpowiada. Sprawdź połączenie i spróbuj ponownie.",
    generationFailed: "Błąd generacji",
    networkOffline: "Brak połączenia z internetem",
    networkOfflineDescription: "Niektóre funkcje mogą być niedostępne.",
    retry: "Spróbuj ponownie",
    dismiss: "Zamknij",

    // Review Proposals
    reviewProposalsTitle: "Przejrzyj propozycje",
    reviewProposalsSubtitle: "Przejrzyj i zapisz wygenerowane fiszki",
    noProposalsSession: "Brak sesji propozycji",
    noProposalsSessionDescription: "Wygeneruj fiszki, aby rozpocząć",
    selectAll: "Zaznacz wszystkie",
    selectedOf: "{selected} z {total} zaznaczonych",
    accepted: "zaakceptowane",
    deleted: "usunięte",
    saveAccepted: "Zapisz zaakceptowane ({count})",
    saveAll: "Zapisz wszystkie",
    rejectAll: "Odrzuć wszystkie",
    rejectAllTitle: "Odrzuć wszystkie propozycje",
    rejectAllDescription:
      "Czy na pewno chcesz odrzucić wszystkie propozycje? Tej akcji nie można cofnąć i wyczyści wszystkie wygenerowane fiszki z sesji.",
    rejectAllConfirm: "Odrzuć wszystkie",
    noItemsToSave: "Brak elementów do zapisania",
    noItemsToSaveDescription: "Zaakceptuj propozycje przed zapisaniem.",
    allProposalsDeleted: "Wszystkie propozycje usunięte",
    allProposalsDeletedDescription: "Wszystkie propozycje zostały usunięte.",
    saveSuccessful: "Zapisano pomyślnie",
    saveFailed: "Błąd zapisu",
    networkError: "Błąd sieci",
    networkErrorDescription: "Sprawdź połączenie i spróbuj ponownie.",
    allProposalsRejected: "Wszystkie propozycje odrzucone",
    allProposalsRejectedDescription: "Wszystkie propozycje zostały odrzucone i wyczyszczone z sesji.",
    errorRejectingProposals: "Błąd",
    errorRejectingProposalsDescription: "Nie udało się odrzucić wszystkich propozycji. Spróbuj ponownie.",
    characters: "znaków",
    acceptedStatus: "Zaakceptowana",
    editedStatus: "Edytowana",
    deletedStatus: "Usunięta",
    pendingStatus: "Oczekująca",
    editProposal: "Edytuj propozycję",
    deleteProposal: "Usuń propozycję",
    saveEdits: "Zapisz edycje",
    cancelEdits: "Anuluj edycje",
    saveCompleted: "Zapisywanie zakończone",
    saveCompletedDescription: "Przejrzyj wyniki zapisywania fiszek i przejdź do nauki.",
    flashcardSaved: "fiszka zapisana",
    flashcardsSaved: "fiszek zapisanych",
    flashcardSkipped: "fiszka pominięta",
    flashcardsSkipped: "fiszek pominiętych",
    skippedDescription: "Te fiszki nie zostały zapisane, ponieważ już istnieją lub mają błędy walidacji.",
    skippedReason: "Powód: {reason}",
    andMore: "...i {count} więcej fiszek",
    goToStudy: "Przejdź do nauki",
    flashcardsReadyForStudy: "Twoje fiszki są gotowe do nauki!",
    noFlashcardsSaved: "Nie zapisano żadnych fiszek.",
    skippedItemsCanBeReviewed: "Pominięte elementy można przejrzeć i edytować w razie potrzeby.",
    cacheRestored: "Pamięć podręczna przywrócona",
    sessionExpiresIn: "Sesja wygasa za {time}",
    clearCache: "Wyczyść pamięć podręczną",
    duplicatesBannerTitle: "{count} {count, plural, one {fiszka została} other {fiszek zostało}} pominiętych",
    duplicatesBannerDescription: "Te fiszki nie zostały zapisane, ponieważ już istnieją lub mają błędy walidacji.",
    clearCacheButton: "Wyczyść pamięć podręczną",
    flashcardWas: "fiszka została",
    flashcardsWere: "fiszek zostało",
    skipped: "pominiętych",

    // Settings
    studySettings: "Ustawienia nauki",
    interfacePreferences: "Preferencje interfejsu",
    settingsLoadError: "Nie udało się załadować ustawień. Spróbuj ponownie.",
    settingsSaveError: "Nie udało się zapisać ustawień. Spróbuj ponownie.",
    loadingSettings: "Ładowanie ustawień...",
    settingsSaved: "Ustawienia zostały zapisane",
    dailyGoal: "Dzienny cel",
    dailyGoalDescription: "Liczba fiszek do nauki dziennie (1-200)",
    dailyGoalError: "Dzienny cel musi być między 1 a 200",
    newLimit: "Limit nowych fiszek",
    newLimitDescription: "Maksymalna liczba nowych fiszek dziennie (0-50)",
    newLimitError: "Limit nowych fiszek musi być między 0 a 50",

    // Account Management
    accountManagement: "Zarządzanie kontem",
    accountManagementDescription: "Zarządzaj ustawieniami konta i bezpieczeństwem",
    accountInformation: "Informacje o koncie",
    accountInformationDescription: "Twoje aktualne dane konta i informacje o sesji",
    lastSignIn: "Ostatnie logowanie",
    userId: "ID użytkownika",
    sessionActive: "Aktywna sesja",
    changePassword: "Zmień hasło",
    changePasswordDescription:
      "Zaktualizuj hasło, aby zachować bezpieczeństwo konta. Zostaniesz wylogowany ze wszystkich urządzeń po zmianie hasła.",
    currentPassword: "Obecne hasło",
    newPassword: "Nowe hasło",
    confirmNewPassword: "Potwierdź nowe hasło",
    currentPasswordRequired: "Obecne hasło jest wymagane",
    newPasswordRequired: "Nowe hasło jest wymagane",
    newPasswordMinLength: "Nowe hasło musi mieć co najmniej 8 znaków",
    newPasswordDifferent: "Nowe hasło musi być inne od obecnego",
    incorrectCurrentPassword: "Nieprawidłowe obecne hasło",
    passwordChanged: "Hasło zostało zmienione",
    passwordChangedDescription: "Zaloguj się ponownie używając nowego hasła.",
    changingPassword: "Zmienianie hasła...",
    signOut: "Wyloguj się",
    signOutDescription:
      "Wyloguj się z konta. Możesz wybrać wylogowanie tylko z tego urządzenia lub ze wszystkich urządzeń.",
    signOutScope: "Zakres wylogowania",
    thisDeviceOnly: "Tylko to urządzenie",
    allDevices: "Wszystkie urządzenia",
    thisDeviceDescription: "Wyloguj się tylko z tego urządzenia. Pozostaniesz zalogowany na innych urządzeniach.",
    allDevicesDescription:
      "Wyloguj się ze wszystkich urządzeń. Będziesz musiał zalogować się ponownie na wszystkich urządzeniach.",
    signingOut: "Wylogowywanie...",
    dangerZone: "Strefa niebezpieczeństwa",
    dangerZoneDescription: "Nieodwracalne akcje, które trwale wpłyną na Twoje konto",
    deleteAccount: "Usuń konto",
    deleteAccountDescription: "Trwale usuń konto i wszystkie powiązane dane. Tej akcji nie można cofnąć.",
    deleteAccountConsequences: "Tej akcji nie można cofnąć. To trwale usunie Twoje konto i wszystkie dane.",
    deleteAccountConsequencesList:
      "Wszystkie Twoje fiszki zostaną trwale usunięte,Twój postęp w nauce zostanie utracony,Twoje ustawienia konta zostaną usunięte,Zostaniesz wylogowany ze wszystkich urządzeń",
    deleteAccountButton: "Usuń moje konto",
    deleteAccountModalTitle: "Usuń konto",
    deleteAccountModalDescription: "Tej akcji nie można cofnąć. To trwale usunie Twoje konto i wszystkie dane.",
    deleteAccountPassword: "Twoje hasło",
    deleteAccountPasswordPlaceholder: "Wprowadź hasło, aby potwierdzić",
    deleteAccountConfirmPhrase: 'Wpisz "delete", aby potwierdzić',
    deleteAccountConfirmPhrasePlaceholder: "delete",
    deleteAccountConfirmPhraseDescription:
      'Wpisz "delete", aby potwierdzić, że rozumiesz, że ta akcja jest nieodwracalna.',
    deleteAccountCooldown: "Poczekaj {time} sekund, zanim będziesz mógł usunąć konto.",
    deleteAccountCooldownDescription: "Poczekaj na zakończenie cooldown",
    deleteAccountPasswordRequired: "Hasło jest wymagane",
    deleteAccountConfirmPhraseError: "Wpisz 'delete', aby potwierdzić usunięcie",
    deletingAccount: "Usuwanie konta...",
    accountDeleted: "Konto zostało usunięte",
    accountDeletedDescription: "Twoje konto zostało trwale usunięte.",
    checkingSession: "Sprawdzanie sesji...",
    sessionSecureMessage: "Twoja sesja jest aktywna i bezpieczna. Możesz zarządzać ustawieniami konta poniżej.",
  },
};

export function t(key: keyof AppCopy, lang: LanguageCode = DEFAULT_LANGUAGE): string {
  return appCopy[lang]?.[key] || appCopy[DEFAULT_LANGUAGE][key] || key;
}

export function tWithParams(
  key: keyof AppCopy,
  params: Record<string, string | number>,
  lang: LanguageCode = DEFAULT_LANGUAGE
): string {
  let text = t(key, lang);
  Object.entries(params).forEach(([param, value]) => {
    text = text.replace(`{${param}}`, String(value));
  });
  return text;
}
