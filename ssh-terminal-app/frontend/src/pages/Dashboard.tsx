import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { useSSHConnections} from '../hooks/useSSHConnections';
import { type SSHConnection } from '../hooks/useSSHConnections';
import { type SSHConnectionInput } from '../hooks/useSSHConnections';
import ConnectionList from '../components/ConnectionList';
import ConnectionForm from '../components/ConnectionForm';
import Terminal from '../components/Terminal';

const Dashboard: React.FC = () => {
  const {
    connections,
    isLoading,
    error,
    fetchConnections,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
  } = useSSHConnections();

  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<SSHConnection | null>(null);
  const [activeTerminal, setActiveTerminal] = useState<SSHConnection | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<{
    [key: number]: { success: boolean; message: string };
  }>({});

  const handleCreateConnection = async (data: SSHConnectionInput) => {
    await createConnection(data);
    setShowForm(false);
  };

  const handleUpdateConnection = async (data: SSHConnectionInput) => {
    if (editingConnection) {
      await updateConnection(editingConnection.id, data);
      setEditingConnection(null);
    }
  };

  const handleDeleteConnection = async (connection: SSHConnection) => {
    if (window.confirm(`"${connection.name}" bağlantısını silmek istediğinize emin misiniz?`)) {
      await deleteConnection(connection.id);
      if (activeTerminal?.id === connection.id) {
        setActiveTerminal(null);
      }
    }
  };

  const handleTestConnection = async (connection: SSHConnection) => {
    setTestingId(connection.id);
    setTestResults(prev => ({ ...prev, [connection.id]: undefined as any }));

    try {
      const result = await testConnection(connection.id);
      setTestResults(prev => ({
        ...prev,
        [connection.id]: {
          success: result.success,
          message: result.message || 'Bağlantı başarılı',
        },
      }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [connection.id]: {
          success: false,
          message: err.message || 'Bağlantı başarısız',
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleConnect = (connection: SSHConnection) => {
    setActiveTerminal(connection);
  };

  const handleCloseTerminal = () => {
    setActiveTerminal(null);
  };

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">SSH Bağlantıları</h1>
            <p className="text-gray-500 mt-1">
              Sunucularınıza tek tıkla bağlanın
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchConnections()}
              disabled={isLoading}
              className="p-2.5 border border-dark-600 rounded-lg hover:bg-dark-700 transition-colors disabled:opacity-50"
              title="Yenile"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-cyan text-dark-900 font-medium rounded-lg hover:bg-opacity-90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Yeni Bağlantı
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Terminal View */}
        {activeTerminal && (
          <div className="mb-8">
            <Terminal connection={activeTerminal} onClose={handleCloseTerminal} />
          </div>
        )}

        {/* Loading State */}
        {isLoading && connections.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Bağlantılar yükleniyor...</p>
          </div>
        ) : (
          <ConnectionList
            connections={connections}
            onConnect={handleConnect}
            onEdit={setEditingConnection}
            onDelete={handleDeleteConnection}
            onTest={handleTestConnection}
            testingId={testingId}
            testResults={testResults}
          />
        )}

        {/* Connection Form Modal */}
        {showForm && (
          <ConnectionForm
            onSubmit={handleCreateConnection}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Edit Form Modal */}
        {editingConnection && (
          <ConnectionForm
            onSubmit={handleUpdateConnection}
            onCancel={() => setEditingConnection(null)}
            initialData={editingConnection}
            isEditing
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
