import { useEffect, useRef, useState, useMemo } from "react";
import {
    View, Text, ScrollView, TouchableOpacity, TextInput,
    StyleSheet, ActivityIndicator, Modal, FlatList, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getTracks, uploadTrack, scrapeTracks } from "../lib/api";
import { getItem, setItem, removeItem } from "../lib/storage";
import { colors } from "../lib/theme";

const LIBRARY_DEFAULTS = {
    liked: [],
    wishlist: [],
    playlists: [{ id: "pl_favorites", name: "Malayalam Mix", trackIds: [] }],
    settings: { offlineMode: false, compactRows: false, theme: "light" },
};

function formatTime(secs) {
    if (!secs || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
}

export default function PlayerScreen() {
    const router = useRouter();
    const soundRef = useRef(null);

    const [tracks, setTracks] = useState([]);
    const [user, setUser] = useState(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.75);
    const [isShuffle, setIsShuffle] = useState(false);
    const [isRepeat, setIsRepeat] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState("home");
    const [query, setQuery] = useState("");
    const [library, setLibrary] = useState(LIBRARY_DEFAULTS);
    const [queue, setQueue] = useState([]);
    const [selectedPlaylistId, setSelectedPlaylistId] = useState("pl_favorites");
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [showSettings, setShowSettings] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [showNowPlaying, setShowNowPlaying] = useState(false);
    const [isScraping, setIsScraping] = useState(false);
    const [scrapeMsg, setScrapeMsg] = useState("");
    const [uploadForm, setUploadForm] = useState({ title: "", artist: "", album: "", duration: "4:20", mood: "Pop", color: "#22c55e", audioUrl: "" });
    const [uploadMsg, setUploadMsg] = useState("");
    const [uploadErr, setUploadErr] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const activeTrack = tracks[activeIndex];
    const isAdmin = user?.email?.toLowerCase() === "admin@example.com";

    // ── Load user + tracks ──
    useEffect(() => {
        (async () => {
            const token = await getItem("auth_token");
            if (!token) { router.replace("/login"); return; }
            const storedUser = await getItem("echowave_user");
            if (storedUser) setUser(storedUser);
            const storedLib = await getItem("echowave_library");
            if (storedLib) setLibrary({ ...LIBRARY_DEFAULTS, ...storedLib, settings: { ...LIBRARY_DEFAULTS.settings, ...storedLib.settings } });
            try {
                const data = await getTracks(token);
                setTracks(data);
            } catch {
                const cached = await getItem("echowave_cached_tracks");
                if (cached?.length) setTracks(cached);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    // ── Persist library ──
    useEffect(() => { setItem("echowave_library", library); }, [library]);
    useEffect(() => { if (tracks.length) setItem("echowave_cached_tracks", tracks); }, [tracks]);

    // ── Audio setup ──
    useEffect(() => {
        Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
        });
    }, []);

    // ── Load & play track ──
    useEffect(() => {
        if (!activeTrack) return;
        loadAndPlay(activeTrack.audioUrl);
    }, [activeIndex, activeTrack?.audioUrl]);

    async function loadAndPlay(url, autoPlay = false) {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            const { sound } = await Audio.Sound.createAsync(
                { uri: url },
                { shouldPlay: autoPlay, volume },
                onPlaybackStatus
            );
            soundRef.current = sound;
        } catch (e) {
            console.warn("Audio load error:", e.message);
        }
    }

    function onPlaybackStatus(status) {
        if (!status.isLoaded) return;
        setIsPlaying(status.isPlaying);
        setPosition(status.positionMillis / 1000);
        setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
        if (status.didJustFinish) {
            if (isRepeat) {
                soundRef.current?.replayAsync();
            } else {
                nextTrack();
            }
        }
    }

    async function playTrack(index) {
        if (index === activeIndex) {
            togglePlay();
            return;
        }
        setActiveIndex(index);
        // useEffect will reload; we want autoplay
        if (soundRef.current) {
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }
        const track = tracks[index];
        if (!track) return;
        const { sound } = await Audio.Sound.createAsync(
            { uri: track.audioUrl },
            { shouldPlay: true, volume },
            onPlaybackStatus
        );
        soundRef.current = sound;
    }

    async function togglePlay() {
        if (!soundRef.current) return;
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;
        if (status.isPlaying) {
            await soundRef.current.pauseAsync();
        } else {
            await soundRef.current.playAsync();
        }
    }

    async function nextTrack() {
        if (!tracks.length) return;
        let next;
        if (queue.length > 0) {
            const nextId = queue[0];
            const idx = tracks.findIndex((t) => t.id === nextId);
            setQueue((q) => q.slice(1));
            next = idx !== -1 ? idx : (activeIndex + 1) % tracks.length;
        } else if (isShuffle && tracks.length > 1) {
            let r = Math.floor(Math.random() * tracks.length);
            while (r === activeIndex) r = Math.floor(Math.random() * tracks.length);
            next = r;
        } else {
            next = (activeIndex + 1) % tracks.length;
        }
        await playTrack(next);
    }

    async function previousTrack() {
        if (!tracks.length) return;
        await playTrack((activeIndex - 1 + tracks.length) % tracks.length);
    }

    async function seek(secs) {
        if (!soundRef.current) return;
        await soundRef.current.setPositionAsync(secs * 1000);
    }

    async function logout() {
        if (soundRef.current) await soundRef.current.unloadAsync();
        await removeItem("auth_token");
        await removeItem("echowave_user");
        router.replace("/login");
    }

    // ── Library helpers ──
    function updateLibrary(fn) { setLibrary((cur) => fn(cur)); }
    function toggleItem(key, id) {
        updateLibrary((cur) => ({ ...cur, [key]: cur[key].includes(id) ? cur[key].filter((x) => x !== id) : [...cur[key], id] }));
    }
    function addToPlaylist(plId, trackId) {
        updateLibrary((cur) => ({ ...cur, playlists: cur.playlists.map((p) => p.id !== plId || p.trackIds.includes(trackId) ? p : { ...p, trackIds: [...p.trackIds, trackId] }) }));
    }
    function createPlaylist() {
        const name = newPlaylistName.trim();
        if (!name) return;
        const pl = { id: `pl_${Date.now()}`, name, trackIds: activeTrack ? [activeTrack.id] : [] };
        updateLibrary((cur) => ({ ...cur, playlists: [...cur.playlists, pl] }));
        setSelectedPlaylistId(pl.id);
        setNewPlaylistName("");
    }
    function deletePlaylist(id) {
        if (id === "pl_favorites") { Alert.alert("Cannot delete the default playlist."); return; }
        Alert.alert("Delete playlist?", "", [
            { text: "Cancel" },
            { text: "Delete", style: "destructive", onPress: () => { updateLibrary((cur) => ({ ...cur, playlists: cur.playlists.filter((p) => p.id !== id) })); setSelectedPlaylistId("pl_favorites"); } },
        ]);
    }

    // ── Scrape ──
    async function handleScrape() {
        setIsScraping(true); setScrapeMsg("");
        try {
            const token = await getItem("auth_token");
            const res = await scrapeTracks(token);
            setScrapeMsg(res.message || "Done.");
            const data = await getTracks(token);
            setTracks(data);
        } catch (e) { setScrapeMsg("Failed: " + e.message); }
        finally { setIsScraping(false); }
    }

    // ── Upload ──
    async function handleUpload() {
        setUploadErr(""); setUploadMsg(""); setIsUploading(true);
        try {
            const token = await getItem("auth_token");
            await uploadTrack(token, uploadForm);
            setUploadMsg("Uploaded!");
            setUploadForm((f) => ({ ...f, title: "" }));
            const data = await getTracks(token);
            setTracks(data);
        } catch (e) { setUploadErr(e.message); }
        finally { setIsUploading(false); }
    }

    // ── Visible tracks ──
    const activePlaylist = library.playlists.find((p) => p.id === selectedPlaylistId);
    const visibleTracks = useMemo(() => {
        let list = tracks;
        if (activeView === "liked") list = tracks.filter((t) => library.liked.includes(t.id));
        else if (activeView === "wishlist") list = tracks.filter((t) => library.wishlist.includes(t.id));
        else if (activeView === "playlist" && activePlaylist) list = tracks.filter((t) => activePlaylist.trackIds.includes(t.id));
        else if (activeView === "queue") list = tracks.filter((t) => queue.includes(t.id));
        const q = query.trim().toLowerCase();
        if (!q) return list;
        return list.filter((t) => [t.title, t.artist, t.album, t.mood].join(" ").toLowerCase().includes(q));
    }, [tracks, activeView, library, activePlaylist, queue, query]);

    const recommendedTracks = useMemo(() => tracks.slice(0, 6), [tracks]);
    const trendingTracks = useMemo(() => [...tracks].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 6), [tracks]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg }}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={{ color: colors.muted, marginTop: 12, fontSize: 14 }}>Preparing your library…</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={s.shell} edges={["top"]}>
            {/* ── Top bar ── */}
            <View style={s.topbar}>
                <View>
                    <Text style={s.topbarTitle}>EchoWave</Text>
                    <Text style={s.topbarSub}>{user?.name || "Listener"} · {user?.plan || "Premium"}</Text>
                </View>
                <View style={s.topbarRight}>
                    {isAdmin && (
                        <TouchableOpacity style={s.iconBtn} onPress={() => setShowUpload(true)}>
                            <Ionicons name="cloud-upload-outline" size={20} color={colors.text} />
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={s.iconBtn} onPress={() => setShowSettings(true)}>
                        <Ionicons name="settings-outline" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.iconBtn} onPress={logout}>
                        <Ionicons name="log-out-outline" size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── Search ── */}
            <View style={s.searchWrap}>
                <Ionicons name="search-outline" size={16} color={colors.muted} />
                <TextInput style={s.searchInput} value={query} onChangeText={setQuery} placeholder="Search songs…" placeholderTextColor={colors.muted} />
                {!!query && <TouchableOpacity onPress={() => setQuery("")}><Ionicons name="close-circle" size={16} color={colors.muted} /></TouchableOpacity>}
            </View>

            {/* ── Tabs ── */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
                {[["home", "Home"], ["liked", "Liked"], ["wishlist", "Wishlist"], ["playlist", "Playlist"], ["queue", "Queue"]].map(([v, label]) => (
                    <TouchableOpacity key={v} style={[s.tab, activeView === v && s.tabActive]} onPress={() => setActiveView(v)}>
                        <Text style={[s.tabText, activeView === v && s.tabTextActive]}>{label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* ── Main scroll ── */}
            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Charts row */}
                {activeView === "home" && !query && tracks.length > 0 && (
                    <>
                        <Text style={s.sectionTitle}>Charts: Top 50</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                            {recommendedTracks.map((track) => {
                                const idx = tracks.findIndex((t) => t.id === track.id);
                                return (
                                    <TouchableOpacity key={`chart-${track.id}`} style={s.chartCard} onPress={() => playTrack(idx)}>
                                        <View style={[s.chartThumb, { backgroundColor: track.color || colors.accent }]}>
                                            <Text style={s.chartChar}>{track.title.slice(0, 1)}</Text>
                                        </View>
                                        <Text style={s.chartTitle} numberOfLines={1}>{track.mood || track.title}</Text>
                                        <Text style={s.chartSub}>Top 50</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <Text style={s.sectionTitle}>Recommended for You</Text>
                        <View style={s.gridWrap}>
                            {recommendedTracks.map((track) => {
                                const idx = tracks.findIndex((t) => t.id === track.id);
                                return <GridCard key={`rec-${track.id}`} track={track} onPlay={() => playTrack(idx)} />;
                            })}
                        </View>

                        <Text style={s.sectionTitle}>Trending Now</Text>
                        <View style={s.gridWrap}>
                            {trendingTracks.map((track) => {
                                const idx = tracks.findIndex((t) => t.id === track.id);
                                return <GridCard key={`trend-${track.id}`} track={track} onPlay={() => playTrack(idx)} />;
                            })}
                        </View>

                        <Text style={s.sectionTitle}>All Songs</Text>
                    </>
                )}

                {/* Playlist controls */}
                {activeView === "playlist" && (
                    <View style={s.playlistBar}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {library.playlists.map((p) => (
                                <TouchableOpacity key={p.id} style={[s.plChip, selectedPlaylistId === p.id && s.plChipActive]}
                                    onPress={() => setSelectedPlaylistId(p.id)}>
                                    <Text style={[s.plChipText, selectedPlaylistId === p.id && s.plChipTextActive]}>{p.name} ({p.trackIds.length})</Text>
                                    {p.id !== "pl_favorites" && (
                                        <TouchableOpacity onPress={() => deletePlaylist(p.id)} style={{ marginLeft: 6 }}>
                                            <Ionicons name="close-circle" size={14} color={selectedPlaylistId === p.id ? colors.accent : colors.muted} />
                                        </TouchableOpacity>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View style={s.newPlaylistRow}>
                            <TextInput style={s.newPlaylistInput} value={newPlaylistName} onChangeText={setNewPlaylistName} placeholder="New playlist name" placeholderTextColor={colors.muted} />
                            <TouchableOpacity style={s.newPlaylistBtn} onPress={createPlaylist}>
                                <Ionicons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {activeView === "queue" && queue.length === 0 && (
                    <Text style={s.emptyText}>No tracks in queue. Add some from the track options!</Text>
                )}

                {/* Track list */}
                {visibleTracks.map((track) => {
                    const idx = tracks.findIndex((t) => t.id === track.id);
                    const isActive = track.id === activeTrack?.id;
                    return (
                        <TrackRow
                            key={track.id}
                            track={track}
                            isActive={isActive}
                            isPlaying={isPlaying && isActive}
                            onPlay={() => playTrack(idx)}
                            isLiked={library.liked.includes(track.id)}
                            isWishlisted={library.wishlist.includes(track.id)}
                            onLike={() => toggleItem("liked", track.id)}
                            onWishlist={() => toggleItem("wishlist", track.id)}
                            onAddToPlaylist={() => addToPlaylist(selectedPlaylistId, track.id)}
                            onAddToQueue={() => setQueue((q) => [...q, track.id])}
                            onRemoveFromQueue={activeView === "queue" ? () => setQueue((q) => q.filter((x) => x !== track.id)) : null}
                        />
                    );
                })}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* ── Now Playing Bar ── */}
            {activeTrack && (
                <TouchableOpacity style={s.nowBar} onPress={() => setShowNowPlaying(true)} activeOpacity={0.9}>
                    <View style={[s.nowThumb, { backgroundColor: activeTrack.color || colors.accent }]}>
                        <Text style={s.nowThumbChar}>{activeTrack.title.slice(0, 1)}</Text>
                    </View>
                    <View style={s.nowInfo}>
                        <Text style={s.nowTitle} numberOfLines={1}>{activeTrack.title}</Text>
                        <Text style={s.nowArtist} numberOfLines={1}>{activeTrack.artist}</Text>
                    </View>
                    <TouchableOpacity style={s.nowBtn} onPress={(e) => { e.stopPropagation(); previousTrack(); }}>
                        <Ionicons name="play-skip-back" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.nowBtn, s.nowPlayBtn]} onPress={(e) => { e.stopPropagation(); togglePlay(); }}>
                        <Ionicons name={isPlaying ? "pause" : "play"} size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.nowBtn} onPress={(e) => { e.stopPropagation(); nextTrack(); }}>
                        <Ionicons name="play-skip-forward" size={20} color={colors.text} />
                    </TouchableOpacity>
                </TouchableOpacity>
            )}

            {/* ── Now Playing Full Modal ── */}
            <NowPlayingModal
                visible={showNowPlaying}
                onClose={() => setShowNowPlaying(false)}
                track={activeTrack}
                isPlaying={isPlaying}
                position={position}
                duration={duration}
                isShuffle={isShuffle}
                isRepeat={isRepeat}
                isLiked={activeTrack ? library.liked.includes(activeTrack.id) : false}
                isWishlisted={activeTrack ? library.wishlist.includes(activeTrack.id) : false}
                onTogglePlay={togglePlay}
                onNext={nextTrack}
                onPrev={previousTrack}
                onSeek={seek}
                onShuffle={() => setIsShuffle((v) => !v)}
                onRepeat={() => setIsRepeat((v) => !v)}
                onLike={() => activeTrack && toggleItem("liked", activeTrack.id)}
                onWishlist={() => activeTrack && toggleItem("wishlist", activeTrack.id)}
                onAddToPlaylist={() => activeTrack && addToPlaylist(selectedPlaylistId, activeTrack.id)}
                onAddToQueue={() => activeTrack && setQueue((q) => [...q, activeTrack.id])}
            />

            {/* ── Settings Modal ── */}
            <SettingsModal
                visible={showSettings}
                onClose={() => setShowSettings(false)}
                library={library}
                updateLibrary={updateLibrary}
                isAdmin={isAdmin}
                isScraping={isScraping}
                scrapeMsg={scrapeMsg}
                onScrape={handleScrape}
            />

            {/* ── Upload Modal ── */}
            <UploadModal
                visible={showUpload}
                onClose={() => setShowUpload(false)}
                form={uploadForm}
                setForm={setUploadForm}
                onSubmit={handleUpload}
                isUploading={isUploading}
                message={uploadMsg}
                error={uploadErr}
                tracks={tracks}
            />
        </SafeAreaView>
    );
}

// ── Sub-components ──

function GridCard({ track, onPlay }) {
    return (
        <TouchableOpacity style={s.gridCard} onPress={onPlay}>
            <View style={[s.gridThumb, { backgroundColor: track.color || colors.accent }]}>
                <Text style={s.gridChar}>{track.title.slice(0, 1)}</Text>
            </View>
            <Text style={s.gridTitle} numberOfLines={1}>{track.title}</Text>
            <Text style={s.gridArtist} numberOfLines={1}>{track.artist}</Text>
        </TouchableOpacity>
    );
}

function TrackRow({ track, isActive, isPlaying, onPlay, isLiked, isWishlisted, onLike, onWishlist, onAddToPlaylist, onAddToQueue, onRemoveFromQueue }) {
    return (
        <TouchableOpacity style={[s.trackRow, isActive && s.trackRowActive]} onPress={onPlay} activeOpacity={0.7}>
            <View style={[s.trackThumb, { backgroundColor: track.color || colors.accent }]}>
                {isPlaying ? (
                    <Ionicons name="musical-notes" size={18} color="#fff" />
                ) : (
                    <Text style={s.trackThumbChar}>{track.title.slice(0, 1)}</Text>
                )}
            </View>
            <View style={s.trackMeta}>
                <Text style={[s.trackTitle, isActive && s.trackTitleActive]} numberOfLines={1}>{track.title}</Text>
                <Text style={s.trackSub} numberOfLines={1}>{track.artist} · {track.album}</Text>
            </View>
            <Text style={s.trackDuration}>{track.duration}</Text>
            <View style={s.trackActions}>
                <TouchableOpacity onPress={onLike} style={s.actionBtn}>
                    <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? colors.accent : colors.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onWishlist} style={s.actionBtn}>
                    <Ionicons name={isWishlisted ? "star" : "star-outline"} size={18} color={isWishlisted ? colors.accent : colors.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onAddToPlaylist} style={s.actionBtn}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onAddToQueue} style={s.actionBtn}>
                    <Ionicons name="list-outline" size={18} color={colors.muted} />
                </TouchableOpacity>
                {onRemoveFromQueue && (
                    <TouchableOpacity onPress={onRemoveFromQueue} style={s.actionBtn}>
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
}

function NowPlayingModal({ visible, onClose, track, isPlaying, position, duration, isShuffle, isRepeat, isLiked, isWishlisted, onTogglePlay, onNext, onPrev, onSeek, onShuffle, onRepeat, onLike, onWishlist, onAddToPlaylist, onAddToQueue }) {
    if (!track) return null;
    const progress = duration > 0 ? position / duration : 0;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={np.shell}>
                <TouchableOpacity style={np.closeBtn} onPress={onClose}>
                    <Ionicons name="chevron-down" size={28} color={colors.muted} />
                </TouchableOpacity>

                <Text style={np.eyebrow}>{track.mood}</Text>

                {/* Album art */}
                <View style={[np.art, { backgroundColor: track.color || colors.accent }]}>
                    <Text style={np.artChar}>{track.title.slice(0, 1)}</Text>
                </View>

                <Text style={np.title}>{track.title}</Text>
                <Text style={np.artist}>{track.artist} · {track.album}</Text>

                {/* Quick actions */}
                <View style={np.quickRow}>
                    <TouchableOpacity style={[np.pill, isLiked && np.pillActive]} onPress={onLike}>
                        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={14} color={isLiked ? colors.accent : colors.muted} />
                        <Text style={[np.pillText, isLiked && np.pillTextActive]}>Like</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[np.pill, isWishlisted && np.pillActive]} onPress={onWishlist}>
                        <Ionicons name={isWishlisted ? "star" : "star-outline"} size={14} color={isWishlisted ? colors.accent : colors.muted} />
                        <Text style={[np.pillText, isWishlisted && np.pillTextActive]}>Wishlist</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={np.pill} onPress={onAddToPlaylist}>
                        <Ionicons name="add" size={14} color={colors.muted} />
                        <Text style={np.pillText}>Playlist</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={np.pill} onPress={onAddToQueue}>
                        <Ionicons name="list" size={14} color={colors.muted} />
                        <Text style={np.pillText}>Queue</Text>
                    </TouchableOpacity>
                </View>

                {/* Progress */}
                <View style={np.progressWrap}>
                    <TouchableOpacity
                        style={np.progressBar}
                        onPress={(e) => {
                            const { locationX, target } = e.nativeEvent;
                            // approximate seek
                            onSeek(progress * duration);
                        }}
                        activeOpacity={1}
                    >
                        <View style={np.progressTrack}>
                            <View style={[np.progressFill, { width: `${progress * 100}%` }]} />
                            <View style={[np.progressThumb, { left: `${progress * 100}%` }]} />
                        </View>
                    </TouchableOpacity>
                    <View style={np.timeRow}>
                        <Text style={np.timeText}>{formatTime(position)}</Text>
                        <Text style={np.timeText}>{formatTime(duration)}</Text>
                    </View>
                </View>

                {/* Controls */}
                <View style={np.controls}>
                    <TouchableOpacity onPress={onShuffle} style={[np.ctrlBtn, isShuffle && np.ctrlBtnActive]}>
                        <Ionicons name="shuffle" size={22} color={isShuffle ? colors.accent : colors.muted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onPrev} style={np.ctrlBtn}>
                        <Ionicons name="play-skip-back" size={26} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onTogglePlay} style={np.playBtn}>
                        <Ionicons name={isPlaying ? "pause" : "play"} size={30} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onNext} style={np.ctrlBtn}>
                        <Ionicons name="play-skip-forward" size={26} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onRepeat} style={[np.ctrlBtn, isRepeat && np.ctrlBtnActive]}>
                        <Ionicons name="repeat" size={22} color={isRepeat ? colors.accent : colors.muted} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

function SettingsModal({ visible, onClose, library, updateLibrary, isAdmin, isScraping, scrapeMsg, onScrape }) {
    function toggleSetting(key) {
        updateLibrary((cur) => ({ ...cur, settings: { ...cur.settings, [key]: !cur.settings[key] } }));
    }

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={set.shell}>
                <View style={set.head}>
                    <Text style={set.title}>Settings</Text>
                    <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
                </View>
                <ScrollView>
                    {[
                        ["offlineMode", "Offline Mode", "cloud-offline-outline"],
                        ["compactRows", "Compact Rows", "list-outline"],
                    ].map(([key, label, icon]) => (
                        <View key={key} style={set.row}>
                            <View style={set.rowLeft}>
                                <Ionicons name={icon} size={18} color={colors.muted} />
                                <Text style={set.rowLabel}>{label}</Text>
                            </View>
                            <TouchableOpacity style={[set.toggle, library.settings[key] && set.toggleOn]} onPress={() => toggleSetting(key)}>
                                <View style={[set.toggleThumb, library.settings[key] && set.toggleThumbOn]} />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {isAdmin && (
                        <View style={set.section}>
                            <Text style={set.sectionLabel}>Admin</Text>
                            <TouchableOpacity style={set.scrapeBtn} onPress={onScrape} disabled={isScraping}>
                                <Ionicons name="refresh-outline" size={18} color={colors.accent} />
                                <Text style={set.scrapeBtnText}>{isScraping ? "Scraping…" : "Run Scraper"}</Text>
                            </TouchableOpacity>
                            {!!scrapeMsg && <Text style={set.scrapeMsg}>{scrapeMsg}</Text>}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

function UploadModal({ visible, onClose, form, setForm, onSubmit, isUploading, message, error, tracks }) {
    const artists = [...new Set(tracks.map((t) => t.artist).filter(Boolean))];
    const moods = [...new Set(tracks.map((t) => t.mood).filter(Boolean))];

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={up.shell}>
                <View style={up.head}>
                    <Text style={up.title}>Upload Track</Text>
                    <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={up.scroll}>
                    {[
                        ["title", "Song Title", "text", "Midnight Drive"],
                        ["artist", "Artist", "text", "Neon Valley"],
                        ["album", "Album", "text", "After Hours"],
                        ["duration", "Duration", "text", "4:20"],
                        ["mood", "Mood / Genre", "text", "Synthwave"],
                        ["audioUrl", "Audio URL", "url", "https://…"],
                    ].map(([key, label, type, ph]) => (
                        <View key={key} style={up.field}>
                            <Text style={up.label}>{label}</Text>
                            <TextInput style={up.input} value={form[key]} onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                                placeholder={ph} placeholderTextColor={colors.muted}
                                keyboardType={type === "url" ? "url" : "default"} autoCapitalize="none" />
                        </View>
                    ))}
                    {!!message && <Text style={up.success}>{message}</Text>}
                    {!!error && <Text style={up.error}>{error}</Text>}
                    <TouchableOpacity style={up.btn} onPress={onSubmit} disabled={isUploading}>
                        {isUploading ? <ActivityIndicator color="#fff" /> : <Text style={up.btnText}>Upload Song</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}

// ── Styles ──

const s = StyleSheet.create({
    shell: { flex: 1, backgroundColor: colors.bg },
    topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line },
    topbarTitle: { fontSize: 18, fontWeight: "900", color: colors.text },
    topbarSub: { fontSize: 11, color: colors.muted, marginTop: 1 },
    topbarRight: { flexDirection: "row", gap: 8 },
    iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
    searchWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line, paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
    searchInput: { flex: 1, fontSize: 14, color: colors.text, height: 36 },
    tabsScroll: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.line, maxHeight: 48 },
    tabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: "row" },
    tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: "transparent" },
    tabActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    tabText: { fontSize: 12, fontWeight: "600", color: colors.muted },
    tabTextActive: { color: colors.accent, fontWeight: "700" },
    scroll: { flex: 1 },
    scrollContent: { padding: 16 },
    sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 12, marginTop: 4 },
    // Charts
    chartCard: { width: 120, marginRight: 12 },
    chartThumb: { width: 120, height: 120, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    chartChar: { fontSize: 40, fontWeight: "900", color: "rgba(255,255,255,0.85)" },
    chartTitle: { fontSize: 12, fontWeight: "700", color: colors.text },
    chartSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
    // Grid
    gridWrap: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
    gridCard: { width: "47%", backgroundColor: colors.surface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.line },
    gridThumb: { width: "100%", aspectRatio: 1, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    gridChar: { fontSize: 32, fontWeight: "900", color: "rgba(255,255,255,0.85)" },
    gridTitle: { fontSize: 12, fontWeight: "700", color: colors.text },
    gridArtist: { fontSize: 11, color: colors.muted, marginTop: 2 },
    // Track rows
    trackRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.line, gap: 10 },
    trackRowActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    trackThumb: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    trackThumbChar: { fontSize: 18, fontWeight: "900", color: "#fff" },
    trackMeta: { flex: 1, minWidth: 0 },
    trackTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
    trackTitleActive: { color: colors.accent },
    trackSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
    trackDuration: { fontSize: 11, color: colors.muted, marginRight: 4 },
    trackActions: { flexDirection: "row", gap: 2 },
    actionBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
    // Playlist bar
    playlistBar: { marginBottom: 16, gap: 10 },
    plChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, marginRight: 8, flexDirection: "row", alignItems: "center" },
    plChipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    plChipText: { fontSize: 12, fontWeight: "600", color: colors.muted },
    plChipTextActive: { color: colors.accent, fontWeight: "700" },
    newPlaylistRow: { flexDirection: "row", gap: 8 },
    newPlaylistInput: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, height: 40, color: colors.text, fontSize: 13 },
    newPlaylistBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    emptyText: { textAlign: "center", color: colors.muted, fontSize: 14, paddingVertical: 40 },
    // Now playing bar
    nowBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 10, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 8 },
    nowThumb: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    nowThumbChar: { fontSize: 18, fontWeight: "900", color: "#fff" },
    nowInfo: { flex: 1, minWidth: 0 },
    nowTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
    nowArtist: { fontSize: 11, color: colors.muted, marginTop: 1 },
    nowBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    nowPlayBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
});

const np = StyleSheet.create({
    shell: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24 },
    closeBtn: { alignSelf: "center", marginTop: 8, marginBottom: 16, padding: 8 },
    eyebrow: { color: colors.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.5, textTransform: "uppercase", textAlign: "center", marginBottom: 16 },
    art: { width: "100%", aspectRatio: 1, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 24 },
    artChar: { fontSize: 80, fontWeight: "900", color: "rgba(255,255,255,0.85)" },
    title: { fontSize: 24, fontWeight: "900", color: colors.text, textAlign: "center" },
    artist: { fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 4, marginBottom: 16 },
    quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 20 },
    pill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
    pillActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    pillText: { fontSize: 12, fontWeight: "600", color: colors.muted },
    pillTextActive: { color: colors.accent },
    progressWrap: { marginBottom: 20 },
    progressBar: { paddingVertical: 10 },
    progressTrack: { height: 4, backgroundColor: colors.line, borderRadius: 2, position: "relative" },
    progressFill: { height: 4, backgroundColor: colors.accent, borderRadius: 2, position: "absolute", top: 0, left: 0 },
    progressThumb: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent, position: "absolute", top: -5, marginLeft: -7 },
    timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
    timeText: { fontSize: 12, color: colors.muted },
    controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
    ctrlBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    ctrlBtnActive: { backgroundColor: colors.accentSoft, borderRadius: 22 },
    playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
});

const set = StyleSheet.create({
    shell: { flex: 1, backgroundColor: colors.bg },
    head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
    title: { fontSize: 18, fontWeight: "800", color: colors.text },
    row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surface, marginHorizontal: 16, marginTop: 10, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.line },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    rowLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
    toggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: colors.line, padding: 3 },
    toggleOn: { backgroundColor: colors.accent },
    toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
    toggleThumbOn: { transform: [{ translateX: 20 }] },
    section: { margin: 16, marginTop: 24 },
    sectionLabel: { fontSize: 11, fontWeight: "800", color: colors.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 10 },
    scrapeBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: "rgba(34,197,94,0.3)", borderRadius: 12, padding: 14 },
    scrapeBtnText: { fontSize: 14, fontWeight: "700", color: colors.accent },
    scrapeMsg: { fontSize: 12, color: colors.muted, marginTop: 8 },
});

const up = StyleSheet.create({
    shell: { flex: 1, backgroundColor: colors.bg },
    head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
    title: { fontSize: 18, fontWeight: "800", color: colors.text },
    scroll: { padding: 20 },
    field: { marginBottom: 16 },
    label: { fontSize: 12, fontWeight: "700", color: colors.text, marginBottom: 6 },
    input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, height: 44, color: colors.text, fontSize: 14 },
    success: { color: colors.accent, fontWeight: "700", marginBottom: 12 },
    error: { color: colors.danger, fontWeight: "700", marginBottom: 12 },
    btn: { backgroundColor: colors.accent, borderRadius: 999, height: 50, alignItems: "center", justifyContent: "center", marginTop: 8 },
    btnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
