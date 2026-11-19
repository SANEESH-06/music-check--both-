const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api";

export async function loginUser(credentials) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(credentials)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed.");
  }

  return data;
}

export async function registerUser(user) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(user)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Registration failed.");
  }

  return data;
}

export async function uploadTrack(token, track) {
  const response = await fetch(`${API_URL}/tracks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(track)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Track upload failed.");
  }

  return data.track;
}

export async function deleteTrack(token, trackId) {
  const response = await fetch(`${API_URL}/tracks/${trackId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Song delete failed.");
  }

  return data;
}

export async function deleteAllTracks(token) {
  const response = await fetch(`${API_URL}/tracks`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ confirm: "DELETE_ALL_TRACKS" })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Delete all songs failed.");
  }

  return data;
}

export async function scrapeTracks(token) {
  const response = await fetch(`${API_URL}/tracks/scrape`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Scraping failed.");
  }

  return data;
}

export async function incrementTrackPlays(token, trackId) {
  try {
    await fetch(`${API_URL}/tracks/${trackId}/plays`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: "{}"
    });
  } catch {
    // fire-and-forget — don't block playback on failure
  }
}

export async function getRecommendations(token, { mood, artist, limit = 6 } = {}) {
  const params = new URLSearchParams();
  if (mood) params.set("mood", mood);
  if (artist) params.set("artist", artist);
  params.set("limit", String(limit));

  const response = await fetch(`${API_URL}/tracks/recommendations?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not load recommendations.");
  return data.tracks.map((t) => ({ ...t, id: t.id || t._id }));
}

