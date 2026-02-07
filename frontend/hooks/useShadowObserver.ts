import { useEffect, useRef, useState, useCallback } from "react";

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
}: {
    isConnected: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    latestTranscript: string;
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

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        // Replace http with ws
        const wsUrl = apiBaseUrl.replace("http", "ws") + "/ws/shadow";

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log("👻 Shadow Observer Connected");
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === "feedback") {
                    setFeedback(data);
                    // Auto-clear feedback after 5 seconds
                    setTimeout(() => setFeedback(null), 5000);
                }
            } catch (e) {
                console.error("Shadow Parse Error", e);
            }
        };

        return () => {
            ws.close();
        };
    }, [isConnected]);

    // 1. Monitor Transcript Pacing (Rambling)
    useEffect(() => {
        if (!isConnected || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;

        // Only send if significant change and strictly longer (user is speaking)
        if (latestTranscript.length > lastTranscriptRef.current.length + 50) {
            const diff = latestTranscript.slice(lastTranscriptRef.current.length);
            socketRef.current.send(JSON.stringify({ type: "transcript", text: diff }));
            lastTranscriptRef.current = latestTranscript;
        }
    }, [latestTranscript, isConnected]);

    // 2. Monitor Visuals (Eye Contact) - 1 FPS
    useEffect(() => {
        if (!isConnected || !videoRef.current) return;

        const interval = setInterval(() => {
            if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
            if (!videoRef.current || !videoRef.current.videoWidth) return;

            const canvas = document.createElement("canvas");
            canvas.width = 320; // Low res for speed
            canvas.height = 240;
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL("image/jpeg", 0.5).split(",")[1]; // Low quality JPEG

                socketRef.current.send(JSON.stringify({ type: "frame", data: base64 }));
            }
        }, 2000); // Every 2 seconds

        return () => clearInterval(interval);
    }, [isConnected, videoRef]);

    return { feedback };
}
