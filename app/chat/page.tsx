'use client';

import { useState } from 'react';
import { useWebLLMEngine } from '@/components/providers/WebLLMProvider';
import { ModelStatus } from '@/lib/types';
import { MODELS } from '@/lib/webllm/models';

export default function ChatPage() {
  const engine = useWebLLMEngine();
  const [status, setStatus] = useState<ModelStatus>(ModelStatus.UNLOADED);
  const [progressText, setProgressText] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  async function handleLoadModel() {
    setStatus(ModelStatus.LOADING);
    try {
      await engine.load(MODELS['low'].id, (report) => {
        setProgressText(report.text);
      });
      setStatus(ModelStatus.READY);
      setProgressText('Model ready.');
    } catch (err) {
      setStatus(ModelStatus.ERROR);
      setProgressText('Failed: ' + String(err));
    }
  }

  async function handleSend() {
    if (!input.trim() || isStreaming) return;
    const userMsg = { role: 'user', content: input.trim() };
    const history = [...messages, userMsg];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setIsStreaming(true);
    try {
      let response = '';
      for await (const token of engine.streamCompletion(history)) {
        response += token;
        setMessages([...history, { role: 'assistant', content: response }]);
      }
    } catch (err) {
      setMessages([...history, { role: 'assistant', content: 'Error: ' + String(err) }]);
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1>VoidChats — Day 1</h1>

      <div style={{ marginBottom: '1rem', color: '#888' }}>
        Status: <strong>{status}</strong>
        {progressText && <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>{progressText}</div>}
      </div>

      {status === ModelStatus.UNLOADED && (
        <button onClick={handleLoadModel} style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}>
          Load Model (~800MB first time)
        </button>
      )}

      <div style={{
        border: '1px solid #333', minHeight: '300px', maxHeight: '500px',
        overflowY: 'auto', padding: '1rem', marginBottom: '1rem', background: '#0a0a0a',
      }}>
        {messages.length === 0
          ? <div style={{ color: '#444' }}>Load model then type a message...</div>
          : messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: '1rem', color: msg.role === 'user' ? '#60a5fa' : '#a3e635' }}>
              <strong>{msg.role}:</strong> {msg.content}
              {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && <span>▋</span>}
            </div>
          ))
        }
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          type="text" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={status !== ModelStatus.READY || isStreaming}
          placeholder={status === ModelStatus.READY ? 'Type a message...' : 'Load model first'}
          style={{ flex: 1, padding: '0.5rem', background: '#111', color: '#fff', border: '1px solid #333' }}
        />
        <button onClick={handleSend} disabled={status !== ModelStatus.READY || isStreaming}
          style={{ padding: '0.5rem 1rem' }}>
          {isStreaming ? 'Thinking...' : 'Send'}
        </button>
      </div>
    </div>
  );
}