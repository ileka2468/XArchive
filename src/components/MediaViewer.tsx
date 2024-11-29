import React, { useState, useRef, useEffect, memo } from "react";
import { MediaDownloadLink } from "../types/twitter";

interface MediaViewerProps {
  media: MediaDownloadLink;
}

export const MediaViewer = memo(function MediaViewer({
  media,
}: MediaViewerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [hasError, setHasError] = useState(false);
  const mediaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsInViewport(true);
          // Delay setting `isVisible` to prevent sudden swapping
          setTimeout(() => setIsVisible(true), 0);
        }
      },
      {
        threshold: 0.1, // Lower threshold to trigger visibility sooner
        rootMargin: "1000px", // Increased root margin for earlier loading
      }
    );

    if (mediaRef.current) {
      intersectionObserver.observe(mediaRef.current);
    }

    return () => {
      intersectionObserver.disconnect();
    };
  }, []); // Removed isVisible from dependencies

  if (media.type === "photo") {
    return (
      <div ref={mediaRef} className="rounded-lg overflow-hidden bg-gray-100">
        {isVisible && !hasError && (
          <img
            src={media.url}
            alt="Tweet media"
            className="w-full h-auto object-cover"
            loading="lazy"
            onError={() => setHasError(true)}
          />
        )}
        {hasError && (
          <div className="p-4 text-center text-gray-500">
            Image failed to load.
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={mediaRef} className="rounded-lg overflow-hidden bg-gray-100">
      {isVisible && isInViewport && !hasError ? (
        <video
          controls
          className="w-full h-auto"
          preload="metadata"
          onError={() => setHasError(true)}
        >
          <source src={`${media.url}#t=0.1`} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      ) : hasError ? (
        <div className="p-4 text-center text-gray-500">
          Video failed to load.
        </div>
      ) : (
        <div className="aspect-video bg-gray-200 animate-pulse" />
      )}
    </div>
  );
});
