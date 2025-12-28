import React, { useState, useEffect, useRef } from "react";
import { publicIpv4 } from "public-ip";

const VideoCard = ({ video, onOpen }) => {
    const [imgError, setImgError] = useState(false);
    const [thumbUrl, setThumbUrl] = useState(null);
    const [ip, setIp] = useState(null);
    const objectUrlRef = useRef(null);

    // get public IP asynchronously
    useEffect(() => {
        let mounted = true;
        publicIpv4()
            .then(addr => {
                if (mounted) setIp(addr);
            })
            .catch(err => {
                console.warn("publicIpv4 lookup failed:", err);
                // leave ip as null -> will fall back to direct image url
            });
        return () => { mounted = false; };
    }, []);

    // fetch thumbnail with headers because <img> can't send custom headers
    useEffect(() => {
        // cleanup previous object URL
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        setImgError(false);
        setThumbUrl(null);

        const src = video?.thumbnail;
        if (!src) return;

        // prefer explicit props, fallback to localStorage (adjust keys as needed)
        const token = localStorage.getItem("evp_token");
        const clientIp = ip;

        // if no token/ip provided, attempt direct image load (may fail if server requires auth)
        if (!token || !clientIp) {
            setThumbUrl(src);
            return;
        }

        let cancelled = false;
        fetch(src, {
            headers: {
                authorization: token, // middleware accepts "Bearer <token>" or raw token
                "x-forwarded-for": clientIp
            },
            // you may want credentials or mode depending on CORS setup
        })
            .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch thumbnail: ${res.status}`);
                return res.blob();
            })
            .then(blob => {
                if (cancelled) return;
                const url = URL.createObjectURL(blob);
                objectUrlRef.current = url;
                setThumbUrl(url);
            })
            .catch(err => {
                console.error("Thumbnail fetch error:", err);
                setImgError(true);
            });

        return () => {
            cancelled = true;
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, [video?.thumbnail, ip]);

    const placeholder = (
        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500">
            <svg className="w-12 h-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        </div>
    );

    return (
        <div
            className="group relative bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-slate-100 dark:border-slate-700 hover:-translate-y-1"
            onClick={() => onOpen(video)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => { if (e.key === "Enter") onOpen(video); }}
        >
            {/* Thumbnail Container */}
            <div className="relative aspect-video overflow-hidden bg-slate-900">
                {thumbUrl && !imgError ? (
                    <img
                        src={thumbUrl}
                        alt={video.title}
                        onError={() => setImgError(true)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    placeholder
                )}

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-md shadow-sm">
                    {video.duration ?? "00:00"}
                </div>

                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/20 backdrop-blur-md rounded-full p-4 shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300 border border-white/30">
                        <svg className="w-8 h-8 text-white fill-current" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 line-clamp-1 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {video.title}
                </h3>
            </div>
        </div>
    );
};

export default VideoCard;
