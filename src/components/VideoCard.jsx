const VideoCard = ({ video, onOpen }) => {
    return (
        <div
            className="bg-white rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow cursor-pointer group"
            onClick={() => onOpen(video)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => { if (e.key === "Enter") onOpen(video); }}
        >
            <div className="relative">
                <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-44 object-cover group-hover:scale-105 transform transition-transform duration-300"
                />
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
