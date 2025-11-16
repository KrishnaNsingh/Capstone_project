import { useEffect, useState, createContext, useContext } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";

interface ThemeTransitionContextType {
  isTransitioning: boolean;
  startTransition: () => void;
}

const ThemeTransitionContext = createContext<ThemeTransitionContextType | undefined>(undefined);

export function useThemeTransitionContext() {
  const context = useContext(ThemeTransitionContext);
  if (context === undefined) {
    throw new Error("useThemeTransitionContext must be used within a ThemeTransitionProvider");
  }
  return context;
}

export function ThemeTransitionProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousTheme, setPreviousTheme] = useState<string | undefined>(undefined);

  // Detect theme changes
  useEffect(() => {
    if (!theme) return;
    
    // Initialize previous theme
    if (previousTheme === undefined) {
      setPreviousTheme(theme);
      return;
    }

    // Detect theme change
    if (theme !== previousTheme) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setIsTransitioning(false);
      }, 800); // Longer duration for smoother transition
      return () => clearTimeout(timer);
    }
    
    setPreviousTheme(theme);
  }, [theme, previousTheme]);

  const startTransition = () => {
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 800);
    return () => clearTimeout(timer);
  };

  return (
    <ThemeTransitionContext.Provider value={{ isTransitioning, startTransition }}>
      {children}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
            style={{ 
              backdropFilter: 'blur(0px)',
              WebkitBackdropFilter: 'blur(0px)'
            }}
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  duration: 0.3
                }}
                className="rounded-xl bg-primary/10 p-6"
              >
                <div className="h-12 w-12 rounded-lg bg-primary" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ 
                  duration: 0.3,
                  delay: 0.1
                }}
                className="text-lg font-semibold text-foreground"
              >
                Switching theme...
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ThemeTransitionContext.Provider>
  );
}