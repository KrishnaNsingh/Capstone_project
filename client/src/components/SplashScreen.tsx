import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  children: React.ReactNode;
}

export default function SplashScreen({ children }: SplashScreenProps) {
  const [showSplash, setShowSplash] = useState(true);

  // Auto-hide splash screen after initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {children}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
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
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  duration: 0.5
                }}
                className="rounded-xl bg-primary/10 p-6"
              >
                <div className="h-12 w-12 rounded-lg bg-primary" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: 0.2,
                  duration: 0.5
                }}
                className="text-lg font-semibold text-foreground"
              >
                PDF Chat
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ 
                  delay: 0.4,
                  duration: 0.5
                }}
                className="text-sm text-muted-foreground"
              >
                Loading your AI assistant...
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}