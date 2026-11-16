import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { socket } from './socket';
import './theme.css';

function Hello() {
  const [connected, setConnected] = useState(socket.connected);
  const [players, setPlayers] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      const sent = Date.now();
      socket.emit('ping', () => setLatency(Date.now() - sent));
    };
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('stats', (s) => setPlayers(s.connected));
    if (socket.connected) onConnect();
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('stats');
    };
  }, []);

  return (
    <main className="hello">
      <h1>Zrada</h1>
      <p className="lead">Ahoj! Tohle je kostra hry.</p>
      <p className={connected ? 'status ok' : 'status wait'}>
        {connected ? 'Spojeno se serverem' : 'Připojuji se…'}
      </p>
      {connected && (
        <p className="muted">
          Připojených zařízení: {players ?? '…'}
          {latency !== null && <> · odezva {latency} ms</>}
        </p>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Hello />
  </StrictMode>,
);
