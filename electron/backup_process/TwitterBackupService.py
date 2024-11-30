import asyncio
import json
import os
import requests  # For Pushover notifications
from datetime import datetime
import twikit
from twikit import Client, Capsolver
from MessageBroker import MessageBroker

MAX_COUNT = 5000
LOG_FILE = "twitter_backup.log"
PUSHOVER_USER_KEY = "uyawc5tru2ac6eq1rynfajyxe5eud3"
PUSHOVER_API_TOKEN = "arh3tjv1ic29n1u7i255rzuya51qk4"
PUSHOVER_DEVICE = "phone"

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
        #self.broker.send_error(f"Failed to send notification: {e}")

class TwitterBackupService:
    def __init__(self, username, email, password, totp_secret=None, event_callback=None):
        self.capsolver = Capsolver(api_key="CAP-3900BD9D26EF9B########", max_attempts=10)
        self.client = Client(language='en-US', captcha_solver=self.capsolver, user_agent = 'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion')
        self.username = username
        self.email = email
        self.user: twikit.User | None = None
        self.user_id = None
        self.backup_file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'backup.json'))
        self.event_callback = event_callback
        self.auth_info = {
            'auth_info_1': username,
            'auth_info_2': email,
            'password': password,
            'totp_secret': totp_secret
        }
        self.backup_data = {
            "following": [],
            "likes": [],
            "bookmarks": [],
            "last_updated": None
        }
        self.configue_message_broker()
        self.load_backup_data()
        

    def configue_message_broker(self):
        self.broker = MessageBroker(self.event_callback)

    def load_backup_data(self):
        try:
            with open(self.backup_file_path, 'r') as f:
                self.backup_data = json.load(f)
            self.broker.send_activity("Loaded existing backup data.")
        except FileNotFoundError:
            self.broker.send_activity("No existing backup found, starting fresh.")
        except Exception as e:
            self.broker.send_error(f"Failed to load backup data: {e}")

    async def login(self):
        try:
            await self.client.login(auth_info_1=self.auth_info["auth_info_1"],
                                    auth_info_2=self.auth_info["auth_info_2"],
                                    password=self.auth_info["password"],
                                    totp_secret=self.auth_info["totp_secret"])
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
                self.broker.send_activity(f"Fetched {len(following_users)} new following users.")
                for user in following_users:
                    send_pushover_notification("New Following", f"New follow: {user[1]}", priority=0, url=f"https://twitter.com/{user[1]}")
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

    def tweet_to_dict(self, tweet):
        tweet_dict = {
            "id": tweet.id,
            "text": tweet.text,
            "created_at": tweet.created_at,
            "user": {
                "id": tweet.user.id,
                "screen_name": tweet.user.screen_name,
                "profile_image_url": tweet.user.profile_image_url
            }
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
                # Handle other media types
            if media_download_links:
                tweet_dict["media_download_links"] = media_download_links

        return tweet_dict

    async def update_backup(self):
        try:
            await self.fetch_following()
            await self.fetch_likes()
            await self.fetch_bookmarks()
            self.backup_data["last_updated"] = datetime.now().isoformat()
            with open(self.backup_file_path, 'w') as f:
                json.dump(self.backup_data, f, indent=4)
            self.broker.send_activity(f"Backup updated at {self.backup_data['last_updated']}.")
        except Exception as e:
            self.broker.send_error(f"Failed to update backup: {e}")
            send_pushover_notification("TwitterBackupService Error", f"Failed to update backup: {e}", priority=2)

    async def run_backup_service(self):
        await self.login()
        while True:
            try:
                await self.update_backup()
            except Exception as e:
                self.broker.send_error(f"Error during backup update: {e}")
                send_pushover_notification("TwitterBackupService Error", f"Error during backup update: {e}", priority=2)
            await asyncio.sleep(5)

async def test_media(bs: TwitterBackupService):
    await bs.login()
    await bs.fetch_likes()
