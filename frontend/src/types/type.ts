export interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  audio?: string;
}

export interface WebSocketMessage {
  type: string;
  message?: string;
  text?: string;
  audio_data?: string;
  format?: string;
  timestamp?: string;
  stage?: string;
  client_id?: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'processing';
