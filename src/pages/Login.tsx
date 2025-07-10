import React, { useState, useRef } from 'react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';
import { Layout } from '../components/Layout';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaUrl, setCaptchaUrl] = useState('/captcha?' + Date.now());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captchaImgRef = useRef<HTMLImageElement>(null);

  const refreshCaptcha = () => {
    setCaptchaUrl('/captcha?' + Date.now());
    setCaptcha('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.post('/api/login', {
        username,
        password,
        captcha,
      });
      setLoading(false);
      window.location.href = '/';
    } catch (err: any) {
      setLoading(false);
      setError(err.response?.data?.error || 'Login failed');
      refreshCaptcha();
    }
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm">
          <h2 className="text-xl font-bold mb-6 text-center">Login</h2>
          {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium">Username</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium">Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border rounded"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="mb-4 flex items-center">
            <img
              ref={captchaImgRef}
              src={captchaUrl}
              alt="captcha"
              className="h-10 w-32 border rounded mr-2 cursor-pointer"
              onClick={refreshCaptcha}
              title="Click to refresh"
            />
            <button type="button" onClick={refreshCaptcha} className="text-xs text-blue-600 underline">Refresh</button>
          </div>
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium">Enter Captcha</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded"
              value={captcha}
              onChange={e => setCaptcha(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default LoginPage; 