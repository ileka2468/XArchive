import React, { useState, useRef, useEffect } from "react";
import { Tweet as TweetType } from "../types/twitter";
import { Tweet } from "./Tweet";

interface LazyTweetProps {
  tweet: TweetType;
}

const LazyTweet: React.FC<LazyTweetProps> = ({ tweet }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tweetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    if (tweetRef.current) {
      observer.observe(tweetRef.current);
    }

    return () => {
      if (tweetRef.current) {
        observer.unobserve(tweetRef.current);
      }
    };
  }, []);

  return (
    <div ref={tweetRef} style={{ minHeight: "200px" }}>
      {isVisible && <Tweet tweet={tweet} />}
    </div>
  );
};

export default LazyTweet;
