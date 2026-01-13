import React, { useState } from 'react';
import { X, Server, Key, Lock } from 'lucide-react';
import { type SSHConnectionInput } from '../hooks/useSSHConnections';   

interface ConnectionFormProps {
  onSubmit: (data: SSHConnectionInput) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<SSHConnectionInput>;
  isEditing?: boolean;
}

const ConnectionForm: React.FC<ConnectionFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  isEditing = false,
}) => {
  const [formData, setFormData] = useState<SSHConnectionInput>({
    name: initialData?.name || '',
    host: initialData?.host || '',
    port: initialData?.port || 22,
    username: initialData?.username || '',
    auth_type: initialData?.auth_type || 'password',
    password: '',
    private_key: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value) || 22 : value,
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-2xl border border-dark-600 w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-dark-600">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Server className="w-5 h-5 text-accent-cyan" />
            {isEditing ? 'Bağlantıyı Düzenle' : 'Yeni SSH Bağlantısı'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Bağlantı Adı
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Örn: Production Server"
              className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Host
              </label>
              <input
                type="text"
                name="host"
                value={formData.host}
                onChange={handleChange}
                placeholder="192.168.1.1 veya example.com"
                className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Port
              </label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                placeholder="22"
                className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="root"
              className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Kimlik Doğrulama Yöntemi
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="auth_type"
                  value="password"
                  checked={formData.auth_type === 'password'}
                  onChange={handleChange}
                  className="w-4 h-4 text-accent-cyan"
                />
                <Lock className="w-4 h-4 text-gray-400" />
                <span>Şifre</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="auth_type"
                  value="key"
                  checked={formData.auth_type === 'key'}
                  onChange={handleChange}
                  className="w-4 h-4 text-accent-cyan"
                />
                <Key className="w-4 h-4 text-gray-400" />
                <span>SSH Key</span>
              </label>
            </div>
          </div>

          {formData.auth_type === 'password' ? (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Şifre
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-colors"
                required={!isEditing}
              />
              {isEditing && (
                <p className="text-xs text-gray-500 mt-1">
                  Değiştirmek istemiyorsanız boş bırakın
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Private Key
              </label>
              <textarea
                name="private_key"
                value={formData.private_key}
                onChange={handleChange}
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                rows={4}
                className="w-full px-4 py-3 bg-dark-900 border border-dark-600 rounded-lg focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-colors font-mono text-sm"
                required={!isEditing}
              />
              {isEditing && (
                <p className="text-xs text-gray-500 mt-1">
                  Değiştirmek istemiyorsanız boş bırakın
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 border border-dark-600 rounded-lg hover:bg-dark-600 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-accent-cyan text-dark-900 font-medium rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Kaydediliyor...' : isEditing ? 'Güncelle' : 'Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectionForm;
