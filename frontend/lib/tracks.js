export const fallbackTracks = [
  {
    id: "trk_001",
    title: "Midnight Drive",
    artist: "Neon Valley",
    album: "After Hours",
    duration: "5:02",
    mood: "Synthwave",
    color: "#146c5f",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: "trk_002",
    title: "Glass Skyline",
    artist: "Mira Lane",
    album: "City Lights",
    duration: "6:12",
    mood: "Electronic",
    color: "#d96b43",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id: "trk_003",
    title: "Warm Static",
    artist: "The Low Signals",
    album: "Signal Room",
    duration: "5:44",
    mood: "Indie",
    color: "#4b6cb7",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  },
  {
    id: "trk_004",
    title: "Silver Morning",
    artist: "Arlo Finch",
    album: "Soft Focus",
    duration: "5:19",
    mood: "Ambient",
    color: "#7d5a50",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3"
  },
  {
    id: "trk_005",
    title: "Pulse Theory",
    artist: "North Circuit",
    album: "Kinetic",
    duration: "5:31",
    mood: "House",
    color: "#8f3d56",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3"
  },
  {
    id: "trk_006",
    title: "മഴനിലാവ്",
    artist: "അനിരുദ്ധ് മേനോൻ",
    album: "Kerala Nights",
    duration: "6:08",
    mood: "Malayalam Melody",
    color: "#1ed760",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3"
  },
  {
    id: "trk_007",
    title: "കായൽ തീരം",
    artist: "നീല രവി",
    album: "Backwater Sessions",
    duration: "6:44",
    mood: "Folk Fusion",
    color: "#0ea5e9",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"
  },
  {
    id: "trk_008",
    title: "കൊച്ചി ബീറ്റ്",
    artist: "DJ മാധവ്",
    album: "Metro Malayalam",
    duration: "5:25",
    mood: "Malayalam Pop",
    color: "#f97316",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
  },
  {
    id: "trk_009",
    title: "ചന്ദനക്കാറ്റ്",
    artist: "മീര നായർ",
    album: "Monsoon Raaga",
    duration: "6:30",
    mood: "Romantic",
    color: "#d946ef",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3"
  },
  {
    id: "trk_010",
    title: "പുലരി പാട്ട്",
    artist: "ഹരിശങ്കർ വർമ്മ",
    album: "Morning Ragas",
    duration: "4:59",
    mood: "Classical",
    color: "#facc15",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3"
  }
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api";

export async function getTracks(token, search = "") {
  try {
    const params = new URLSearchParams();

    if (search) {
      params.set("search", search);
    }

    const response = await fetch(`${API_URL}/tracks${params.toString() ? `?${params}` : ""}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Unable to load tracks.");
    }

    const data = await response.json();
    return data.tracks.map((track) => ({
      ...track,
      id: track.id || track._id
    }));
  } catch (error) {
    if (error.message === "Unable to load tracks.") {
      throw error;
    }

    return fallbackTracks;
  }
}
