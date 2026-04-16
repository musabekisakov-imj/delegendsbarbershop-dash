import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../store/auth-store';
import { authApi } from '../lib/api';
import { initializeMockData } from '../lib/mock-data';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScissorsIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';

export function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuthStore();
  const [email, setEmail] = useState('admin@barberpro.com');
  const [password, setPassword] = useState('password');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize mock data on first load
    initializeMockData();
    
    // Redirect if already authenticated
    if (isAuthenticated) {
      navigate('/overview');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authApi.login(email, password);
      login(response.user, response.token);
      toast.success('Welcome back!');
      navigate('/overview');
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <ScissorsIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">BarberPro</h1>
          <p className="mt-2 text-sm text-gray-600">Barbershop Management Dashboard</p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-xl font-semibold text-gray-900">Sign in to your account</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="mt-1"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-blue-50 p-4">
            <p className="text-xs text-blue-900">
              <strong>Demo credentials:</strong> Any email and password will work for this prototype.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          BarberPro Dashboard v2 — April 2026
        </p>
      </div>
    </div>
  );
}
