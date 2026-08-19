import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import Home from '@/pages/home';

// We don't have a not-found page yet, let's just make a simple one or use Home for everything.
function NotFound() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-ink text-text-primary">
      <h1 className="font-display text-2xl">404 - Not Found</h1>
    </div>
  );
}

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
