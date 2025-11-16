import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function useThemeTransition() {
  const { theme } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousTheme, setPreviousTheme] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Initialize previousTheme on first render
    if (previousTheme === undefined && theme) {
      setPreviousTheme(theme);
      return;
    }

    // Detect theme change and trigger transition
    if (theme && previousTheme && theme !== previousTheme) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 500); // Match this to your splash screen animation duration
      return () => clearTimeout(timer);
    }
    
    setPreviousTheme(theme);
  }, [theme, previousTheme]);

  return { isTransitioning, theme };
}