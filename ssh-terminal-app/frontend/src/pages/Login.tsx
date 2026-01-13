import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../lib/api';
import { Terminal, Mail, Lock, Chrome } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Giriş başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    authAPI.googleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 grid-bg">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-cyan/10 rounded-2xl mb-4">
            <Terminal className="w-8 h-8 text-accent-cyan" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">SSH Terminal</h1>
          <p className="text-gray-500 mt-2">Hesabınıza giriş yapın</p>
        </div>

        {/* Login Form */}
        <div className="bg-dark-800 border border-dark-600 rounded-2xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@email.com"
                  className="w-full pl-12 pr-4 py-3 bg-dark-900 border border-dark-600 rounded-lg focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-dark-900 border border-dark-600 rounded-lg focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-accent-cyan text-dark-900 font-semibold rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-dark-800 text-gray-500">veya</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 border border-dark-600 rounded-lg hover:bg-dark-700 transition-colors"
          >
            <Chrome className="w-5 h-5 text-gray-400" />
            <span>Google ile Giriş Yap</span>
          </button>

          <p className="mt-6 text-center text-gray-500">
            Hesabınız yok mu?{' '}
            <Link to="/register" className="text-accent-cyan hover:underline">
              Kayıt olun
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
