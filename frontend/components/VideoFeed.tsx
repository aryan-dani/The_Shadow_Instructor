import { useEffect, useState } from "react";
import { User, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Bot } from "lucide-react";

interface VideoFeedProps {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    streamRef: React.MutableRefObject<MediaStream | null>;
    isMicOn: boolean;
    setIsMicOn: (val: boolean) => void;
    isCameraOn: boolean;
    setIsCameraOn: (val: boolean) => void;
    onEndCall: () => void;
    isConnected: boolean;
}

export function VideoFeed({
    videoRef,
    streamRef,
    isMicOn,
    setIsMicOn,
    isCameraOn,
    setIsCameraOn,
    onEndCall,
    isConnected,
}: VideoFeedProps) {

    // Initialize video stream
    useEffect(() => {
        const startVideo = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720, facingMode: "user" },
                    audio: false,
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera access denied:", err);
                setIsCameraOn(false);
            }
        };
        startVideo();
        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    // Toggle camera tracks
    useEffect(() => {
        if (streamRef.current) {
            streamRef.current.getVideoTracks().forEach((track) => {
                track.enabled = isCameraOn;
            });
            if (isCameraOn && videoRef.current && !videoRef.current.srcObject) {
                videoRef.current.srcObject = streamRef.current;
            }
        }
    }, [isCameraOn]);

    return (
        <div className="h-full bg-neutral-900/80 border border-neutral-800 rounded-3xl relative overflow-hidden">
            {/* Self View Video */}
            {isCameraOn ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                    <div className="w-24 h-24 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                        <User className="w-12 h-12 text-neutral-600" />
                    </div>
                </div>
            )}

            {/* Live Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full z-10 border border-neutral-800">
                <div
                    className={`w-2 h-2 rounded-full ${isConnected ? "bg-white" : "bg-neutral-500 animate-pulse"}`}
                />
                <span className="text-xs font-medium text-white">
                    {isConnected ? "Live" : "Starting..."}
                </span>
            </div>

            {/* AI Interviewer Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full z-10 border border-neutral-800">
                <Bot className="w-3.5 h-3.5 text-white" />
                <span className="text-xs font-medium text-neutral-300">
                    AI Interviewer
                </span>
            </div>

            {/* Controls Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
                <button
                    onClick={() => setIsMicOn(!isMicOn)}
                    className={`p-3.5 rounded-full transition-all border ${isMicOn
                            ? "bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700"
                            : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                        }`}
                >
                    {isMicOn ? (
                        <Mic className="w-5 h-5" />
                    ) : (
                        <MicOff className="w-5 h-5" />
                    )}
                </button>

                <button
                    onClick={() => setIsCameraOn(!isCameraOn)}
                    className={`p-3.5 rounded-full transition-all border ${isCameraOn
                            ? "bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700"
                            : "bg-red-500 hover:bg-red-600 text-white border-red-500"
                        }`}
                >
                    {isCameraOn ? (
                        <VideoIcon className="w-5 h-5" />
                    ) : (
                        <VideoOff className="w-5 h-5" />
                    )}
                </button>

                <button
                    onClick={onEndCall}
                    className="p-3.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all border border-red-500"
                >
                    <PhoneOff className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
