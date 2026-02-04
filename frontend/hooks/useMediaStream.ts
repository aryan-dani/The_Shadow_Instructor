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
          // Setup MediaRecorder to capture audio chunks
          // Determine supported mime types
          let options: MediaRecorderOptions | undefined = undefined;

          if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
            options = { mimeType: "audio/webm;codecs=opus" };
          } else if (MediaRecorder.isTypeSupported("audio/webm")) {
            options = { mimeType: "audio/webm" };
          } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
            options = { mimeType: "audio/mp4" }; // Safari fallback
          }
          // If none match, we leave options undefined to let browser pick default

          try {
            // Isolate audio track to prevent issues with video track in audio-only recorder
            const audioTracks = localStream.getAudioTracks();
            if (audioTracks.length > 0) {
              const audioStream = new MediaStream([audioTracks[0]]);
              const recorder = new MediaRecorder(audioStream, options);

              recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                  onAudioData(event.data);
                }
              };

              // Slightly longer timeslice to ensure stability
              recorder.start(500);
              mediaRecorderRef.current = recorder;
            } else {
              console.warn("No audio track found for MediaRecorder");
            }
          } catch (e: any) {
            console.error("MediaRecorder start failed:", e);
            setError(`MediaRecorder Error: ${e.message}`);
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
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
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
