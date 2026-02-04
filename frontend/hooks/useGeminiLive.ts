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

  const processAudioQueue = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;

    // Dequeue next chunk
    const chunk = audioQueueRef.current.shift();
    if (!chunk) return;

    // Convert Int16 -> Float32
    const float32 = new Float32Array(chunk.length);
    for (let i = 0; i < chunk.length; i++) {
      float32[i] = chunk[i] / 32768; // Normalized -1.0 to 1.0
    }

    // Schedule playback
    const buffer = audioContextRef.current.createBuffer(
      1,
      float32.length,
      24000,
    ); // Model is 24kHz usually
    buffer.getChannelData(0).set(float32);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);

    // Ensure smooth continuous playback
    const ctxTime = audioContextRef.current.currentTime;
    let startTime = nextStartTimeRef.current;
    if (startTime < ctxTime) startTime = ctxTime;

    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;

    source.onended = () => {
      processAudioQueue();
    };
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

      if (!isPlayingRef.current) {
        processAudioQueue();
      }
    },
    [processAudioQueue],
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
4. Speak naturally, professionally, and concisely. 
5. This is a VOICE interview. Keep responses spoken-word friendly.
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
            if (serverContent.modelTurn) {
              const parts = serverContent.modelTurn.parts;
              for (const part of parts) {
                if (part.text) {
                  console.log("Model Text:", part.text);
                  setMessages((prev) => [
                    ...prev,
                    { role: "model", text: part.text, timestamp: Date.now() },
                  ]);
                }
                if (part.inlineData) {
                  // PCM Audio
                  queueAudioOutput(part.inlineData.data);
                }
              }
            }
            if (serverContent.turnComplete) {
              console.log("Turn Complete");
            }
          }
        };

        ws.onclose = (event) => {
          console.log("Gemini Closed:", event.code, event.reason);
          setIsConnected(false);
          stopAudioInput();
        };
      } catch (e) {
        console.error("Connection Failed:", e);
        setIsConnected(false);
      }
    },
    [processAudioQueue, queueAudioOutput],
  );

  const disconnect = useCallback(() => {
    if (socketRef.current) socketRef.current.close();
    stopAudioInput();
    setIsConnected(false);
  }, []);

  // 3. Audio Input Handling (Mic -> PCM 16kHz -> Base64 -> WS)
  const startAudioInput = async (ws: WebSocket) => {
    // Initialize Audio Context
    audioContextRef.current = new (
      window.AudioContext || (window as any).webkitAudioContext
    )({ sampleRate: 16000 }); // Try to ask directly for 16kHz

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
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

        const inputData = e.inputBuffer.getChannelData(0); // Float32

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
    if (audioContextRef.current) audioContextRef.current.close();
  };

  return { connect, disconnect, isConnected, messages };
}
