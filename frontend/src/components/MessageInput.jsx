import React, { useState, useRef, useEffect } from 'react';
import AudioRecorder from './AudioRecorder';

const LANG_MAP = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN' };

function MessageInput({
  onSend,
  disabled,
  onAttachClick,
  showUploadMenu,
  onDocumentUpload,
  onAudioVideoUpload,
  onAudioInput,
  loading,
  language,
  onCloseUploadMenu,
  transcribedText,
  onTranscriptionComplete
}) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const pdfInputRef = useRef(null);
  const audioVideoInputRef = useRef(null);
  const uploadMenuRef = useRef(null);
  const recognitionRef = useRef(null);
  const inputBeforeVoiceRef = useRef('');
  const finalTranscriptRef = useRef('');

  useEffect(() => {
    if (transcribedText) setInput(transcribedText);
  }, [transcribedText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Voice input requires Chrome or Edge browser.');
      return;
    }

    // Save whatever is already typed
    inputBeforeVoiceRef.current = input;
    finalTranscriptRef.current = '';

    const recognition = new SR();
    recognition.lang = LANG_MAP[language] || 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcript + ' ';
        } else {
          interim = transcript;
        }
      }
      // Combine: text typed before mic + confirmed words + live preview
      const combined = [
        inputBeforeVoiceRef.current,
        finalTranscriptRef.current.trim(),
        interim
      ].filter(Boolean).join(' ');
      setInput(combined);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (e.error === 'network') {
        alert('Voice input needs an internet connection (Chrome uses Google servers). Please check your network.');
      } else if (e.error === 'audio-capture') {
        alert('No microphone found. Please connect a microphone and try again.');
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true); // set immediately, don't wait for onstart
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    // onend will fire and set isListening = false
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput('');
      if (onTranscriptionComplete) onTranscriptionComplete();
    }
  };

  const handlePDFChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      onDocumentUpload(file);
    } else {
      alert('Please upload a PDF file');
    }
    e.target.value = '';
  };

  const handleAudioVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validExtensions = ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.mp4', '.avi', '.mov', '.mkv', '.webm'];
      const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (validExtensions.includes(fileExt)) {
        onAudioVideoUpload(file);
      } else {
        alert('Please upload a valid audio or video file');
      }
    }
    e.target.value = '';
  };

  const placeholderText = {
    en: 'Ask a legal question...',
    hi: 'कानूनी सवाल पूछें...',
    te: 'చట్టపరమైన ప్రశ్న అడగండి...',
    ta: 'சட்ட கேள்வி கேளுங்கள்...'
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(event.target)) {
        if (!event.target.closest('.attach-btn')) onCloseUploadMenu();
      }
    };
    if (showUploadMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUploadMenu, onCloseUploadMenu]);

  return (
    <div className="input-wrapper">
      {showUploadMenu && (
        <div className="upload-menu" ref={uploadMenuRef}>
          <label className="upload-menu-item">
            <span>📄</span>
            <span>Upload PDF</span>
            <input type="file" accept=".pdf" onChange={handlePDFChange} ref={pdfInputRef} style={{ display: 'none' }} />
          </label>
          <label className="upload-menu-item">
            <span>🎥</span>
            <span>Upload Audio/Video</span>
            <input
              type="file"
              accept=".mp3,.wav,.m4a,.flac,.ogg,.mp4,.avi,.mov,.mkv,.webm"
              onChange={handleAudioVideoChange}
              ref={audioVideoInputRef}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      )}

      <form onSubmit={handleSubmit} className="input-form">
        <button type="button" className="attach-btn" onClick={onAttachClick} title="Upload document or audio/video">
          📎
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? 'Listening...' : (placeholderText[language] || placeholderText.en)}
          disabled={disabled}
          className="message-input"
        />

        <AudioRecorder
          isListening={isListening}
          onStart={startListening}
          onStop={stopListening}
          disabled={disabled || loading}
        />

        <button type="submit" disabled={disabled || !input.trim() || loading} className="send-btn">
          {loading ? <span className="loading-spinner"></span> : '↑'}
        </button>
      </form>
    </div>
  );
}

export default MessageInput;
