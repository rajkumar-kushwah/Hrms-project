
export default function FullScreenLoader() {
    return (
        <div className="app-fullscreen-loader">
            <div className="loader-dots" role="status" aria-label="Loading">
                {Array.from({ length: 100 }).map((_, index) => (
                    <span
                        key={index}
                        className="loader-dot"
                        style={{ "--dot-index": index } as React.CSSProperties}
                    />
                ))}
            </div>
        </div>
    );
}
