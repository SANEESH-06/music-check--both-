"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Music, Upload, ArrowLeft, BarChart2, Users, Disc } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadTrack, scrapeTracks } from "@/lib/api";
import { getTracks } from "@/lib/tracks";

export default function DashboardPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", artist: "", album: "", duration: "4:20", mood: "Future Pop", color: "#6d5dfc",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState("");
  const [stats, setStats] = useState({ total: 0, artists: 0, moods: 0 });

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) { router.replace("/login"); return; }
    getTracks(token).then((tracks) => {
      setStats({
        total: tracks.length,
        artists: new Set(tracks.map((t) => t.artist)).size,
        moods: new Set(tracks.map((t) => t.mood)).size
      });
    }).catch(() => { });
  }, [router]);

  function updateField(e) {
    const { name, value } = e.target;
    setForm((c) => ({ ...c, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setMessage(""); setIsSubmitting(true);
    try {
      const token = localStorage.getItem("auth_token");
      if (!token) throw new Error("You must be signed in to upload songs.");
      await uploadTrack(token, form);
      setMessage("Track uploaded successfully!");
      setForm((c) => ({ ...c, title: "", artist: "", album: "" }));
      const tracks = await getTracks(token);
      setStats({ total: tracks.length, artists: new Set(tracks.map((t) => t.artist)).size, moods: new Set(tracks.map((t) => t.mood)).size });
    } catch (err) { setError(err.message); }
    finally { setIsSubmitting(false); }
  }

  async function handleScrape() {
    setScrapeMsg(""); setIsScraping(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await scrapeTracks(token);
      setScrapeMsg(res.message || "Scrape complete.");
      const tracks = await getTracks(token);
      setStats({ total: tracks.length, artists: new Set(tracks.map((t) => t.artist)).size, moods: new Set(tracks.map((t) => t.mood)).size });
    } catch (err) { setScrapeMsg("Scraping failed: " + err.message); }
    finally { setIsScraping(false); }
  }

  return (
    <main className="dashboard-shell" style={{ alignItems: "flex-start", padding: "32px 24px" }}>
      <div style={{ width: "100%", maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p className="eyebrow">Admin Studio</p>
            <h1 style={{ margin: 0, fontSize: "2.2rem" }}>Music Dashboard</h1>
          </div>
          <button className="nav-button" type="button" onClick={() => router.push("/")} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ArrowLeft size={16} /> Back to Player
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { icon: <Music size={22} />, label: "Total Songs Count", value: stats.total },
            { icon: <Users size={22} />, label: "Artists", value: stats.artists },
            { icon: <Disc size={22} />, label: "Genres / Moods", value: stats.moods },
          ].map(({ icon, label, value }) => (
            <div key={label} className="dashboard-panel" style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16, maxWidth: "none" }}>
              <div style={{ background: "rgba(109,93,252,0.18)", borderRadius: 14, padding: 12, color: "var(--accent)" }}>{icon}</div>
              <div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, lineHeight: 1 }}>{value}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 4 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Scrape + Upload row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>

          {/* Scrape panel */}
          <div className="dashboard-panel" style={{ padding: 28, maxWidth: "none", display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <p className="eyebrow">Auto Import</p>
              <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Scrape Tracks</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 8 }}>Pull new tracks from the backend scraper into the library.</p>
            </div>
            <button type="button" onClick={handleScrape} disabled={isScraping}
              style={{ background: "rgba(30,215,96,0.2)", border: "1px solid var(--green)", color: "var(--green)", borderRadius: 18, padding: "12px 20px", fontWeight: 900, cursor: "pointer", fontSize: "0.95rem" }}>
              {isScraping ? "Scraping..." : "Run Scraper"}
            </button>
            {scrapeMsg && (
              <div className={scrapeMsg.includes("failed") ? "error-box" : "success-box"}>
                {scrapeMsg.includes("failed") ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                <span style={{ fontSize: "0.85rem" }}>{scrapeMsg}</span>
              </div>
            )}
          </div>

          {/* Upload panel */}
          <div className="dashboard-panel" style={{ padding: 28, maxWidth: "none" }}>
            <p className="eyebrow">Manual Upload</p>
            <h2 style={{ margin: "0 0 16px", fontSize: "1.4rem" }}>Add New Track</h2>
            <form className="dashboard-form" onSubmit={handleSubmit} style={{ marginTop: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label><span>Song title</span><input name="title" value={form.title} onChange={updateField} required placeholder="Midnight Drive" /></label>
                <label><span>Artist</span><input name="artist" value={form.artist} onChange={updateField} required placeholder="Neon Valley" /></label>
                <label><span>Album</span><input name="album" value={form.album} onChange={updateField} required placeholder="After Hours" /></label>
                <label><span>Duration</span><input name="duration" value={form.duration} onChange={updateField} required /></label>
                <label><span>Mood / Genre</span><input name="mood" value={form.mood} onChange={updateField} required /></label>
                <label><span>Accent color</span><input type="color" name="color" value={form.color} onChange={updateField} style={{ height: 48, padding: "4px 8px" }} /></label>
              </div>
              <label><span>Audio URL</span><input name="audioUrl" value={form.audioUrl} onChange={updateField} required /></label>

              {message && <div className="success-box"><CheckCircle2 size={18} /><span>{message}</span></div>}
              {error && <div className="error-box"><XCircle size={18} /><span>{error}</span></div>}

              <div className="dashboard-actions">
                <button type="submit" disabled={isSubmitting} style={{ background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                  <Upload size={16} />{isSubmitting ? "Uploading..." : "Upload song"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
