"use client";

import { useEffect, useMemo, useRef, useState, memo, useCallback } from "react";
import {
  Check, Crown, Download, Heart, ListMusic, LogOut, Menu, Moon, Pause, Play, Plus,
  Repeat, Search, Settings, Shuffle, SkipBack, SkipForward, SlidersHorizontal,
  Star, Sun, Volume2, X, Trash2, Music, Clock, Radio, ListOrdered, Upload,
  FileAudio, Lock, EyeOff, Sparkles, Disc
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getTracks } from "@/lib/tracks";
import { deleteAllTracks, deleteTrack, uploadTrack, scrapeTracks, incrementTrackPlays, getRecommendations } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import Dropdown from "@/components/ui/Dropdown";

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
    theme: "light"
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

function isUrlCrossOrigin(url) {
  if (!url) return false;
  try {
    const origin = new URL(url, window.location.href).origin;
    return origin !== window.location.origin;
  } catch {
    return false;
  }
}

function normalizeComparable(value) {
  return String(value ?? "").trim().toLowerCase();
}

function cleanTrackPayload(form) {
  return {
    title: String(form.title ?? "").trim(),
    artist: String(form.artist ?? "").trim(),
    album: String(form.album ?? "").trim(),
    duration: String(form.duration ?? "").trim(),
    mood: String(form.mood ?? "").trim(),
    color: String(form.color ?? "").trim(),
    audioUrl: String(form.audioUrl ?? "").trim(),
    coverUrl: String(form.coverUrl ?? "").trim()
  };
}

function findDuplicateTrack(tracks, candidate) {
  const candidateTitle = normalizeComparable(candidate.title);
  const candidateArtist = normalizeComparable(candidate.artist);
  const candidateAudioUrl = normalizeComparable(candidate.audioUrl);

  return tracks.find((track) => {
    const sameTitleAndArtist =
      normalizeComparable(track.title) === candidateTitle &&
      normalizeComparable(track.artist) === candidateArtist;
    const sameAudioUrl = candidateAudioUrl && normalizeComparable(track.audioUrl) === candidateAudioUrl;

    return sameTitleAndArtist || sameAudioUrl;
  });
}

function pruneTrackFromLibrary(library, trackId) {
  return {
    ...library,
    liked: library.liked.filter((id) => id !== trackId),
    wishlist: library.wishlist.filter((id) => id !== trackId),
    playlists: library.playlists.map((playlist) => ({
      ...playlist,
      trackIds: playlist.trackIds.filter((id) => id !== trackId)
    }))
  };
}


// Optimized Progress Bar Component to prevent MusicPlayer re-renders during playback
function TrackProgressBar({ audioRef, activeTrackUrl, useEqualizer }) {
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
  }, [audioRef.current, activeTrackUrl, useEqualizer]);

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

// Creative Commons Badge Component
function CreativeCommonsBadge({ title }) {
  return (
    <span className="cc-badge" title={title || "Creative Commons / Royalty Free Audio"} style={{ display: "inline-flex", alignItems: "center", gap: "3px", verticalAlign: "middle" }}>
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M10 9.3a2.8 2.8 0 0 0-3.5 1 3.1 3.1 0 0 0 0 3.4 2.8 2.8 0 0 0 3.5 1" />
        <path d="M17 9.3a2.8 2.8 0 0 0-3.5 1 3.1 3.1 0 0 0 0 3.4 2.8 2.8 0 0 0 3.5 1" />
      </svg>
      <span>CC</span>
    </span>
  );
}

// Spotify-style Grid Card Component
const TrackCard = memo(function TrackCard({ track, onPlay }) {
  return (
    <div className="spotify-card" onClick={onPlay}>
      <div className="card-image-wrap" style={{ background: track.coverUrl ? "none" : `linear-gradient(135deg, ${track.color || "#6d5dfc"}, #1f2937)`, position: "relative", overflow: "hidden" }}>
        {track.coverUrl ? (
          <img src={track.coverUrl} alt={track.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0, borderRadius: "inherit" }} />
        ) : (
          <span className="card-thumb-char">{track.title.slice(0, 1)}</span>
        )}
        <button className="spotify-play-btn" type="button" aria-label="Play">
          <Play size={20} fill="currentColor" style={{ marginLeft: "2px" }} />
        </button>
      </div>
      <div className="card-info">
        <strong className="card-title">
          {track.title}
          <CreativeCommonsBadge title="No copyright / CC Creative Commons royalty free audio" />
        </strong>
        <span className="card-artist">{track.artist}</span>
      </div>
    </div>
  );
});

// Memoized Track Row Component for extreme performance
const TrackRow = memo(function TrackRow({
  track,
  originalIndex,
  isActive,
  isPlaying,
  playTrack,
  togglePlay,
  isLiked,
  isWishlisted,
  toggleArrayItem,
  selectedPlaylistId,
  addToPlaylist,
  addToQueue,
  activeView,
  removeFromQueue,
  removeFromPlaylist,
  isAdmin,
  onDeleteTrack
}) {
  return (
    <article className={isActive ? "track-row active" : "track-row"}>
      <button className="track-main" type="button" onClick={() => playTrack(originalIndex)}>
        {track.coverUrl ? (
          <img src={track.coverUrl} alt={track.title} className="track-thumb" style={{ objectFit: "cover", background: "none" }} />
        ) : (
          <span className="track-thumb" style={{ background: track.color }}>{track.title.slice(0, 1)}</span>
        )}
        <span className="track-meta">
          <strong>
            {track.title}
            {isActive && isPlaying && (
              <span className="music-playing-waves">
                <span className="wave-bar" /><span className="wave-bar" /><span className="wave-bar" /><span className="wave-bar" />
              </span>
            )}
            <CreativeCommonsBadge />
          </strong>
          <small>{track.artist} / {track.album}</small>
        </span>
        <span className="track-mood">{track.mood}</span>
        <span className="track-duration">{track.duration}</span>
      </button>
      <div className="row-actions">
        <button className="mini-action" type="button" aria-label={isActive && isPlaying ? "Pause" : `Play ${track.title}`}
          onClick={() => isActive ? togglePlay() : playTrack(originalIndex)}>
          {isActive && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} />}
        </button>
        <button className={isLiked ? "mini-action active" : "mini-action"} type="button" aria-label="Like" onClick={() => toggleArrayItem("liked", track.id)}><Heart size={14} fill="currentColor" /></button>
        <button className={isWishlisted ? "mini-action active" : "mini-action"} type="button" aria-label="Wishlist" onClick={() => toggleArrayItem("wishlist", track.id)}><Star size={14} fill="currentColor" /></button>
        {activeView !== "playlist" && (
          <button className="mini-action" type="button" aria-label="Add to playlist" onClick={() => addToPlaylist(selectedPlaylistId, track.id)}><Plus size={14} /></button>
        )}
        <button className="mini-action" type="button" aria-label="Add to queue" onClick={() => addToQueue(track.id)}><ListOrdered size={14} /></button>
        {activeView === "queue" && (
          <button className="mini-action" type="button" aria-label="Remove from queue" onClick={() => removeFromQueue(track.id)} style={{ color: "var(--danger)" }}><Trash2 size={14} /></button>
        )}
        {activeView === "playlist" && (
          <button className="mini-action" type="button" aria-label="Remove from playlist" onClick={() => removeFromPlaylist(selectedPlaylistId, track.id)} style={{ color: "var(--danger)" }}><Trash2 size={14} /></button>
        )}
        {isAdmin && (
          <button className="mini-action" type="button" aria-label={`Delete ${track.title}`} onClick={() => onDeleteTrack(track)} style={{ color: "var(--danger)" }}><Trash2 size={14} /></button>
        )}
      </div>
    </article>
  );
});


export default function MusicPlayer() {
  const router = useRouter();
  const { toast } = useToast();
  const [playlistToDelete, setPlaylistToDelete] = useState(null);
  const [trackToDelete, setTrackToDelete] = useState(null);
  const [isDeletingTrack, setIsDeletingTrack] = useState(false);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deleteAllText, setDeleteAllText] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMiniPlayerOpen, setIsMiniPlayerOpen] = useState(false);
  const audioRef = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [user, setUser] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeView, setActiveView] = useState("all");
  const [selectedAlbum, setSelectedAlbum] = useState(null);
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

  // Recommendations state
  const [recommendations, setRecommendations] = useState([]);

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
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeUploadTab, setActiveUploadTab] = useState("details");
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadHQ, setUploadHQ] = useState(true);
  const [uploadPublic, setUploadPublic] = useState(true);
  const [uploadCache, setUploadCache] = useState(false);
  const fileInputRef = useRef(null);

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
        const savedTracks = JSON.parse(localStorage.getItem("echowave_cached_tracks") || "[]");

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

  // Dynamic Glass Intensity styling
  useEffect(() => {
    const intensity = library?.settings?.glassIntensity ?? 70;
    const blur = intensity / 4;
    const opacity = (100 - intensity) / 100;
    document.documentElement.style.setProperty("--glass-blur", `${blur}px`);
    document.documentElement.style.setProperty("--glass-opacity", `${opacity}`);
  }, [library?.settings?.glassIntensity]);

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
  const isCrossOrigin = isUrlCrossOrigin(activeTrack?.audioUrl);
  const useEqualizer = !isCrossOrigin && eqPreset !== "flat";

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

    if (activeView === "albums" && selectedAlbum) {
      scopedTracks = tracks.filter((track) => (track.album || "Unknown Album") === selectedAlbum);
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
    if (recommendations.length > 0) return recommendations;
    // Fallback: liked tracks first, then first 6
    const liked = tracks.filter((t) => library.liked.includes(t.id));
    if (liked.length >= 3) return liked.slice(0, 6);
    return tracks.slice(0, 6);
  }, [recommendations, tracks, library.liked]);

  const trendingTracks = useMemo(() => {
    return [...tracks].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 6);
  }, [tracks]);

  // Fetch smart recommendations whenever the active track changes
  useEffect(() => {
    if (!activeTrack) return;
    const token = localStorage.getItem("auth_token");
    if (!token) return;

    getRecommendations(token, {
      mood: activeTrack.mood,
      artist: activeTrack.artist,
      limit: 6
    })
      .then((recs) => {
        // Exclude the currently playing track from recommendations
        setRecommendations(recs.filter((r) => r.id !== activeTrack.id));
      })
      .catch(() => {
        // Silently fall back to liked / first tracks
        setRecommendations([]);
      });
  }, [activeTrack?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group tracks by album
  const albumGroups = useMemo(() => {
    const map = {};
    tracks.forEach((track) => {
      const key = track.album || "Unknown Album";
      if (!map[key]) {
        map[key] = { name: key, tracks: [], color: track.color, coverUrl: track.coverUrl, artist: track.artist };
      }
      map[key].tracks.push(track);
    });
    return Object.values(map);
  }, [tracks]);

  const likedCount = library.liked.length;
  const wishlistCount = library.wishlist.length;

  // Ref to prevent feedback loop between app slider and volumechange listener
  const isInternalVolumeChange = useRef(false);

  // Apply volume to audio element whenever volume state changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    isInternalVolumeChange.current = true;
    audio.volume = volume;
    // Reset flag after the volumechange event fires (next microtask)
    Promise.resolve().then(() => { isInternalVolumeChange.current = false; });
  }, [volume]);

  // Sync app volume slider when system/browser volume changes externally
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleVolumeChange = () => {
      if (isInternalVolumeChange.current) return; // skip — we caused this
      const sysVol = audio.volume;
      setVolume(sysVol);
    };

    audio.addEventListener("volumechange", handleVolumeChange);
    return () => audio.removeEventListener("volumechange", handleVolumeChange);
  }, []);

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
  }, [activeTrack?.audioUrl, useEqualizer]);

  // Ref to signal that we want to play as soon as the new src loads
  const shouldPlayRef = useRef(false);
  const currentUrlRef = useRef(null);
  const lastAudioElementRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack?.audioUrl) return;

    const url = activeTrack.audioUrl;

    // Clean up any pending canplay listener
    const cleanup = () => audio.removeEventListener("canplay", onCanPlay);

    const tryPlay = () => {
      cleanup();
      if (!shouldPlayRef.current) return;
      shouldPlayRef.current = false;
      audio.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("play() failed:", err.message);
          setIsPlaying(false);
        });
    };

    function onCanPlay() { tryPlay(); }

    // Only reload if the URL actually changed or the audio element itself changed
    if (currentUrlRef.current !== url || lastAudioElementRef.current !== audio) {
      currentUrlRef.current = url;
      lastAudioElementRef.current = audio;
      audio.src = url;
      audio.load();
    }

    if (!shouldPlayRef.current) return;

    if (audio.readyState >= 3) {
      tryPlay();
    } else {
      audio.addEventListener("canplay", onCanPlay);
    }

    return cleanup;
  }, [activeTrack?.audioUrl, activeIndex, useEqualizer]); // eslint-disable-line react-hooks/exhaustive-deps


  // Audio Equalizer setup
  const initEqualizer = (presetToApply) => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();

        const lowFilter = audioCtxRef.current.createBiquadFilter();
        lowFilter.type = "lowshelf";
        lowFilter.frequency.value = 250;

        const midFilter = audioCtxRef.current.createBiquadFilter();
        midFilter.type = "peaking";
        midFilter.Q.value = 1.0;
        midFilter.frequency.value = 1000;

        const highFilter = audioCtxRef.current.createBiquadFilter();
        highFilter.type = "highshelf";
        highFilter.frequency.value = 4000;

        lowFilter.connect(midFilter);
        midFilter.connect(highFilter);
        highFilter.connect(audioCtxRef.current.destination);

        eqFiltersRef.current = [lowFilter, midFilter, highFilter];
      }

      // Reconnect the new audio element
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          // ignore
        }
        sourceRef.current = null;
      }

      const source = audioCtxRef.current.createMediaElementSource(audio);
      sourceRef.current = source;

      const lowFilter = eqFiltersRef.current[0];
      source.connect(lowFilter);

      isEqInitialized.current = true;

      // Apply gains immediately after initialization
      const preset = presetToApply ?? eqPreset;
      const filters = eqFiltersRef.current;
      if (filters.length >= 3 && preset !== "flat") {
        applyGains(preset, filters);
      }
    } catch (err) {
      console.error("Web Audio Equalizer failed to initialize:", err);
    }
  };

  function applyGains(presetName, filters) {
    const [low, mid, high] = filters;
    if (presetName === "flat") {
      low.gain.value = 0; mid.gain.value = 0; high.gain.value = 0;
    } else if (presetName === "bass-boost") {
      low.gain.value = 8; mid.gain.value = 0; high.gain.value = -2;
    } else if (presetName === "vocal-boost") {
      low.gain.value = -2; mid.gain.value = 6; high.gain.value = 2;
    } else if (presetName === "treble-boost") {
      low.gain.value = -4; mid.gain.value = 0; high.gain.value = 8;
    } else if (presetName === "electronic") {
      low.gain.value = 6; mid.gain.value = -2; high.gain.value = 5;
    }
  }

  const applyEqPreset = (presetName) => {
    if (presetName !== "flat" && isUrlCrossOrigin(activeTrack?.audioUrl)) {
      toast({
        title: "Equalizer Restriction",
        description: "Equalizer presets are only supported for same-origin or CORS-enabled tracks. External tracks will play without equalizer effects.",
        type: "warning"
      });
      return;
    }

    setEqPreset(presetName);

    if (presetName === "flat") {
      // Apply flat gains if already initialized
      if (isEqInitialized.current && eqFiltersRef.current.length >= 3) {
        applyGains("flat", eqFiltersRef.current);
      }
      return;
    }

    if (!isEqInitialized.current || !sourceRef.current) {
      // initEqualizer will apply the gains after setup
      initEqualizer(presetName);
      return;
    }

    const filters = eqFiltersRef.current;
    if (filters.length < 3) return;
    applyGains(presetName, filters);
  };

  useEffect(() => {
    // Reset EQ state when audio element remounts (key changes between eq-audio/direct-audio)
    isEqInitialized.current = false;
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch { }
      sourceRef.current = null;
    }
    if (useEqualizer && audioRef.current) {
      initEqualizer(eqPreset);
    }
  }, [useEqualizer]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateLibrary(updater) {
    setLibrary((current) => {
      return typeof updater === "function" ? updater(current) : updater;
    });
  }

  const toggleArrayItem = useCallback((key, trackId) => {
    updateLibrary((current) => {
      const currentItems = current[key] || [];
      const nextItems = currentItems.includes(trackId)
        ? currentItems.filter((id) => id !== trackId)
        : [...currentItems, trackId];

      return {
        ...current,
        [key]: nextItems
      };
    });
  }, []);

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
      toast({
        title: "Action Restricted",
        description: "Cannot delete the default playlist.",
        type: "error"
      });
      return;
    }
    setPlaylistToDelete(playlistId);
  }

  const confirmDeletePlaylist = () => {
    if (!playlistToDelete) return;
    const playlistId = playlistToDelete;
    setPlaylistToDelete(null);

    updateLibrary((current) => {
      const nextPlaylists = current.playlists.filter((p) => p.id !== playlistId);
      return {
        ...current,
        playlists: nextPlaylists
      };
    });
    setSelectedPlaylistId("pl_favorites");
    setActiveView("all");

    toast({
      title: "Success",
      description: "Playlist deleted successfully.",
      type: "success"
    });
  };

  const addToPlaylist = useCallback((playlistId, trackId) => {
    const playlist = library.playlists.find((item) => item.id === playlistId);

    if (playlist?.trackIds.includes(trackId)) {
      toast({
        title: "Already Added",
        description: "This song is already in the selected playlist.",
        type: "info"
      });
      return;
    }

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
  }, [library.playlists, toast]);

  const removeFromPlaylist = useCallback((playlistId, trackId) => {
    updateLibrary((current) => ({
      ...current,
      playlists: current.playlists.map((playlist) => {
        if (playlist.id !== playlistId) {
          return playlist;
        }

        return {
          ...playlist,
          trackIds: playlist.trackIds.filter((id) => id !== trackId)
        };
      })
    }));
  }, []);

  const addToQueue = useCallback((trackId) => {
    setQueue((current) => {
      if (current.includes(trackId)) {
        toast({
          title: "Already Queued",
          description: "This song is already in the queue.",
          type: "info"
        });
        return current;
      }

      return [...current, trackId];
    });
  }, [toast]);

  const removeFromQueue = useCallback((trackId) => {
    setQueue((current) => current.filter((id) => id !== trackId));
  }, []);

  function removeTrackFromState(trackId) {
    const activeId = tracks[activeIndex]?.id;
    const nextTracks = tracks.filter((track) => track.id !== trackId);

    setQueue((current) => current.filter((id) => id !== trackId));
    updateLibrary((current) => pruneTrackFromLibrary(current, trackId));
    setTracks(nextTracks);

    if (!nextTracks.length) {
      setActiveIndex(0);
      return;
    }

    if (activeId === trackId) {
      setActiveIndex(Math.min(activeIndex, nextTracks.length - 1));
      return;
    }

    const nextActiveIndex = nextTracks.findIndex((track) => track.id === activeId);
    setActiveIndex(nextActiveIndex === -1 ? 0 : nextActiveIndex);
  }

  function requestDeleteTrack(track) {
    if (!isAdmin) {
      toast({
        title: "Action Restricted",
        description: "Admin access is required to delete songs.",
        type: "error"
      });
      return;
    }

    setTrackToDelete(track);
  }

  async function confirmDeleteTrack() {
    if (!trackToDelete) return;

    setIsDeletingTrack(true);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("You must be signed in to delete songs.");

      const deletingActiveTrack = activeTrack?.id === trackToDelete.id;
      const result = await deleteTrack(token, trackToDelete.id);

      if (deletingActiveTrack && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }

      removeTrackFromState(trackToDelete.id);
      setTrackToDelete(null);
      toast({
        title: "Song Deleted",
        description: result.message || `"${trackToDelete.title}" was removed from your app.`,
        type: "success"
      });
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: err.message,
        type: "error"
      });
    } finally {
      setIsDeletingTrack(false);
    }
  }

  async function confirmDeleteAllTracks() {
    if (deleteAllText.trim().toUpperCase() !== "DELETE") {
      toast({
        title: "Validation Required",
        description: "Type DELETE to confirm removing every song.",
        type: "warning"
      });
      return;
    }

    setIsDeletingAll(true);

    try {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("You must be signed in to delete songs.");

      const result = await deleteAllTracks(token);

      if (audioRef.current) {
        audioRef.current.pause();
      }

      setIsPlaying(false);
      setTracks([]);
      setActiveIndex(0);
      setQueue([]);
      updateLibrary((current) => ({
        ...current,
        liked: [],
        wishlist: [],
        playlists: current.playlists.map((playlist) => ({
          ...playlist,
          trackIds: []
        }))
      }));
      setIsDeleteAllOpen(false);
      setDeleteAllText("");
      setActiveView("all");
      setSelectedAlbum(null);
      toast({
        title: "Songs Deleted",
        description: result.message || "All songs were removed from your app.",
        type: "success"
      });
    } catch (err) {
      toast({
        title: "Delete All Failed",
        description: err.message,
        type: "error"
      });
    } finally {
      setIsDeletingAll(false);
    }
  }

  const playTrack = useCallback((index) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Resume AudioContext if suspended (required after user gesture)
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }

    if (index === activeIndex) {
      // Same track — just resume
      audio.play().then(() => setIsPlaying(true)).catch((e) => console.warn(e));
      return;
    }

    // New track — increment plays on the outgoing active track, effect handles src
    const token = localStorage.getItem("auth_token");
    const newTrack = tracks[index];
    if (token && newTrack?.id) {
      incrementTrackPlays(token, newTrack.id);
      // Update plays count locally so trendingTracks stays accurate
      setTracks((prev) =>
        prev.map((t) => t.id === newTrack.id ? { ...t, plays: (t.plays || 0) + 1 } : t)
      );
    }

    shouldPlayRef.current = true;
    setActiveIndex(index);
  }, [activeIndex, tracks]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch((e) => console.warn(e));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  function nextTrack() {
    if (!tracks.length) return;
    shouldPlayRef.current = true;
    if (queue.length > 0) {
      const nextId = queue[0];
      const index = tracks.findIndex((t) => t.id === nextId);
      setQueue((q) => q.slice(1));
      if (index !== -1) { setActiveIndex(index); return; }
    }
    if (isShuffle && tracks.length > 1) {
      let r = Math.floor(Math.random() * tracks.length);
      while (r === activeIndex) r = Math.floor(Math.random() * tracks.length);
      setActiveIndex(r);
    } else {
      setActiveIndex((activeIndex + 1) % tracks.length);
    }
  }

  function previousTrack() {
    if (!tracks.length) return;
    shouldPlayRef.current = true;
    setActiveIndex((activeIndex - 1 + tracks.length) % tracks.length);
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
      toast({
        title: "Success",
        description: res.message || "Scraping complete.",
        type: "success"
      });
      // Refresh track list
      const updatedTracks = await getTracks(token);
      setTracks(updatedTracks);
    } catch (err) {
      setScrapeMessage("Scraping failed: " + err.message);
      toast({
        title: "Scraping Failed",
        description: err.message,
        type: "error"
      });
    } finally {
      setIsScraping(false);
    }
  };

  // Helper to format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Helper to process dropped/selected files
  const processSelectedFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      setUploadError("Please select a valid audio file.");
      toast({
        title: "Invalid File",
        description: "Please select a valid audio file.",
        type: "warning"
      });
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      setUploadError("Audio files must be 16 MB or smaller.");
      toast({
        title: "File Too Large",
        description: "Audio files must be 16 MB or smaller.",
        type: "warning"
      });
      return;
    }
    setUploadError("");
    setSelectedFile(file);

    // Pre-fill Title from filename
    const titleWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setUploadForm((prev) => ({
      ...prev,
      title: titleWithoutExt
    }));

    // Auto-extract duration
    const fileUrl = URL.createObjectURL(file);
    const tempAudio = new Audio(fileUrl);
    tempAudio.addEventListener("loadedmetadata", () => {
      const minutes = Math.floor(tempAudio.duration / 60);
      const seconds = Math.floor(tempAudio.duration % 60).toString().padStart(2, "0");
      setUploadForm((prev) => ({
        ...prev,
        duration: `${minutes}:${seconds}`
      }));
      URL.revokeObjectURL(fileUrl);
    });

    // Convert file to Base64
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadForm((prev) => ({
        ...prev,
        audioUrl: event.target.result
      }));
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop event handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setUploadForm((prev) => ({
      ...prev,
      title: "",
      audioUrl: ""
    }));
    setFileInputKey((k) => k + 1);
  };

  // Handle local track upload from modal
  const handleUpload = async (e) => {
    e.preventDefault();
    const payload = cleanTrackPayload(uploadForm);
    const missingField = ["title", "artist", "album", "duration", "mood", "color", "audioUrl"].find((field) => !payload[field]);

    if (missingField) {
      const message = missingField === "audioUrl"
        ? "Please select or drop an audio file first."
        : "Please complete all required song fields.";
      setUploadError(message);
      toast({
        title: "Validation Required",
        description: message,
        type: "warning"
      });
      return;
    }

    const duplicate = findDuplicateTrack(tracks, payload);

    if (duplicate) {
      const message = `"${duplicate.title}" by ${duplicate.artist} is already in your library.`;
      setUploadError(message);
      toast({
        title: "Duplicate Song",
        description: message,
        type: "warning"
      });
      return;
    }

    setUploadError("");
    setUploadMessage("");
    setIsUploading(true);

    try {
      const token = localStorage.getItem("auth_token");
      await uploadTrack(token, payload);
      setUploadMessage("Track uploaded successfully!");
      toast({
        title: "Success",
        description: "Track uploaded successfully!",
        type: "success"
      });
      setUploadForm({
        title: "",
        artist: artistOptions[0] || "",
        album: albumOptions[0] || "",
        duration: "4:20",
        mood: moodOptions[0] || "",
        color: "#6d5dfc",
        audioUrl: ""
      });
      setSelectedFile(null);
      setFileInputKey((k) => k + 1);
      // Refresh tracks
      const updatedTracks = await getTracks(token);
      setTracks(updatedTracks);
    } catch (err) {
      setUploadError(err.message);
      toast({
        title: "Upload Failed",
        description: err.message,
        type: "error"
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return <div className="loading-panel">Preparing your premium library…</div>;
  }

  return (
    <div className={library.settings.reduceMotion ? "player-shell reduce-motion" : "player-shell"}>
      <audio
        key={useEqualizer ? "eq-audio" : "direct-audio"}
        ref={audioRef}
        crossOrigin={useEqualizer ? "anonymous" : undefined}
        onEnded={handleEnded}
      />


      {/* ── Mobile Header ── */}
      <div className="mobile-topbar">
        <button className="mobile-menu-btn" type="button" aria-label="Toggle menu" onClick={() => setIsMobileSidebarOpen((v) => !v)}>
          <Menu size={22} />
        </button>
        <span className="mobile-topbar-title" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <radialGradient id="mtBg" cx="40%" cy="30%" r="65%"><stop offset="0%" stopColor="#1e3a4a" /><stop offset="100%" stopColor="#060e14" /></radialGradient>
              <linearGradient id="mtRim" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4a9e8e" stopOpacity="0.6" /><stop offset="40%" stopColor="#22c55e" stopOpacity="0.9" /><stop offset="100%" stopColor="#166534" stopOpacity="0.3" /></linearGradient>
              <linearGradient id="mtWave" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#86efac" /><stop offset="50%" stopColor="#22c55e" /><stop offset="100%" stopColor="#34d399" /></linearGradient>
              <filter id="mtGlow" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="1.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <clipPath id="mtClip"><circle cx="32" cy="32" r="29" /></clipPath>
            </defs>
            <circle cx="32" cy="32" r="30" fill="url(#mtBg)" />
            <circle cx="32" cy="32" r="29.5" fill="none" stroke="url(#mtRim)" strokeWidth="1.5" />
            <g clipPath="url(#mtClip)" filter="url(#mtGlow)">
              <line x1="8" y1="32" x2="56" y2="32" stroke="url(#mtWave)" strokeWidth="0.5" opacity="0.5" />
              <path d="M12 32 C15 25,18 19,20 32 C22 45,26 45,32 32 C38 19,42 19,44 32 C46 45,49 39,52 32" fill="none" stroke="url(#mtWave)" strokeWidth="1" opacity="0.6" />
              <path d="M12 32 C15 39,18 45,20 32 C22 19,26 19,32 32 C38 45,42 45,44 32 C46 19,49 25,52 32" fill="none" stroke="url(#mtWave)" strokeWidth="1" opacity="0.6" />
              <path d="M16 32 C18 27,20 21,20 32 C20 43,24 43,32 32 C40 21,44 21,44 32 C44 43,46 37,48 32" fill="none" stroke="#86efac" strokeWidth="1.4" />
              <path d="M16 32 C18 37,20 43,20 32 C20 21,24 21,32 32 C40 43,44 43,44 32 C44 21,46 27,48 32" fill="none" stroke="#86efac" strokeWidth="1.4" />
            </g>
          </svg>
          EchoWave
        </span>
        <button className="mobile-menu-btn" type="button" aria-label="Search" onClick={() => document.querySelector('.topbar-search input')?.focus()}>
          <Search size={20} />
        </button>
      </div>

      {/* Sidebar backdrop */}
      {isMobileSidebarOpen && <div className="sidebar-backdrop" onClick={() => setIsMobileSidebarOpen(false)} />}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${isMobileSidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" style={{ padding: "2px" }}>
            <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <radialGradient id="slBg" cx="40%" cy="30%" r="65%"><stop offset="0%" stopColor="#1e3a4a" /><stop offset="50%" stopColor="#0d1f2d" /><stop offset="100%" stopColor="#060e14" /></radialGradient>
                <linearGradient id="slRim" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4a9e8e" stopOpacity="0.6" /><stop offset="40%" stopColor="#22c55e" stopOpacity="0.9" /><stop offset="100%" stopColor="#166534" stopOpacity="0.3" /></linearGradient>
                <linearGradient id="slWave" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#86efac" /><stop offset="30%" stopColor="#4ade80" /><stop offset="50%" stopColor="#22c55e" /><stop offset="70%" stopColor="#86efac" /><stop offset="100%" stopColor="#34d399" /></linearGradient>
                <filter id="slGlow" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="1.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <filter id="slOuterGlow" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                <radialGradient id="slGloss" cx="40%" cy="25%" r="50%"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" /><stop offset="100%" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
                <clipPath id="slClip"><circle cx="32" cy="32" r="29" /></clipPath>
              </defs>
              <circle cx="32" cy="32" r="31" fill="none" stroke="#22c55e" strokeWidth="1" opacity="0.35" filter="url(#slOuterGlow)" />
              <circle cx="32" cy="32" r="30" fill="url(#slBg)" />
              <circle cx="32" cy="32" r="29.5" fill="none" stroke="url(#slRim)" strokeWidth="1.5" />
              <circle cx="32" cy="32" r="27" fill="none" stroke="#22c55e" strokeWidth="0.4" opacity="0.2" />
              <g clipPath="url(#slClip)" filter="url(#slGlow)">
                <line x1="8" y1="32" x2="56" y2="32" stroke="url(#slWave)" strokeWidth="0.5" opacity="0.5" />
                <path d="M8 32 C12 20,16 14,20 32 C24 50,28 50,32 32 C36 14,40 14,44 32 C48 50,52 44,56 32" fill="none" stroke="url(#slWave)" strokeWidth="0.5" opacity="0.2" />
                <path d="M8 32 C12 44,16 50,20 32 C24 14,28 14,32 32 C36 50,40 50,44 32 C48 14,52 20,56 32" fill="none" stroke="url(#slWave)" strokeWidth="0.5" opacity="0.2" />
                <path d="M10 32 C13 24,17 18,20 32 C23 46,27 46,32 32 C37 18,41 18,44 32 C47 46,51 40,54 32" fill="none" stroke="url(#slWave)" strokeWidth="0.8" opacity="0.45" />
                <path d="M10 32 C13 40,17 46,20 32 C23 18,27 18,32 32 C37 46,41 46,44 32 C47 18,51 24,54 32" fill="none" stroke="url(#slWave)" strokeWidth="0.8" opacity="0.45" />
                <path d="M12 32 C15 25,18 19,20 32 C22 45,26 45,32 32 C38 19,42 19,44 32 C46 45,49 39,52 32" fill="none" stroke="url(#slWave)" strokeWidth="1" opacity="0.6" />
                <path d="M12 32 C15 39,18 45,20 32 C22 19,26 19,32 32 C38 45,42 45,44 32 C46 19,49 25,52 32" fill="none" stroke="url(#slWave)" strokeWidth="1" opacity="0.6" />
                <path d="M14 32 C16 26,19 20,20 32 C21 44,25 44,32 32 C39 20,43 20,44 32 C45 44,48 38,50 32" fill="none" stroke="url(#slWave)" strokeWidth="1.2" opacity="0.8" />
                <path d="M14 32 C16 38,19 44,20 32 C21 20,25 20,32 32 C39 44,43 44,44 32 C45 20,48 26,50 32" fill="none" stroke="url(#slWave)" strokeWidth="1.2" opacity="0.8" />
                <path d="M16 32 C18 27,20 21,20 32 C20 43,24 43,32 32 C40 21,44 21,44 32 C44 43,46 37,48 32" fill="none" stroke="#86efac" strokeWidth="1.4" opacity="1" />
                <path d="M16 32 C18 37,20 43,20 32 C20 21,24 21,32 32 C40 43,44 43,44 32 C44 21,46 27,48 32" fill="none" stroke="#86efac" strokeWidth="1.4" opacity="1" />
              </g>
              <circle cx="32" cy="32" r="29" fill="url(#slGloss)" />
              <path d="M 16 14 A 20 20 0 0 1 48 14" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.1" />
            </svg>
          </div>
          <span>EchoWave</span>
        </div>

        <p className="sidebar-section-label">Menu</p>
        <nav className="sidebar-nav">
          {[
            ["all", "Home", <Music size={16} />],
            ["liked", `Likes (${library.liked.length})`, <Heart size={16} />],
            ["wishlist", `Wishlist (${library.wishlist.length})`, <Star size={16} />],
            ["albums", "Albums", <Disc size={16} />],
            ["playlist", "Playlists", <ListMusic size={16} />],
            ["queue", `Queue (${queue.length})`, <ListOrdered size={16} />],
          ].map(([view, label, icon]) => (
            <button key={view} type="button"
              className={activeView === view ? "sidebar-item active" : "sidebar-item"}
              onClick={() => { setActiveView(view); if (view !== "albums") setSelectedAlbum(null); setIsMobileSidebarOpen(false); }}>
              {icon} {label}
              {activeView === view && <span className="sidebar-dot" />}
            </button>
          ))}
        </nav>

        <p className="sidebar-section-label">General</p>
        <nav className="sidebar-nav">
          <button className="sidebar-item" type="button" onClick={() => { setIsSettingsOpen(true); setIsMobileSidebarOpen(false); }}>
            <Settings size={16} /> Settings
          </button>
          <button className="sidebar-item" type="button" onClick={() => { logout(); setIsMobileSidebarOpen(false); }}>
            <LogOut size={16} /> Log out
          </button>
        </nav>

        <div className="sidebar-footer">
          <span className="premium-badge" style={{ width: "fit-content" }}>
            <Crown size={13} /> {user?.plan || "Premium"}
          </span>
          <p className="sidebar-footer-links">Legal · Privacy · Cookie Policy</p>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="main-content">

        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <span>Discover</span>
            <span className="crumb-sep">›</span>
            <span className="crumb-sub">
              {activeView === "all" ? "Home" : activeView === "liked" ? "Liked Songs" : activeView === "wishlist" ? "Wishlist" : activeView === "albums" ? (selectedAlbum || "Albums") : activeView === "playlist" ? "Playlist" : "Queue"}
            </span>
          </div>
          <div className="topbar-right">
            <label className="topbar-search">
              <Search size={14} aria-hidden="true" />
              <input type="search" placeholder="Search songs" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            {isAdmin && (
              <>
                <button type="button" onClick={() => { setScrapeMessage(""); handleScrape(); }} disabled={isScraping}
                  style={{ background: "var(--accent-soft)", border: "1px solid rgba(34,197,94,0.3)", color: "var(--accent)", borderRadius: 999, padding: "0 14px", height: 34, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                  {isScraping ? "Scraping…" : "Scrape"}
                </button>
                <button type="button" onClick={() => setIsUploadOpen(true)}
                  style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 999, padding: "0 14px", height: 34, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                  Upload
                </button>
                <button type="button" onClick={() => setIsDeleteAllOpen(true)}
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: 999, padding: "0 14px", height: 34, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
                  Delete all
                </button>
              </>
            )}
            <div className="user-chip">
              <div className="user-avatar">{(user?.name || "U").slice(0, 1).toUpperCase()}</div>
              <div className="user-chip-info">
                <div className="user-chip-name">{user?.name || "Listener"}</div>
                <div className="user-chip-plan">{user?.plan || "Premium"}</div>
              </div>
            </div>
          </div>
        </header>

        {scrapeMessage && (
          <div style={{ background: "var(--accent-soft)", borderBottom: "1px solid rgba(34,197,94,0.2)", padding: "8px 28px", fontSize: "0.8rem", color: "var(--accent-dark)" }}>
            {scrapeMessage}
          </div>
        )}

        {/* Page body */}
        <div className="page-body">

          {/* ── Content scroll ── */}
          <div className="content-scroll">

            {/* Charts row — only on home with no search */}
            {activeView === "all" && !query.trim() && tracks.length > 0 && (
              <>
                <div className="section-head">
                  <h2>Charts: Top 50</h2>
                </div>
                <div className="charts-row">
                  {recommendedTracks.map((track) => {
                    const idx = tracks.findIndex((t) => t.id === track.id);
                    return (
                      <div key={`chart-${track.id}`} className="chart-card" onClick={() => playTrack(idx)}>
                        <div className="chart-thumb" style={{ background: track.coverUrl ? "none" : `linear-gradient(135deg, ${track.color || "#22c55e"}, #1a2035)`, position: "relative", overflow: "hidden" }}>
                          {track.coverUrl ? (
                            <img src={track.coverUrl} alt={track.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }} />
                          ) : (
                            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "2.2rem", fontWeight: 900 }}>{track.title.slice(0, 1)}</span>
                          )}
                        </div>
                        <div className="chart-card-title">{track.mood || track.title}</div>
                        <div className="chart-card-sub">Top 50</div>
                      </div>
                    );
                  })}
                </div>
                <div className="section-head" style={{ marginTop: 28 }}>
                  <h2>Listening History</h2>
                  <button className="see-all-btn" type="button">See All</button>
                </div>
              </>
            )}

            {/* Tabs */}
            <div className="library-tabs">
              <button className={activeView === "all" ? "tab-button active" : "tab-button"} type="button" onClick={() => { setActiveView("all"); setSelectedAlbum(null); }}>All songs</button>
              <button className={activeView === "albums" ? "tab-button active" : "tab-button"} type="button" onClick={() => { setActiveView("albums"); setSelectedAlbum(null); }}>Albums</button>
              <button className={activeView === "liked" ? "tab-button active" : "tab-button"} type="button" onClick={() => { setActiveView("liked"); setSelectedAlbum(null); }}>Liked {library.liked.length}</button>
              <button className={activeView === "wishlist" ? "tab-button active" : "tab-button"} type="button" onClick={() => { setActiveView("wishlist"); setSelectedAlbum(null); }}>Wishlist {library.wishlist.length}</button>
              <button className={activeView === "playlist" ? "tab-button active" : "tab-button"} type="button" onClick={() => { setActiveView("playlist"); setSelectedAlbum(null); }}>Playlist</button>
              <button className={activeView === "queue" ? "tab-button active" : "tab-button"} type="button" onClick={() => { setActiveView("queue"); setSelectedAlbum(null); }}>Queue ({queue.length})</button>
            </div>

            {/* Playlist bar */}
            <div className="playlist-bar">
              <div style={{ display: "flex", gap: 8 }}>
                <Dropdown
                  value={selectedPlaylistId}
                  onChange={(e) => { setSelectedPlaylistId(e.target.value); setActiveView("playlist"); }}
                  options={library.playlists.map((p) => ({ value: p.id, label: `${p.name} (${p.trackIds.length})` }))}
                  style={{ flex: 1 }}
                />
                {selectedPlaylistId !== "pl_favorites" && (
                  <button type="button" onClick={() => deletePlaylist(selectedPlaylistId)} aria-label="Delete playlist"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--danger)", color: "var(--danger)", borderRadius: "var(--radius-sm)", padding: "0 12px", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
              <form onSubmit={createPlaylist} className="playlist-form">
                <input value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} placeholder="New playlist" />
                <button type="submit" aria-label="Create playlist"><Plus size={16} /></button>
              </form>
            </div>

            {/* Premium strip */}
            <div className="premium-strip">
              <div>
                <strong>{library.settings.offlineMode ? "Offline-ready session" : "Premium session"}</strong>
                <span>{user?.name || "Listener"} — liked, wishlist, playlists saved on device.</span>
              </div>
              {library.settings.offlineMode ? <Download size={18} /> : <ListMusic size={18} />}
            </div>

            {/* Recommended + Trending grids */}
            {activeView === "all" && !query.trim() && tracks.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 24, marginBottom: 24 }}>
                <div>
                  <div className="section-head" style={{ marginBottom: 12 }}>
                    <h3 style={{ fontSize: "0.9rem", fontWeight: 800, margin: 0 }}>
                      Recommended for You
                    </h3>
                    {activeTrack && (
                      <span style={{ fontSize: "0.74rem", color: "var(--muted)" }}>
                        because you&apos;re listening to <strong style={{ color: "var(--accent)" }}>{activeTrack.mood}</strong>
                      </span>
                    )}
                  </div>
                  {recommendedTracks.length > 0 ? (
                    <div className="spotify-grid">
                      {recommendedTracks.map((track) => {
                        const idx = tracks.findIndex((t) => t.id === track.id);
                        return <TrackCard key={`rec-${track.id}`} track={track} onPlay={() => idx !== -1 && playTrack(idx)} />;
                      })}
                    </div>
                  ) : (
                    <div style={{ color: "var(--muted)", fontSize: "0.85rem", padding: "12px 0" }}>
                      Like some songs to get personalised picks.
                    </div>
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: "0.9rem", fontWeight: 800, marginBottom: 12 }}>Trending Now</h3>
                  <div className="spotify-grid">
                    {trendingTracks.map((track) => {
                      const idx = tracks.findIndex((t) => t.id === track.id);
                      return <TrackCard key={`trend-${track.id}`} track={track} onPlay={() => playTrack(idx)} />;
                    })}
                  </div>
                </div>
                <h3 style={{ fontSize: "0.9rem", fontWeight: 800 }}>All Songs</h3>
              </div>
            )}

            {activeView === "queue" && queue.length === 0 && (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--muted)" }}>No tracks in queue. Add some from the track options!</div>
            )}

            {tracks.length === 0 && (
              <div style={{ padding: "56px 0", textAlign: "center", color: "var(--muted)", display: "grid", justifyItems: "center", gap: 12 }}>
                <Music size={28} />
                <h3 style={{ color: "var(--text)", fontSize: "1rem", margin: 0 }}>No songs in your library</h3>
                <p style={{ margin: 0, maxWidth: 360 }}>Upload a song to start listening again.</p>
                {isAdmin && (
                  <button type="button" className="pill-button active" onClick={() => setIsUploadOpen(true)}>
                    <Upload size={14} /> Upload song
                  </button>
                )}
              </div>
            )}

            {/* Albums grid */}
            {activeView === "albums" && !selectedAlbum && (
              <div>
                <div className="section-head" style={{ marginBottom: 16 }}>
                  <h2>Albums <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: "0.85rem" }}>({albumGroups.length})</span></h2>
                </div>
                <div className="spotify-grid">
                  {albumGroups.map((album) => (
                    <div key={album.name} className="spotify-card album-card" onClick={() => setSelectedAlbum(album.name)}>
                      <div className="card-image-wrap" style={{ background: album.coverUrl ? "none" : `linear-gradient(135deg, ${album.color || "#6d5dfc"}, #1f2937)`, position: "relative", overflow: "hidden" }}>
                        {album.coverUrl ? (
                          <img src={album.coverUrl} alt={album.name} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0, borderRadius: "inherit" }} />
                        ) : (
                          <span className="card-thumb-char">{album.name.slice(0, 1)}</span>
                        )}
                        <button className="spotify-play-btn" type="button" aria-label="Open album">
                          <Disc size={18} />
                        </button>
                      </div>
                      <div className="card-info">
                        <strong className="card-title">{album.name}</strong>
                        <span className="card-artist">{album.artist} · {album.tracks.length} songs</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Album detail — track list */}
            {activeView === "albums" && selectedAlbum && (
              <div>
                <div className="album-detail-header">
                  <button className="album-back-btn" type="button" onClick={() => setSelectedAlbum(null)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    All Albums
                  </button>
                  <div className="album-detail-info">
                    {(() => {
                      const ag = albumGroups.find((a) => a.name === selectedAlbum);
                      return (
                        <>
                          <div className="album-detail-art" style={{ background: ag?.coverUrl ? "none" : `linear-gradient(135deg, ${ag?.color || "#6d5dfc"}, #1f2937)` }}>
                            {ag?.coverUrl ? (
                              <img src={ag.coverUrl} alt={ag.name} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                            ) : (
                              <span style={{ color: "#fff", fontSize: "2.5rem", fontWeight: 900 }}>{selectedAlbum.slice(0, 1)}</span>
                            )}
                          </div>
                          <div>
                            <p style={{ color: "var(--muted)", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Album</p>
                            <h2 style={{ fontSize: "1.4rem", fontWeight: 900, margin: 0 }}>{selectedAlbum}</h2>
                            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 4 }}>{ag?.artist} · {ag?.tracks.length} songs</p>
                            <button className="album-play-all-btn" type="button" onClick={() => {
                              const first = ag?.tracks[0];
                              if (first) { const idx = tracks.findIndex((t) => t.id === first.id); playTrack(idx); }
                            }}>
                              <Play size={14} fill="currentColor" /> Play All
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Track rows */}
            <div className={library.settings.compactRows ? "track-list compact" : "track-list"}>
              {visibleTracks.map((track) => {
                const originalIndex = tracks.findIndex((item) => item.id === track.id);
                const isActive = track.id === activeTrack?.id;
                return (
                  <TrackRow
                    key={track.id}
                    track={track}
                    originalIndex={originalIndex}
                    isActive={isActive}
                    isPlaying={isPlaying}
                    playTrack={playTrack}
                    togglePlay={togglePlay}
                    isLiked={library.liked.includes(track.id)}
                    isWishlisted={library.wishlist.includes(track.id)}
                    toggleArrayItem={toggleArrayItem}
                    selectedPlaylistId={selectedPlaylistId}
                    addToPlaylist={addToPlaylist}
                    addToQueue={addToQueue}
                    activeView={activeView}
                    removeFromQueue={removeFromQueue}
                    removeFromPlaylist={removeFromPlaylist}
                    isAdmin={isAdmin}
                    onDeleteTrack={requestDeleteTrack}
                  />
                );
              })}
            </div>
          </div>

          {/* ── Now Playing Panel ── */}
          {activeTrack && (
            <aside className="now-playing-panel">
              <div className="now-playing-art" style={{ background: activeTrack.coverUrl ? "none" : `linear-gradient(135deg, ${activeTrack.color || "#22c55e"}, #1a2035)`, position: "relative", overflow: "hidden" }}>
                {activeTrack.coverUrl ? (
                  <>
                    <img src={activeTrack.coverUrl} alt={activeTrack.title} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0, borderRadius: "inherit" }} />
                    <div className={isPlaying ? "vinyl spinning" : "vinyl"} style={{ opacity: 0.85 }} />
                  </>
                ) : (
                  <>
                    <span>{activeTrack.title.slice(0, 1)}</span>
                    <div className={isPlaying ? "vinyl spinning" : "vinyl"} />
                  </>
                )}
              </div>

              <div className="now-playing-title">
                {activeTrack.title}
                {useEqualizer && (
                  <span className="eq-badge-active" title="Equalizer Enabled" style={{ marginLeft: "8px", verticalAlign: "middle" }}>
                    <SlidersHorizontal size={12} style={{ display: "inline-block", color: "var(--accent)" }} />
                  </span>
                )}
              </div>
              <div className="now-playing-artist">
                {activeTrack.artist} · <span style={{ color: "var(--accent)" }}>{activeTrack.mood}</span>
                <span style={{ marginLeft: "8px" }}><CreativeCommonsBadge /></span>
              </div>

              <TrackProgressBar audioRef={audioRef} activeTrackUrl={activeTrack.audioUrl} useEqualizer={useEqualizer} />

              <div className="controls">
                <button className={isShuffle ? "icon-button active" : "icon-button"} type="button" aria-label="Shuffle" onClick={() => setIsShuffle((v) => !v)}><Shuffle size={15} /></button>
                <button className="icon-button" type="button" aria-label="Previous" onClick={previousTrack}><SkipBack size={17} /></button>
                <button className="play-button" type="button" aria-label="Play/Pause" onClick={togglePlay}>
                  {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                </button>
                <button className="icon-button" type="button" aria-label="Next" onClick={nextTrack}><SkipForward size={17} /></button>
                <button className={isRepeat ? "icon-button active" : "icon-button"} type="button" aria-label="Repeat" onClick={() => setIsRepeat((v) => !v)}><Repeat size={15} /></button>
              </div>

              <label className="volume-control">
                <Volume2 size={15} aria-hidden="true" />
                <input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
              </label>

              <div className="quick-actions" style={{ marginTop: 14 }}>
                <button className={library.liked.includes(activeTrack.id) ? "pill-button active" : "pill-button"} type="button" onClick={() => toggleArrayItem("liked", activeTrack.id)}><Heart size={13} fill="currentColor" /> Like</button>
                <button className={library.wishlist.includes(activeTrack.id) ? "pill-button active" : "pill-button"} type="button" onClick={() => toggleArrayItem("wishlist", activeTrack.id)}><Star size={13} fill="currentColor" /> Wishlist</button>
                <button className="pill-button" type="button" onClick={() => addToPlaylist(selectedPlaylistId, activeTrack.id)}><Plus size={13} /> Playlist</button>
                <button className="pill-button" type="button" onClick={() => addToQueue(activeTrack.id)}><ListOrdered size={13} /> Queue</button>
                {isAdmin && (
                  <button className="pill-button" type="button" onClick={() => requestDeleteTrack(activeTrack)} style={{ color: "var(--danger)", borderColor: "var(--danger)" }}><Trash2 size={13} /> Delete</button>
                )}
              </div>
            </aside>
          )}

        </div>{/* end page-body */}
      </div>{/* end main-content */}

      {/* ── Mobile Mini Player Bar ── */}
      {activeTrack && (
        <div className="mobile-mini-player" onClick={() => setIsMiniPlayerOpen(true)}>
          <div className="mini-player-art" style={{ background: activeTrack.coverUrl ? "none" : `linear-gradient(135deg, ${activeTrack.color || "#22c55e"}, #1a2035)` }}>
            {activeTrack.coverUrl ? (
              <img src={activeTrack.coverUrl} alt={activeTrack.title} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
            ) : (
              <span style={{ color: "#fff", fontWeight: 900, fontSize: "1rem" }}>{activeTrack.title.slice(0, 1)}</span>
            )}
          </div>
          <div className="mini-player-info">
            <span className="mini-player-title">{activeTrack.title}</span>
            <span className="mini-player-artist">{activeTrack.artist}</span>
          </div>
          <div className="mini-player-controls" onClick={(e) => e.stopPropagation()}>
            <button className="mini-player-btn" type="button" aria-label="Previous" onClick={previousTrack}><SkipBack size={18} /></button>
            <button className="mini-player-btn mini-player-play" type="button" aria-label="Play/Pause" onClick={togglePlay}>
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>
            <button className="mini-player-btn" type="button" aria-label="Next" onClick={nextTrack}><SkipForward size={18} /></button>
          </div>
        </div>
      )}

      {/* ── Mobile Full-Screen Player ── */}
      {isMiniPlayerOpen && activeTrack && (
        <div className="mobile-fullplayer">
          {/* Blurred background from album art */}
          <div className="fullplayer-bg" style={{
            background: activeTrack.coverUrl
              ? `url(${activeTrack.coverUrl}) center/cover no-repeat`
              : `linear-gradient(135deg, ${activeTrack.color || "#22c55e"}, #1a2035)`
          }} />
          <div className="fullplayer-overlay" />

          <div className="fullplayer-inner">
            {/* Header */}
            <div className="fullplayer-header">
              <button className="fullplayer-close" type="button" aria-label="Minimize" onClick={() => setIsMiniPlayerOpen(false)}>
                <svg width="32" height="6" viewBox="0 0 32 6" fill="none"><rect width="32" height="6" rx="3" fill="currentColor" opacity="0.4" /></svg>
              </button>
              <span className="fullplayer-label">Now Playing</span>
              <button className="fullplayer-more" type="button" aria-label="More options">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
              </button>
            </div>

            {/* Album Art */}
            <div className="fullplayer-art">
              {activeTrack.coverUrl ? (
                <img src={activeTrack.coverUrl} alt={activeTrack.title} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
              ) : (
                <span style={{ color: "rgba(255,255,255,0.9)", fontSize: "5rem", fontWeight: 900 }}>{activeTrack.title.slice(0, 1)}</span>
              )}
            </div>

            {/* Track info + like */}
            <div className="fullplayer-meta">
              <div>
                <div className="fullplayer-title">{activeTrack.title}</div>
                <div className="fullplayer-artist">{activeTrack.artist}</div>
              </div>
              <button
                className={library.liked.includes(activeTrack.id) ? "fullplayer-like active" : "fullplayer-like"}
                type="button"
                aria-label="Like"
                onClick={() => toggleArrayItem("liked", activeTrack.id)}
              >
                <Heart size={22} fill={library.liked.includes(activeTrack.id) ? "currentColor" : "none"} />
              </button>
            </div>

            {/* Progress */}
            <TrackProgressBar audioRef={audioRef} activeTrackUrl={activeTrack.audioUrl} useEqualizer={useEqualizer} />

            {/* Controls */}
            <div className="fullplayer-controls">
              <button className={isShuffle ? "fp-icon-btn active" : "fp-icon-btn"} type="button" aria-label="Shuffle" onClick={() => setIsShuffle((v) => !v)}><Shuffle size={18} /></button>
              <button className="fp-icon-btn" type="button" aria-label="Previous" onClick={previousTrack}><SkipBack size={28} fill="currentColor" /></button>
              <button className="fp-play-btn" type="button" aria-label="Play/Pause" onClick={togglePlay}>
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" style={{ marginLeft: 3 }} />}
              </button>
              <button className="fp-icon-btn" type="button" aria-label="Next" onClick={nextTrack}><SkipForward size={28} fill="currentColor" /></button>
              <button className={isRepeat ? "fp-icon-btn active" : "fp-icon-btn"} type="button" aria-label="Repeat" onClick={() => setIsRepeat((v) => !v)}><Repeat size={18} /></button>
            </div>

            {/* Volume */}
            <label className="fullplayer-volume">
              <Volume2 size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
              <input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
              <Volume2 size={18} style={{ color: "rgba(255,255,255,0.8)" }} />
            </label>
          </div>
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {playlistToDelete && (
        <div className="upload-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="upload-modal-content" style={{ maxWidth: 400, textAlign: "center", padding: "24px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 10 }}>Delete Playlist</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 24, lineHeight: 1.5 }}>
              Are you sure you want to delete the playlist "{library.playlists.find((p) => p.id === playlistToDelete)?.name}"? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button type="button" className="pill-button" onClick={() => setPlaylistToDelete(null)} style={{ minWidth: 100 }}>
                Cancel
              </button>
              <button
                type="button"
                className="pill-button active"
                onClick={confirmDeletePlaylist}
                style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)", minWidth: 100 }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Modal ── */}
      {/* Delete song confirmation */}
      {trackToDelete && (
        <div className="upload-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="upload-modal-content" style={{ maxWidth: 420, textAlign: "center", padding: "24px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 10 }}>Delete Song</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 24, lineHeight: 1.5 }}>
              Delete "{trackToDelete.title}" from your app? This removes it from all songs, playlists, likes, wishlist, and queue.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button type="button" className="pill-button" onClick={() => setTrackToDelete(null)} disabled={isDeletingTrack} style={{ minWidth: 100 }}>
                Cancel
              </button>
              <button
                type="button"
                className="pill-button active"
                onClick={confirmDeleteTrack}
                disabled={isDeletingTrack}
                style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)", minWidth: 100 }}
              >
                {isDeletingTrack ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete all confirmation */}
      {isDeleteAllOpen && (
        <div className="upload-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="upload-modal-content" style={{ maxWidth: 440, padding: "24px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 10 }}>Delete All Songs</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16, lineHeight: 1.5 }}>
              This permanently removes every song from your app and clears all song references from playlists, likes, wishlist, and queue.
            </p>
            <label style={{ display: "grid", gap: 8, color: "var(--muted)", fontSize: "0.82rem", fontWeight: 700 }}>
              Type DELETE to confirm
              <input
                value={deleteAllText}
                onChange={(e) => setDeleteAllText(e.target.value)}
                placeholder="DELETE"
                style={{ height: 44, borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text)", padding: "0 12px", fontWeight: 700 }}
              />
            </label>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
              <button type="button" className="pill-button" onClick={() => { setIsDeleteAllOpen(false); setDeleteAllText(""); }} disabled={isDeletingAll} style={{ minWidth: 100 }}>
                Cancel
              </button>
              <button
                type="button"
                className="pill-button active"
                onClick={confirmDeleteAllTracks}
                disabled={isDeletingAll}
                style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)", minWidth: 120 }}
              >
                {isDeletingAll ? "Deleting..." : "Delete all"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isUploadOpen && (
        <div className="upload-modal-overlay">
          <div className="upload-modal-content">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <p className="eyebrow">Admin Studio</p>
                <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Upload a New Track</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => { setIsUploadOpen(false); setUploadError(""); setUploadMessage(""); }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleUpload} className="dashboard-form">
              {/* File Select / Card Toggle */}
              {!selectedFile ? (
                <div
                  className={dragActive ? "drag-drop-zone drag-active" : "drag-drop-zone"}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    key={fileInputKey}
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => processSelectedFile(e.target.files?.[0])}
                    style={{ display: "none" }}
                  />
                  <div className="drag-drop-icon-wrapper">
                    <Upload size={20} />
                  </div>
                  <p className="drag-drop-text">Drag and drop files or</p>
                  <button className="drag-drop-btn" type="button">Choose files to upload</button>
                  <p className="drag-drop-subtext">Audio files (MP3, WAV, etc.) — Maximum size 16 MB</p>
                </div>
              ) : (
                <div className="file-preview-box">
                  <div className="file-preview-left">
                    <div className="file-preview-icon">
                      <FileAudio size={20} />
                    </div>
                    <div className="file-preview-details">
                      <p className="file-preview-name">{selectedFile.name}</p>
                      <p className="file-preview-size">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                  <button className="file-preview-remove" type="button" onClick={removeSelectedFile}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="upload-tabs">
                <button
                  type="button"
                  className={activeUploadTab === "details" ? "upload-tab active" : "upload-tab"}
                  onClick={() => setActiveUploadTab("details")}
                >
                  File Settings
                </button>
                <button
                  type="button"
                  className={activeUploadTab === "settings" ? "upload-tab active" : "upload-tab"}
                  onClick={() => setActiveUploadTab("settings")}
                >
                  Widget Options
                </button>
              </div>

              {/* Tab Panels */}
              {activeUploadTab === "details" ? (
                <div style={{ display: "grid", gap: "12px" }}>
                  <label><span>Song Title</span><input type="text" value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} placeholder="Midnight Escape" required /></label>
                  <label><span>Artist</span>
                    <Dropdown
                      value={uploadForm.artist}
                      onChange={(e) => setUploadForm({ ...uploadForm, artist: e.target.value })}
                      options={artistOptions.map((a) => ({ value: a, label: a }))}
                      className="modal-select"
                    />
                  </label>
                  <label><span>Album</span>
                    <Dropdown
                      value={uploadForm.album}
                      onChange={(e) => setUploadForm({ ...uploadForm, album: e.target.value })}
                      options={albumOptions.map((a) => ({ value: a, label: a }))}
                      className="modal-select"
                    />
                  </label>
                  <label><span>Mood / Genre</span>
                    <Dropdown
                      value={uploadForm.mood}
                      onChange={(e) => setUploadForm({ ...uploadForm, mood: e.target.value })}
                      options={moodOptions.map((m) => ({ value: m, label: m }))}
                      className="modal-select"
                    />
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <label><span>Accent Color</span><input type="color" value={uploadForm.color} onChange={(e) => setUploadForm({ ...uploadForm, color: e.target.value })} style={{ width: "100%", padding: 0, height: "44px", cursor: "pointer" }} /></label>
                    <label><span>Duration</span><input type="text" value={uploadForm.duration} onChange={(e) => setUploadForm({ ...uploadForm, duration: e.target.value })} required /></label>
                  </div>
                </div>
              ) : (
                <div className="upload-toggle-list">
                  <div className="upload-toggle-row">
                    <div className="upload-toggle-left">
                      <div className="upload-toggle-icon">
                        <Sparkles size={16} />
                      </div>
                      <div className="upload-toggle-info">
                        <span className="upload-toggle-title">Presentation Mode</span>
                        <span className="upload-toggle-desc">Enable high fidelity 320kbps format stream</span>
                      </div>
                    </div>
                    <label className="upload-switch">
                      <input type="checkbox" checked={uploadHQ} onChange={(e) => setUploadHQ(e.target.checked)} />
                      <span className="upload-slider" />
                    </label>
                  </div>

                  <div className="upload-toggle-row">
                    <div className="upload-toggle-left">
                      <div className="upload-toggle-icon">
                        <Lock size={16} />
                      </div>
                      <div className="upload-toggle-info">
                        <span className="upload-toggle-title">Password Protect</span>
                        <span className="upload-toggle-desc">Require login/key authorization to stream</span>
                      </div>
                    </div>
                    <label className="upload-switch">
                      <input type="checkbox" checked={!uploadPublic} onChange={(e) => setUploadPublic(!e.target.checked)} />
                      <span className="upload-slider" />
                    </label>
                  </div>

                  <div className="upload-toggle-row">
                    <div className="upload-toggle-left">
                      <div className="upload-toggle-icon">
                        <EyeOff size={16} />
                      </div>
                      <div className="upload-toggle-info">
                        <span className="upload-toggle-title">Offline Cache</span>
                        <span className="upload-toggle-desc">Precache track in client indexedDB store</span>
                      </div>
                    </div>
                    <label className="upload-switch">
                      <input type="checkbox" checked={uploadCache} onChange={(e) => setUploadCache(e.target.checked)} />
                      <span className="upload-slider" />
                    </label>
                  </div>
                </div>
              )}

              {uploadMessage && <p style={{ color: "var(--accent)", fontWeight: 700, margin: "8px 0 0 0" }}>{uploadMessage}</p>}
              {uploadError && <p style={{ color: "var(--danger)", fontWeight: 700, margin: "8px 0 0 0" }}>{uploadError}</p>}

              <button type="submit" disabled={isUploading} className="launch-button">
                {isUploading ? "Uploading…" : "Launch it →"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Settings Drawer ── */}
      <aside className={isSettingsOpen ? "settings-drawer open" : "settings-drawer"} aria-hidden={!isSettingsOpen}>
        <div className="settings-head">
          <div>
            <p className="eyebrow">Playback Settings</p>
            <h2>Control Center</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close settings" onClick={() => setIsSettingsOpen(false)}><X size={18} /></button>
        </div>

        <div className="setting-row" style={{ display: "grid", gap: 10 }}>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Radio size={16} /> Equalizer Preset</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["flat", "bass-boost", "vocal-boost", "treble-boost", "electronic"].map((preset) => (
              <button key={preset} type="button" onClick={() => applyEqPreset(preset)}
                style={{ padding: "5px 11px", fontSize: "0.76rem", borderRadius: 10, border: "1px solid var(--line)", background: eqPreset === preset ? "var(--accent)" : "transparent", color: eqPreset === preset ? "#fff" : "var(--text)", cursor: "pointer", textTransform: "capitalize" }}>
                {preset.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-row" style={{ justifyContent: "space-between" }}>
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}><Clock size={16} /> Sleep Timer</span>
          <Dropdown
            value={sleepTimeLeft === null ? "off" : String(sleepTimeLeft)}
            onChange={(e) => { const v = e.target.value; setSleepTimeLeft(v === "off" ? null : Number(v)); }}
            options={[
              { value: "off", label: "Off" },
              { value: "300", label: "5 min" },
              { value: "900", label: "15 min" },
              { value: "1800", label: "30 min" },
              { value: "3600", label: "60 min" }
            ]}
            style={{ width: "120px" }}
          />
        </div>
        {sleepTimeLeft !== null && (
          <div style={{ color: "var(--accent)", fontSize: "0.8rem", fontWeight: 700, textAlign: "right" }}>Timer: {formatTime(sleepTimeLeft)} left</div>
        )}

        {[
          ["offlineMode", <Download size={15} />, "Offline mode"],
          ["highQuality", <Check size={15} />, "High quality audio"],
          ["compactRows", <ListMusic size={15} />, "Compact rows"],
          ["reduceMotion", <Moon size={15} />, "Reduce motion"],
        ].map(([key, icon, label]) => (
          <label key={key} className="setting-row">
            <span>{icon} {label}</span>
            <button className={library.settings[key] ? "switch active" : "switch"} type="button"
              onClick={() => toggleSetting(key)} aria-label={`Toggle ${label}`}><span /></button>
          </label>
        ))}

        <label className="setting-row">
          <span><Sun size={15} /> Theme</span>
          <div className="theme-switches">
            <button className={library.settings.theme === "light" ? "theme-button active" : "theme-button"} type="button" onClick={() => updateSetting("theme", "light")}>Light</button>
            <button className={library.settings.theme === "dark" ? "theme-button active" : "theme-button"} type="button" onClick={() => updateSetting("theme", "dark")}>Dark</button>
          </div>
        </label>

        <label className="slider-setting">
          <span><SlidersHorizontal size={15} /> Glass intensity</span>
          <input type="range" min="35" max="95" value={library.settings.glassIntensity} onChange={(e) => updateSetting("glassIntensity", Number(e.target.value))} />
        </label>
      </aside>

    </div>
  );
}
