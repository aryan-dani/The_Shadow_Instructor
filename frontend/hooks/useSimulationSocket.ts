import { useState, useEffect, useRef, useCallback } from 'react';

// Types based on backend/models/schemas.py
export type Message = {
  role: 'user' | 'interviewer' | 'instructor';
  content: string;
  timestamp?: number;
};

export type SimulationState = {
  isConnected: boolean;
  messages: Message[]; // Chat history (User + Interviewer)
  instructorFeedback: Message[]; // Shadow comments
  sendMessage: (content: string) => void;
};

export const useSimulationSocket = (url: string = 'ws://localhost:8000/ws/simulation') => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [instructorFeedback, setInstructorFeedback] = useState<Message[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

  // Function to send messages
  const sendMessage = useCallback((content: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // Backend expects a JSON string, likely just the content or a wrapper
      // Based on standard simple websocket implementations, usually we send just a wrapper
      // I'll assume we send: { role: "user", content: "..." }
      const payload = JSON.stringify({ role: 'user', content });
      socketRef.current.send(payload);
      
      // Optimistically add user message to UI
      const userMsg: Message = { role: 'user', content, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    // Initialize WebSocket
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to Shadow Instructor Simulation');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different message types based on 'role'
        // Assuming the backend sends back a Message object structure
        const incomingMessage: Message = {
          role: data.role,
          content: data.content,
          timestamp: data.timestamp || Date.now()
        };

        if (incomingMessage.role === 'instructor') {
          setInstructorFeedback((prev) => [...prev, incomingMessage]);
        } else {
          // Interviewer or system messages go to main chat
          setMessages((prev) => [...prev, incomingMessage]);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from Shadow Instructor Simulation');
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    // Cleanup
    return () => {
      ws.close();
    };
  }, [url]);

  return {
    isConnected,
    messages,
    instructorFeedback,
    sendMessage
  };
};
