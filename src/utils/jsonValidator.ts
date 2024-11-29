import { TwitterBackup, Tweet } from "../types/twitter";

export function validateTwitterBackup(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    console.log("Received data:", data);
    return { valid: false, errors: ["Data must be an object"] };
  }

  const backup = data as Partial<TwitterBackup>;

  // Debug log the received data structure
  console.log("Received data structure:", {
    followingType: Array.isArray(backup.following)
      ? "array"
      : typeof backup.following,
    likesType: Array.isArray(backup.likes) ? "array" : typeof backup.likes,
    bookmarksType: Array.isArray(backup.bookmarks)
      ? "array"
      : typeof backup.bookmarks,
    lastUpdatedType: typeof backup.last_updated,
    receivedKeys: Object.keys(backup),
  });

  // Check following array
  if (!Array.isArray(backup.following)) {
    errors.push(
      `following must be an array (received ${typeof backup.following})`
    );
    console.log("Following data:", backup.following);
  } else {
    const invalidFollowing = backup.following.find(
      (item) =>
        !Array.isArray(item) ||
        item.length !== 2 ||
        typeof item[0] !== "string" ||
        typeof item[1] !== "string"
    );
    if (invalidFollowing) {
      errors.push(
        `following array must contain tuples of [string, string] (found invalid entry: ${JSON.stringify(
          invalidFollowing
        )})`
      );
    }
  }

  // Check likes and bookmarks arrays
  ["likes", "bookmarks"].forEach((key) => {
    const tweets: any = backup[key as keyof TwitterBackup];
    if (!Array.isArray(tweets)) {
      errors.push(`${key} must be an array (received ${typeof tweets})`);
      console.log(`${key} data:`, tweets);
    } else {
      tweets.forEach((tweet, index) => {
        if (!tweet.id) errors.push(`Tweet at ${key}[${index}] missing id`);
        if (!tweet.text) errors.push(`Tweet at ${key}[${index}] missing text`);
        if (!tweet.created_at)
          errors.push(`Tweet at ${key}[${index}] missing created_at`);
        if (!tweet.user?.id || !tweet.user?.screen_name) {
          errors.push(
            `Tweet at ${key}[${index}] has invalid user object: ${JSON.stringify(
              tweet.user
            )}`
          );
        }
        if (
          tweet.media_download_links &&
          !Array.isArray(tweet.media_download_links)
        ) {
          errors.push(
            `Tweet at ${key}[${index}] has invalid media_download_links: ${typeof tweet.media_download_links}`
          );
        }
      });
    }
  });

  // Check last_updated
  if (typeof backup.last_updated !== "string") {
    errors.push(
      `last_updated must be a string (received ${typeof backup.last_updated})`
    );
    console.log("last_updated value:", backup.last_updated);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
