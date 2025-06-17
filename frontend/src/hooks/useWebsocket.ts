import { ConnectionStatus, WebSocketMessage } from "@/types/type";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseWebSocketProps {
  url: string;
  clientId: string;
  onMessage: (data: WebSocketMessage) => void;
  onConnectionChange: (status: ConnectionStatus) => void;
}

export const useWebSocket = ({
  url,
  clientId,
  onMessage,
  onConnectionChange
}: UseWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    onConnectionChange("connecting");

    try {
      wsRef.current = new WebSocket(`${url}/ws/${clientId}`);

      wsRef.current.binaryType = "arraybuffer"; // Enable binary data support

      wsRef.current.onopen = () => {
        setIsConnected(true);
        onConnectionChange("connected");

        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000);
      };

      wsRef.current.onmessage = (event) => {
        if (typeof event.data === "string") {
          try {
            const data: WebSocketMessage = JSON.parse(event.data);
            onMessage(data);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        } else {
          // If you want to handle incoming binary messages too
          console.warn("Received binary data via WebSocket, not handled.");
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        onConnectionChange("disconnected");

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        onConnectionChange("disconnected");
      };
    } catch (error) {
      console.error("Failed to connect:", error);
      onConnectionChange("disconnected");
    }
  }, [url, clientId, onMessage, onConnectionChange]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    onConnectionChange("disconnected");
  }, [onConnectionChange]);

  const sendMessage = useCallback((message: any): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const sendRawBytes = useCallback((data: ArrayBuffer | Uint8Array): boolean => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendMessage,
    sendRawBytes,
    isConnected
  };
};
