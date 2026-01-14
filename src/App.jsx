import AppRoutes from './router/AppRoutes'
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Play, Loader2, Sparkles, Volume2 } from 'lucide-react';
import axios from 'axios';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Fetch available voices on component mount
  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      const response = await axios.get('https://meditation-app-backend-6o1d.onrender.com/api/get-voices');
      console.log('Backend Response:', response.data);
      
      // Backend se voices array extract karna
      if (response.data.success && response.data.voices) {
        setAvailableVoices(response.data.voices);
      } else {
        setAvailableVoices([]);
      }
    } catch (err) {
      console.error('Error fetching voices:', err.response?.data || err.message);
    }
  };

  // Recording toggle
  const toggleRecording = async () => {
    if (!isRecording) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const newRecording = {
          id: Date.now(),
          url: audioUrl,
          blob: audioBlob,
          timestamp: new Date().toLocaleString()
        };
        setRecordings(prev => [...prev, newRecording]);

        if (!selectedVoice) {
          setSelectedVoice(newRecording.id);
        }

        // Backend upload to /clone endpoint
        const file = new File([audioBlob], `voice-${Date.now()}.wav`, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('voice_sample', file);
        formData.append('name', file.name);

        axios.post('https://meditation-app-backend-6o1d.onrender.com/api/clone', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
          .then(res => {
            console.log('Voice uploaded successfully:', res.data);
            // Assuming /clone response has { success: true, voice: { _id, ... } }
            if (res.data.success && res.data.voice && res.data.voice._id) {
              setSelectedVoice(res.data.voice._id);
            }
            // Refresh the voices list after successful upload
            fetchVoices();
          })
          .catch(err => {
            console.error('Upload error:', err.response?.data || err.message);
          });

        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } else {
      mediaRecorderRef.current.stop();
    }
  };

  const deleteRecording = (id) => {
    setRecordings(prev => prev.filter(rec => rec.id !== id));
    if (selectedVoice === id) {
      setSelectedVoice(recordings.find(r => r.id !== id)?.id || null);
    }
  };

  const convertTextToSpeech = async () => {
    if (!textInput.trim()) return;
    setLoading(true);

    // console.log('selectedVoice', selectedVoice);
    // // console.log('selectedVoice', selectedVoice);
    // return
    

    const voiceId = selectedVoice || recordings[0]?.id || 'default-voice';
    
    try {
      const response = await fetch('https://meditation-app-backend-6o1d.onrender.com/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput, voiceId: voiceId })
      });
      
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const newAudio = new Audio(audioUrl);
      await newAudio.play();
      setTextInput('');
    } catch (err) {
      console.error('TTS error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <Volume2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Voice Studio
              </h1>
            </div>
            <p className="text-gray-600 text-lg">Record your voice and transform text into speech</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl mb-8 border border-white/50">
            <div className="flex items-center gap-3 mb-6">
              <Mic className="w-6 h-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-800">Record Your Voice</h2>
            </div>

            <button
              onClick={toggleRecording}
              className={`w-full py-6 px-6 rounded-2xl font-semibold text-lg shadow-lg transform transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${isRecording
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white animate-pulse'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white'
                }`}
            >
              <div className="flex items-center justify-center gap-3">
                {isRecording ? (
                  <>
                    <Square className="w-6 h-6" />
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-6 h-6" />
                    <span>Start Recording</span>
                  </>
                )}
              </div>
            </button>

            {isRecording && (
              <div className="mt-6 flex items-center justify-center gap-2 text-red-500">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Recording in progress...</span>
              </div>
            )}
          </div>

  

          {/* Available Voices Section - Updated to match backend response structure */}
          {availableVoices.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl mb-8 border border-white/50">
              <div className="flex items-center gap-3 mb-6">
                <Volume2 className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold text-gray-800">Available Voices</h2>
                <span className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  {availableVoices.length}
                </span>
              </div>

              <div className="space-y-4">
                {availableVoices.map((voice, index) => (
                  <div
                    key={voice._id || index}
                    className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <h3 className="text-lg font-bold text-gray-800">{voice.name}</h3>
                        </div>
                        <p className="text-xs text-gray-600 font-mono bg-white/50 px-2 py-1 rounded inline-block">
                          ID: {voice._id}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedVoice(voice.voiceId)}
                        className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                          selectedVoice === voice.voiceId
                            ? 'bg-green-600 text-white shadow-md'
                            : 'bg-white text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {selectedVoice === voice.voiceId ? 'Selected' : 'Select'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-white/70 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Category</p>
                        <p className="text-sm font-semibold text-gray-800">Custom</p>
                      </div>
                      <div className="bg-white/70 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Duration</p>
                        <p className="text-sm font-semibold text-gray-800">
                          {voice.duration 
                            ? `${Math.round(voice.duration)}s` 
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {voice.voiceLink && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-2">Preview Audio:</p>
                        <audio
                          controls
                          className="w-full h-10"
                          src={voice.voiceLink}
                        />
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-xs text-gray-500">
                        Created: {new Date(voice.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Text to Speech Section */}
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-white/50">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-6 h-6 text-pink-600" />
              <h2 className="text-2xl font-bold text-gray-800">Text to Speech</h2>
            </div>

            <div className="relative">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type your text here and we'll bring it to life with your voice..."
                className="w-full p-5 border-2 border-gray-200 rounded-2xl mb-4 resize-none h-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-gray-700 placeholder-gray-400"
              />
              <div className="absolute bottom-8 right-6 text-sm text-gray-400">
                {textInput.length} characters
              </div>
            </div>

            <button
              onClick={convertTextToSpeech}
              className={`w-full py-5 px-6 rounded-2xl font-semibold text-lg shadow-lg transform transition-all duration-300 ${loading || !textInput.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white hover:scale-[1.02] active:scale-[0.98]'
                }`}
            >
              <div className="flex items-center justify-center gap-3">
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Converting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    <span>Convert & Play</span>
                  </>
                )}
              </div>
            </button>

            {!recordings.length && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <span className="text-lg">⚠️</span>
                  <span>Record a voice sample first to enable text-to-speech conversion</span>
                </p>
              </div>
            )}

            {recordings.length > 0 && selectedVoice && (
              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                <p className="text-sm text-indigo-800 flex items-center gap-2">
                  <span className="text-lg">ℹ️</span>
                  <span>Using selected voice for conversion</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <AppRoutes />
    </>
  );
}

export default App;