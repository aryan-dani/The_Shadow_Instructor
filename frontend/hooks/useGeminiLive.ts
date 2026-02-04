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
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // 1. Audio Output Queue handling (PCM 16 -> Speaker)
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const isMutedRef = useRef(false);
  const isInterruptedRef = useRef(false);

  const stopAudioPlayback = useCallback(() => {
    // Stop all actively scheduled sources
    scheduledSourcesRef.current.forEach((source) => {
      try {
        source.onended = null;
        source.stop();
      } catch (e) {
        // ignore
      }
    });
    scheduledSourcesRef.current = [];

    // Clear queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    nextStartTimeRef.current = 0;
  }, []);

  const scheduleAudioQueue = useCallback(() => {
    if (isInterruptedRef.current) {
      return;
    }

    if (
      !audioContextRef.current ||
      audioContextRef.current.state === "closed"
    ) {
      return;
    }

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;

    // If we've fallen behind or just started, reset time to now + small buffer
    if (nextStartTimeRef.current < now) {
      nextStartTimeRef.current = now + 0.05;
    }

    // Schedule ALL available chunks in the queue
    while (audioQueueRef.current.length > 0) {
      const chunk = audioQueueRef.current.shift();
      if (!chunk) continue;

      // Convert Int16 -> Float32
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
          // Cleanup finished source from tracking array
          scheduledSourcesRef.current = scheduledSourcesRef.current.filter(
            (s) => s !== source,
          );
        };
      } catch (e) {
        console.error("Audio Schedule Error:", e);
      }
    }
  }, []);

  const queueAudioOutput = useCallback(
    (base64Data: string) => {
      if (!audioContextRef.current) return;

      // Base64 -> ArrayBuffer -> Int16Array
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16 = new Int16Array(bytes.buffer);

      audioQueueRef.current.push(int16);

      // Trigger scheduling
      if (!isInterruptedRef.current) {
        scheduleAudioQueue();
      }
    },
    [scheduleAudioQueue],
  );

  // 2. Connection Management
  const connect = useCallback(
    async (role: string, resumeText: string) => {
      try {
        console.log("Connecting to Gemini Live...");
        // A. Get Token
        const authRes = await fetch("http://localhost:8000/auth/token");
        const authData = await authRes.json();
        if (!authData.token) throw new Error("Failed to get token");

        const token = authData.token;
        const param = authData.type === "bearer" ? "access_token" : "key";

        // B. Connect WS
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

          // C. Send Bidi Setup
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
                parts: [
                  {
                    text: systemInstruction,
                  },
                ],
              },
            },
          };
          ws.send(JSON.stringify(setupMessage));

          // Initialize Audio Input
          startAudioInput(ws);
        };

        ws.onmessage = async (event) => {
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
            // Check for interruption signal
            if (serverContent.interrupted) {
              console.log("Interruption detected - clearing audio queue");
              stopAudioPlayback();
              isInterruptedRef.current = false; // Server acked the interruption, we can listen again
            }

            // New turn logic: if server signals start of a turn, clear residual audio
            // Note: 'turnStart' is not a standard field, but we can infer start if we receive text/audio after an idle period
            // or rely on 'interrupted'. For now, we'll stick to 'interrupted' and robust queue management.
            if (serverContent.modelTurn) {
              // If we are actively interrupted by the user locally, ignore incoming chunks until server ack
              if (isInterruptedRef.current) {
                // But if the server is sending a NEW turn (which this is), it might mean the server has already processed the interruption
                // and is sending the new response. We should check if we need to reset.
                // Actually, if we get a modelTurn, it means the model is speaking.
                // If we were interrupting, and now we get data, it's ambiguous if it's the old stream or new.
                // The 'interrupted' signal usually comes FIRST.
                // Let's rely on the loops below.
              }

              const parts = serverContent.modelTurn.parts;
              for (const part of parts) {
                if (part.text) {
                  // FILTER: Ignore "Thought Logs" or internal monologue starting with ** or "I'm focusing"
                  // This is a client-side patch for model verbosity
                  if (
                    part.text.startsWith("**") ||
                    part.text.startsWith("I'm focusing") ||
                    part.text.startsWith("I've interpreted")
                  ) {
                    continue;
                  }

                  // Only add message if it has meaningful content
                  if (part.text.trim()) {
                    setMessages((prev) => {
                      const lastMsg = prev[prev.length - 1];
                      // Merge with previous model message if it exists and looks like a continuation
                      if (lastMsg && lastMsg.role === "model" && lastMsg.text) {
                        return [
                          ...prev.slice(0, -1),
                          {
                            ...lastMsg,
                            text:
                              lastMsg.text +
                              (lastMsg.text.endsWith(" ") ? "" : " ") +
                              part.text,
                          },
                        ];
                      }
                      return [
                        ...prev,
                        {
                          role: "model",
                          text: part.text,
                          timestamp: Date.now(),
                        },
                      ];
                    });
                  }
                }
                if (part.inlineData) {
                  // If we locally interrupted, ignore incoming audio chunks for a bit
                  // until the server confirms interruption or finishes the turn.
                  // However, waiting for "interrupted" might be too strict if server decides NOT to interrupt.
                  // Compromise: if interrupted ref is true, we drop.
                  if (isInterruptedRef.current) {
                    continue;
                  }
                  // PCM Audio
                  queueAudioOutput(part.inlineData.data);
                }
              }
            }
            if (serverContent.turnComplete) {
              isInterruptedRef.current = false; // Reset on turn complete
              // Also clear queue? The python code says: "For interruptions to work, we need to stop playback. So empty out the audio queue because it may have loaded much more audio than has played yet."
              // We should probably rely on 'interrupted' signal for clearing, but turnComplete implies the end of a thought.
              console.log("Turn Complete");
            }
          }
        };

        ws.onclose = (event) => {
          console.log("Gemini Closed:", event.code, event.reason);
          setIsConnected(false);
          stopAudioInput();
          stopAudioPlayback();
        };
      } catch (e) {
        console.error("Connection Failed:", e);
        setIsConnected(false);
        stopAudioPlayback();
      }
    },
    [scheduleAudioQueue, queueAudioOutput, stopAudioPlayback],
  );

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null; // Prevent multiple close attempts
    }
    stopAudioInput();
    stopAudioPlayback();
    setIsConnected(false);
  }, [stopAudioPlayback]);

  // 3. Audio Input Handling (Mic -> PCM 16kHz -> Base64 -> WS)
  const startAudioInput = async (ws: WebSocket) => {
    // If context exists and is closed, create new one
    if (audioContextRef.current?.state === "closed") {
      audioContextRef.current = null;
    }

    // Initialize Audio Context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )({ sampleRate: 16000 }); // Try to ask directly for 16kHz
    }

    try {
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

      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Simple Downsampler if Sample Rate is high (e.g. 44100 or 48000 -> 16000)
      // Note: ScriptProcessor is deprecated but widely supported. AudioWorklet is better but more complex for this snippet.
      if (!audioContextRef.current) return;

      const processor = audioContextRef.current.createScriptProcessor(
        4096,
        1,
        1,
      );

      let chunkCount = 0;
      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;

        // If muted, do NOT send data
        if (isMutedRef.current) return;

        const inputData = e.inputBuffer.getChannelData(0); // Float32

        // Client-side VAD (Voice Activity Detection) to stop playback if user speaks
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);

        // Threshold 0.02 is roughly -34dB, good for detecting active speech vs silence
        if (rms > 0.02) {
          // Only stop playback if we are actually playing
          if (isPlayingRef.current) {
            stopAudioPlayback();
            isInterruptedRef.current = true; // Mark as locally interrupted
          }
        }

        // RESAMPLE TO 16kHz if needed
        // This is a naive nearest-neighbor resample.
        // For production, use a proper FIR filter.
        let pcm16;

        // Current context sample rate (typically 44100 or 48000 on PC)
        const currentRate = audioContextRef.current?.sampleRate || 16000;
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

        // Efficient Base64 in browser
        let binary = "";
        const len = uint8.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const b64 = window.btoa(binary);

        // DEBUG: Log every 50th chunk to confirm audio flow
        chunkCount++;
        if (chunkCount % 50 === 0) {
          console.log(
            `🎤 Audio Chunk #${chunkCount} | Size: ${b64.length} | Rate: ${currentRate}->${targetRate}`,
          );
        }

        // Send Realtime Input
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

      source.connect(processor);
      processor.connect(audioContextRef.current.destination); // destination is mute usually, but needed for processing to fire
      processorRef.current = processor;
    } catch (e) {
      console.error("Mic Access Error:", e);
    }
  };

  const stopAudioInput = () => {
    if (streamRef.current)
      streamRef.current.getTracks().forEach((t) => t.stop());
    if (processorRef.current) processorRef.current.disconnect();
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(console.error);
    }
  };

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
