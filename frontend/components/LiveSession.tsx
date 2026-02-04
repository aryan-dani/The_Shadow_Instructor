import React, { useEffect, useState } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useMediaStream } from "@/hooks/useMediaStream";
import { motion } from "framer-motion";

interface LiveSessionProps {
  onAudioData: (data: Blob) => void;
  isConnected: boolean;
}

export default function LiveSession({
  onAudioData,
  isConnected,
}: LiveSessionProps) {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);

  const { videoRef, stream, error, volume } = useMediaStream({
    enabled: true,
    onAudioData: isConnected && isMicOn ? onAudioData : undefined,
  });

  useEffect(() => {
    if (stream) {
      stream.getAudioTracks().forEach((track) => (track.enabled = isMicOn));
      stream.getVideoTracks().forEach((track) => (track.enabled = isCameraOn));
    }
  }, [isMicOn, isCameraOn, stream]);

  return (
    <div className="relative w-full h-full flex flex-col bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
      {/* Video Feed */}
      <div className="relative flex-1 bg-[#1a1c20] flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-red-400 font-medium text-sm p-4 text-center bg-red-900/10 rounded-lg">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${!isCameraOn ? "opacity-0" : "opacity-100"}`}
          />
        )}

        {/* Placeholder when video is off */}
        {!isCameraOn && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
              <span className="text-gray-500 font-bold text-xl">OFF</span>
            </div>
          </div>
        )}

        {/* Live Indicator */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full z-10">
          <div
            className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
          />
          <span className="text-[10px] font-bold text-white/90 tracking-wide uppercase">
            {isConnected ? "Live Interview" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-900/90 backdrop-blur-xl px-6 py-3 rounded-full shadow-lg border border-white/5 z-20">
        <button
          onClick={() => setIsMicOn(!isMicOn)}
          className={`p-3.5 rounded-full transition-all duration-200 ${isMicOn ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-red-500 text-white hover:bg-red-600"}`}
        >
          {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button
          onClick={() => setIsCameraOn(!isCameraOn)}
          className={`p-3.5 rounded-full transition-all duration-200 ${isCameraOn ? "bg-gray-700 text-white hover:bg-gray-600" : "bg-red-500 text-white hover:bg-red-600"}`}
        >
          {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
      </div>

      {/* Audio Visualizer Strip */}
      {isMicOn && isConnected && (
        <div className="absolute bottom-0 left-0 right-0 h-24 flex items-end justify-center gap-1.5 pb-2 pointer-events-none opacity-90">
          {/* Reactive Waveform */}
          {[...Array(12)].map((_, i) => {
            // Create a symmetrical wave pattern
            const center = 6;
            const dist = Math.abs(i - center);
            const multiplier = Math.max(0.3, 1 - dist * 0.15); // Higher in middle
            return (
              <motion.div
                key={i}
                className="w-2 rounded-t-lg bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                animate={{
                  height: Math.max(4, volume * 1.5 * multiplier) + "%",
                  opacity: 0.5 + volume / 200,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
