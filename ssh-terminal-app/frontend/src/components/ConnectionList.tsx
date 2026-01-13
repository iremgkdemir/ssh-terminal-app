import React from 'react';
import { Server, Play, Trash2, Edit, Wifi, WifiOff } from 'lucide-react';
import { type SSHConnection } from '../hooks/useSSHConnections';
interface ConnectionListProps {
  connections: SSHConnection[];
  onConnect: (connection: SSHConnection) => void;
  onEdit: (connection: SSHConnection) => void;
  onDelete: (connection: SSHConnection) => void;
  onTest: (connection: SSHConnection) => void;
  testingId?: number | null;
  testResults?: { [key: number]: { success: boolean; message: string } };
}

const ConnectionList: React.FC<ConnectionListProps> = ({
  connections,
  onConnect,
  onEdit,
  onDelete,
  onTest,
  testingId,
  testResults = {},
}) => {
  if (connections.length === 0) {
    return (
      <div className="text-center py-16">
        <Server className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-400 mb-2">
          Henüz SSH bağlantısı yok
        </h3>
        <p className="text-gray-500">
          Yeni bir SSH bağlantısı ekleyerek başlayın
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {connections.map(connection => {
        const testResult = testResults[connection.id];
        const isTesting = testingId === connection.id;

        return (
          <div
            key={connection.id}
            className="bg-dark-800 border border-dark-600 rounded-xl p-5 hover:border-dark-500 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-cyan/10 rounded-lg flex items-center justify-center">
                  <Server className="w-5 h-5 text-accent-cyan" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{connection.name}</h3>
                  <p className="text-sm text-gray-500">
                    {connection.username}@{connection.host}
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-gray-500 bg-dark-900 px-2 py-1 rounded">
                :{connection.port}
              </span>
            </div>

            {testResult && (
              <div
                className={`mb-4 p-2 rounded-lg text-sm flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}
              >
                {testResult.success ? (
                  <Wifi className="w-4 h-4" />
                ) : (
                  <WifiOff className="w-4 h-4" />
                )}
                <span className="truncate">{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => onConnect(connection)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-cyan text-dark-900 font-medium rounded-lg hover:bg-opacity-90 transition-colors"
              >
                <Play className="w-4 h-4" />
                Bağlan
              </button>
              
              <button
                onClick={() => onTest(connection)}
                disabled={isTesting}
                className="p-2.5 border border-dark-600 rounded-lg hover:bg-dark-600 transition-colors disabled:opacity-50"
                title="Bağlantıyı Test Et"
              >
                {isTesting ? (
                  <div className="w-4 h-4 border-2 border-accent-cyan border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4 text-gray-400" />
                )}
              </button>

              <button
                onClick={() => onEdit(connection)}
                className="p-2.5 border border-dark-600 rounded-lg hover:bg-dark-600 transition-colors"
                title="Düzenle"
              >
                <Edit className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => onDelete(connection)}
                className="p-2.5 border border-dark-600 rounded-lg hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                title="Sil"
              >
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-dark-600 flex items-center justify-between text-xs text-gray-500">
              <span>
                {connection.auth_type === 'password' ? '🔐 Şifre' : '🔑 SSH Key'}
              </span>
              <span>
                {new Date(connection.created_at).toLocaleDateString('tr-TR')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConnectionList;
