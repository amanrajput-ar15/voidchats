'use client';

import { useState } from 'react';
import { useWebLLMEngine } from '@/components/providers/WebLLMProvider';
import { useDeviceCapability } from '@/hooks/useDeviceCapability';
import { DeviceCheck } from '@/components/loading/DeviceCheck';
import { ModelLoader } from '@/components/loading/ModelLoader';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { PassphraseSetup } from '@/components/ui/PassphraseSetup';
import { ModelStatus } from '@/lib/types';

export default function ChatPage() {
  const engine = useWebLLMEngine();
  const deviceProfile = useDeviceCapability();
  const [modelStatus, setModelStatus] = useState<ModelStatus>(
    ModelStatus.UNLOADED
  );
  const [errorMsg, setErrorMsg] = useState('');

  const [passphrase, setPassphrase] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('vc-passphrase');
    }
    return null;
  });

  if (!deviceProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-zinc-500 text-sm">Checking device...</p>
      </div>
    );
  }

  if (!deviceProfile.hasWebGPU) {
    return <DeviceCheck hasWebGPU={false}>{null}</DeviceCheck>;
  }

  if (!passphrase) {
    return (
      <PassphraseSetup
        onPassphraseSet={(p) => setPassphrase(p)}
      />
    );
  }

  if (
    modelStatus === ModelStatus.UNLOADED ||
    modelStatus === ModelStatus.LOADING
  ) {
    return (
      <ModelLoader
        model={deviceProfile.selectedModel}
        selectionReason={deviceProfile.selectionReason}
        onLoad={(onProgress) =>
          engine.load(deviceProfile.selectedModel.id, onProgress)
        }
        onReady={() => setModelStatus(ModelStatus.READY)}
        onError={(err) => {
          setErrorMsg(err);
          setModelStatus(ModelStatus.ERROR);
        }}
      />
    );
  }

  if (modelStatus === ModelStatus.ERROR) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="max-w-sm text-center px-8">
          <p className="text-red-400 text-sm font-medium mb-2">
            Failed to load model
          </p>
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

  return <ChatContainer deviceProfile={deviceProfile} />;
}