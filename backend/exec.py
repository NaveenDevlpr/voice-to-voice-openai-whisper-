from .prompt import general_prompt
from .models import model
from .util import get_val_env

def get_llm_response(transcription: str):
    general_model_name = get_val_env("GENERAL_MODEL_NAME")
    
    completion = model.chat.completions.create(
        model=general_model_name,
        messages=[
            {"role": "system", "content": general_prompt},
            {"role": "user", "content": transcription},
        ],
        temperature=0.7,
    )

    return completion.choices[0].message.content



def get_tts_response(llm_response):
    response = model.audio.speech.create(
    model="playai-tts",
    voice="Aaliyah-PlayAI",
    response_format="wav",
    input=llm_response,
    )
    return response.read()