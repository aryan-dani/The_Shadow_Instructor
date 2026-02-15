import { useState, useRef, useCallback, useEffect } from "react";
import { API_BASE_URL } from "../utils/api";

const GEMINI_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

export type GeminiTurn = {
  role: "user" | "model" | "system";
  text?: string;
  timestamp: number;
  turnComplete?: boolean;
};

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<GeminiTurn[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isSetupCompleteRef = useRef(false);

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
    isSetupCompleteRef.current = false;

    scheduledSourcesRef.current.forEach((s) => {
      try { s.stop(); } catch (e) { }
    });
    scheduledSourcesRef.current = [];
  }, [stopAudioPlayback, stopAudioInput, isConnected]);

  // Keep AudioContext active in background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

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

      if ((ctx.state as string) === "closed" || !audioContextRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if ((ctx.state as string) === "closed" || !audioContextRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const source = ctx.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(ctx, "audio-input-processor");
      workletNodeRef.current = workletNode;

      let chunkCount = 0;

      workletNode.port.onmessage = (event) => {
        if (ws.readyState !== WebSocket.OPEN || !isSetupCompleteRef.current) return;
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
                mime_type: "audio/pcm;rate=16000",
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
    async ({
      role,
      resumeText,
      persona,
      voice,
      difficulty,
      webcamRef
    }: {
      role: string;
      resumeText: string;
      persona: "tough" | "friendly" | "faang";
      voice: "Puck" | "Charon" | "Kore" | "Aoede" | "Fenrir";
      difficulty: "easy" | "medium" | "hard";
      webcamRef?: React.RefObject<HTMLVideoElement | null>;
    }) => {
      disconnect();

      try {


        console.log("Connecting to Gemini Live...");

        const apiBaseUrl = API_BASE_URL;
        const authRes = await fetch(`${apiBaseUrl}/auth/token`);
        const authData = await authRes.json();
        if (!authData.token) throw new Error("Failed to get token");

        const token = authData.token;
        const param = authData.type === "bearer" ? "access_token" : "key";

        // Determine WebSocket URL and Model Resource Name
        let wsUrl = GEMINI_URL;
        let modelResourceName = "models/gemini-2.0-flash-exp";

        if (authData.project_id && authData.location) {
          // Vertex AI
          // Vertex AI
          // Using strict regional endpoint for gemini-live-2.5-flash-native-audio
          const loc = "us-central1";
          const host = `${loc}-aiplatform.googleapis.com`;

          wsUrl = `wss://${host}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;
          // Full Resource Name: projects/{PROJECT_ID}/locations/{LOCATION}/publishers/google/models/gemini-live-2.5-flash-native-audio
          const modelId = "gemini-live-2.5-flash-native-audio";
          modelResourceName = `projects/${authData.project_id}/locations/${loc}/publishers/google/models/${modelId}`;

          console.log("Using Vertex AI WebSocket:", wsUrl);
        } else {
          // Google AI Studio
          console.log("Using Google AI Studio WebSocket:", wsUrl);
        }

        const ws = new WebSocket(`${wsUrl}?${param}=${token}`);
        socketRef.current = ws;
        isSetupCompleteRef.current = false;

        ws.onopen = () => {
          console.log("Gemini Connected. Sending Setup...");
          setIsConnected(true);

          // Generate dynamic system instruction based on config
          let toneInstruction = "";
          let focusInstruction = "";

          switch (persona) {
            case "tough":
              toneInstruction = "You are a TOUGH, fast-paced technical interviewer. Do not accept vague answers. Interrupt if the candidate is rambling. Be direct and strict.";
              break;
            case "friendly":
              toneInstruction = "You are a friendly, encouraging senior engineer. Be patient, give helpful hints if they get stuck, and keep the tone warm and collaborative.";
              break;
            case "faang":
              toneInstruction = "You are an interviewer at a FAANG company (Google/Meta level). Focus heavily on scalability, edge cases, and algorithmic complexity. Expect high precision.";
              break;
          }

          switch (difficulty) {
            case "easy":
              focusInstruction = "Ask standard, fundamental questions. If they struggle, guide them to the answer. Avoid complex system design edge cases.";
              break;
            case "medium":
              focusInstruction = "Ask practically relevant questions. Expect them to handle standard edge cases. Offer minor hints only if completely stuck.";
              break;
            case "hard":
              focusInstruction = "Ask really challenging, deep technical questions. Probe for weakness. Do not give hints. Focus on obscure edge cases and performance optimizations.";
              break;
          }

          const systemInstruction = `
You are an expert technical interviewer at a top tech company.
You are interviewing the candidate for the role of: ${role}.

Your Persona: ${toneInstruction}
Difficulty Level: ${focusInstruction}

CANDIDATE STARTING CONTEXT (RESUME HIGHLIGHTS):
${resumeText.substring(0, 4000)}

YOUR GOAL:
1. Conduct a rigorous technical interview matching your persona and difficulty settings.
2. START IMMEDIATELY by introducing yourself (in character) and asking your first question based on their resume.
3. Then move to a system design or coding challenge fitting the role.

IMPORTANT: Begin speaking as soon as you receive this. Do NOT wait for the candidate to speak first.
Start with a brief greeting and your first question.

MULTIMODAL CAPABILITIES:
- You can SEE the candidate via video stream.
- Pay attention to their non-verbal cues (eye contact, nervousness, smiles, posture).
- If they look confused or nervous, you can comment on it gently (e.g., "You look a bit unsure, want a hint?").
- If they are confident and smiling, match their energy.

STYLE GUIDELINES (STRICT):
- You are a VOICE-ONLY interface.
- You must NOT generate internal thought logs, plans, or headers.
- Your output must ONLY be the exact words you speak to the candidate.
- Be concise (under 30 seconds per response).
- Speak naturally and professionally.
          `;

          const setupMessage = {
            setup: {
              model: modelResourceName,
              generation_config: {
                response_modalities: ["AUDIO"],
                speech_config: {
                  voice_config: {
                    prebuilt_voice_config: {
                      voice_name: voice || "Kore",
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

          // Start audio and video - but nothing will be sent until isSetupCompleteRef.current is true
          startAudioInput(ws);

          // START VIDEO STREAMING
          if (webcamRef?.current) {
            const videoCanvas = document.createElement("canvas");
            const videoCtx = videoCanvas.getContext("2d");
            const videoEl = webcamRef.current;

            // Send a frame every 500ms (2 FPS) - sufficient for analysis without killing bandwidth
            const videoInterval = setInterval(() => {
              if (ws.readyState !== WebSocket.OPEN || !videoEl.videoWidth) return;

              // Draw current frame to canvas (resize to 320px width for efficiency)
              const scale = 320 / videoEl.videoWidth;
              videoCanvas.width = 320;
              videoCanvas.height = videoEl.videoHeight * scale;

              videoCtx?.drawImage(videoEl, 0, 0, videoCanvas.width, videoCanvas.height);

              // Get JPEG base64
              const base64Image = videoCanvas.toDataURL("image/jpeg", 0.6).split(",")[1];

              const msg = {
                realtime_input: {
                  media_chunks: [
                    {
                      mime_type: "image/jpeg",
                      data: base64Image,
                    },
                  ],
                },
              };
              ws.send(JSON.stringify(msg));
            }, 500);

            // Clear interval on close
            const originalClose = ws.onclose;
            ws.onclose = (ev) => {
              clearInterval(videoInterval);
              if (originalClose) originalClose.call(ws, ev);
            };
          }
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

          if (data.setupComplete) {
            console.log("👻 Gemini Setup Complete");
            isSetupCompleteRef.current = true;

            // Trigger the first prompt now that setup is complete
            const triggerMessage = {
              client_content: {
                turns: [
                  {
                    role: "user",
                    parts: [{ text: "Begin the interview now. Introduce yourself and ask your first question." }],
                  },
                ],
                turn_complete: true,
              },
            };
            ws.send(JSON.stringify(triggerMessage));
            return;
          }

          const serverContent = data.serverContent;
          if (serverContent) {
            if (serverContent.interrupted) {
              stopAudioPlayback();
              isInterruptedRef.current = false;
            }

            // Handle audio output
            if (serverContent.modelTurn) {
              const parts = serverContent.modelTurn.parts;
              for (const part of parts) {
                if (part.inlineData) {
                  if (isInterruptedRef.current) continue;
                  isPlayingRef.current = true;
                  queueAudioOutput(part.inlineData.data);
                }
              }
            }

            // Capture AI Output Transcription - real-time display
            const outputTranscript =
              serverContent.modelTurnTranscription?.text ||
              serverContent.outputTranscription?.text ||
              serverContent.output_transcription?.text;

            if (outputTranscript && outputTranscript.trim()) {
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                // Append to last model message if it exists and isn't complete
                if (lastMsg && lastMsg.role === "model" && !lastMsg.turnComplete) {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, text: (lastMsg.text || "") + " " + outputTranscript },
                  ];
                }
                return [
                  ...prev,
                  { role: "model", text: outputTranscript, timestamp: Date.now() },
                ];
              });
            }

            // Capture User Input Transcription - real-time display
            const inputTranscript =
              serverContent.inputTranscription?.text ||
              serverContent.input_transcription?.text;

            if (inputTranscript && inputTranscript.trim()) {
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                // Append to last user message if it exists and isn't complete
                if (lastMsg && lastMsg.role === "user" && !lastMsg.turnComplete) {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, text: (lastMsg.text || "") + " " + inputTranscript },
                  ];
                }
                return [
                  ...prev,
                  { role: "user", text: inputTranscript, timestamp: Date.now() },
                ];
              });
            }

            if (serverContent.turnComplete) {
              isInterruptedRef.current = false;
              isPlayingRef.current = false;
              // Mark the last message as turn complete
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const lastMsg = prev[prev.length - 1];
                return [
                  ...prev.slice(0, -1),
                  { ...lastMsg, turnComplete: true },
                ];
              });
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
