
from fastapi import FastAPI
from .models import model
from fastapi import UploadFile,File
from .util import get_val_env
from .exec import get_llm_response,get_tts_response
from io import BytesIO
from fastapi import WebSocket, WebSocketDisconnect,WebSocketException
from .websocket import websokcet_connect,process_audio_message,websocket_disconnect,send_json_message
from .voice_detect import VoiceDetector


groq_api_key=get_val_env('MODEL_API_KEY')
model_name=get_val_env('STT_MODEL_NAME')

app=FastAPI()


@app.websocket('/ws/{client_id}')
async def handle_websocket(websocket: WebSocket, client_id: str):
    
    await websokcet_connect(websocket=websocket,client_id=client_id)
    
    voice_detector = VoiceDetector()
    audio_buffer = bytearray()
    silence_frames = 0
    speaking = False
    
    # max_silence_duration = 0.7  # ~700ms
    # frame_duration = voice_detector.frame_duration  # 30ms
    # frames_per_second = 1000 / frame_duration  # = 1000 / 30 ≈ 33.33
    # max_silence_frames = int(max_silence_duration * frames_per_second)
    max_silence_frames = 1.5
    try:
        while True:
            data = await websocket.receive_bytes()
                
            if not data:
                print("Received empty data frame")
                continue
                
            
            voice_detected = voice_detector.detect_voice(data)
            
            print(f"[VAD] Voice detected: {voice_detected} | Silence Frames: {silence_frames}")
            if voice_detected:
                
                silence_frames = 0
                audio_buffer.extend(data)

                if not speaking:
                    await send_json_message(data={"type": "vad", "status": "active"}, client_id=client_id)
                    speaking = True
            else:
                silence_frames += 1
                
                if len(audio_buffer) > 0 and silence_frames >= max_silence_frames:
                    print("INNNNNNNNN")
                    audio_response=await process_audio_message(client_id=client_id, audio_bytes=bytes(audio_buffer))
                #     if audio_response:
                #         await websocket.send_bytes(audio_response)
                    
                
                #     audio_buffer = bytearray()
                #     silence_frames=0
                #     await send_json_message(data={"type": "vad", "status": "inactive"},client_id=client_id)
                #     speaking=False
                # elif len(audio_buffer) > 0:
                #     audio_buffer.extend(data)
            # message = await websocket.receive_text()
           
            
            
    except WebSocketDisconnect as e:
        print("Disconnection Error=========>",e)
        await websocket_disconnect(client_id)
        

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