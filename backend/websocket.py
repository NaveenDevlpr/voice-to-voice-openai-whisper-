from fastapi import WebSocket
import json
import base64
from io import BytesIO
import io
import wave
from .models import model, get_val_env
from .exec import get_llm_response, get_tts_response
import datetime
from tempfile import NamedTemporaryFile

websocket_connections = {}


async def websokcet_connect(websocket: WebSocket, client_id: str):
    await websocket.accept()
    websocket_connections[client_id] = websocket


async def websocket_disconnect(client_id: str):
    if client_id in websocket_connections:
        del websocket_connections[client_id]


async def send_message(client_id: str, data: dict):
    if client_id in websocket_connections:
        try:
            await websocket_connections[client_id].send_text(json.dumps(data))
        except Exception as e:
            await websocket_disconnect(client_id)

async def send_json_message(client_id: str, data: dict):
    if client_id in websocket_connections:
        try:
            await websocket_connections[client_id].send_json(data)
        except Exception as e:
            await websocket_disconnect(client_id)


async def process_audio_message(client_id: str, audio_bytes):
    try:
        # data = json.loads(message)

        # audio_b64 = data.get("audio_data", "")

        # audio_bytes = base64.b64decode(audio_b64)

        # audio_buffer = BytesIO(audio_bytes)
        model_name = get_val_env("STT_MODEL_NAME")
        print("MODEL_NAME------->",model_name)
        # file_upload = ("audio.wav", audio_bytes)
        
        wav_buffer = io.BytesIO()
        with wave.open(wav_buffer, 'wb') as wf:
            wf.setnchannels(1)           
            wf.setsampwidth(2)           
            wf.setframerate(16000)      
            wf.writeframes(audio_bytes)
        
        wav_buffer.seek(0)

        
        file_upload = ("audio.wav", wav_buffer)

        audio_transcription = model.audio.transcriptions.create(
            file=file_upload,
            model=model_name,
            response_format="text",
            language='en'
        )

        # with NamedTemporaryFile(suffix=".wav") as temp_audio:
        #     temp_audio.write(audio_bytes)
        #     temp_audio.seek(0)

        #     try:
        #         audio_transcription = model.audio.transcriptions.create(
        #         file=temp_audio,
        #         model=model_name,
        #         response_format="text",
        #         )
        #     except Exception as e:
        #         print('auio_error-------->',e)

        print("transcription[[[[[[[]]]]]]]", audio_transcription)

        # llm_response = get_llm_response(transcription=audio_transcription)

        # audio_response = get_tts_response(llm_response=llm_response)
        
        # return audio_response
    except Exception as e:
        print("error_transcription------>",e)
        await send_message(
            client_id, {"type": "error", "message": "Error processing audio"}
        )
