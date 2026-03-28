// app/chat/page.tsx
'use client';

import { useState } from 'react';
import { useWebLLMEngine } from '@/components/providers/WebLLMProvider';
import { useDeviceCapability } from '@/hooks/useDeviceCapability';
import { DeviceCheck } from '@/components/loading/DeviceCheck';
import { ModelLoader } from '@/components/loading/ModelLoader';
import { ModelStatus } from '@/lib/types';

export default function ChatPage() {
  const engine = useWebLLMEngine();
  const deviceProfile = useDeviceCapability();
  const [modelStatus, setModelStatus] = useState<ModelStatus>(ModelStatus.UNLOADED);
  const [errorMsg, setErrorMsg] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Wait for device detection
  if (!deviceProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-zinc-500 text-sm">Checking device...</p>
      </div>
    );
  }

  // WebGPU gate
  if (!deviceProfile.hasWebGPU) {
    return <DeviceCheck hasWebGPU={false}>{null}</DeviceCheck>;
  }

  // Loading screen
  if (modelStatus === ModelStatus.UNLOADED || modelStatus === ModelStatus.LOADING) {
    return (
      <ModelLoader
        model={deviceProfile.selectedModel}
        onLoad={(onProgress) => engine.load(deviceProfile.selectedModel.id, onProgress)}
        onReady={() => setModelStatus(ModelStatus.READY)}
        onError={(err) => {
          setErrorMsg(err);
          setModelStatus(ModelStatus.ERROR);
        }}
      />
    );
  }

  // Error state
  if (modelStatus === ModelStatus.ERROR) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="max-w-sm text-center px-8">
          <p className="text-red-400 text-sm font-medium mb-2">Failed to load model</p>
          <p className="text-zinc-500 text-xs mb-6">{errorMsg}</p>
          <button
            onClick={() => setModelStatus(ModelStatus.UNLOADED)}
            className="text-white bg-zinc-800 hover:bg-zinc-700 text-sm px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Chat UI (temporary inline version — will be replaced Day 3)
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
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <h1 className="text-white font-medium">VoidChats</h1>
          <span className="text-zinc-500 text-xs">
            {deviceProfile.selectedModel.displayName} · local
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center mt-20">
              <p className="text-zinc-600 text-sm">
                Your conversation stays on this device.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xl px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 text-zinc-100'
              }`}>
                {msg.content}
                {isStreaming && i === messages.length - 1 && msg.role === 'assistant' && (
                  <span className="inline-block w-1.5 h-4 bg-zinc-400 ml-0.5 animate-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isStreaming}
            placeholder="Message VoidChats..."
            className="flex-1 bg-zinc-900 text-white text-sm px-4 py-3 rounded-xl border border-zinc-800 focus:outline-none focus:border-zinc-600 placeholder-zinc-600 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="bg-white text-black text-sm font-medium px-5 py-3 rounded-xl hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}