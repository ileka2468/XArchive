import { memo } from "react";
import { Tweet as TweetType } from "../types/twitter";
import { MediaViewer } from "./MediaViewer";
import { Calendar } from "lucide-react";

interface TweetProps {
  tweet: TweetType;
}

export const Tweet = memo(function Tweet({ tweet }: TweetProps) {
  const date = new Date(tweet.created_at);
  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <article className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:border-blue-300 transition-colors">
      <div className="flex items-start gap-3 mb-2">
  
         <img
          src={tweet.user.profile_image_url}
          alt={`${tweet.user.screen_name}'s profile`}
          className="w-10 h-10 rounded-full"
        />
        <div className="flex-1">
          <h3 className="font-bold text-gray-900">@{tweet.user.screen_name}</h3>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Calendar size={14} />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      <p className="text-gray-800 mb-3 whitespace-pre-wrap">{tweet.text}</p>

      {tweet.media_download_links && tweet.media_download_links.length > 0 && (
        <div className="grid gap-2">
          {tweet.media_download_links.map((media, index) => (
            <MediaViewer key={`${tweet.id}-${index}`} media={media} />
          ))}
        </div>
      )}
    </article>
  );
});
