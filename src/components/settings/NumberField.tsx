import React, { useId } from "react";
import { Label } from "../ui/label";

export interface NumberFieldProps {
  label: string;
  value: number | "";
  onChange: (value: number | "") => void;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  error?: string;
  inputId?: string;
}

export const NumberField = React.memo(function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  description,
  error,
  inputId,
}: NumberFieldProps) {
  const generatedId = useId();
  const id = inputId || generatedId;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty string
    if (inputValue === "") {
      onChange("");
      return;
    }

    // Only allow digits, minus sign (for negative numbers), and decimal point
    const sanitizedValue = inputValue.replace(/[^0-9.-]/g, "");

    // Prevent multiple decimal points or minus signs
    const decimalCount = (sanitizedValue.match(/\./g) || []).length;
    const minusCount = (sanitizedValue.match(/-/g) || []).length;

    if (decimalCount > 1 || minusCount > 1) {
      return; // Don't update if invalid
    }

    // Only allow minus at the beginning
    if (minusCount === 1 && !sanitizedValue.startsWith("-")) {
      return; // Don't update if minus is not at the beginning
    }

    const numValue = Number(sanitizedValue);

    // Only allow valid numbers
    if (!Number.isNaN(numValue)) {
      onChange(numValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter, arrow keys
    if ([8, 9, 27, 13, 37, 38, 39, 40].includes(e.keyCode)) {
      return;
    }

    // Allow: numbers, decimal point, minus sign
    if (/[0-9.-]/.test(e.key)) {
      // Prevent multiple decimal points
      if (e.key === "." && e.currentTarget.value.includes(".")) {
        e.preventDefault();
        return;
      }

      // Prevent multiple minus signs
      if (e.key === "-" && e.currentTarget.value.includes("-")) {
        e.preventDefault();
        return;
      }

      // Only allow minus at the beginning
      if (e.key === "-" && e.currentTarget.selectionStart !== 0) {
        e.preventDefault();
        return;
      }

      return;
    }

    // Block all other keys
    e.preventDefault();
  };

  const handleBlur = () => {
    // Convert empty string to 0 for min=0 fields, or validate range
    if (value === "") {
      if (min === 0) {
        onChange(0);
      } else if (min !== undefined) {
        onChange(min);
      }
    }
  };

  const hasError = !!error;
  const describedBy = [description && descriptionId, error && errorId].filter(Boolean).join(" ");

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </Label>

      <input
        id={id}
        type="number"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        aria-describedby={describedBy || undefined}
        aria-invalid={hasError}
        className={`
          flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background 
          file:border-0 file:bg-transparent file:text-sm file:font-medium 
          placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 
          focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
          ${hasError ? "border-red-500 focus-visible:ring-red-500" : ""}
        `}
      />

      {(description || error) && (
        <div className="space-y-1">
          {description && (
            <p id={descriptionId} className="text-sm text-gray-500">
              {description}
            </p>
          )}
          {error && (
            <p id={errorId} className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
});
