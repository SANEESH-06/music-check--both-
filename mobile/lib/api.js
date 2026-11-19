import { Platform } from "react-native";
import Constants from "expo-constants";

const debuggerHost =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    Constants.linkingUri;
const localHost = debuggerHost?.split(":")[0];
const isLoopbackHost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(localHost);
const DEFAULT_API_URL = localHost && !isLoopbackHost
    ? `http://${localHost}:5000/api`
    : Platform.OS === "android"
        ? "http://10.0.2.2:5000/api"
        : "http://127.0.0.1:5000/api";
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

export async function loginUser(credentials) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed.");
    return data;
}

export async function registerUser(user) {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed.");
    return data;
}

export async function getTracks(token) {
    const res = await fetch(`${API_URL}/tracks`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Unable to load tracks.");
    const data = await res.json();
    return data.tracks.map((t) => ({ ...t, id: t.id || t._id }));
}

export async function uploadTrack(token, track) {
    const res = await fetch(`${API_URL}/tracks`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(track),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Upload failed.");
    return data.track;
}

export async function deleteTrack(token, trackId) {
    const res = await fetch(`${API_URL}/tracks/${trackId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Delete failed.");
    return data;
}

export async function deleteAllTracks(token) {
    const res = await fetch(`${API_URL}/tracks`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirm: "DELETE_ALL_TRACKS" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Delete all failed.");
    return data;
}

export async function scrapeTracks(token) {
    const res = await fetch(`${API_URL}/tracks/scrape`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Scraping failed.");
    return data;
}
