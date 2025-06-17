from groq import Groq
from .util import get_val_env

api_key=get_val_env('MODEL_API_KEY')

model=Groq(api_key=api_key)

