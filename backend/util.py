from dotenv import load_dotenv
import os


load_dotenv()


def get_val_env(key: str):
    return os.getenv(key)

