import webrtcvad
import numpy as np
import struct

class VoiceDetector:
    def __init__(self, sample_rate=16000, frame_duration=10):
        self.vad = webrtcvad.Vad(3)  
        self.sample_rate = sample_rate
        self.frame_duration = frame_duration
        self.frame_size = int(sample_rate * frame_duration / 1000)
        self.silence_frames = 0
        self.max_silence_frames = 23
        self.min_speech_frames = 3
        self.speech_frames = 0
        self.is_speaking = False

    def _frame_generator(self, audio_data):
        n = len(audio_data)
        frames = [audio_data[i:i + self.frame_size * 2] for i in range(0, n, self.frame_size * 2)]
        return frames

    def _convert_audio_data(self, audio_data):
        try:
            return np.frombuffer(audio_data, dtype=np.int16)
        except ValueError:
            try:
                float_array = np.frombuffer(audio_data, dtype=np.float32)
                return (float_array * 32767).astype(np.int16)
            except Exception as e:
                print("Audio conversion error:", e)
                return np.array([], dtype=np.int16)

    def detect_voice(self, audio_data):
        if not audio_data:
            return False

        audio_array = self._convert_audio_data(audio_data)
        if len(audio_array) == 0:
            return False

        frames = self._frame_generator(audio_array.tobytes())
        current_speech_frames = 0

        for frame in frames:
            if len(frame) != self.frame_size * 2:
                continue
            try:
                if self.vad.is_speech(frame, self.sample_rate):
                    current_speech_frames += 1
                    self.speech_frames += 1
                    self.silence_frames = 0
                else:
                    self.silence_frames += 1
            except Exception as e:
                continue

        if current_speech_frames > 0:
            if not self.is_speaking and self.speech_frames >= self.min_speech_frames:
                self.is_speaking = True
            return True

        if self.silence_frames > self.max_silence_frames:
            self.is_speaking = False
            self.speech_frames = 0
            return False

        return self.is_speaking
