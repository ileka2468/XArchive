import React, { memo } from "react";
import { Tweet as TweetType } from "../types/twitter";
import { Tweet } from "./Tweet";

interface TweetListProps {
  tweets?: TweetType[];
  title: string;
}

export const TweetList = memo(function TweetList({
  tweets = [],
  title,
}: TweetListProps) {
  if (!tweets?.length) {
    return (
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <p className="text-gray-500">No tweets to display</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      <div className="grid gap-4">
        {tweets.map((tweet, index) => (
          <Tweet key={`${tweet.id}-${index}`} tweet={tweet} />
        ))}
      </div>
    </section>
  );
});
