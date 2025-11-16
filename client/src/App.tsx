import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ChatPage from "@/pages/ChatPage";
import { ThemeProvider } from "next-themes";
import SplashScreen from "@/components/SplashScreen";
import { ThemeTransitionProvider } from "@/components/ThemeTransitionProvider";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider 
      defaultTheme="system" 
      enableSystem 
      attribute="class"
    >
      <ThemeTransitionProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <SplashScreen>
              <Toaster />
              <Router />
            </SplashScreen>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeTransitionProvider>
    </ThemeProvider>
  );
}

export default App;