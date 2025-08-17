// Typy pomocnicze dla formularzy autoryzacji zgodnie z planem implementacji

export type LoginFormValues = {
  email: string;
  password: string;
};

export type SignupFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

export type FieldErrors<T> = Partial<Record<keyof T | "form", string>>;

export type AuthFormState<T> = {
  values: T;
  errors: FieldErrors<T>;
  isSubmitting: boolean;
  redirectTo?: string;
};
