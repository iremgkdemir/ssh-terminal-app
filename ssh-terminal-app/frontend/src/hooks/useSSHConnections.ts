import { useState, useEffect, useCallback } from 'react';
import { sshAPI } from '../lib/api';

export interface SSHConnection {
  id: number;
  user_id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: string;
  created_at: string;
  updated_at: string;
}

export interface SSHConnectionInput {
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: string;
  password?: string;
  private_key?: string;
}

export const useSSHConnections = () => {
  const [connections, setConnections] = useState<SSHConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await sshAPI.getConnections();
      setConnections(response.data.connections || []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Bağlantılar yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const createConnection = async (data: SSHConnectionInput) => {
    const response = await sshAPI.createConnection(data);
    setConnections(prev => [response.data.connection, ...prev]);
    return response.data.connection;
  };

  const updateConnection = async (id: number, data: SSHConnectionInput) => {
    const response = await sshAPI.updateConnection(id, data);
    setConnections(prev =>
      prev.map(conn => (conn.id === id ? response.data.connection : conn))
    );
    return response.data.connection;
  };

  const deleteConnection = async (id: number) => {
    await sshAPI.deleteConnection(id);
    setConnections(prev => prev.filter(conn => conn.id !== id));
  };

  const testConnection = async (id: number) => {
    const response = await sshAPI.testConnection(id);
    return response.data;
  };

  return {
    connections,
    isLoading,
    error,
    fetchConnections,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
  };
};