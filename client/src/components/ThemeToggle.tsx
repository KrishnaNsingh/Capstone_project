import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useThemeTransitionContext } from "@/components/ThemeTransitionProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { startTransition } = useThemeTransitionContext();
  const [mounted, setMounted] = useState(false);

  // When mounted on client, set mounted to true
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        data-testid="button-theme-toggle"
        className="h-9 w-9 opacity-0"
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const toggleTheme = () => {
    startTransition();
    // Add a small delay to ensure the transition animation starts before theme change
    setTimeout(() => {
      setTheme(theme === "light" ? "dark" : "light");
    }, 100);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
      className="h-9 w-9"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}