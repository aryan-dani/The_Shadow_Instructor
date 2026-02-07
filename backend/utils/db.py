from supabase import create_client, Client
from utils.config import config

class Database:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance.client = None
        return cls._instance

    def get_client(self) -> Client:
        if self.client is None:
            if not config.SUPABASE_URL or not config.SUPABASE_KEY:
                print("Warning: Supabase credentials not set. Database features will be disabled.")
                return None
            
            self.client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
        return self.client

db = Database()
