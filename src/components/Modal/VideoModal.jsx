const VideoModal = ({ video, onClose }) => {
    if (!video) return null;
    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div className="bg-gray-900 rounded-lg overflow-hidden max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-3 border-b border-gray-800">
                    <h2 className="text-white text-lg">{video.title}</h2>
                    <button
                        className="text-white/80 hover:text-white"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
                <div className="bg-black">
                    <video
                        controls
                        autoPlay
                        src={video.src}
                        className="w-full max-h-[70vh] bg-black"
                    />
                </div>
                {video.description && (
                    <div className="p-3 text-sm text-gray-300">
                        {video.description}
                    </div>
                )}
            </div>
        </div>
    );
};


export default VideoModal;