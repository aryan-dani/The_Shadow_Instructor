import { useState, useEffect, useRef, useCallback } from "react";

export type Message = {
  role: "user" | "interviewer" | "instructor";
  content: string;
  timestamp?: number;
};

export type SimulationState = {
  isConnected: boolean;
  messages: Message[];
  instructorFeedback: Message[];
  sendMessage: (content: string) => void;
  sendAudio: (data: Blob) => void;
  connect: () => void;
  disconnect: () => void;
};

import { WS_BASE_URL } from "../utils/api";

export const useSimulationSocket = (
  baseUrl: string = WS_BASE_URL + "/ws/simulation",
  scenario: string,
): SimulationState => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [instructorFeedback, setInstructorFeedback] = useState<Message[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  // Audio Context for playback
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )({
        sampleRate: 24000,
      });
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    } else if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }
  }, []);

  const playAudioChunk = useCallback(
    async (data: ArrayBuffer) => {
      if (!audioContextRef.current) initAudioContext();
      const ctx = audioContextRef.current!;

      try {
        const int16Array = new Int16Array(data);
        const float32Array = new Float32Array(int16Array.length);

        for (let i = 0; i < int16Array.length; i++) {
          float32Array[i] = int16Array[i] / 32768;
        }

        const buffer = ctx.createBuffer(1, float32Array.length, 24000);
        buffer.getChannelData(0).set(float32Array);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);

        const currentTime = ctx.currentTime;
        const startTime = Math.max(currentTime, nextStartTimeRef.current);

        source.start(startTime);
        nextStartTimeRef.current = startTime + buffer.duration;
      } catch (e) {
        console.error("Audio playback error:", e);
      }
    },
    [initAudioContext],
  );

  const sendMessage = useCallback((content: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({ role: "user", content });
      socketRef.current.send(payload);

      const userMsg: Message = { role: "user", content, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
    }
  }, []);

  const sendAudio = useCallback((data: Blob) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(data);
    }
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current) return;

    const ws = new WebSocket(`${baseUrl}?scenario=${scenario}`);
    ws.binaryType = "arraybuffer";
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        playAudioChunk(event.data);
        return;
      }

      try {
        const data = JSON.parse(event.data);

        const incomingMessage: Message = {
          role: data.role,
          content: data.content,
          timestamp: data.timestamp || Date.now(),
        };

        if (incomingMessage.role === "instructor") {
          setInstructorFeedback((prev) => [...prev, incomingMessage]);
        } else {
          setMessages((prev) => [...prev, incomingMessage]);
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;
    };

    ws.onerror = () => {
      setIsConnected(false);
    };
  }, [baseUrl, scenario, playAudioChunk]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setIsConnected(false);
      setMessages([]);
      setInstructorFeedback([]);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    messages,
    instructorFeedback,
    sendMessage,
    sendAudio,
    connect,
    disconnect,
  };
};
