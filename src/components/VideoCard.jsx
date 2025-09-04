import React, { useEffect, useState, useRef } from "react";

const VideoCard = ({ video, onOpen }) => {
    const [thumb, setThumb] = useState(() => {
        try { return sessionStorage.getItem(`thumb:${video.id}`); } catch { return video.thumbnail || null; }
    });
    const [generating, setGenerating] = useState(false);
    const containerRef = useRef(null);
    const vidRef = useRef(null);
    const controllerRef = useRef(null);

    useEffect(() => {
        if (thumb || video.thumbnail) return; // nothing to do

        let observer;
        const startWhenVisible = () => {
            // Avoid generating thumbnails for offscreen cards
            if (generating) return;
            generateThumbnail().catch(() => {/* ignore */});
        };

        if ("IntersectionObserver" in window) {
            observer = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        startWhenVisible();
                        observer.disconnect();
                    }
                });
            }, { rootMargin: "200px" });
            if (containerRef.current) observer.observe(containerRef.current);
        } else {
            // fallback: start immediately
            startWhenVisible();
        }

        return () => {
            if (observer) observer.disconnect();
            if (controllerRef.current) controllerRef.current.abort();
            if (vidRef.current) {
                try { vidRef.current.src = ""; } catch {}
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video.id, video.src, thumb]);

    async function generateThumbnail() {
        setGenerating(true);
        controllerRef.current = new AbortController();
        const cacheKey = `thumb:${video.id}`;

        // 1) Try to fetch video as blob (requires CORS if cross-origin)
        try {
            const resp = await fetch(video.src, { signal: controllerRef.current.signal, mode: "cors" });
            if (!resp.ok) throw new Error("fetch failed");
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);

            try {
                const dataUrl = await drawFromVideoSrc(url);
                try { sessionStorage.setItem(cacheKey, dataUrl); } catch {}
                setThumb(dataUrl);
                URL.revokeObjectURL(url);
                setGenerating(false);
                return;
            } catch (err) {
                // drawing failed (rare if fetch succeeded) - continue to fallback
                URL.revokeObjectURL(url);
                console.warn("drawFromVideoSrc failed", err);
            }
        } catch (err) {
            // fetch may fail due to CORS or network - fallback below
            console.warn("fetch blob failed (CORS/network):", err);
        }

        // 2) Fallback: try using a direct video element (may be blocked by CORS on toDataURL)
        try {
            const dataUrl = await drawFromVideoSrc(video.src);
            try { sessionStorage.setItem(cacheKey, dataUrl); } catch {}
            setThumb(dataUrl);
        } catch (err) {
            console.warn("Fallback thumbnail generation failed:", err);
            // leave thumb null -> placeholder will be used
        } finally {
            setGenerating(false);
        }
    }

    // helper: load video, seek, draw to canvas, return dataURL
    function drawFromVideoSrc(src) {
        return new Promise((resolve, reject) => {
            const vid = document.createElement("video");
            vidRef.current = vid;
            vid.muted = true;
            vid.playsInline = true;
            vid.crossOrigin = "anonymous"; // required for canvas export (if resource allows)
            vid.src = src;

            const cleanup = () => {
                try {
                    vid.pause();
                    vid.removeAttribute("src");
                    vid.load && vid.load();
                } catch (e) { /* ignore */ }
            };

            const onError = (e) => {
                cleanup();
                reject(new Error("video load error"));
            };

            const onLoadedMetadata = () => {
                // choose a small offset to avoid black first-frame
                const seekTo = Math.min(1, Math.max(0, (vid.duration || 0) * 0.05));
                try {
                    vid.currentTime = seekTo;
                } catch (e) {
                    // some browsers disallow setting currentTime before ready; try draw on loadeddata
                }
            };

            const draw = () => {
                try {
                    const w = vid.videoWidth || 640;
                    const h = vid.videoHeight || Math.round(w * 9 / 16);
                    const canvas = document.createElement("canvas");
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(vid, 0, 0, w, h);
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                    cleanup();
                    resolve(dataUrl);
                } catch (err) {
                    cleanup();
                    reject(err);
                }
            };

            const onSeeked = () => draw();
            const onLoadedData = () => {
                // if seeking failed, draw from current frame
                draw();
            };

            vid.addEventListener("loadedmetadata", onLoadedMetadata);
            vid.addEventListener("seeked", onSeeked);
            vid.addEventListener("loadeddata", onLoadedData);
            vid.addEventListener("error", onError);

            // start loading / attempt autoplay (muted) to ensure frames available
            vid.load();
            const p = vid.play?.();
            if (p && typeof p.then === "function") {
                p.catch(() => {
                    // autoplay blocked is fine; we only need frame data
                });
            }

            // safety timeout: reject if nothing happens
            const timeout = setTimeout(() => {
                vid.removeEventListener("loadedmetadata", onLoadedMetadata);
                vid.removeEventListener("seeked", onSeeked);
                vid.removeEventListener("loadeddata", onLoadedData);
                vid.removeEventListener("error", onError);
                try { vid.pause(); } catch {}
                reject(new Error("thumbnail generation timeout"));
            }, 15000);

            // wrap resolve/reject to clear timeout
            const originalResolve = resolve;
            const originalReject = reject;
            resolve = (v) => { clearTimeout(timeout); originalResolve(v); };
            reject = (e) => { clearTimeout(timeout); originalReject(e); };
        });
    }

    const placeholder = (
        <div className="w-full h-44 bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white/80">
            🎬
        </div>
    );

    return (
        <div
            ref={containerRef}
            className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => onOpen(video)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => { if (e.key === "Enter") onOpen(video); }}
        >
            <div className="relative">
                {thumb ? (
                    <img
                        src={thumb}
                        alt={video.title}
                        className="w-full h-44 object-cover group-hover:scale-105 transform transition-transform duration-300"
                    />
                ) : (
                    placeholder
                )}

                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                    {video.duration ?? "00:00"}
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-white/90 rounded-full p-3">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 5v14l11-7z"></path>
                        </svg>
                    </div>
                </div>

                {generating && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                    </div>
                )}
            </div>
            <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{video.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{video.description}</p>
            </div>
        </div>
    );
};

export default VideoCard;
