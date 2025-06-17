'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Mic, MicOff, Send, Power, PowerOff } from 'lucide-react';
import { clsx } from 'clsx';
import { ConnectionStatus, Message, WebSocketMessage } from '@/types/type';
import { useWebSocket } from '@/hooks/useWebsocket';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8000';

export const VoiceConversation: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      text: 'Welcome to FastAPI Voice Conversation! Click Connect to start.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [textInput, setTextInput] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [statusMessage, setStatusMessage] = useState<string>();
  const [clientId] = useState(() => `client_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const addMessage = useCallback((text: string, type: Message['type'], timestamp?: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type,
      text,
      timestamp: timestamp || new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const playAudio = useCallback((audioData: string) => {
    try {
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioData), c => c.charCodeAt(0))], 
        { type: 'audio/wav' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play().catch(console.error);
        audioRef.current.onended = () => URL.revokeObjectURL(audioUrl);
      }
      
      addMessage('🔊 Playing AI voice response', 'system');
    } catch (error) {
      console.error('Error playing audio:', error);
      addMessage('Error playing audio response', 'system');
    }
  }, [addMessage]);

  const handleWebSocketMessage = useCallback((data: WebSocketMessage) => {
    switch (data.type) {
      case 'connection_established':
        addMessage(data.message || 'Connected to server', 'system', data.timestamp);
        break;
      case 'processing':
        setStatus('processing');
        setStatusMessage(`${data.message} (${data.stage?.toUpperCase()})`);
        break;
      case 'transcription':
        addMessage(`You: ${data.text}`, 'user', data.timestamp);
        break;
      case 'ai_response':
        addMessage(`AI: ${data.text}`, 'ai', data.timestamp);
        break;
      case 'audio_response':
        if (data.audio_data) {
          playAudio(data.audio_data);
        }
        break;
      case 'processing_complete':
        setStatus('connected');
        setStatusMessage('Ready for input');
        break;
      case 'error':
        addMessage(`Error: ${data.message}`, 'system');
        setStatus('connected');
        setStatusMessage('Error occurred');
        break;
      case 'pong':
        console.log('Pong received');
        break;
    }
  }, [addMessage, playAudio]);

  const handleConnectionChange = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    switch (newStatus) {
      case 'connected':
        setStatusMessage('Connected to FastAPI server');
        break;
      case 'connecting':
        setStatusMessage('Connecting...');
        break;
      case 'disconnected':
        setStatusMessage('Disconnected');
        addMessage('Disconnected from server', 'system');
        break;
    }
  }, [addMessage]);

  const { connect, disconnect,sendRawBytes, sendMessage, isConnected } = useWebSocket({
    url: WS_URL,
    clientId,
    onMessage: handleWebSocketMessage,
    onConnectionChange: handleConnectionChange
  });

  const handleAudioData = useCallback(async (audioBlob: Blob) => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioData = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
    //   const sent = sendMessage({
    //     type: 'audio_chunk',
    //     audio_data: audioData
    //   });
    const sent=sendRawBytes(arrayBuffer)

      if (!sent) {
        addMessage('Failed to send audio data', 'system');
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      addMessage('Error processing audio data', 'system');
    }
  }, [sendMessage, addMessage]);

  const { isRecording, isSupported, toggleRecording } = useAudioRecorder({
    onAudioData: handleAudioData
  });

  const handleSendText = useCallback(() => {
    const text = textInput.trim();
    if (!text || !isConnected) return;

    const sent = sendMessage({
      type: 'text_message',
      text
    });

    if (sent) {
      addMessage(`You: ${text}`, 'user');
      setTextInput('');
    } else {
      addMessage('Failed to send message', 'system');
    }
  }, [textInput, isConnected, sendMessage, addMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }, [handleSendText]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🎤 FastAPI Voice Chat
            </h1>
            <p className="text-gray-600">Client ID: {clientId}</p>
          </div>

         

          <div className="flex flex-wrap justify-center gap-4 my-8">
            <button
              onClick={isConnected ? disconnect : connect}
              disabled={status === 'connecting'}
              className={clsx(
                'flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white transition-all duration-300 min-w-[160px] justify-center',
                isConnected 
                  ? 'bg-red-500 hover:bg-red-600 hover:shadow-lg hover:-translate-y-1' 
                  : 'bg-blue-500 hover:bg-blue-600 hover:shadow-lg hover:-translate-y-1',
                status === 'connecting' && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isConnected ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
              {isConnected ? 'Disconnect' : 'Connect'}
            </button>

            <button
              onClick={toggleRecording}
              disabled={!isConnected || !isSupported}
              className={clsx(
                'flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white transition-all duration-300 min-w-[180px] justify-center',
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-green-500 hover:bg-green-600 hover:shadow-lg hover:-translate-y-1',
                (!isConnected || !isSupported) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-5 h-5" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5" />
                  Start Recording
                </>
              )}
            </button>
          </div>

          {/* Text Input */}
          <div className="flex gap-3 mb-8">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              disabled={!isConnected}
              className={clsx(
                'flex-1 px-6 py-4 border-2 border-gray-200 rounded-full text-lg transition-all duration-300 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100',
                !isConnected && 'opacity-50 cursor-not-allowed'
              )}
            />
            <button
              onClick={handleSendText}
              disabled={!isConnected || !textInput.trim()}
              className={clsx(
                'flex items-center gap-2 px-6 py-4 bg-purple-500 text-white rounded-full font-semibold transition-all duration-300 hover:bg-purple-600 hover:shadow-lg hover:-translate-y-1',
                (!isConnected || !textInput.trim()) && 'opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-none'
              )}
            >
              <Send className="w-5 h-5" />
              Send
            </button>
          </div>

         
          <audio ref={audioRef} className="hidden" />

          {/* Warnings */}
          {!isSupported && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800">
              <p className="font-semibold">⚠️ Audio Recording Not Supported</p>
              <p>Your browser doesn't support audio recording. Please use text input instead.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};