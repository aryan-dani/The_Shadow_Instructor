export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

if (typeof window !== "undefined") {
    console.log("---------------------------------------------");
    console.log("Shadow Instructor Config");
    console.log("API_BASE_URL:", API_BASE_URL);
    console.log("WS_BASE_URL:", WS_BASE_URL);
    console.log("NEXT_PUBLIC_BACKEND_URL:", process.env.NEXT_PUBLIC_BACKEND_URL);
    console.log("---------------------------------------------");
}
