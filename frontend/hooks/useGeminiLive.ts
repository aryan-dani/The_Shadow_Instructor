import { useState, useRef, useCallback, useEffect } from "react";

const GEMINI_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

export type GeminiTurn = {
  role: "user" | "model" | "system";
  text?: string;
  timestamp: number;
};

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<GeminiTurn[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Audio Output Queue handling (PCM 16 -> Speaker)
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isMutedRef = useRef(false);
  const isInterruptedRef = useRef(false);

  const stopAudioPlayback = useCallback(() => {
    scheduledSourcesRef.current.forEach((source) => {
      try {
        source.onended = null;
        source.stop();
      } catch (e) {
        // ignore
      }
    });
    scheduledSourcesRef.current = [];
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextStartTimeRef.current = 0;
  }, []);

  const scheduleAudioQueue = useCallback(() => {
    if (isInterruptedRef.current) return;
    if (!audioContextRef.current || audioContextRef.current.state === "closed") return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    if (nextStartTimeRef.current < now) {
      nextStartTimeRef.current = now + 0.05;
    }

    while (audioQueueRef.current.length > 0) {
      const chunk = audioQueueRef.current.shift();
      if (!chunk) continue;

      const float32 = new Float32Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        float32[i] = chunk[i] / 32768;
      }

      try {
        const buffer = ctx.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += buffer.duration;

        scheduledSourcesRef.current.push(source);
        source.onended = () => {
          scheduledSourcesRef.current = scheduledSourcesRef.current.filter((s) => s !== source);
        };
      } catch (e) {
        console.error("Audio Schedule Error:", e);
      }
    }
  }, []);

  const queueAudioOutput = useCallback(
    (base64Data: string) => {
      if (!audioContextRef.current) return;

      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);
      audioQueueRef.current.push(int16);

      if (!isInterruptedRef.current) {
        scheduleAudioQueue();
      }
    },
    [scheduleAudioQueue],
  );

  const stopAudioInput = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (!isConnected && !socketRef.current) return;

    console.log("Disconnecting...");

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    stopAudioInput();
    stopAudioPlayback();

    setIsConnected(false);
    setMessages([]);
    isInterruptedRef.current = false;
    audioQueueRef.current = [];

    scheduledSourcesRef.current.forEach((s) => {
      try { s.stop(); } catch (e) { }
    });
    scheduledSourcesRef.current = [];
  }, [stopAudioPlayback, stopAudioInput, isConnected]);

  const startAudioInput = useCallback(async (ws: WebSocket) => {
    if (audioContextRef.current?.state === "closed") {
      audioContextRef.current = null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
    }

    const ctx = audioContextRef.current;

    try {
      // Load AudioWorklet module
      await ctx.audioWorklet.addModule("/audio-processor.js");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(ctx, "audio-input-processor");
      workletNodeRef.current = workletNode;

      let chunkCount = 0;

      workletNode.port.onmessage = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        if (isMutedRef.current) return;

        const inputData = event.data.buffer as Float32Array;

        // Voice Activity Detection
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        if (rms > 0.02) {
          if (isPlayingRef.current) {
            stopAudioPlayback();
            isInterruptedRef.current = true;
          }
        }

        // Resample to 16kHz if needed
        let pcm16: Int16Array;
        const currentRate = ctx.sampleRate || 16000;
        const targetRate = 16000;

        if (currentRate !== targetRate) {
          const ratio = currentRate / targetRate;
          const newLength = Math.floor(inputData.length / ratio);
          pcm16 = new Int16Array(newLength);

          for (let i = 0; i < newLength; i++) {
            const originalIndex = Math.floor(i * ratio);
            let s = Math.max(-1, Math.min(1, inputData[originalIndex]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
        } else {
          pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            let s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
        }

        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = "";
        const len = uint8.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const b64 = window.btoa(binary);

        chunkCount++;
        if (chunkCount % 50 === 0) {
          console.log(`Audio Chunk #${chunkCount} | Size: ${b64.length}`);
        }

        const msg = {
          realtime_input: {
            media_chunks: [
              {
                mime_type: "audio/pcm",
                data: b64,
              },
            ],
          },
        };
        ws.send(JSON.stringify(msg));
      };

      source.connect(workletNode);
      workletNode.connect(ctx.destination);
    } catch (e) {
      console.error("Mic Access Error:", e);
    }
  }, [stopAudioPlayback]);

  const connect = useCallback(
    async (role: string, resumeText: string) => {
      disconnect();

      try {
        console.log("Connecting to Gemini Live...");

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const authRes = await fetch(`${apiBaseUrl}/auth/token`);
        const authData = await authRes.json();
        if (!authData.token) throw new Error("Failed to get token");

        const token = authData.token;
        const param = authData.type === "bearer" ? "access_token" : "key";

        const ws = new WebSocket(`${GEMINI_URL}?${param}=${token}`);
        socketRef.current = ws;

        ws.onopen = () => {
          console.log("Gemini Connected. Sending Setup...");
          setIsConnected(true);

          const systemInstruction = `
You are an expert technical interviewer at a top tech company.
You are interviewing the candidate for the role of: ${role}.

CANDIDATE STARTING CONTEXT (RESUME HIGHLIGHTS):
${resumeText.substring(0, 4000)}

YOUR GOAL:
1. Conduct a rigorous but fair technical interview.
2. Start by briefly validating 1-2 key items from their resume to build rapport.
3. Then move to a system design or coding challenge fitting the role.

STYLE GUIDELINES (STRICT):
- You are a VOICE-ONLY interface.
- You must NOT generate internal thought logs, plans, or headers (e.g., "**Initiating...**").
- You must NOT say things like "I'm focusing on..." or "I will now ask...".
- Your output must ONLY be the exact words you speak to the candidate.
- Be concise (under 30 seconds).
- Speak naturally and professionally.
          `;

          const setupMessage = {
            setup: {
              model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
              generation_config: {
                response_modalities: ["AUDIO"],
                speech_config: {
                  voice_config: {
                    prebuilt_voice_config: {
                      voice_name: "Kore",
                    },
                  },
                },
              },
              system_instruction: {
                parts: [{ text: systemInstruction }],
              },
            },
          };
          ws.send(JSON.stringify(setupMessage));

          startAudioInput(ws);
        };

        ws.onmessage = async (event) => {
          if (socketRef.current !== ws) return;

          let data;
          try {
            if (event.data instanceof Blob) {
              const text = await event.data.text();
              data = JSON.parse(text);
            } else {
              data = JSON.parse(event.data);
            }
          } catch (e) {
            console.error("Parse Error", e);
            return;
          }

          const serverContent = data.serverContent;
          if (serverContent) {
            if (serverContent.interrupted) {
              console.log("Interruption detected - clearing audio queue");
              stopAudioPlayback();
              isInterruptedRef.current = false;
            }

            if (serverContent.modelTurn) {
              const parts = serverContent.modelTurn.parts;
              for (const part of parts) {
                if (part.text) {
                  // Filter internal monologue
                  if (
                    part.text.startsWith("**") ||
                    part.text.startsWith("I'm focusing") ||
                    part.text.startsWith("I've interpreted")
                  ) {
                    continue;
                  }

                  if (part.text.trim()) {
                    setMessages((prev) => {
                      const lastMsg = prev[prev.length - 1];
                      if (lastMsg && lastMsg.role === "model" && lastMsg.text) {
                        return [
                          ...prev.slice(0, -1),
                          {
                            ...lastMsg,
                            text: lastMsg.text + (lastMsg.text.endsWith(" ") ? "" : " ") + part.text,
                          },
                        ];
                      }
                      return [
                        ...prev,
                        { role: "model", text: part.text, timestamp: Date.now() },
                      ];
                    });
                  }
                }
                if (part.inlineData) {
                  if (isInterruptedRef.current) continue;
                  queueAudioOutput(part.inlineData.data);
                }
              }
            }
            if (serverContent.turnComplete) {
              isInterruptedRef.current = false;
              console.log("Turn Complete");
            }
          }
        };

        ws.onclose = (event) => {
          console.log("Gemini Closed:", event.code, event.reason);
          if (socketRef.current === ws) {
            setIsConnected(false);
          }
          stopAudioInput();
          stopAudioPlayback();
        };
      } catch (e) {
        console.error("Connection Failed:", e);
        if (!socketRef.current) return;
        setIsConnected(false);
        stopAudioPlayback();
      }
    },
    [scheduleAudioQueue, queueAudioOutput, stopAudioPlayback, disconnect, startAudioInput, stopAudioInput],
  );

  const setMicMuted = useCallback((muted: boolean) => {
    isMutedRef.current = muted;
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }, []);

  return { connect, disconnect, isConnected, messages, setMicMuted };
}
