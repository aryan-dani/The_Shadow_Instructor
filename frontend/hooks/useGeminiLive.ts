import { useState, useRef, useCallback, useEffect } from "react";
import { API_BASE_URL } from "../utils/api";

export type GeminiTurn = {
  role: "user" | "model" | "system";
  text?: string;
  timestamp: number;
  turnComplete?: boolean;
};

// ==================== PERSONA & DIFFICULTY MAPS ====================
const PERSONA_INSTRUCTIONS: Record<string, string> = {
  tough:
    "You are a STRICT, fast-paced technical interviewer. Do not accept vague, incomplete, or one-word answers. If the candidate says something generic like 'sure' or 'yes', immediately ask them to elaborate with specifics. Be direct and demanding.",
  friendly:
    "You are a warm, encouraging senior engineer. Be patient and collaborative. If the candidate gets stuck, offer gentle hints. Keep the tone supportive — but still require them to articulate their thoughts clearly.",
  faang:
    "You are a FAANG bar-raiser (Google/Meta level). Focus on scalability, edge cases, algorithmic complexity, and production readiness. Expect precise, structured answers. One-word responses are unacceptable.",
  roast:
    "You are in BRUTAL ROAST MODE. Be hilariously sarcastic and ruthless. Mock vague answers, laugh at hesitation, and deliver savage one-liners. If they say 'sure' without explaining anything, roast them for it.",
};

const DIFFICULTY_INSTRUCTIONS: Record<string, string> = {
  easy:
    "Ask standard, foundational questions. Guide the candidate step-by-step if they struggle. Avoid complex edge cases.",
  medium:
    "Ask practically relevant questions. Expect them to handle standard edge cases and trade-offs. Offer minor hints only if completely stuck.",
  hard:
    "Ask deep, challenging questions that probe for expertise. Focus on obscure edge cases and performance optimization. Do not give hints.",
};

const ANTI_HALLUCINATION_RULES = `
CRITICAL RULES — DO NOT VIOLATE:
1. NEVER infer, assume, or fabricate technical concepts the candidate did not explicitly say.
2. If the candidate gives a vague or one-word answer (e.g., "sure", "yeah", "okay", "chaur"), DO NOT treat it as a valid technical response. Instead, ask them to elaborate: "Can you explain what you mean?" or "Walk me through your thinking."
3. NEVER say things like "Great, so you'd use X" unless the candidate explicitly mentioned X by name.
4. Only acknowledge and evaluate technical concepts the candidate has EXPLICITLY stated in their own words.
5. If the candidate is silent or gives non-technical answers, note the lack of response. Do NOT fill gaps with assumed knowledge.
6. Your assessment must be based SOLELY on what was actually spoken, never on what could theoretically be inferred from their resume.
`.trim();

export function useGeminiLive() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<GeminiTurn[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isSetupCompleteRef = useRef(false);

  // Audio Output Queue
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
    if (!audioContextRef.current || audioContextRef.current.state === "closed")
      return;

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
          scheduledSourcesRef.current = scheduledSourcesRef.current.filter(
            (s) => s !== source,
          );
        };
      } catch (e) {
        console.error("Audio schedule error:", e);
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
      audioContextRef.current.close().catch(() => { });
      audioContextRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (!isConnected && !socketRef.current) return;

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    stopAudioInput();
    stopAudioPlayback();

    setIsConnected(false);
    isInterruptedRef.current = false;
    audioQueueRef.current = [];
    isSetupCompleteRef.current = false;

    scheduledSourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch (e) { }
    });
    scheduledSourcesRef.current = [];
  }, [stopAudioPlayback, stopAudioInput, isConnected]);

  // Keep AudioContext active in background
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        audioContextRef.current?.state === "suspended"
      ) {
        audioContextRef.current.resume();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const startAudioInput = useCallback(
    async (ws: WebSocket) => {
      if (audioContextRef.current?.state === "closed") {
        audioContextRef.current = null;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )({
          sampleRate: 16000,
        });
      }

      const ctx = audioContextRef.current;

      try {
        await ctx.audioWorklet.addModule("/audio-processor.js");

        if ((ctx.state as string) === "closed" || !audioContextRef.current)
          return;

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

        workletNode.port.onmessage = (event) => {
          if (ws.readyState !== WebSocket.OPEN || !isSetupCompleteRef.current)
            return;
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
        console.error("Mic access error:", e);
      }
    },
    [stopAudioPlayback],
  );

  const connect = useCallback(
    async ({
      role,
      resumeText,
      persona,
      voice,
      difficulty,
      webcamRef,
    }: {
      role: string;
      resumeText: string;
      persona: "tough" | "friendly" | "faang" | "roast";
      voice: "Puck" | "Charon" | "Kore" | "Aoede" | "Fenrir";
      difficulty: "easy" | "medium" | "hard";
      webcamRef?: React.RefObject<HTMLVideoElement | null>;
    }) => {
      disconnect();

      try {
        const authRes = await fetch(`${API_BASE_URL}/auth/token`);
        const authData = await authRes.json();
        if (!authData.token) throw new Error("Failed to get auth token");

        // Vertex AI only
        const loc = "us-central1";
        const host = `${loc}-aiplatform.googleapis.com`;
        const wsUrl = `wss://${host}/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;
        const modelId = "gemini-live-2.5-flash-native-audio";
        const modelResourceName = `projects/${authData.project_id}/locations/${loc}/publishers/google/models/${modelId}`;

        const ws = new WebSocket(`${wsUrl}?access_token=${authData.token}`);
        socketRef.current = ws;
        isSetupCompleteRef.current = false;

        ws.onopen = () => {
          setIsConnected(true);

          // Build dynamic system instruction from persona/difficulty maps
          const personaInstruction =
            PERSONA_INSTRUCTIONS[persona] || PERSONA_INSTRUCTIONS["friendly"];
          const difficultyInstruction =
            DIFFICULTY_INSTRUCTIONS[difficulty] || DIFFICULTY_INSTRUCTIONS["medium"];

          const systemInstruction = `You are an expert technical interviewer conducting a live voice interview.
Role being interviewed for: ${role}

INTERVIEWER PERSONA:
${personaInstruction}

DIFFICULTY:
${difficultyInstruction}

CANDIDATE RESUME (for context only — do NOT assume they know everything listed):
${resumeText.substring(0, 4000)}

YOUR GOALS:
1. Start immediately: introduce yourself (in character) and ask your first question based on their resume.
2. Conduct a structured technical interview matching your persona and difficulty.
3. Progress naturally: resume validation → technical deep-dive → system design or coding challenge.
4. Adapt follow-up questions based on the candidate's ACTUAL responses.

MULTIMODAL AWARENESS:
- You can see the candidate via webcam. If you notice poor body language, address it in-character.

VOICE OUTPUT RULES:
- You are a VOICE-ONLY interface. Output ONLY the words you speak.
- Do NOT output internal thoughts, plans, markdown, headers, or formatting.
- Be concise: each response should be under 30 seconds of speech.
- Speak naturally and professionally.

${ANTI_HALLUCINATION_RULES}

BEGIN: Introduce yourself and ask your first question now. Do NOT wait for the candidate to speak first.`;

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
              input_audio_transcription: {},
              output_audio_transcription: {},
              system_instruction: {
                parts: [{ text: systemInstruction }],
              },
            },
          };
          ws.send(JSON.stringify(setupMessage));

          startAudioInput(ws);

          // Video streaming (2 FPS)
          if (webcamRef?.current) {
            const videoCanvas = document.createElement("canvas");
            const videoCtx = videoCanvas.getContext("2d");
            const videoEl = webcamRef.current;

            const videoInterval = setInterval(() => {
              if (ws.readyState !== WebSocket.OPEN || !videoEl.videoWidth)
                return;

              const scale = 320 / videoEl.videoWidth;
              videoCanvas.width = 320;
              videoCanvas.height = videoEl.videoHeight * scale;

              videoCtx?.drawImage(
                videoEl,
                0,
                0,
                videoCanvas.width,
                videoCanvas.height,
              );

              const base64Image = videoCanvas
                .toDataURL("image/jpeg", 0.6)
                .split(",")[1];

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
            return;
          }

          if (data.setupComplete) {
            isSetupCompleteRef.current = true;

            // Trigger the first prompt
            const triggerMessage = {
              client_content: {
                turns: [
                  {
                    role: "user",
                    parts: [
                      {
                        text: "Begin the interview now. Introduce yourself and ask your first question.",
                      },
                    ],
                  },
                ],
                turn_complete: true,
              },
            };
            ws.send(JSON.stringify(triggerMessage));
            return;
          }

          const serverContent = data.serverContent || data.server_content;
          if (serverContent) {
            if (serverContent.interrupted) {
              stopAudioPlayback();
              isInterruptedRef.current = false;
            }

            // Handle audio output
            const modelTurn =
              serverContent.modelTurn || serverContent.model_turn;
            if (modelTurn) {
              const parts = modelTurn.parts;
              for (const part of parts) {
                if (part.inlineData) {
                  if (isInterruptedRef.current) continue;
                  isPlayingRef.current = true;
                  queueAudioOutput(part.inlineData.data);
                } else if (part.inline_data) {
                  if (isInterruptedRef.current) continue;
                  isPlayingRef.current = true;
                  queueAudioOutput(part.inline_data.data);
                }
              }
            }

            // AI Output Transcription
            const outputTranscript =
              serverContent.modelTurnTranscription?.text ||
              serverContent.outputTranscription?.text ||
              serverContent.output_transcription?.text ||
              serverContent.model_turn_transcription?.text;

            if (outputTranscript && outputTranscript.trim()) {
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (
                  lastMsg &&
                  lastMsg.role === "model" &&
                  !lastMsg.turnComplete
                ) {
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...lastMsg,
                      text: (lastMsg.text || "") + " " + outputTranscript,
                    },
                  ];
                }
                return [
                  ...prev,
                  {
                    role: "model",
                    text: outputTranscript,
                    timestamp: Date.now(),
                  },
                ];
              });
            }

            // User Input Transcription
            const inputTranscript =
              serverContent.inputTranscription?.text ||
              serverContent.input_transcription?.text;

            if (inputTranscript && inputTranscript.trim()) {
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (
                  lastMsg &&
                  lastMsg.role === "user" &&
                  !lastMsg.turnComplete
                ) {
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...lastMsg,
                      text: (lastMsg.text || "") + " " + inputTranscript,
                    },
                  ];
                }
                return [
                  ...prev,
                  {
                    role: "user",
                    text: inputTranscript,
                    timestamp: Date.now(),
                  },
                ];
              });
            }

            if (serverContent.turnComplete || serverContent.turn_complete) {
              isInterruptedRef.current = false;
              isPlayingRef.current = false;
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

        ws.onclose = () => {
          if (socketRef.current === ws) {
            setIsConnected(false);
          }
          stopAudioInput();
          stopAudioPlayback();
        };
      } catch (e) {
        console.error("Connection failed:", e);
        if (!socketRef.current) return;
        setIsConnected(false);
        stopAudioPlayback();
      }
    },
    [
      scheduleAudioQueue,
      queueAudioOutput,
      stopAudioPlayback,
      disconnect,
      startAudioInput,
      stopAudioInput,
    ],
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
