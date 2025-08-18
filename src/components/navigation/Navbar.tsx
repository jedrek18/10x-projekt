import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { User, Settings, LogOut, Menu } from "lucide-react";
import { supabaseClient } from "../../db/supabase.client";

import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t } from "../../lib/i18n";

export function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = usePreferredLanguage();

  useEffect(() => {
    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabaseClient.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error("Error getting user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabaseClient.auth.signOut();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSettings = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/settings";
    }
  };

  if (isLoading) {
    return (
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-muted rounded animate-pulse"></div>
            <span className="font-semibold">10x Flashcards</span>
          </div>
        </div>
      </nav>
    );
  }

  if (!user) {
    return null; // Nie pokazuj nawigacji dla niezalogowanych
  }

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <a href="/" className="font-semibold hover:text-blue-600 transition-colors cursor-pointer">
            10x Flashcards
          </a>
        </div>

        <div className="flex items-center space-x-4">
          <a href="/generate" className="text-sm font-medium hover:text-blue-600 transition-colors cursor-pointer">
            {t("generate", language)}
          </a>
          <a href="/study" className="text-sm font-medium hover:text-blue-600 transition-colors cursor-pointer">
            {t("study", language)}
          </a>
          <a href="/ai-tools" className="text-sm font-medium hover:text-blue-600 transition-colors cursor-pointer">
            AI Tools
          </a>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{user.email ? user.email.split("@")[0] : t("user", language)}</span>
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleSettings} className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>{t("settings", language)}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="flex items-center space-x-2 text-destructive">
                <LogOut className="h-4 w-4" />
                <span>{t("logout", language)}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
