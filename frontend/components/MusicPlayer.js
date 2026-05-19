"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Crown,
  Download,
  Heart,
  ListMusic,
  LogOut,
  Moon,
  Pause,
  Play,
  Plus,
  Repeat,
  Search,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Star,
  Sun,
  Volume2,
  X,
  Trash2,
  Music,
  Clock,
  Radio,
  ListOrdered
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getTracks } from "@/lib/tracks";
import { uploadTrack, scrapeTracks } from "@/lib/api";

const libraryDefaults = {
  liked: [],
  wishlist: [],
  playlists: [
    {
      id: "pl_favorites",
      name: "Malayalam Mix",
      trackIds: []
    }
  ],
  settings: {
    offlineMode: false,
    compactRows: false,
    highQuality: true,
    glassIntensity: 70,
    reduceMotion: false,
    theme: "dark"
  }
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function readLibrary() {
  try {
    const saved = JSON.parse(localStorage.getItem("echowave_library"));

    return {
      ...libraryDefaults,
      ...saved,
      settings: {
        ...libraryDefaults.settings,
        ...saved?.settings
      }
    };
  } catch {
    return libraryDefaults;
  }
}

// Optimized Progress Bar Component to prevent MusicPlayer re-renders during playback
function TrackProgressBar({ audioRef, activeTrackUrl }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration) {
        setDuration(audio.duration);
      }
    };

    if (audio.duration) {
      setDuration(audio.duration);
    }
    setCurrentTime(audio.currentTime);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleLoadedMetadata);
    audio.addEventListener("canplay", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleLoadedMetadata);
    };
  }, [audioRef.current, activeTrackUrl]);

  const seek = (event) => {
    const nextTime = Number(event.target.value);
    setCurrentTime(nextTime);
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  return (
    <div className="progress-area">
      <input
        aria-label="Track progress"
        type="range"
        min="0"
        max={duration || 0}
        value={currentTime}
        onChange={seek}
      />
      <div className="time-row">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

// Spotify-style Grid Card Component
function TrackCard({ track, onPlay }) {
  return (
    <div className="spotify-card" onClick={onPlay}>
      <div className="card-image-wrap" style={{ background: `linear-gradient(135deg, ${track.color || "#6d5dfc"}, #1f2937)` }}>
        <span className="card-thumb-char">{track.title.slice(0, 1)}</span>
        <button className="spotify-play-btn" type="button" aria-label="Play">
          <Play size={20} fill="currentColor" style={{ marginLeft: "2px" }} />
        </button>
      </div>
      <div className="card-info">
        <strong className="card-title">
          {track.title}
          <span className="cc-badge" title="No copyright / CC Creative Commons royalty free audio">CC</span>
        </strong>
        <span className="card-artist">{track.artist}</span>
      </div>
    </div>
  );
}


export default function MusicPlayer() {
  const router = useRouter();
  const audioRef = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [user, setUser] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeView, setActiveView] = useState("all");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState("pl_favorites");
  const [library, setLibrary] = useState(libraryDefaults);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [query, setQuery] = useState("");
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Premium features state
  const [sleepTimeLeft, setSleepTimeLeft] = useState(null);
  const [eqPreset, setEqPreset] = useState("flat");
  const [queue, setQueue] = useState([]);

  // Scrape state
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState("");

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    artist: "",
    album: "",
    duration: "4:20",
    mood: "Future Pop",
    color: "#6d5dfc",
    audioUrl: ""
  });
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Equalizer Web Audio API Refs
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const eqFiltersRef = useRef([]);
  const isEqInitialized = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("echowave_user");

    if (!token) {
      router.replace("/login");
      return;
    }

    setLibrary(readLibrary());

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    getTracks(token)
      .then(setTracks)
      .catch(() => {
        const savedTracks = JSON.parse(localStorage.getItem("sounddeck_cached_tracks") || "[]");

        if (savedTracks.length) {
          setTracks(savedTracks);
          return;
        }

        localStorage.removeItem("auth_token");
        router.replace("/login");
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  useEffect(() => {
    localStorage.setItem("echowave_library", JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    document.documentElement.dataset.theme = library.settings.theme;
  }, [library.settings.theme]);

  useEffect(() => {
    if (tracks.length) {
      localStorage.setItem("echowave_cached_tracks", JSON.stringify(tracks));
    }
  }, [tracks]);

  useEffect(() => {
    if (!tracks.length) {
      return;
    }

    updateLibrary((current) => {
      const defaultPlaylist = current.playlists.find((playlist) => playlist.id === "pl_favorites");

      if (!defaultPlaylist || defaultPlaylist.trackIds.length) {
        return current;
      }

      const malayalamTrackIds = tracks
        .filter((track) => [track.title, track.artist, track.album, track.mood].join(" ").toLowerCase().includes("malayalam"))
        .map((track) => track.id);

      return {
        ...current,
        playlists: current.playlists.map((playlist) => {
          if (playlist.id !== "pl_favorites") {
            return playlist;
          }

          return {
            ...playlist,
            trackIds: malayalamTrackIds
          };
        })
      };
    });
  }, [tracks]);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimeLeft === null) return;
    if (sleepTimeLeft <= 0) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      setSleepTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      setSleepTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimeLeft]);

  const activeTrack = tracks[activeIndex];
  const activePlaylist = library.playlists.find((playlist) => playlist.id === selectedPlaylistId);
  const isAdmin = user?.email?.toLowerCase() === "admin@example.com";

  // Dropdown options populated from existing DB tracks
  const existingArtists = useMemo(() => Array.from(new Set(tracks.map((t) => t.artist).filter(Boolean))), [tracks]);
  const existingAlbums = useMemo(() => Array.from(new Set(tracks.map((t) => t.album).filter(Boolean))), [tracks]);
  const existingMoods = useMemo(() => Array.from(new Set(tracks.map((t) => t.mood).filter(Boolean))), [tracks]);

  const artistOptions = useMemo(() => existingArtists.length > 0 ? existingArtists : ["Neon Valley", "Mira Lane", "The Low Signals", "Arlo Finch", "North Circuit"], [existingArtists]);
  const albumOptions = useMemo(() => existingAlbums.length > 0 ? existingAlbums : ["After Hours", "City Lights", "Signal Room", "Soft Focus", "Kinetic"], [existingAlbums]);
  const moodOptions = useMemo(() => existingMoods.length > 0 ? existingMoods : ["Synthwave", "Electronic", "Indie", "Ambient", "House"], [existingMoods]);
  const audioOptions = useMemo(() => Array.from({ length: 16 }, (_, i) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${i + 1}.mp3`), []);

  // Initialize form options
  useEffect(() => {
    if (tracks.length > 0) {
      setUploadForm((prev) => ({
        ...prev,
        artist: prev.artist || artistOptions[0],
        album: prev.album || albumOptions[0],
        mood: prev.mood || moodOptions[0],
        audioUrl: prev.audioUrl || audioOptions[0]
      }));
    }
  }, [tracks.length, artistOptions, albumOptions, moodOptions, audioOptions]);


  const visibleTracks = useMemo(() => {
    let scopedTracks = tracks;

    if (activeView === "liked") {
      scopedTracks = tracks.filter((track) => library.liked.includes(track.id));
    }

    if (activeView === "wishlist") {
      scopedTracks = tracks.filter((track) => library.wishlist.includes(track.id));
    }

    if (activeView === "playlist" && activePlaylist) {
      scopedTracks = tracks.filter((track) => activePlaylist.trackIds.includes(track.id));
    }

    if (activeView === "queue") {
      scopedTracks = tracks.filter((track) => queue.includes(track.id));
    }

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return scopedTracks;
    }

    return scopedTracks.filter((track) => {
      return [track.title, track.artist, track.album, track.mood]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activePlaylist, activeView, library.liked, library.wishlist, queue, query, tracks]);

  const recommendedTracks = useMemo(() => {
    return tracks.slice(0, 6);
  }, [tracks]);

  const trendingTracks = useMemo(() => {
    return [...tracks].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 6);
  }, [tracks]);

  const likedCount = library.liked.length;
  const wishlistCount = library.wishlist.length;

  useEffect(() => {
    if (!audioRef.current) {
      return;
    }

    audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [audioRef.current]);

  useEffect(() => {
    if (!audioRef.current || !activeTrack) {
      return;
    }

    audioRef.current.load();

    if (isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
      initEqualizer();
    }
  }, [activeTrack?.audioUrl]);


  // Audio Equalizer setup
  const initEqualizer = () => {
    if (isEqInitialized.current) return;
    const audio = audioRef.current;
    if (!audio) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(audio);
      sourceRef.current = source;

      const lowFilter = ctx.createBiquadFilter();
      lowFilter.type = "lowshelf";
      lowFilter.frequency.value = 250;

      const midFilter = ctx.createBiquadFilter();
      midFilter.type = "peaking";
      midFilter.Q.value = 1.0;
      midFilter.frequency.value = 1000;

      const highFilter = ctx.createBiquadFilter();
      highFilter.type = "highshelf";
      highFilter.frequency.value = 4000;

      source.connect(lowFilter);
      lowFilter.connect(midFilter);
      midFilter.connect(highFilter);
      highFilter.connect(ctx.destination);

      eqFiltersRef.current = [lowFilter, midFilter, highFilter];
      isEqInitialized.current = true;
      applyEqPreset(eqPreset);
    } catch (err) {
      console.error("Web Audio Equalizer failed to initialize:", err);
    }
  };

  const applyEqPreset = (presetName) => {
    setEqPreset(presetName);
    if (!isEqInitialized.current) {
      initEqualizer();
    }

    const filters = eqFiltersRef.current;
    if (filters.length < 3) return;

    const [low, mid, high] = filters;

    if (presetName === "flat") {
      low.gain.value = 0;
      mid.gain.value = 0;
      high.gain.value = 0;
    } else if (presetName === "bass-boost") {
      low.gain.value = 8;
      mid.gain.value = 0;
      high.gain.value = -2;
    } else if (presetName === "vocal-boost") {
      low.gain.value = -2;
      mid.gain.value = 6;
      high.gain.value = 2;
    } else if (presetName === "treble-boost") {
      low.gain.value = -4;
      mid.gain.value = 0;
      high.gain.value = 8;
    } else if (presetName === "electronic") {
      low.gain.value = 6;
      mid.gain.value = -2;
      high.gain.value = 5;
    }
  };

  function updateLibrary(updater) {
    setLibrary((current) => {
      return typeof updater === "function" ? updater(current) : updater;
    });
  }

  function toggleArrayItem(key, trackId) {
    updateLibrary((current) => {
      const currentItems = current[key];
      const nextItems = currentItems.includes(trackId)
        ? currentItems.filter((id) => id !== trackId)
        : [...currentItems, trackId];

      return {
        ...current,
        [key]: nextItems
      };
    });
  }

  function toggleSetting(key) {
    updateLibrary((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: !current.settings[key]
      }
    }));
  }

  function updateSetting(key, value) {
    updateLibrary((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: value
      }
    }));
  }

  function createPlaylist(event) {
    event.preventDefault();

    const name = newPlaylistName.trim();

    if (!name) {
      return;
    }

    const playlist = {
      id: `pl_${Date.now()}`,
      name,
      trackIds: activeTrack ? [activeTrack.id] : []
    };

    updateLibrary((current) => ({
      ...current,
      playlists: [...current.playlists, playlist]
    }));
    setSelectedPlaylistId(playlist.id);
    setActiveView("playlist");
    setNewPlaylistName("");
  }

  function deletePlaylist(playlistId) {
    if (playlistId === "pl_favorites") {
      alert("Cannot delete the default playlist.");
      return;
    }
    if (confirm("Are you sure you want to delete this playlist?")) {
      updateLibrary((current) => {
        const nextPlaylists = current.playlists.filter((p) => p.id !== playlistId);
        return {
          ...current,
          playlists: nextPlaylists
        };
      });
      setSelectedPlaylistId("pl_favorites");
      setActiveView("all");
    }
  }

  function addToPlaylist(playlistId, trackId) {
    updateLibrary((current) => ({
      ...current,
      playlists: current.playlists.map((playlist) => {
        if (playlist.id !== playlistId || playlist.trackIds.includes(trackId)) {
          return playlist;
        }

        return {
          ...playlist,
          trackIds: [...playlist.trackIds, trackId]
        };
      })
    }));
  }

  function addToQueue(trackId) {
    setQueue((current) => [...current, trackId]);
  }

  function removeFromQueue(trackId) {
    setQueue((current) => current.filter((id) => id !== trackId));
  }

  function playTrack(index) {
    initEqualizer();
    if (index === activeIndex && audioRef.current) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      return;
    }

    setActiveIndex(index);
    setIsPlaying(true);
  }

  function togglePlay() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    initEqualizer();

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }

  function nextTrack() {
    if (!tracks.length) {
      return;
    }

    // Play from Queue if available
    if (queue.length > 0) {
      const nextId = queue[0];
      const index = tracks.findIndex((t) => t.id === nextId);
      setQueue((q) => q.slice(1));
      if (index !== -1) {
        setActiveIndex(index);
        setIsPlaying(true);
        return;
      }
    }

    if (isShuffle && tracks.length > 1) {
      let randomIndex = Math.floor(Math.random() * tracks.length);

      while (randomIndex === activeIndex) {
        randomIndex = Math.floor(Math.random() * tracks.length);
      }

      setActiveIndex(randomIndex);
      setIsPlaying(true);
      return;
    }

    setActiveIndex((activeIndex + 1) % tracks.length);
    setIsPlaying(true);
  }

  function previousTrack() {
    if (!tracks.length) {
      return;
    }

    setActiveIndex((activeIndex - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  }

  function handleEnded() {
    if (isRepeat && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }

    nextTrack();
  }

  function logout() {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    localStorage.removeItem("auth_token");
    localStorage.removeItem("echowave_user");
    router.replace("/login");
  }

  // Trigger web scraping on backend
  const handleScrape = async () => {
    setIsScraping(true);
    setScrapeMessage("");
    try {
      const token = localStorage.getItem("auth_token");
      const res = await scrapeTracks(token);
      setScrapeMessage(res.message);
      // Refresh track list
      const updatedTracks = await getTracks(token);
      setTracks(updatedTracks);
    } catch (err) {
      setScrapeMessage("Scraping failed: " + err.message);
    } finally {
      setIsScraping(false);
    }
  };

  // Handle local track upload from modal
  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError("");
    setUploadMessage("");
    setIsUploading(true);

    try {
      const token = localStorage.getItem("auth_token");
      await uploadTrack(token, uploadForm);
      setUploadMessage("Track uploaded successfully!");
      setUploadForm((prev) => ({ ...prev, title: "" }));
      // Refresh tracks
      const updatedTracks = await getTracks(token);
      setTracks(updatedTracks);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading || !activeTrack) {
    return (
      <main className="player-shell">
        <section className="loading-panel">Preparing your premium library...</section>
      </main>
    );
  }

  return (
    <main
      className={library.settings.reduceMotion ? "player-shell reduce-motion" : "player-shell"}
      style={{ "--glass-level": `${library.settings.glassIntensity}%` }}
    >
      <audio
        ref={audioRef}
        src={activeTrack.audioUrl}
        crossOrigin="anonymous"
        onEnded={handleEnded}
      />

      <section className="player-now" style={{ "--track-color": activeTrack.color }}>
        <nav className="player-nav">
          <div>
            <p className="eyebrow">
              EchoWave Audio Suite
              <span className="cc-badge" style={{ marginLeft: "8px" }} title="Creative Commons royalty free audio">CC</span>
            </p>
            <h1>EchoWave</h1>
          </div>
          <div className="nav-actions">
            <span className="premium-badge">
              <Crown size={15} aria-hidden="true" />
              {user?.plan || "Premium"}
            </span>
            <button className="icon-button" type="button" aria-label="Open settings" onClick={() => setIsSettingsOpen(true)}>
              <Settings size={20} />
            </button>
            <button className="icon-button" type="button" aria-label="Logout" onClick={logout}>
              <LogOut size={20} />
            </button>
          </div>
        </nav>

        {isAdmin ? (
          <div className="admin-toolbar" style={{ display: "flex", gap: "10px", marginTop: "4px", alignItems: "center" }}>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--muted)",
                fontWeight: "bold",
                background: "rgba(255, 255, 255, 0.08)",
                padding: "8px 12px",
                borderRadius: "18px",
                border: "1px solid var(--line)",
                whiteSpace: "nowrap"
              }}
            >
              Tracks: {tracks.length}
            </span>
            <button
              className="nav-button"
              type="button"
              onClick={() => {
                setScrapeMessage("");
                handleScrape();
              }}
              disabled={isScraping}
              style={{
                flex: 1,
                background: "rgba(30, 215, 96, 0.2)",
                border: "1px solid var(--green)",
                color: "var(--green)",
                height: "36px",
                borderRadius: "18px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              {isScraping ? "Scraping..." : "Scrape"}
            </button>
            <button
              className="nav-button"
              type="button"
              onClick={() => setIsUploadOpen(true)}
              style={{
                flex: 1,
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                height: "36px",
                borderRadius: "18px",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              Upload
            </button>
          </div>
        ) : null}


        {scrapeMessage && (
          <div className="scrape-banner" style={{ background: "rgba(255, 255, 255, 0.1)", border: "1px solid var(--line)", padding: "10px", borderRadius: "10px", textAlign: "center", fontSize: "0.85rem", marginTop: "4px" }}>
            {scrapeMessage}
          </div>
        )}


        <div className="album-art" aria-hidden="true">
          <span>{activeTrack.title.slice(0, 1)}</span>
          <div className={isPlaying ? "vinyl spinning" : "vinyl"} />
        </div>

        <div className="track-heading">
          <p>
            {activeTrack.mood}
            <span className="cc-badge" style={{ marginLeft: "8px" }} title="Creative Commons royalty free audio">CC</span>
          </p>
          <h2>{activeTrack.title}</h2>
          <span>{activeTrack.artist}</span>
        </div>

        <div className="quick-actions">
          <button
            className={library.liked.includes(activeTrack.id) ? "pill-button active" : "pill-button"}
            type="button"
            onClick={() => toggleArrayItem("liked", activeTrack.id)}
          >
            <Heart size={16} fill="currentColor" />
            Like
          </button>
          <button
            className={library.wishlist.includes(activeTrack.id) ? "pill-button active" : "pill-button"}
            type="button"
            onClick={() => toggleArrayItem("wishlist", activeTrack.id)}
          >
            <Star size={16} fill="currentColor" />
            Wishlist
          </button>
          <button
            className="pill-button"
            type="button"
            onClick={() => addToPlaylist(selectedPlaylistId, activeTrack.id)}
          >
            <Plus size={16} />
            Playlist
          </button>
          <button
            className="pill-button"
            type="button"
            onClick={() => addToQueue(activeTrack.id)}
          >
            <ListOrdered size={16} />
            + Queue
          </button>
        </div>

        {/* Optimized Progress Bar */}
        <TrackProgressBar audioRef={audioRef} />

        <div className="controls">
          <button
            className={isShuffle ? "icon-button active" : "icon-button"}
            type="button"
            aria-label="Toggle shuffle"
            onClick={() => setIsShuffle((current) => !current)}
          >
            <Shuffle size={19} />
          </button>
          <button className="icon-button" type="button" aria-label="Previous track" onClick={previousTrack}>
            <SkipBack size={22} />
          </button>
          <button className="play-button" type="button" aria-label="Play or pause" onClick={togglePlay}>
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
          <button className="icon-button" type="button" aria-label="Next track" onClick={nextTrack}>
            <SkipForward size={22} />
          </button>
          <button
            className={isRepeat ? "icon-button active" : "icon-button"}
            type="button"
            aria-label="Toggle repeat"
            onClick={() => setIsRepeat((current) => !current)}
          >
            <Repeat size={19} />
          </button>
        </div>

        <label className="volume-control">
          <Volume2 size={18} aria-hidden="true" />
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </label>
      </section>

      <section className="library-panel">
        <div className="library-header">
          <div>
            <p className="eyebrow">No ads / High quality / Unlimited skips</p>
            <h2>Your Premium Library</h2>
          </div>
          <label className="search-box">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search songs"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="library-tabs">
          <button className={activeView === "all" ? "tab-button active" : "tab-button"} type="button" onClick={() => setActiveView("all")}>
            All songs
          </button>
          <button className={activeView === "liked" ? "tab-button active" : "tab-button"} type="button" onClick={() => setActiveView("liked")}>
            Liked {likedCount}
          </button>
          <button className={activeView === "wishlist" ? "tab-button active" : "tab-button"} type="button" onClick={() => setActiveView("wishlist")}>
            Wishlist {wishlistCount}
          </button>
          <button className={activeView === "playlist" ? "tab-button active" : "tab-button"} type="button" onClick={() => setActiveView("playlist")}>
            Playlist
          </button>
          <button className={activeView === "queue" ? "tab-button active" : "tab-button"} type="button" onClick={() => setActiveView("queue")}>
            Queue ({queue.length})
          </button>
        </div>

        <div className="playlist-bar">
          <div style={{ display: "flex", gap: "8px", width: "100%" }}>
            <select
              aria-label="Select playlist"
              value={selectedPlaylistId}
              onChange={(event) => {
                setSelectedPlaylistId(event.target.value);
                setActiveView("playlist");
              }}
              style={{ flex: 1 }}
            >
              {library.playlists.map((playlist) => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name} ({playlist.trackIds.length})
                </option>
              ))}
            </select>
            {selectedPlaylistId !== "pl_favorites" && (
              <button
                type="button"
                onClick={() => deletePlaylist(selectedPlaylistId)}
                aria-label="Delete playlist"
                className="playlist-delete-btn"
                style={{
                  background: "rgba(255, 107, 107, 0.15)",
                  border: "1px solid var(--danger)",
                  color: "var(--danger)",
                  borderRadius: "18px",
                  padding: "0 15px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <form onSubmit={createPlaylist} className="playlist-form">
            <input
              value={newPlaylistName}
              onChange={(event) => setNewPlaylistName(event.target.value)}
              placeholder="New playlist"
            />
            <button type="submit" aria-label="Create playlist">
              <Plus size={18} />
            </button>
          </form>
        </div>

        <div className={library.settings.compactRows ? "track-list compact" : "track-list"}>
          <div className="premium-strip">
            <div>
              <strong>{library.settings.offlineMode ? "Offline-ready session" : "Premium session"}</strong>
              <span>{user?.name || "Listener"} is signed in. Liked songs, wishlist, playlists, and settings are saved on this device.</span>
            </div>
            {library.settings.offlineMode ? <Download size={22} aria-hidden="true" /> : <ListMusic size={22} aria-hidden="true" />}
          </div>

          {activeView === "all" && !query.trim() && (
            <div className="spotify-dashboard" style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "32px", padding: "10px 0" }}>
              <div className="spotify-section">
                <h3 className="section-title" style={{ fontSize: "1.2rem", fontWeight: "800", marginBottom: "12px", color: "var(--text)" }}>Recommended for You</h3>
                <div className="spotify-grid">
                  {recommendedTracks.map((track) => {
                    const originalIndex = tracks.findIndex((item) => item.id === track.id);
                    return (
                      <TrackCard
                        key={`rec-${track.id}`}
                        track={track}
                        onPlay={() => playTrack(originalIndex)}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="spotify-section">
                <h3 className="section-title" style={{ fontSize: "1.2rem", fontWeight: "800", marginBottom: "12px", color: "var(--text)" }}>Trending Now</h3>
                <div className="spotify-grid">
                  {trendingTracks.map((track) => {
                    const originalIndex = tracks.findIndex((item) => item.id === track.id);
                    return (
                      <TrackCard
                        key={`trend-${track.id}`}
                        track={track}
                        onPlay={() => playTrack(originalIndex)}
                      />
                    );
                  })}
                </div>
              </div>

              <h3 className="section-title" style={{ fontSize: "1.2rem", fontWeight: "800", marginTop: "12px", color: "var(--text)" }}>All Songs</h3>
            </div>
          )}

          {activeView === "queue" && queue.length === 0 && (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
              No tracks in your play queue. Add some from the track options!
            </div>
          )}

          {visibleTracks.map((track) => {
            const originalIndex = tracks.findIndex((item) => item.id === track.id);
            const isActive = track.id === activeTrack.id;

            return (
              <article className={isActive ? "track-row active" : "track-row"} key={track.id}>
                <button className="track-main" type="button" onClick={() => playTrack(originalIndex)}>
                  <span className="track-thumb" style={{ background: track.color }}>
                    {track.title.slice(0, 1)}
                  </span>
                  <span className="track-meta" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <strong style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {track.title}
                        {isActive && isPlaying && (
                          <div className="music-playing-waves">
                            <span className="wave-bar"></span>
                            <span className="wave-bar"></span>
                            <span className="wave-bar"></span>
                            <span className="wave-bar"></span>
                          </div>
                        )}
                        <span className="cc-badge" title="No copyright / CC Creative Commons royalty free audio">CC</span>
                      </strong>
                      <small>{track.artist} / {track.album}</small>
                    </div>
                  </span>
                  <span className="track-mood">{track.mood}</span>
                  <span className="track-duration">{track.duration}</span>
                </button>
                <div className="row-actions">
                  <button
                    className="mini-action"
                    type="button"
                    aria-label={`Play ${track.title}`}
                    onClick={() => playTrack(originalIndex)}
                  >
                    <Play size={16} />
                  </button>
                  <button
                    className={library.liked.includes(track.id) ? "mini-action active" : "mini-action"}
                    type="button"
                    aria-label="Like song"
                    onClick={() => toggleArrayItem("liked", track.id)}
                  >
                    <Heart size={16} fill="currentColor" />
                  </button>
                  <button
                    className={library.wishlist.includes(track.id) ? "mini-action active" : "mini-action"}
                    type="button"
                    aria-label="Add to wishlist"
                    onClick={() => toggleArrayItem("wishlist", track.id)}
                  >
                    <Star size={16} fill="currentColor" />
                  </button>
                  <button
                    className="mini-action"
                    type="button"
                    aria-label="Add to selected playlist"
                    onClick={() => addToPlaylist(selectedPlaylistId, track.id)}
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    className="mini-action"
                    type="button"
                    aria-label="Add to play queue"
                    onClick={() => addToQueue(track.id)}
                  >
                    <ListOrdered size={16} />
                  </button>
                  {activeView === "queue" && (
                    <button
                      className="mini-action"
                      type="button"
                      aria-label="Remove from queue"
                      onClick={() => removeFromQueue(track.id)}
                      style={{ color: "var(--danger)" }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Upload Pop-up Modal */}
      {isUploadOpen && (
        <div className="upload-modal-overlay">
          <div className="upload-modal-content dashboard-panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p className="eyebrow">Admin Studio</p>
                <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Upload a New Track</h1>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => {
                  setIsUploadOpen(false);
                  setUploadError("");
                  setUploadMessage("");
                }}
              >
                <X size={20} />
              </button>
            </div>
            <p style={{ marginTop: "10px", fontSize: "0.9rem", color: "var(--muted)" }}>
              Add new music using dropdown selection of existing entities to maintain data consistency.
            </p>

            <form onSubmit={handleUpload} className="dashboard-form" style={{ marginTop: "15px" }}>
              <label>
                <span>Song Title</span>
                <input
                  type="text"
                  name="title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="Midnight Escape"
                  required
                />
              </label>

              <label>
                <span>Artist</span>
                <select
                  name="artist"
                  value={uploadForm.artist}
                  onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}
                  className="modal-select"
                >
                  {artistOptions.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Album</span>
                <select
                  name="album"
                  value={uploadForm.album}
                  onChange={(e) => setUploadForm({ ...uploadForm, album: e.target.value })}
                  className="modal-select"
                >
                  {albumOptions.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Mood / Genre</span>
                <select
                  name="mood"
                  value={uploadForm.mood}
                  onChange={(e) => setUploadForm({ ...uploadForm, mood: e.target.value })}
                  className="modal-select"
                >
                  {moodOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Audio Track (Pre-populated option)</span>
                <select
                  name="audioUrl"
                  value={uploadForm.audioUrl}
                  onChange={(e) => setUploadForm({ ...uploadForm, audioUrl: e.target.value })}
                  className="modal-select"
                >
                  {audioOptions.map((url, i) => (
                    <option key={url} value={url}>SoundHelix Song {i + 1}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Accent Color</span>
                <input
                  type="color"
                  name="color"
                  value={uploadForm.color}
                  onChange={(e) => setUploadForm({ ...uploadForm, color: e.target.value })}
                />
              </label>

              <label>
                <span>Duration</span>
                <input
                  type="text"
                  name="duration"
                  value={uploadForm.duration}
                  onChange={(e) => setUploadForm({ ...uploadForm, duration: e.target.value })}
                  required
                />
              </label>

              {uploadMessage && <p style={{ color: "var(--green)", fontWeight: "bold" }}>{uploadMessage}</p>}
              {uploadError && <p style={{ color: "var(--danger)", fontWeight: "bold" }}>{uploadError}</p>}

              <div className="dashboard-actions">
                <button type="submit" disabled={isUploading}>
                  {isUploading ? "Uploading..." : "Upload song"}
                </button>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setIsUploadOpen(false);
                    setUploadError("");
                    setUploadMessage("");
                  }}
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <aside className={isSettingsOpen ? "settings-drawer open" : "settings-drawer"} aria-hidden={!isSettingsOpen}>
        <div className="settings-head">
          <div>
            <p className="eyebrow">Playback Settings</p>
            <h2>Control Center</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close settings" onClick={() => setIsSettingsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Audio Equalizer */}
        <div className="setting-row" style={{ display: "grid", gap: "10px" }}>
          <span style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Radio size={18} />
            Equalizer Preset
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "5px" }}>
            {["flat", "bass-boost", "vocal-boost", "treble-boost", "electronic"].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyEqPreset(preset)}
                className={`preset-btn ${eqPreset === preset ? "active" : ""}`}
                style={{
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  borderRadius: "12px",
                  border: "1px solid var(--line)",
                  background: eqPreset === preset ? "var(--green)" : "transparent",
                  color: eqPreset === preset ? "#041008" : "var(--text)",
                  cursor: "pointer",
                  textTransform: "capitalize"
                }}
              >
                {preset.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Sleep Timer */}
        <div className="setting-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Clock size={18} />
            Sleep Timer
          </span>
          <select
            value={sleepTimeLeft === null ? "off" : sleepTimeLeft}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "off") {
                setSleepTimeLeft(null);
              } else {
                setSleepTimeLeft(Number(val));
              }
            }}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              color: "var(--text)",
              border: "1px solid var(--line)",
              borderRadius: "12px",
              padding: "6px",
              outline: "none"
            }}
          >
            <option value="off" style={{ color: "#111827" }}>Off</option>
            <option value="300" style={{ color: "#111827" }}>5 Minutes</option>
            <option value="900" style={{ color: "#111827" }}>15 Minutes</option>
            <option value="1800" style={{ color: "#111827" }}>30 Minutes</option>
            <option value="3600" style={{ color: "#111827" }}>60 Minutes</option>
          </select>
        </div>

        {sleepTimeLeft !== null && (
          <div style={{ padding: "5px 16px", color: "var(--green)", fontSize: "0.85rem", fontWeight: "bold", textAlign: "right" }}>
            Timer active: {formatTime(sleepTimeLeft)} left
          </div>
        )}

        <label className="setting-row">
          <span>
            <Download size={18} />
            Offline mode
          </span>
          <button
            className={library.settings.offlineMode ? "switch active" : "switch"}
            type="button"
            onClick={() => toggleSetting("offlineMode")}
            aria-label="Toggle offline mode"
          >
            <span />
          </button>
        </label>

        <label className="setting-row">
          <span>
            <Check size={18} />
            High quality audio
          </span>
          <button
            className={library.settings.highQuality ? "switch active" : "switch"}
            type="button"
            onClick={() => toggleSetting("highQuality")}
            aria-label="Toggle high quality audio"
          >
            <span />
          </button>
        </label>

        <label className="setting-row">
          <span>
            <ListMusic size={18} />
            Compact rows
          </span>
          <button
            className={library.settings.compactRows ? "switch active" : "switch"}
            type="button"
            onClick={() => toggleSetting("compactRows")}
            aria-label="Toggle compact rows"
          >
            <span />
          </button>
        </label>

        <label className="setting-row">
          <span>
            <Moon size={18} />
            Reduce motion
          </span>
          <button
            className={library.settings.reduceMotion ? "switch active" : "switch"}
            type="button"
            onClick={() => toggleSetting("reduceMotion")}
            aria-label="Toggle reduced motion"
          >
            <span />
          </button>
        </label>

        <label className="setting-row theme-row">
          <span>
            <Sun size={18} />
            Theme mode
          </span>
          <div className="theme-switches">
            <button
              className={library.settings.theme === "dark" ? "theme-button active" : "theme-button"}
              type="button"
              onClick={() => updateSetting("theme", "dark")}
            >
              Dark
            </button>
            <button
              className={library.settings.theme === "light" ? "theme-button active" : "theme-button"}
              type="button"
              onClick={() => updateSetting("theme", "light")}
            >
              Light
            </button>
          </div>
        </label>

        <label className="slider-setting">
          <span>
            <SlidersHorizontal size={18} />
            Glass intensity
          </span>
          <input
            type="range"
            min="35"
            max="95"
            value={library.settings.glassIntensity}
            onChange={(event) => updateSetting("glassIntensity", Number(event.target.value))}
          />
        </label>
      </aside>
    </main>
  );
}
