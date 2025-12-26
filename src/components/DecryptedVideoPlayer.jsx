import React, { useEffect, useRef, useState } from "react";
import { publicIpv4 } from "public-ip";

const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB
const PREFETCH_CHUNKS = 2;
const MAX_BUFFER_AHEAD_SECONDS = 60;
const BUFFER_KEEP_BEHIND_SECONDS = 10;

async function b64ToArrayBuffer(b64) {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

async function importAesKeyForCtr(base64Key) {
    const raw = await b64ToArrayBuffer(base64Key);
    return window.crypto.subtle.importKey("raw", raw, { name: "AES-CTR" }, false, ["decrypt"]);
}

function deriveCounterFromIv(ivBuf, blockIndex) {
    const iv = new Uint8Array(ivBuf.slice(0));
    let carry = Number(blockIndex);
    for (let i = iv.length - 1; i >= 0 && carry > 0; i--) {
        const add = carry & 0xff;
        const sum = iv[i] + add;
        iv[i] = sum & 0xff;
        carry = Math.floor(carry / 256) + Math.floor(sum / 256);
    }
    return iv.buffer;
}

export default function DecryptedVideoPlayer({ video, onClose }) {
    const videoRef = useRef(null);
    const mediaSourceRef = useRef(null);
    const sourceBufferRef = useRef(null);
    const objectUrlRef = useRef(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!video) return;
        let aborted = false;
        let totalSize = null;
        let key = null;
        let ivBuf = null;

        // Prefetch pipeline state
        let fetchCursor = 0;
        let appendCursor = 0;
        let inFlight = 0;
        const queue = [];

        async function setup() {
            try {
                setLoading(true);
                const cachedIp = localStorage.getItem("evp_ip");
                const ip = cachedIp || (await publicIpv4());
                try { localStorage.setItem("evp_ip", ip); } catch {}

                // Get encryption key/iv from server
                const keyResp = await fetch(`${BASE_URL}/api/v1/video/get-video-key`, {
                    headers: {
                        Authorization: localStorage.getItem("evp_token") || "",
                        "x-forwarded-for": ip
                    }
                });
                if (!keyResp.ok) throw new Error("Failed to get decrypt info");
                const keyRespJson = await keyResp.json();
                const keyData = keyRespJson?.data || keyRespJson;
                if (!keyData?.encKeyBase64 || !keyData?.ivBase64) throw new Error("Missing key/iv from server");

                key = await importAesKeyForCtr(keyData.encKeyBase64);
                ivBuf = await b64ToArrayBuffer(keyData.ivBase64);

                const videoEl = videoRef.current;
                if (!videoEl) throw new Error("Video element not mounted");

                // Create MediaSource and attach
                const ms = new MediaSource();
                mediaSourceRef.current = ms;

                const onSourceOpen = async () => {
                    if (aborted) return;
                    try {
                        const mime = 'video/mp4; codecs="avc1.64001E, mp4a.40.2"';
                        if (!MediaSource.isTypeSupported(mime)) throw new Error("MIME not supported");

                        sourceBufferRef.current = ms.addSourceBuffer(mime);

                        sourceBufferRef.current.addEventListener("updateend", () => {
                            maintainBufferedRanges();
                            pump();
                        });

                        // determine total size via 0-0 range request
                        const headResp = await fetch(video.src, {
                            method: "GET",
                            headers: {
                                Authorization: localStorage.getItem("evp_token") || "",
                                "x-forwarded-for": ip,
                                Range: "bytes=0-0"
                            }
                        });
                        if (!(headResp.status === 206 || headResp.status === 200)) {
                            throw new Error("Failed to get video size");
                        }
                        const contentRange = headResp.headers.get("Content-Range") || "";
                        const m = contentRange.match(/\/(\d+)$/);
                        totalSize = m ? parseInt(m[1], 10) : null;

                        // init cursors
                        fetchCursor = 0;
                        appendCursor = 0;

                        pump();
                    } catch {
                        try { if (ms && ms.readyState === "open") ms.endOfStream("decode"); } catch (_) {}
                    }
                };

                ms.addEventListener("sourceopen", onSourceOpen, { once: true });

                const objectUrl = URL.createObjectURL(ms);
                objectUrlRef.current = objectUrl;
                videoEl.src = objectUrl;

                async function fetchDecryptRange(start, end) {
                    const resp = await fetch(video.src, {
                        method: "GET",
                        headers: {
                            Authorization: localStorage.getItem("evp_token") || "",
                            "x-forwarded-for": ip,
                            Range: `bytes=${start}-${end}`
                        }
                    });
                    if (!(resp.status === 206 || resp.status === 200)) {
                        throw new Error(`Range request failed: ${resp.status}`);
                    }
                    const encrypted = await resp.arrayBuffer();
                    const blockIndex = Math.floor(start / 16);
                    const counterBuf = deriveCounterFromIv(ivBuf, blockIndex);
                    const decrypted = await window.crypto.subtle.decrypt(
                        { name: "AES-CTR", counter: counterBuf, length: 64 },
                        key,
                        encrypted
                    );
                    return new Uint8Array(decrypted);
                }

                function getBufferedAheadSeconds(sb, now) {
                    let bufferedAhead = 0;
                    for (let i = 0; i < sb.buffered.length; i++) {
                        const s = sb.buffered.start(i);
                        const e = sb.buffered.end(i);
                        if (e > now) bufferedAhead += Math.max(0, e - Math.max(s, now));
                    }
                    return bufferedAhead;
                }

                function prefetch() {
                    if (aborted) return;
                    const sb = sourceBufferRef.current;
                    const msRef = mediaSourceRef.current;
                    const v = videoRef.current;
                    if (!sb || !msRef || !v) return;
                    if (msRef.readyState !== "open") return;
                    if (totalSize == null) return;

                    const now = !isNaN(v.currentTime) ? v.currentTime : 0;
                    const bufferedAhead = getBufferedAheadSeconds(sb, now);
                    if (bufferedAhead > MAX_BUFFER_AHEAD_SECONDS) return;

                    while (!aborted && inFlight + queue.length < PREFETCH_CHUNKS && fetchCursor < totalSize) {
                        const start = fetchCursor;
                        const end = Math.min(start + CHUNK_SIZE - 1, totalSize - 1);

                        inFlight++;
                        fetchDecryptRange(start, end)
                            .then((chunk) => {
                                queue.push({ start, end, chunk });
                            })
                            .catch(() => {
                                try { if (msRef && msRef.readyState === "open") msRef.endOfStream("network"); } catch {}
                            })
                            // eslint-disable-next-line no-loop-func
                            .finally(() => {
                                inFlight--;
                                pump();
                            });

                        fetchCursor = end + 1;
                    }
                }

                function pump() {
                    if (aborted) return;
                    const sb = sourceBufferRef.current;
                    const msRef = mediaSourceRef.current;
                    if (!sb || !msRef) return;
                    if (msRef.readyState !== "open") return;

                    // Always keep pipeline running
                    prefetch();

                    if (sb.updating) return;

                    if (totalSize != null && appendCursor >= totalSize && queue.length === 0 && inFlight === 0) {
                        try { msRef.endOfStream(); } catch (_) {}
                        return;
                    }

                    const nextIdx = queue.findIndex((q) => q.start === appendCursor);
                    if (nextIdx === -1) return;

                    const item = queue.splice(nextIdx, 1)[0];
                    const wasInitial = appendCursor === 0;

                    try {
                        sb.appendBuffer(item.chunk);
                        appendCursor = item.end + 1;
                        if (wasInitial) {
                            try {
                                videoRef.current.muted = false;
                                videoRef.current.play().catch(() => {});
                            } catch {}
                        }
                    } catch {
                        try { if (msRef && msRef.readyState === "open") msRef.endOfStream("decode"); } catch (_) {}
                    }
                }

                function maintainBufferedRanges() {
                    const v = videoRef.current;
                    const sbLocal = sourceBufferRef.current;
                    if (!sbLocal || !v) return;
                    const now = v.currentTime || 0;

                    for (let i = sbLocal.buffered.length - 1; i >= 0; i--) {
                        try {
                            const start = sbLocal.buffered.start(i);
                            const end = sbLocal.buffered.end(i);
                            if (end < Math.max(0, now - BUFFER_KEEP_BEHIND_SECONDS)) {
                                console.log(`Removing buffered range ${start} - ${end} (behind currentTime ${now})`);
                                sbLocal.remove(start, end);
                            }
                        } catch {}
                    }

                    // extra trimming if buffer ahead is too large
                    let ahead = 0;
                    for (let i = 0; i < sbLocal.buffered.length; i++) {
                        const s = sbLocal.buffered.start(i);
                        const e = sbLocal.buffered.end(i);
                        if (e > now) ahead += Math.max(0, e - Math.max(s, now));
                    }
                    if (ahead > MAX_BUFFER_AHEAD_SECONDS) {
                        const removeTo = Math.max(0, now - BUFFER_KEEP_BEHIND_SECONDS);
                        console.log("Force trimming to free space, remove up to", removeTo);
                        try { sbLocal.remove(0, removeTo); } catch {}
                    }
                }
            } catch (err) {
                alert("Failed preparing encrypted stream: " + (err.message || err));
                onClose();
            } finally {
                setLoading(false);
            }
        }

        setup();

        return () => {
            aborted = true;
            try {
                const sb = sourceBufferRef.current;
                const ms = mediaSourceRef.current;
                if (sb && ms && (ms.readyState === "open" || ms.readyState === "ended")) {
                    const attached = Array.prototype.indexOf.call(ms.sourceBuffers, sb) !== -1;
                    if (attached) ms.removeSourceBuffer(sb);
                }
                sourceBufferRef.current = null;
                if (objectUrlRef.current && videoRef.current) {
                    // eslint-disable-next-line
                    try { videoRef.current.src = ""; } catch {}
                    try { URL.revokeObjectURL(objectUrlRef.current); } catch {}
                    objectUrlRef.current = null;
                }
                mediaSourceRef.current = null;
            } catch {}
        };
    }, [video, onClose]);

    if (!video) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-4xl overflow-hidden">
                <div className="flex items-center justify-between p-2 border-b">
                    <div className="font-medium">{video.title}</div>
                    <button onClick={onClose} className="px-3 py-1">✕</button>
                </div>
                <div className="bg-black">
                    {loading && <div className="text-white p-4">Preparing encrypted stream...</div>}
                    <video ref={videoRef} controls className="w-full max-h-[90vh]" />
                </div>
            </div>
        </div>
    );
}