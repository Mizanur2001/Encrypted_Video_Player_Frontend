import React, { useEffect, useState } from "react";
import VideoModal from "../../components/Modal/VideoModal";
import VideoCard from "../../components/VideoCard";

const mockVideos = [
    {
        id: "1",
        title: "Sample Video One",
        description: "A beautiful sample video.",
        thumbnail: "https://via.placeholder.com/480x270.png?text=Video+1",
        src: "https://www.w3schools.com/html/mov_bbb.mp4",
        duration: "0:10"
    },
    {
        id: "2",
        title: "Sample Video Two",
        description: "Another sample clip.",
        thumbnail: "https://via.placeholder.com/480x270.png?text=Video+2",
        src: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm",
        duration: "0:08"
    },
    // add more mock items if needed
];


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
                const res = await fetch("/api/videos");
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (!cancelled) {
                    setVideos(Array.isArray(data) ? data : mockVideos);
                }
            } catch (err) {
                // fallback to mock data if fetch fails
                if (!cancelled) {
                    setError("Failed to load videos, showing samples.");
                    setVideos(mockVideos);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchVideos();
        return () => { cancelled = true; };
    }, []);

    const filtered = videos.filter(v =>
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
                            <span className="text-xs text-gray-500">Fast | Secure | Local thumbnails</span>
                        </div>

                        {error && (
                            <div className="mt-1 sm:mt-0 inline-flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M12 9v4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12 17h.01" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                            {filtered.map(video => (
                                <VideoCard key={video.id} video={video} onOpen={setActiveVideo} />
                            ))}
                        </div>
                    )}
                </main>
            )}

            <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
        </div>
    );
};

export default VideoPlayer;
