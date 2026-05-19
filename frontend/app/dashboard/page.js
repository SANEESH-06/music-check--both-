"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { uploadTrack } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    artist: "",
    album: "",
    duration: "4:20",
    mood: "Future Pop",
    color: "#6d5dfc",
    audioUrl: "https://"
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");

      if (!token) {
        throw new Error("You must be signed in to upload songs.");
      }

      await uploadTrack(token, form);
      setMessage("Track uploaded successfully. Refresh the home page to see it in the library.");
      setForm((current) => ({
        ...current,
        title: "",
        artist: "",
        album: "",
        duration: "4:20",
        mood: "Future Pop",
        audioUrl: "https://"
      }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-panel">
        <p className="eyebrow">Admin Studio</p>
        <h1>Upload a New Track</h1>
        <p>
          Add fresh music to the library, tune the mood, and keep the future-facing look consistent across the app.
        </p>

        <form className="dashboard-form" onSubmit={handleSubmit}>
          <label>
            <span>Song title</span>
            <input name="title" value={form.title} onChange={updateField} required />
          </label>

          <label>
            <span>Artist</span>
            <input name="artist" value={form.artist} onChange={updateField} required />
          </label>

          <label>
            <span>Album</span>
            <input name="album" value={form.album} onChange={updateField} required />
          </label>

          <label>
            <span>Duration</span>
            <input name="duration" value={form.duration} onChange={updateField} required />
          </label>

          <label>
            <span>Mood</span>
            <input name="mood" value={form.mood} onChange={updateField} required />
          </label>

          <label>
            <span>Accent color</span>
            <input type="color" name="color" value={form.color} onChange={updateField} />
          </label>

          <label>
            <span>Audio URL</span>
            <input name="audioUrl" value={form.audioUrl} onChange={updateField} required />
          </label>

          <div className="dashboard-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Upload song"}
            </button>
            <button type="button" className="link-button" onClick={() => router.push("/")}>Return to player</button>
          </div>

          {message ? (
            <div className="success-box">
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          ) : null}

          {error ? (
            <div className="error-box">
              <XCircle size={18} />
              <span>{error}</span>
            </div>
          ) : null}
        </form>
      </section>
    </main>
  );
}

