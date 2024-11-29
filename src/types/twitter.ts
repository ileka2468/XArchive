export interface TwitterUser {
  id: string;
  screen_name: string;
}

export interface MediaDownloadLink {
  type: 'photo' | 'video';
  url: string;
}

export interface Tweet {
  id: string;
  text: string;
  created_at: string;
  user: TwitterUser;
  media_download_links?: MediaDownloadLink[];
}

export interface TwitterBackup {
  following: [string, string][];
  likes: Tweet[];
  bookmarks: Tweet[];
  last_updated: string;
}