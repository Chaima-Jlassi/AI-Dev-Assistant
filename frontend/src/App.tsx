import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import AgentPage from "./pages/AgentPage";
import ExtensionPage from "./pages/ExtensionPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import LearnMoreIndexPage from "./pages/LearnMoreIndexPage";
import LearnMoreDetailPage from "./pages/LearnMoreDetailPage";
import NotFound from "./pages/NotFound";
import { isLoggedIn } from "@/lib/auth";

const queryClient = new QueryClient();


const Protected = ({ children }: { children: React.ReactNode }) => {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
};


const GuestOnly = ({ children }: { children: React.ReactNode }) => {
  return !isLoggedIn() ? <>{children}</> : <Navigate to="/agent" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>

        {/* Public routes */}
        <Route path="/login"  element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><SignupPage /></GuestOnly>} />

        {/* All other routes — with Navbar */}
        <Route path="/*" element={
          <>
            <Navbar />
            <Routes>
              <Route path="/"          element={<Index />} />
              <Route path="/extension" element={<ExtensionPage />} />
              <Route path="/learn-more" element={<LearnMoreIndexPage />} />
              <Route path="/learn-more/:topic" element={<LearnMoreDetailPage />} />
              <Route path="/agent"     element={<Protected><AgentPage /></Protected>} />
              <Route path="*"          element={<NotFound />} />
            </Routes>
          </>
        } />

      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
