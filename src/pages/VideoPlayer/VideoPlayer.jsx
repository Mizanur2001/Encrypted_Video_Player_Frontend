import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { publicIpv4 } from "public-ip";
import VideoCard from "../../components/VideoCard";
import DecryptedVideoPlayer from "../../components/DecryptedVideoPlayer";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const formatDuration = (secondsOrStr) => {
    const s = Math.max(0, Number(secondsOrStr) || 0);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
};

const VideoPlayer = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeVideo, setActiveVideo] = useState(null);
    const [query, setQuery] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function fetchVideos() {
            setLoading(true);
            setError(null);
            try {
                const ip = await publicIpv4();
                const resp = await axios.get(`${BASE_URL}/api/v1/video/get-video-info`, {
                    headers: {
                        authorization: localStorage.getItem("evp_token") || "",
                        "x-forwarded-for": ip,
                    },
                });

                const apiVideos = resp?.data?.data?.videos || [];
                const mapped = apiVideos.map((v) => ({
                    id: v.id || v.videoPath,
                    title: v.title || v.id,
                    description: v.description || "",
                    thumbnail: v.thumbnail?.startsWith("http")
                        ? v.thumbnail
                        : `${BASE_URL}${v.thumbnail || ""}`,
                    src: `${BASE_URL}/api/v1/video/get-video/${encodeURIComponent(
                        v.videoPath
                    )}`,
                    duration: formatDuration(v.duration),
                }));

                if (!cancelled) setVideos(mapped);
            } catch (err) {
                if (!cancelled) {
                    setError("Failed to load videos");
                    toast.error("Error fetching video info");
                    localStorage.removeItem("evp_token");
                    window.location.reload();
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchVideos();
        return () => {
            cancelled = true;
        };
    }, []);

    const filtered = videos.filter(
        (v) =>
            v.title.toLowerCase().includes(query.toLowerCase()) ||
            (v.description || "").toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="p-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <div>
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:gap-4 gap-2">
                        <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-800">
                                {videos.length ?? 0} videos
                            </span>
                            <span className="text-xs text-gray-500">
                                Fast | Secure | Local thumbnails
                            </span>
                        </div>

                        {error && (
                            <div className="mt-1 sm:mt-0 inline-flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded">
                                <svg
                                    className="w-4 h-4"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                >
                                    <path
                                        d="M12 9v4"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M12 17h.01"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search videos..."
                        className="px-3 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring focus:ring-indigo-200"
                    />
                    <button
                        className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        onClick={() => setQuery("")}
                    >
                        Clear
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-gray-500">Loading videos...</div>
                </div>
            ) : (
                <main>
                    {filtered.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">No videos found.</div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filtered.map((video) => (
                                <VideoCard key={video.id} video={video} onOpen={setActiveVideo} />
                            ))}
                        </div>
                    )}
                </main>
            )}

            {activeVideo && (
                <DecryptedVideoPlayer
                    video={activeVideo}
                    onClose={() => setActiveVideo(null)}
                />
            )}
        </div>
    );
};

export default VideoPlayer;
