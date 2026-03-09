import { useEffect } from 'react';

function AudioRecorder({ isListening, onStart, onStop, disabled }) {
  // Cleanup recognition if component unmounts while listening
  useEffect(() => {
    return () => { if (isListening) onStop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isListening) {
    return (
      <div className="audio-recorder recording-active">
        <div className="recording-indicator">
          <div className="recording-dot"></div>
          <span className="recording-live-text">Listening...</span>
        </div>
        <button
          type="button"
          className="recording-btn stop-btn"
          onClick={onStop}
          title="Done speaking"
        >
          ⏹
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="mic-btn"
      onClick={onStart}
      disabled={disabled}
      title="Click to speak"
    >
      🎤
    </button>
  );
}

export default AudioRecorder;
