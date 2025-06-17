'use client'
import React, { useEffect, useRef, useState } from "react";

const WS_URL = "ws://localhost:8000/ws/client123"; 

const WebSocketAudioRecorder = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const connectWebSocket = () => {
    wsRef.current = new WebSocket(WS_URL);

    wsRef.current.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    wsRef.current.onclose = () => {
      console.log("🔌 WebSocket disconnected");
    };

    wsRef.current.onerror = (e) => {
      console.error("❌ WebSocket error", e);
    };

    wsRef.current.onmessage = (event) => {
      if (event.data instanceof Blob) {
        const audioBlob = new Blob([event.data], { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } else {
        try {
          const message = JSON.parse(event.data);
          console.log("🔔 Message from server:", message);
        } catch {
          console.log("📥 Unknown message format", event.data);
        }
      }
    };
  };

  const startRecording = async () => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000,
    });

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContextRef.current.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (isPaused) return;

      const input = e.inputBuffer.getChannelData(0); // mono
      const pcmData = float32ToInt16(input);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(pcmData);
      }
    };

    source.connect(processor);
    processor.connect(audioContextRef.current.destination);

    setIsRecording(true);
    setIsPaused(false);
  };

  const stopRecording = () => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioContextRef.current?.close();
    wsRef.current?.close();

    setIsRecording(false);
    setIsPaused(false);
  };

  const pauseRecording = () => {
    setIsPaused(true);
  };

  const resumeRecording = () => {
    setIsPaused(false);
  };

  const float32ToInt16 = (buffer: Float32Array) => {
    const int16Buffer = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return new Uint8Array(int16Buffer.buffer);
  };

  useEffect(() => {
    connectWebSocket();
    return () => stopRecording();
  }, []);

  return (
    <div className="p-4 text-center">
      <h2 className="text-xl font-bold mb-4">🎙️ WebSocket Audio Recorder</h2>
      <div className="flex justify-center gap-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-6 py-2 rounded text-white ${isRecording ? "bg-red-600" : "bg-green-600"}`}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>

        {isRecording && (
          <>
            <button
              onClick={pauseRecording}
              disabled={isPaused}
              className="px-6 py-2 rounded bg-yellow-500 text-white disabled:opacity-50"
            >
              Pause
            </button>
            <button
              onClick={resumeRecording}
              disabled={!isPaused}
              className="px-6 py-2 rounded bg-blue-500 text-white disabled:opacity-50"
            >
              Resume
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default WebSocketAudioRecorder;
