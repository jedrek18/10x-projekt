import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePreferredLanguage } from "@/lib/usePreferredLanguage";
import type { LanguageCode } from "@/lib/i18n-landing";

export interface LanguageSelectorProps {
  value?: LanguageCode;
  onChange?: (lang: LanguageCode) => void;
}

export function LanguageSelector(props: LanguageSelectorProps) {
  const { language, setLanguage } = usePreferredLanguage();

  const current = props.value ?? language;

  useEffect(() => {
    if (props.value && props.value !== language) {
      setLanguage(props.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value]);

  function handleChange(next: string) {
    const code = next as LanguageCode;
    setLanguage(code);
    props.onChange?.(code);
  }

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="min-w-28" aria-label="Language selector" aria-controls="language-live-region">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent className="z-[9999] min-w-32">
        <SelectItem value="en">English (EN)</SelectItem>
        <SelectItem value="pl">Polski (PL)</SelectItem>
      </SelectContent>
    </Select>
  );
}

export default LanguageSelector;


