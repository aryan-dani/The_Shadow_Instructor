export const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const getVsUrl = () => {
    if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
    return API_BASE_URL.replace(/^http/, "ws");
};

export const WS_BASE_URL = getVsUrl();

if (typeof window !== "undefined") {
    console.log("---------------------------------------------");
    console.log("Shadow Instructor Config");
    console.log("API_BASE_URL:", API_BASE_URL);
    console.log("WS_BASE_URL:", WS_BASE_URL);
    console.log("NEXT_PUBLIC_BACKEND_URL:", process.env.NEXT_PUBLIC_BACKEND_URL);
    console.log("---------------------------------------------");
}
