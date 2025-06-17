from fastapi import WebSocket
import json
import base64
from io import BytesIO
from .models import model, get_val_env
from .exec import get_llm_response, get_tts_response
import datetime

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
            websocket_disconnect(client_id)


async def process_audio_message(client_id: str, message: str):
    try:
        data = json.loads(message)

        audio_b64 = data.get("audio_data", "")

        audio_bytes = base64.b64decode(audio_b64)

        audio_buffer = BytesIO(audio_bytes)

        model_name = get_val_env("STT_MODEL_NAME")
        audio_transcription = model.audio.transcriptions.create(
            file=audio_buffer,
            model=model_name,
            response_format="text",
        )

        llm_response = get_llm_response(transcription=audio_transcription)

        audio_response = get_tts_response(llm_response=llm_response)

        if audio_response:

            audio_b64 = base64.b64encode(audio_response).decode("utf-8")
            await send_message(
                client_id,
                {
                    "type": "audio_response",
                    "audio_data": audio_b64,
                    "format": "wav",
                    "timestamp": datetime.now().isoformat(),
                },
            )
            
        await send_message(client_id, {
                "type": "processing_complete",
                "message": "Ready for next input"
        })
    except Exception as e:

        await send_message(
            client_id, {"type": "error", "message": "Error processing audio"}
        )
