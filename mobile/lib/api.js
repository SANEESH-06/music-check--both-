const API_URL = "http://192.168.29.223:5000/api"; // Auto-detected local IP for physical device
// For Android emulator use: http://10.0.2.2:5000/api

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

export async function scrapeTracks(token) {
    const res = await fetch(`${API_URL}/tracks/scrape`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Scraping failed.");
    return data;
}
