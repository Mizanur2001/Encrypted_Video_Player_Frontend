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
        <div className="w-full h-44 bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white/80">
            🎬
        </div>
    );

    return (
        <div
            className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => onOpen(video)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => { if (e.key === "Enter") onOpen(video); }}
        >
            <div className="relative">
                {thumbUrl && !imgError ? (
                    <img
                        src={thumbUrl}
                        alt={video.title}
                        onError={() => setImgError(true)}
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
            </div>
            <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{video.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{video.description}</p>
            </div>
        </div>
    );
};

export default VideoCard;
