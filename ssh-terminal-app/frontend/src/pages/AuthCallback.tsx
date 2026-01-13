import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../lib/api';
import { Terminal } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthData } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login?error=' + error);
      return;
    }

    if (token) {
      localStorage.setItem('token', token);
      
      authAPI.getMe()
        .then(response => {
          setAuthData(response.data.user, token);
          navigate('/');
        })
        .catch(() => {
          localStorage.removeItem('token');
          navigate('/login?error=auth_failed');
        });
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, setAuthData]);

  return (
    <div className="min-h-screen flex items-center justify-center grid-bg">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-cyan/10 rounded-2xl mb-4">
          <Terminal className="w-8 h-8 text-accent-cyan animate-pulse" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Giriş yapılıyor...</h2>
        <p className="text-gray-500">Lütfen bekleyin</p>
        <div className="mt-6">
          <div className="w-8 h-8 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;
