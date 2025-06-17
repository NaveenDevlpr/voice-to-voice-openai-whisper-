from .prompt import general_prompt
from .models import model
from .util import get_val_env
import os
from cartesia import Cartesia
import io
import wave

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
    try:
        cartesia_key = get_val_env("CARTESIA_KEY")
        client = Cartesia(api_key=cartesia_key)
        response = client.tts.bytes(
            model_id="sonic-2",
            transcript=llm_response,
            voice={
                "mode": "id",
                "id": "bf0a246a-8642-498a-9950-80c35e9276b5",
            },
            language="en",
            output_format={
                "container": "raw",
                "sample_rate": 44100,
                "encoding": "pcm_f32le",
            },
        )
        audio_bytes = b"".join(response)
        wav_buffer = io.BytesIO()
    
    
        with wave.open(wav_buffer, 'wb') as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(4)  
            wav_file.setframerate(44100)  
            wav_file.writeframes(audio_bytes)  
    
    
        wav_buffer.seek(0)
        wave_bytes=wav_buffer.read()
        return wave_bytes
    except Exception as e:
        print("cartesia_error------>",e)
    # response = model.audio.speech.create(
    # model="playai-tts",
    # voice="Aaliyah-PlayAI",
    # response_format="wav",
    # input=llm_response,
    # )
    # return response.read()
