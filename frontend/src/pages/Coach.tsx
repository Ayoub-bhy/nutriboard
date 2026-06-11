import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { ChatMessage } from '../api/types';

const today = () => new Date().toISOString().slice(0, 10);
const QUICKS = ['What should I eat now?', 'Check my protein', 'I hit my water', 'Log my weight 79 kg', 'Give me a tip'];

export default function Coach() {
  const [date] = useState(today());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [snapHash, setSnapHash] = useState('');
  const [lastSeen, setLastSeen] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'ai' | 'rule'>('rule');
  const endRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    const { snapshot, messages } = await api.getCoach(date);
    setMessages(messages);
    setSnapHash(JSON.stringify(snapshot));
  };
  useEffect(() => { refresh(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const inSync = snapHash !== '' && snapHash === lastSeen;

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    try {
      const r = await api.sendCoach(date, text);
      setMode(r.mode);
      await refresh();
      const { snapshot } = await api.getCoach(date);
      setLastSeen(JSON.stringify(snapshot));
    } finally { setBusy(false); }
  };

  const syncNow = async () => { await refresh(); setLastSeen(snapHash); };

  return (
    <div className="grid">
      <section className="card col-8">
        <h2>💬 Your Nutrition Coach — {mode === 'ai' ? 'live AI ⚡' : 'built-in coach'}</h2>
        <div className={'sync ' + (inSync ? 'ok' : 'no')}>
          <span className="badge" />
          <span>{inSync ? "In sync — I've reviewed your latest logs ✓" : "Out of sync — you've logged things I haven't reviewed yet."}</span>
          <button className="btn sm" style={{ marginLeft: 'auto' }} onClick={syncNow}>Sync now</button>
        </div>
        <div className="msgs">
          {messages.length === 0 && <div className="msg coach">Hi! I'm your coach. Tell me what you ate, your weight, or how you feel and I'll keep your tracking honest.</div>}
          {messages.map((m, i) => (
            <div key={i} className={'msg ' + (m.role === 'user' ? 'user' : 'coach')}>
              {m.text}{m.createdAt && <div className="hint" style={{ margin: '6px 0 0' }}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>}
            </div>
          ))}
          {busy && <div className="msg coach">…thinking</div>}
          <div ref={endRef} />
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 10 }}>
          {QUICKS.map((q) => <div key={q} className="pill" style={{ cursor: 'pointer' }} onClick={() => send(q)}>{q}</div>)}
        </div>
        <div className="chatin">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send(input)} placeholder="Tell your coach anything…" />
          <button className="btn" onClick={() => send(input)} disabled={busy}>Send</button>
        </div>
      </section>
      <section className="card col-4">
        <h2>ℹ️ How the coach works</h2>
        <p className="hint" style={{ marginTop: 0 }}>The coach reads your live logs from the API and replies with specific, numbers-based guidance. It can log your weight straight from chat ("79 kg") and suggest meals from your remaining budget.</p>
        <div className="motiv">Set <code>ANTHROPIC_API_KEY</code> on the backend to upgrade replies to a live Claude model — the app falls back to the built-in coach automatically.</div>
      </section>
    </div>
  );
}
