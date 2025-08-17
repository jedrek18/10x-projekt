import { useState, useEffect } from "react";

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);
  const [lastError, setLastError] = useState<string | undefined>();

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setLastError(undefined);
    };

    const handleOffline = () => {
      setOnline(false);
    };

    // Ustaw początkowy stan
    setOnline(navigator.onLine);

    // Nasłuchuj zmian stanu sieci
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { online, lastError, setLastError };
}
