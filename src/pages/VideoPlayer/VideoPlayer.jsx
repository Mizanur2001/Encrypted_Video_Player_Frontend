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
                    localStorage.removeItem("evp_ip");
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                            Encrypted Video Library
                        </h1>
                        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                            <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-semibold">
                                {videos.length ?? 0} videos
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">Encrypted Streaming</span>
                            
                            {error && (
                                <div className="ml-2 inline-flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-md border border-rose-100 dark:border-rose-800">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="relative w-full md:w-96 group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search library..."
                            className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-white dark:bg-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
                        />
                        {query && (
                            <button
                                onClick={() => setQuery("")}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                    </div>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                            </div>
                        </div>
                        <p className="mt-4 text-slate-500 font-medium animate-pulse">Loading your secure library...</p>
                    </div>
                ) : (
                    <main>
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-full mb-4">
                                    <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No videos found</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                                    We couldn't find any videos matching "{query}". Try adjusting your search terms.
                                </p>
                                <button 
                                    onClick={() => setQuery("")}
                                    className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm shadow-indigo-200 dark:shadow-none"
                                >
                                    Clear Search
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
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
        </div>
    );
};

export default VideoPlayer;
