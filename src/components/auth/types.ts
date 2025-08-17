// Typy pomocnicze dla formularzy autoryzacji zgodnie z planem implementacji

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface SignupFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

export type FieldErrors<T> = Partial<Record<keyof T | "form", string>>;

export interface AuthFormState<T> {
  values: T;
  errors: FieldErrors<T>;
  isSubmitting: boolean;
  redirectTo?: string;
}
