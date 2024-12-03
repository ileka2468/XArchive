import sys
import random
from twikit.user import User
from twikit.client.client import Client, Capsolver
from twikit.errors import Forbidden
import asyncio
import json

REPROCESS_TIME_SECONDS = 17 * 60

class AccountRestorationService:
    def __init__(self, username, email, password, totp_secret):
        self.client = None
        self.auth_info = {'auth_info_1' : username, 'auth_info_2' : email, 'password' : password, 'totp_secret': totp_secret}
        self.username = username
        self.email = email
        self.user: User
        self.user = None
        self.user_id = None
        self.account_data = {}
        self.residualFollowingData = []
        self.reprocessFollowing = False
        self.solver = Capsolver(api_key='CAP-3900BD9D26EF9B9C89A228B3E3C6587E', max_attempts=10)

    async def login(self):
        if self.client and not self.reprocessFollowing:
            sys.exit(0)
        try:
            self.client = Client('en', captcha_solver=self.solver, user_agent = 'Mozilla/5.0 (platform; rv:geckoversion) Gecko/geckotrail Firefox/firefoxversion', proxy="http://pcoSg0CJ1Q-res-us-nnid-66477466:PC_LsQZNaFRR8bK9ty2@proxy-us.proxy-cheap.com:5959")
            await self.client.login(auth_info_1=self.auth_info["auth_info_1"],
                                    auth_info_2=self.auth_info["auth_info_2"],
                                    password=self.auth_info["password"],
                                    totp_secret=self.auth_info["totp_secret"],
            )
            self.user = await self.client.get_user_by_screen_name(self.username)
            self.user_id = self.user.id
        except Exception as e:
            raise e

    def load_account_data(self):
        with open("account_backup.json", "r") as file:
            self.account_data =  json.load(file)

    async def restore_following(self):
        while True:
            try:
                if self.reprocessFollowing:
                    list_data = self.residualFollowingData
                else:
                    list_data = self.account_data['following']

                if len(list_data) > 15:
                    following_list = list_data[:15]
                    self.residualFollowingData = list_data[15:]
                    self.reprocessFollowing = True
                else:
                    following_list = list_data
                    self.reprocessFollowing = False

                print(following_list)
                for user in following_list:
                    random_time = random.randint(30, 60)
                    try:
                        await self.client.follow_user(user[0])
                        print("Followed user: " + user[1])
                        await asyncio.sleep(random_time)
                    except Forbidden as e:
                        if 'Cannot find specified user' in str(e):
                            print(f"User not found, removing user: {user[1]}")
                            list_data.remove(user)
                        else:
                            raise e

                if not self.reprocessFollowing:
                    break

            except Exception as e:
                print(f"An error occurred: {e}")

    async def restore_likes(self):
        try:
            likes_list = self.account_data['likes']
            likes_list.reverse()
            print(likes_list)
            for tweet in likes_list:
                await self.client.favorite_tweet(tweet['id'])
                print("liked tweet: " + tweet['id'])
                await self.sleep_random()
        except Exception as e:
            raise e

    async def restore_bookmarks(self):
        try:
            bookmarks_list = self.account_data['bookmarks']
            bookmarks_list.reverse()
            print(bookmarks_list)
            for tweet in bookmarks_list:
                await self.client.bookmark_tweet(tweet['id'])
                print("bookmarked tweet: " + tweet['id'])
                await self.sleep_random()
        except Exception as e:
            raise e


    async def restore(self):
        if self.reprocessFollowing:
            print("Detected residual following from last run, continuing to restore following...")
            await self.restore_following()
            return

        self.load_account_data()
        await self.login()
        await self.restore_likes()
        await self.restore_bookmarks()
        # await self.restore_following()



    async def restore_account(self):
        while True:
            await self.restore()
            if self.reprocessFollowing:
                print("Detected residual following from last run, sleeping for 15 minutes and resuming restoration...")
            await asyncio.sleep(REPROCESS_TIME_SECONDS)

    @classmethod
    async def sleep_random(cls):
        await asyncio.sleep(random.randint(1, 5))


if __name__ == '__main__':
    ars = AccountRestorationService("DonnaWilso76235", "nmknlbpu@velismail.com", "Iafmpxl72", totp_secret="")
    asyncio.run(ars.restore_account())
