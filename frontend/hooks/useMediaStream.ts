import { useState, useEffect, useRef, useCallback } from "react";

interface UseMediaStreamProps {
  onAudioData?: (data: Blob) => void;
  enabled: boolean;
}

export const useMediaStream = ({
  onAudioData,
  enabled,
}: UseMediaStreamProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0); // Add volume state
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const analysisContextRef = useRef<AudioContext | null>(null); // Ref to hold AudioContext
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let localStream: MediaStream | null = null;

    const startStream = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: 640, height: 480 }, // Optimize for low bandwidth/latency
        });

        setStream(localStream);

        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }

        // --- Audio Analysis Setup ---
        try {
          const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioContextClass();
          analysisContextRef.current = audioCtx;

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64; // Smaller FFT size for rough volume
          const source = audioCtx.createMediaStreamSource(localStream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateVolume = () => {
            if (!localStream?.active) return;

            analyser.getByteFrequencyData(dataArray);
            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;

            // Normalizing to 0-100 roughly
            setVolume(Math.min(100, (average / 128) * 100));

            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };

          updateVolume();
        } catch (e) {
          console.error("Audio Analysis setup failed", e);
        }
        // ----------------------------

        if (onAudioData) {
          // --- PCM 16kHz Recorder Setup ---
          try {
            // Create a separate audio context for recording to ensure control over sample rate if possible,
            // but usually we must use the system rate and downsample.
            const audioCtx = new (
              window.AudioContext || (window as any).webkitAudioContext
            )();
            const source = audioCtx.createMediaStreamSource(localStream);

            // Processor buffer size: 4096 frames
            const processor = audioCtx.createScriptProcessor(4096, 1, 1);

            source.connect(processor);
            processor.connect(audioCtx.destination);

            const targetSampleRate = 16000;
            let bufferRemaining = new Float32Array(0);

            processor.onaudioprocess = (e) => {
              if (!localStream?.active) return;

              const inputData = e.inputBuffer.getChannelData(0);

              // --- Simple Downsampler (from AudioContext rate to 16kHz) ---
              // Concatenate with any leftover buffer
              const inputBuffer = new Float32Array(
                bufferRemaining.length + inputData.length,
              );
              inputBuffer.set(bufferRemaining);
              inputBuffer.set(inputData, bufferRemaining.length);

              const ratio = audioCtx.sampleRate / targetSampleRate;
              const newLength = Math.floor(inputBuffer.length / ratio);
              const result = new Int16Array(newLength);

              for (let i = 0; i < newLength; i++) {
                const offset = Math.floor(i * ratio);
                // Simple decimation (nearest neighbor is okay for speech 16k usually,
                // but linear interpolation is better. Using decimation for speed/simplicity here
                // as speech recognition is robust)

                // Clamp to [-1, 1]
                let sample = Math.max(-1, Math.min(1, inputBuffer[offset]));

                // Convert to Int16
                result[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
              }

              // Store remainder
              const consumedRaw = Math.floor(newLength * ratio);
              bufferRemaining = inputBuffer.slice(consumedRaw);

              if (result.length > 0) {
                onAudioData(new Blob([result.buffer], { type: "audio/pcm" }));
              }
            };

            // Keep references to cleanup later
            (localStream as any).processor = processor;
            (localStream as any).recordingCtx = audioCtx;
          } catch (e: any) {
            console.error("PCM Recorder setup failed:", e);
            setError(`Recorder Error: ${e.message}`);
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to access camera/microphone");
      }
    };

    if (enabled) {
      startStream();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [enabled]); // Re-run if enabled status changes

  const stopStream = useCallback(() => {
    if (stream) {
      // Cleanup Audio Processing
      if ((stream as any).processor) {
        (stream as any).processor.disconnect();
        (stream as any).processor.onaudioprocess = null;
      }
      if ((stream as any).recordingCtx) {
        (stream as any).recordingCtx.close();
      }

      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    }

    if (analysisContextRef.current) {
      analysisContextRef.current.close();
      analysisContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [stream]);

  return { videoRef, stream, error, volume };
};
