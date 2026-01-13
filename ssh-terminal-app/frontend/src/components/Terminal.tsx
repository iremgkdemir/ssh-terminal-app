import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { useWebSocketTerminal } from '../hooks/useWebSocket';
import { type SSHConnection } from '../hooks/useSSHConnections';
import { X, Maximize2, Minimize2 } from 'lucide-react';

interface TerminalProps {
  connection: SSHConnection;
  onClose: () => void;
}

const Terminal: React.FC<TerminalProps> = ({ connection, onClose }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string>('Bağlanıyor...');

  const handleOutput = useCallback((data: string) => {
    if (xtermRef.current) {
      xtermRef.current.write(data);
    }
  }, []);

  const handleStatus = useCallback((message: string) => {
    setStatusMessage(message);
    if (xtermRef.current) {
      xtermRef.current.writeln(`\r\n\x1b[33m[${message}]\x1b[0m\r\n`);
    }
  }, []);

  const handleError = useCallback((message: string) => {
    setStatusMessage(`Hata: ${message}`);
    if (xtermRef.current) {
      xtermRef.current.writeln(`\r\n\x1b[31m[Hata: ${message}]\x1b[0m\r\n`);
    }
  }, []);

  const handleConnect = useCallback(() => {
    setStatusMessage('Bağlandı');
  }, []);

  const handleDisconnect = useCallback(() => {
    setStatusMessage('Bağlantı kesildi');
    if (xtermRef.current) {
      xtermRef.current.writeln('\r\n\x1b[31m[Bağlantı kesildi]\x1b[0m\r\n');
    }
  }, []);

  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendInput,
    sendResize,
  } = useWebSocketTerminal({
    connectionId: connection.id,
    onOutput: handleOutput,
    onStatus: handleStatus,
    onError: handleError,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
  });

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle: 'block',
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      theme: {
        background: '#0a0a0f',
        foreground: '#e0e0e0',
        cursor: '#00d4ff',
        cursorAccent: '#0a0a0f',
        selectionBackground: '#00d4ff40',
        black: '#0a0a0f',
        red: '#ff6b6b',
        green: '#00ff88',
        yellow: '#ffd93d',
        blue: '#00d4ff',
        magenta: '#a855f7',
        cyan: '#00d4ff',
        white: '#e0e0e0',
        brightBlack: '#4a4a5a',
        brightRed: '#ff8585',
        brightGreen: '#33ff99',
        brightYellow: '#ffe066',
        brightBlue: '#33ddff',
        brightMagenta: '#bb77ff',
        brightCyan: '#33ddff',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Handle input
    xterm.onData((data) => {
      sendInput(data);
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();
        const { cols, rows } = xtermRef.current;
        sendResize(cols, rows);
      }
    };

    window.addEventListener('resize', handleResize);

    // Connect to SSH
    connect();

    // Initial message
    xterm.writeln('\x1b[36m╔══════════════════════════════════════════════╗\x1b[0m');
    xterm.writeln('\x1b[36m║\x1b[0m  \x1b[1;33mSSH Terminal\x1b[0m                               \x1b[36m║\x1b[0m');
    xterm.writeln(`\x1b[36m║\x1b[0m  \x1b[32m${connection.username}@${connection.host}:${connection.port}\x1b[0m`);
    xterm.writeln('\x1b[36m╚══════════════════════════════════════════════╝\x1b[0m');
    xterm.writeln('');

    return () => {
      window.removeEventListener('resize', handleResize);
      disconnect();
      xterm.dispose();
    };
  }, [connection, connect, disconnect, sendInput, sendResize]);

  // Handle fullscreen toggle
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
        if (xtermRef.current) {
          const { cols, rows } = xtermRef.current;
          sendResize(cols, rows);
        }
      }, 100);
    }
  }, [isFullscreen, sendResize]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-50'
          : 'h-[600px]'
      } bg-dark-900 rounded-xl border border-dark-600 overflow-hidden flex flex-col`}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark-800 border-b border-dark-600">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-sm font-mono text-gray-400">
            {connection.name} - {connection.username}@{connection.host}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <span
            className={`text-xs px-2 py-1 rounded ${
              isConnected
                ? 'bg-green-500/20 text-green-400'
                : isConnecting
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {statusMessage}
          </span>
          
          <button
            onClick={toggleFullscreen}
            className="p-1.5 hover:bg-dark-600 rounded transition-colors"
            title={isFullscreen ? 'Küçült' : 'Tam Ekran'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-gray-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
            title="Kapat"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-hidden"
        style={{ padding: '8px' }}
      />
    </div>
  );
};

export default Terminal;
