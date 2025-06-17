
from fastapi import FastAPI
from .models import model
from fastapi import UploadFile,File
from .util import get_val_env
from .exec import get_llm_response,get_tts_response
from io import BytesIO
from fastapi import WebSocket, WebSocketDisconnect,WebSocketException
from .websocket import websokcet_connect,process_audio_message,websocket_disconnect

groq_api_key=get_val_env('MODEL_API_KEY')
model_name=get_val_env('STT_MODEL_NAME')

app=FastAPI()


@app.websocket('/ws/{client_id}')
async def handle_websocket(websocket: WebSocket, client_id: str):
    await websokcet_connect(websocket=websocket,client_id=client_id)
    
    try:
        while True:
            message = await websocket.receive_text()
            await process_audio_message(client_id=client_id, message=message)
            
    except WebSocketDisconnect as e:
        print("Disconnection Error=========>",e)
        websocket_disconnect(client_id)
        
    except Exception as e:
        print("Websocket Exception Error=====>",e)
        websocket_disconnect(client_id)
        

# @app.post('/speech-to-text')
# async def transcribe_audio(file:UploadFile=File(...)):
    
#     try:
#         audio_bytes=await file.read()
        
       
#         audio_buffer = BytesIO(audio_bytes)
#         audio_buffer.name = file.filename
        
#         audio_transcription=model.audio.transcriptions.create(
#             file=audio_buffer,
#             model=model_name,
#             response_format="text",
#             )

#         llm_response=get_llm_response(transcription=audio_transcription)
        
#         tts_response=get_tts_response(llm_response=llm_response)
#     except Exception as e :
#         print("Error---->",e)