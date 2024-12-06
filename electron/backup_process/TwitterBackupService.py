# electron/backup_process/TwitterBackupService.py

import asyncio
import json
import os
import requests
from datetime import datetime
import twikit
from twikit import Client, Capsolver
from MessageBroker import MessageBroker

PUSHOVER_USER_KEY = ""
PUSHOVER_API_TOKEN = ""
PUSHOVER_DEVICE = ""

def send_pushover_notification(title, message, priority=0, url=None, url_title=None):
    return # stop wasting my mf bandwidth while developing
    # Send a Pushover notification
    payload = {
        "token": PUSHOVER_API_TOKEN,
        "user": PUSHOVER_USER_KEY,
        "device": PUSHOVER_DEVICE,
        "title": title,
        "message": message,
        "priority": priority,
        "html": 1
    }
    if url:
        payload["url"] = url
        payload["url_title"] = url_title

    try:
        response = requests.post("https://api.pushover.net/1/messages.json", data=payload)
        response.raise_for_status()
    except requests.RequestException as e:
        pass

class TwitterBackupService:
    def __init__(self, backup_name, credentials, event_callback=None, backup_dir=None):
        self.backup_name = backup_name
        self.credentials = credentials
        self.username = credentials.get("username")
        self.email = credentials.get("email")
        self.password = credentials.get("password")
        self.totp_secret = credentials.get("totp_secret")
        self.backup_dir = backup_dir or os.path.join(os.getcwd(), "backups", self.backup_name)
        os.makedirs(self.backup_dir, exist_ok=True)
        self.backup_file_path = os.path.join(self.backup_dir, 'backup.json')
        self.event_callback = event_callback

        self.capsolver = Capsolver(api_key="CAP-3900BD9D26EF9B########", max_attempts=10)
        self.client = Client(
            language='en-US',
            captcha_solver=self.capsolver,
            user_agent='Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion'
        )
        self.user: twikit.User | None = None
        self.user_id = None
        self.backup_data = {
            "following": [],
            "likes": [],
            "bookmarks": [],
            "last_updated": None
        }
        self.configure_message_broker()
        self.load_backup_data()

    def configure_message_broker(self):
        self.broker = MessageBroker(self.event_callback)

    def load_backup_data(self):
        try:
            if os.path.exists(self.backup_file_path):
                with open(self.backup_file_path, 'r') as f:
                    self.backup_data = json.load(f)
                self.broker.send_activity("Loaded existing backup data.")
            else:
                self.broker.send_activity("No existing backup found, starting fresh.")
        except Exception as e:
            self.broker.send_error(f"Failed to load backup data: {e}")

    async def login(self):
        try:
            await self.client.login(
                auth_info_1=self.username,
                auth_info_2=self.email,
                password=self.password,
                totp_secret=self.totp_secret
            )
            self.user = await self.client.get_user_by_screen_name(self.username)
            self.user_id = self.user.id
            self.broker.send_activity(f"Logged in successfully as {self.username}.")
            send_pushover_notification("TwitterBackupService", "Service started successfully.", priority=1)
        except Exception as e:
            self.broker.send_error(f"Login failed: {e}")
            send_pushover_notification("TwitterBackupService Error", f"Login failed: {e}", priority=2)
            raise

    async def fetch_following(self):
        following_users = []
        latest_following = self.backup_data["following"][0] if self.backup_data["following"] else None
        latest_id = latest_following[0] if latest_following else None

        try:
            following_result = await self.user.get_following(count=100)
            for user in following_result:
                if user.id == latest_id:
                    break
                following_users.append((user.id, user.screen_name))
            if following_users:
                self.backup_data["following"] = following_users + self.backup_data["following"]
                self.save_backup_data()
                self.broker.send_activity(f"Fetched {len(following_users)} new following users.")
                for user in following_users:
                    send_pushover_notification(
                        "New Following",
                        f"New follow: {user[1]}",
                        priority=0,
                        url=f"https://twitter.com/{user[1]}"
                    )
            else:
                self.broker.send_activity("No new following users found.")
        except Exception as e:
            self.broker.send_error(f"Failed to fetch following: {e}")
            send_pushover_notification("TwitterBackupService Error", f"Failed to fetch following: {e}", priority=2)

    async def fetch_likes(self):
        liked_tweets = []
        latest_like = self.backup_data["likes"][0] if self.backup_data["likes"] else None
        latest_id = latest_like["id"] if latest_like else None

        try:
            likes_result = await self.user.get_tweets("Likes", count=350)
            for tweet in likes_result:
                if tweet.id == latest_id:
                    break
                liked_tweets.append(self.tweet_to_dict(tweet))
            if liked_tweets:
                self.backup_data["likes"] = liked_tweets + self.backup_data["likes"]
                self.save_backup_data()
                self.broker.send_activity(f"Fetched {len(liked_tweets)} new liked tweets.")
                for tweet in liked_tweets:
                    send_pushover_notification(
                        "New Like",
                        f"{tweet['text']}\n\n",
                        priority=0,
                        url=f"https://twitter.com/{tweet['user']['screen_name']}/status/{tweet['id']}"
                    )
            else:
                self.broker.send_activity("No new liked tweets found.")
        except Exception as e:
            self.broker.send_error(f"Failed to fetch likes: {e}")
            send_pushover_notification("TwitterBackupService Error", f"Failed to fetch likes: {e}", priority=2)

    async def fetch_bookmarks(self):
        bookmarks = []
        latest_bookmark = self.backup_data["bookmarks"][0] if self.backup_data["bookmarks"] else None
        latest_id = latest_bookmark["id"] if latest_bookmark else None

        try:
            bookmarks_result = await self.client.get_bookmarks(count=350)
            for tweet in bookmarks_result:
                if tweet.id == latest_id:
                    break
                bookmarks.append(self.tweet_to_dict(tweet))
            if bookmarks:
                self.backup_data["bookmarks"] = bookmarks + self.backup_data["bookmarks"]
                self.save_backup_data()
                self.broker.send_activity(f"Fetched {len(bookmarks)} new bookmarks.")
                for tweet in bookmarks:
                    send_pushover_notification(
                        "New Bookmark",
                        tweet["text"],
                        priority=0,
                        url=f"https://twitter.com/{tweet['user']['screen_name']}/status/{tweet['id']}"
                    )
            else:
                self.broker.send_activity("No new bookmarks found.")
        except Exception as e:
            self.broker.send_error(f"Failed to fetch bookmarks: {e}")
            send_pushover_notification("TwitterBackupService Error", f"Failed to fetch bookmarks: {e}", priority=2)

    def tweet_to_dict(self, tweet: twikit.Tweet, depth=0, max_depth=5):
        if not tweet or depth > max_depth:
            return None

        tweet_dict = {
            "id": tweet.id,
            "text": tweet.text,
            "created_at": tweet.created_at,
            "user": {
                "id": tweet.user.id,
                "screen_name": tweet.user.screen_name,
                "profile_image_url": tweet.user.profile_image_url
            },
            "quote": self.tweet_to_dict(tweet.quote) if tweet.quote else None,
        }

        # Process media
        if hasattr(tweet, 'media') and tweet.media:
            media_download_links = []
            for media in tweet.media:
                if media['type'] == 'video':
                    video_variants = media.get('video_info', {}).get('variants', [])
                    # Sort variants by bitrate descending to get the highest quality first
                    video_variants_sorted = sorted(
                        [variant for variant in video_variants if variant.get('content_type') == 'video/mp4'],
                        key=lambda x: x.get('bitrate', 0),
                        reverse=True
                    )
                    if video_variants_sorted:
                        # Select the variant with the highest bitrate
                        download_url = video_variants_sorted[0]['url']
                        media_download_links.append({"type": "video", "url": download_url})
                elif media['type'] == 'photo':
                    download_url = media.get("media_url_https")
                    if download_url:
                        media_download_links.append({"type": "photo", "url": download_url})
                # Handle other media types if necessary
            if media_download_links:
                tweet_dict["media_download_links"] = media_download_links

        return tweet_dict

    def save_backup_data(self):
        with open(self.backup_file_path, 'w') as f:
            json.dump(self.backup_data, f, indent=4)
        self.broker.send_activity("Backup data saved.")

    async def update_backup(self):
        try:
            await self.fetch_following()
            await self.fetch_likes()
            await self.fetch_bookmarks()
            self.backup_data["last_updated"] = datetime.now().isoformat()
            self.save_backup_data()
            self.broker.send_activity(f"Backup updated at {self.backup_data['last_updated']}.")
        except Exception as e:
            self.broker.send_error(f"Failed to update backup: {e}")
            send_pushover_notification("TwitterBackupService Error", f"Failed to update backup: {e}", priority=2)

    async def start_backup(self):
        await self.login()
        while True:
            try:
                await self.update_backup()
            except Exception as e:
                self.broker.send_error(f"Error during backup update: {e}")
                send_pushover_notification("TwitterBackupService Error", f"Error during backup update: {e}", priority=2)
            await asyncio.sleep(3)
