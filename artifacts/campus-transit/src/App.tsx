import { type ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Workspace, LoginPage, SetupPage } from '@/components/Workspace';
import { Route, Switch, useLocation, Router as WouterRouter, Link } from 'wouter';
import { Bus, ArrowRight } from 'lucide-react';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15000, retry: 1 } } });

function Protected({ role }: { role: 'admin' | 'driver' | 'student' }) {
  const { user, profile, loading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!loading) {
      if (!user || !profile) setLocation('/login');
      else if (profile.role !== role) setLocation(`/${profile.role}`);
    }
  }, [loading, user, profile, role, setLocation]);
  if (loading || !user || !profile || profile.role !== role) return <div className="loading-screen"><span className="brand-mark"><Bus /></span><div className="skeleton-line" /><span>Checking your campus access…</span></div>;
  return <Workspace role={role} />;
}
function Router() {
  const [location, setLocation] = useLocation();
  const { user, profile, loading } = useAuth();
  useEffect(() => {
    if (location === '/' && !loading) setLocation(user && profile ? `/${profile.role}` : '/login');
  }, [location, loading, user, profile, setLocation]);
  if (!isSupabaseConfigured && location !== '/login' && location !== '/register') return <SetupPage />;
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/login"><LoginPage /></Route>
    <Route path="/register"><LoginPage register /></Route>
    <Route path="/admin"><Protected role="admin" /></Route>
    <Route path="/admin/:section">{() => <Protected role="admin" />}</Route>
    <Route path="/driver"><Protected role="driver" /></Route>
    <Route path="/student"><Protected role="student" /></Route>
    <Route path="/"><div className="loading-screen"><span className="brand-mark"><Bus /></span>Opening your workspace…</div></Route>
    <Route><main className="not-found"><span className="brand-mark"><Bus /></span><span className="eyebrow">404 · OFF ROUTE</span><h1>This page isn’t on the map.</h1><p>Check the address or return to your workspace.</p><Link className="button primary" href="/">Back to workspace <ArrowRight size={16} /></Link></main></Route>
  </Switch></ErrorBoundary>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><AuthProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Router /></RoutedErrorBoundary></WouterRouter></AuthProvider><Toaster /></TooltipProvider></QueryClientProvider>;
}
export default App;
