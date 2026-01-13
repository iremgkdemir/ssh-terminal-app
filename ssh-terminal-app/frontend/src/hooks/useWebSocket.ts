import { useState, useRef, useCallback, useEffect } from 'react';
import { getWebSocketURL } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface WebSocketMessage {
  type: 'output' | 'status' | 'error';
  message?: string;
  data?: string;
}

interface UseWebSocketTerminalOptions {
  connectionId: number;
  onOutput?: (data: string) => void;
  onStatus?: (message: string) => void;
  onError?: (message: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const useWebSocketTerminal = ({
  connectionId,
  onOutput,
  onStatus,
  onError,
  onConnect,
  onDisconnect,
}: UseWebSocketTerminalOptions) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) return;

    setIsConnecting(true);
    
    const wsUrl = getWebSocketURL(connectionId, user.id);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'output':
            if (message.data) {
              onOutput?.(message.data);
            }
            break;
          case 'status':
            if (message.message) {
              onStatus?.(message.message);
            }
            break;
          case 'error':
            if (message.message) {
              onError?.(message.message);
            }
            break;
        }
      } catch (e) {
        // Handle non-JSON messages
        console.error('Failed to parse WebSocket message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.('WebSocket connection error');
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      onDisconnect?.();
      wsRef.current = null;
    };

    wsRef.current = ws;
  }, [connectionId, user, onOutput, onStatus, onError, onConnect, onDisconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const sendInput = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data }));
    }
  }, []);

  const sendResize = useCallback((cols: number, rows: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendInput,
    sendResize,
  };
};
