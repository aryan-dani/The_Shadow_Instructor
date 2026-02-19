import { useEffect, useRef, useState } from "react";
import { WS_BASE_URL } from "../utils/api";

export type ShadowFeedback = {
  type: "feedback";
  category: "vision" | "audio";
  message: string;
  level: "info" | "warning" | "alert";
};

export function useShadowObserver({
  isConnected,
  videoRef,
  latestTranscript,
  persona = "friendly",
}: {
  isConnected: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  latestTranscript: string;
  persona?: "tough" | "friendly" | "faang" | "roast";
}) {
  const [feedback, setFeedback] = useState<ShadowFeedback | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const lastTranscriptRef = useRef<string>("");

  // Connect to Shadow WebSocket
  useEffect(() => {
    if (!isConnected) {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      return;
    }

    const wsUrl = `${WS_BASE_URL}/ws/shadow?persona=${persona}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "feedback") {
          setFeedback(data);
          setTimeout(() => setFeedback(null), 5000);
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    return () => {
      ws.close();
    };
  }, [isConnected]);

  // Monitor Transcript Pacing
  useEffect(() => {
    if (
      !isConnected ||
      !socketRef.current ||
      socketRef.current.readyState !== WebSocket.OPEN
    )
      return;

    if (latestTranscript.length > lastTranscriptRef.current.length + 50) {
      const diff = latestTranscript.slice(lastTranscriptRef.current.length);
      socketRef.current.send(
        JSON.stringify({ type: "transcript", text: diff }),
      );
      lastTranscriptRef.current = latestTranscript;
    }
  }, [latestTranscript, isConnected]);

  // Monitor Visuals (Eye Contact) — every 2 seconds
  useEffect(() => {
    if (!isConnected || !videoRef.current) return;

    const interval = setInterval(() => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN)
        return;
      if (!videoRef.current || !videoRef.current.videoWidth) return;

      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
        socketRef.current.send(JSON.stringify({ type: "frame", data: base64 }));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnected, videoRef]);

  return { feedback };
}
