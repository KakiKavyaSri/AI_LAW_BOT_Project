# Install FFmpeg on Windows

## Quick Install (Recommended)

### Option 1: Using Chocolatey (Easiest)
1. Open PowerShell as Administrator
2. Install Chocolatey (if not installed):
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```
3. Install FFmpeg:
   ```powershell
   choco install ffmpeg
   ```
4. Restart your terminal and backend server

### Option 2: Manual Install
1. Download FFmpeg: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
2. Extract to: `C:\ffmpeg`
3. Add to PATH:
   - Open "Environment Variables" (search in Windows)
   - Under "System variables", find "Path"
   - Click "Edit" → "New"
   - Add: `C:\ffmpeg\bin`
   - Click OK on all windows
4. Restart your terminal and backend server

### Option 3: Using Scoop
1. Install Scoop: https://scoop.sh/
2. Run:
   ```powershell
   scoop install ffmpeg
   ```

## Verify Installation

Open Command Prompt and run:
```bash
ffmpeg -version
```

You should see FFmpeg version information.

## After Installing

1. Restart your backend server:
   ```bash
   cd backend
   venv\Scripts\activate
   uvicorn app.main:app --reload --port 8000
   ```

2. Test audio recording again - it should now transcribe correctly!

## Why FFmpeg is Needed

- Browser records audio as WebM format
- Whisper works best with WAV format
- FFmpeg converts WebM → WAV for accurate transcription
- Without FFmpeg, Whisper tries to read WebM directly (poor results)
