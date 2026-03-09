# FIR-RAG — Complete Project Details

---

## Table of Contents

1. [Project Summary](#1-project-summary)
2. [What Problem It Solves](#2-what-problem-it-solves)
3. [Complete Technology Stack](#3-complete-technology-stack)
4. [All Libraries & Exact Versions](#4-all-libraries--exact-versions)
5. [What We Implemented](#5-what-we-implemented)
6. [How Everything Works — Deep Dive](#6-how-everything-works--deep-dive)
7. [Prompt Engineering](#7-prompt-engineering)
8. [Model Details & Why Each Was Chosen](#8-model-details--why-each-was-chosen)
9. [Metrics & Configuration Numbers](#9-metrics--configuration-numbers)
10. [Database — Tables, Columns, Indexes](#10-database--tables-columns-indexes)
11. [API — All Endpoints with Details](#11-api--all-endpoints-with-details)
12. [Frontend — Components & Features](#12-frontend--components--features)
13. [Key Design Decisions](#13-key-design-decisions)
14. [Limitations & Known Issues](#14-limitations--known-issues)
15. [File-by-File Code Summary](#15-file-by-file-code-summary)

---

## 1. Project Summary

**FIR-RAG** is a full-stack AI-powered Indian legal assistant built as a final year project. It combines Retrieval-Augmented Generation (RAG) with a specialized Indian law knowledge base to:

- Answer any Indian legal question (IPC, BNS, CrPC, BNSS, Civil, Family, Cyber, IP, Employment, Constitutional, Tax, Environmental law)
- Analyze uploaded legal documents — FIRs, petitions, complaints, legal notices
- Transcribe and index audio/video files containing legal proceedings
- Support multilingual interaction in English, Hindi, Telugu, and Tamil
- Provide structured legal analysis with section numbers, case law, legal consequences, and next steps

The project was built entirely from scratch with no pre-existing legal AI platform. All RAG logic, document processing, chunking, vector storage, transcription, and translation pipelines were custom-implemented.

---

## 2. What Problem It Solves

**Problem:** Ordinary citizens in India have very limited access to legal knowledge. Hiring a lawyer for basic legal queries is expensive. Legal documents (FIRs, court orders, notices) are written in complex language and reference IPC/CrPC section numbers that most people cannot interpret.

**Additionally:** India transitioned from the Indian Penal Code (IPC, 1860) to Bharatiya Nyaya Sanhita (BNS, 2023) effective July 1, 2024. Practitioners and citizens now need both old and new section references simultaneously.

**Solution:** An AI assistant that:
1. Explains any legal concept in plain language
2. Accepts any format of legal document (PDF, audio recording, video) and answers questions about it
3. Maps IPC sections to their BNS equivalents automatically
4. Works in multiple Indian languages
5. Suggests relevant case laws and recommended next steps

---

## 3. Complete Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Frontend** | React | 18.2.0 |
| **Frontend build** | react-scripts (Create React App) | 5.0.1 |
| **Backend framework** | FastAPI | 0.115.0 |
| **ASGI server** | Uvicorn | 0.31.0 |
| **LLM** | Llama 3.3 70B Versatile | via Groq API |
| **LLM provider** | Groq (LPU inference) | — |
| **RAG framework** | LangChain | 0.3.7 |
| **Embedding model** | all-mpnet-base-v2 | via sentence-transformers 3.3.1 |
| **Vector database** | FAISS (local, CPU) | faiss-cpu |
| **Speech-to-text** | faster-whisper (tiny, int8) | latest |
| **PDF parsing** | PyPDF2 | 3.0.1 |
| **OCR** | Tesseract + pytesseract | 0.3.13 |
| **Audio extraction** | ffmpeg + pydub | 0.25.1 |
| **Database** | SQLite 3 | built-in Python |
| **Language** | Python | 3.10+ |
| **OS (development)** | Windows 11 | — |

---

## 4. All Libraries & Exact Versions

### Backend (requirements.txt)

```
# Server
fastapi==0.115.0
uvicorn[standard]==0.31.0
python-multipart==0.0.17

# RAG / LLM
langchain==0.3.7
langchain-groq==0.2.1
langchain-community==0.3.5
langchain-core==0.3.15
langchain-huggingface==0.1.2
langchain-text-splitters==0.3.2

# Vector store
faiss-cpu

# Embeddings / ML
transformers==4.46.3
sentence-transformers==3.3.1
torch

# PDF processing
PyPDF2==3.0.1
pytesseract==0.3.13
pdf2image==1.17.0
pillow==11.0.0

# Audio/Video
faster-whisper
pydub==0.25.1
ffmpeg-python==0.2.0

# Utilities
python-dotenv==1.0.1
numpy==1.26.4

# Database: sqlite3 (built into Python)
```

### Frontend (package.json)

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-scripts": "5.0.1",
  "@csstools/normalize.css": "^12.1.1",
  "sanitize.css": "^13.0.0"
}
```

No additional UI libraries (Tailwind, Material UI, etc.) — all styling is custom CSS.

---

## 5. What We Implemented

### 5.1 RAG Pipeline
- Custom RAG orchestration in `chat_service.py`
- Translate query → Rewrite query → FAISS search → Augment prompt → LLM → Parse → Translate back
- Session-scoped multi-document retrieval across all uploaded documents in a session
- Chat history injection (last 6 messages) for multi-turn conversations
- Response splitting on `---SIMILAR_CASES---` marker to separate main response from case law

### 5.2 Document Processing
- PDF text extraction with PyPDF2
- OCR fallback using Tesseract for scanned/image-based PDFs
- Legal-aware chunking: pattern-based splitting on legal section markers before character-based splitting
- Two-stage chunking: pattern stage (800-char buffer) → RecursiveCharacterTextSplitter (900 chars, 200 overlap)
- Regex entity extraction: IPC sections, CrPC sections, BNS sections, case references, dates

### 5.3 Vector Store
- Local FAISS index per document (key: `session_id_document_id`)
- LangChain `FAISS.from_documents()` with HuggingFace embeddings
- Disk persistence: `faiss_indexes/{session_id_document_id}/` directory
- Multi-document query: merges results across all session indexes, sorts by L2 score, returns top-k

### 5.4 Speech-to-Text
- faster-whisper tiny model, int8 quantized, CPU inference
- Auto language detection (99 languages)
- Video → audio extraction via ffmpeg subprocess (primary) or pydub (fallback)
- Transcription config: `beam_size=5`, `no_speech_threshold=0.3`, `log_prob_threshold=-1.0`, `condition_on_previous_text=False`
- Live voice input via browser MediaRecorder API → `.webm` blob → backend transcription
- Language hint pass-through: user's selected language sent to Whisper for better accuracy

### 5.5 Translation
- Groq LLM (llama-3.3-70b, temperature=0.3) used for all translation
- 4 supported languages: English (en), Hindi (hi), Telugu (te), Tamil (ta)
- Flow: detect language → translate query to English → process → translate response back
- Chat history stored in English in DB, translated on the fly when displaying

### 5.6 Structured Legal Analysis
- `legal_section_predictor.py` uses LLM (temperature=0.2) with a structured JSON output prompt
- Output fields: document_type, case_summary, key_parties, applicable_sections (IPC + BNS), applicable_crpc_sections, offense_details (cognizable, bailable, compoundable), legal_consequences, similar_cases, recommended_next_steps, important_notes
- JSON parsing with fallback for malformed outputs
- IPC→BNS format conversion for legacy output handling

### 5.7 Entity Extraction
- Regex-based extraction from document text
- Extracts: IPC section numbers, CrPC section numbers, BNS section numbers, case references (v., AIR, SCC), dates (multiple formats)

### 5.8 Authentication
- JWT-less session token system: 32-byte `secrets.token_hex()`
- In-memory `active_sessions` dict with 7-day expiry
- SHA256 password hashing
- FastAPI middleware validates `Authorization: Bearer <token>` on every protected endpoint
- Public paths (no auth required): `/api/register`, `/api/login`, `/api/health`, `/docs`, `/openapi.json`

### 5.9 Multi-Session Chat Management
- Each user can have unlimited sessions
- Sessions persisted in SQLite; FAISS indexes persisted on disk
- Frontend sidebar shows all sessions with previews (first 60 chars of first message)
- Session can be deleted (removes DB records + FAISS index files)
- Auto-creation of new session on login via `needs_new_session` localStorage flag

### 5.10 Frontend Features
- **Chat UI:** Message list with user/AI bubbles, markdown-style formatting, typing indicator
- **Similar cases toggle:** Each AI response has a collapsible "Similar Cases" section
- **Document manager:** Grid view, multi-select, search, delete, bulk analyze
- **Voice recording:** Start/pause/stop/cancel with live timer and visual indicator
- **Language selector:** Switches UI language for voice + translation
- **Toast notifications:** Success, error, info banners (auto-dismiss 4 seconds)
- **Sidebar:** Collapsible on desktop (width animation), overlay on mobile (transform slide)
- **Session history:** Sidebar list of all sessions with timestamps, click to switch
- **Upload menu:** Attach button opens menu with PDF upload vs Audio/Video upload options
- **Legal Analysis view:** Modal with structured JSON rendered as sections, tags, entity lists

---

## 6. How Everything Works — Deep Dive

### 6.1 Chat Query Pipeline (8 steps)

```
1. User sends message (POST /api/chat)
   Body: { session_id, message, language }

2. Backend fetches last 6 messages from chat_messages table
   SELECT role, content FROM chat_messages
   WHERE session_id = ? ORDER BY timestamp DESC LIMIT 6

3. If language != "en":
   - LLM detects language (prompt: "respond with only en/hi/te/ta")
   - LLM translates to English (temp=0.3)

4. LLM rewrites query to fix typos/ambiguity
   Prompt: "Fix spelling errors and rephrase clearly.
            Return ONLY the corrected query, nothing else."
   - If rewritten != original → use rewritten for FAISS search
   - User always sees original query in UI

5. FAISS retrieval:
   - Embed rewritten query with all-mpnet-base-v2 → 768-dim vector
   - Search all session document indexes (lazy-load from disk if needed)
   - Merge results, sort by L2 score ascending, return top 5
   - Each result: { text: chunk_text, metadata: {...}, score: float }

6. LLM generates response:
   - Prompt: Legal Context + Chat History + User Question + Guidelines
   - Output: Full legal explanation + "---SIMILAR_CASES---" + case law section

7. Split on "---SIMILAR_CASES---":
   - main_content = everything before marker
   - similar_cases = everything after marker (null if no marker)

8. If language != "en":
   - Translate main_content to user language (temp=0.3)
   - Translate similar_cases to user language

9. Save both messages to SQLite chat_messages

10. Return: { response, similar_cases, language, retrieved_chunks }
```

### 6.2 PDF Upload Pipeline (6 steps)

```
1. POST /api/upload-document (multipart form)
   - document_id = UUID generated by backend
   - File bytes read into memory

2. PyPDF2 extracts text page by page
   - If page.extract_text() returns empty:
     → Convert page to image (pdf2image, 300 DPI)
     → Tesseract OCR → text
     → metadata["ocr"] = True

3. Legal-aware chunking on extracted text:
   Stage A: Accumulate lines in buffer (max 800 chars)
            Force split when buffer > 800 AND current line
            contains no legal section pattern
            Patterns: Section\s+\d+, IPC\s+\d+, CrPC\s+\d+, BNS\s+\d+
            Case refs: v., vs., versus, AIR\s+\d+, SCC\s+\d+
   Stage B: RecursiveCharacterTextSplitter
            chunk_size=900, chunk_overlap=200
            separators=["\n\n", "\n", ". ", " ", ""]

4. HuggingFace embeddings (all-mpnet-base-v2) embeds all chunks → 768-dim vectors

5. FAISS.from_documents() creates index
   Key: {session_id}_{document_id}
   Saved to: faiss_indexes/{key}/index.faiss + index.pkl

6. INSERT INTO session_documents (session_id, document_id, document_name, document_type="pdf")
```

### 6.3 Audio/Video Pipeline (4 steps)

```
1. POST /api/upload-audio-video (multipart form)
   - Saved to OS temp dir with original extension

2. If video file:
   ffmpeg subprocess:
     ffmpeg -i {input} -vn -acodec pcm_s16le -ar 16000 -ac 1 -y {output.wav}
   Fallback if ffmpeg not found:
     pydub.AudioSegment.from_file() → .export(format="wav")

3. faster-whisper transcription:
   model.transcribe(audio_path, beam_size=5, no_speech_threshold=0.3,
                    log_prob_threshold=-1.0, condition_on_previous_text=False)
   Returns: generator of segments, TranscriptionInfo
   Full text = " ".join([seg.text for seg in segments])
   Language from: info.language (e.g. "en"), info.language_probability

4. Chunk transcript with legal_aware_chunking()
   → Embed → FAISS index (same as PDF pipeline from step 4)
   → Transcription text shown to user in chat as assistant message
   → INSERT INTO session_documents (document_type="audio"/"video")
```

### 6.4 Structured Analysis Pipeline

```
POST /api/analyze-document { session_id, document_ids }

1. FAISS query with: "legal sections, case details, charges, offense"
   top_k=10 (higher than chat to get broader document coverage)

2. Combine top 10 chunks into context string

3. LegalSectionPredictor.predict_sections(context, context)
   Prompt sends context to LLM (temp=0.2) requesting strict JSON output

4. JSON parsed with json.loads()
   Fallback dict returned if JSON malformed

5. Response includes 10 fields:
   document_type, case_summary, key_parties,
   applicable_sections, applicable_crpc_sections,
   offense_details, legal_consequences, case_number,
   similar_cases, recommended_next_steps, important_notes
```

---

## 7. Prompt Engineering

### 7.1 Main Chat Prompt (chat_service.py)

Structured as a PromptTemplate with 3 input variables:

```
{context}   — top-5 FAISS chunks (empty string if no doc)
{history}   — last 6 messages, each truncated to 600 chars
{question}  — user's original English query
```

**Guidelines enforced in prompt:**

| # | Guideline | Purpose |
|---|-----------|---------|
| 0 | Document context check | If user asks to "summarize/analyze" a doc but context is empty → refuse with clear message |
| 1 | Legal topics list | Lists all valid Indian law domains; rejects only clearly non-legal questions |
| 2 | Information source | Use retrieved context if available; otherwise use trained knowledge |
| 3 | IPC → BNS mapping | Always cite both section numbers (e.g. "Section 420 IPC (now Section 318 BNS)") |
| 4 | Similar cases | 2–3 landmark cases placed after `---SIMILAR_CASES---` marker |
| 5 | Formatting | 🔹 for headings, bullet •, **bold** for terms, double newline after headings |
| 6 | Content depth | Comprehensive: sections, procedures, timelines, jurisdiction, bail status |

**Temperature:** 0.6 — allows natural language while staying legally grounded

### 7.2 Query Rewriting Prompt

```
"Fix any spelling errors and rephrase this legal query to be clearer.
 Return ONLY the corrected query text, nothing else.
 If the query is already clear and correct, return it unchanged."
```

### 7.3 Structured Analysis Prompt (legal_section_predictor.py)

Requests strict JSON with 10+ fields. Key instructions:
- Extract EXACT section numbers from document if mentioned
- Infer sections if not explicitly stated based on offense type
- Always map IPC → BNS (302→103, 420→318, 376→63-70, etc.)
- Return ONLY valid JSON — no markdown, no code blocks

Input truncated to: document_text[:3000], context[:2000]

**Temperature:** 0.2 — factual, deterministic, reproducible

### 7.4 Translation Prompts

**To English:**
```
"Translate the following {source_language} text to English.
 Maintain the original meaning and context."
```

**From English:**
```
"Translate the following English text to {target_language}.
 Maintain the original meaning, tone, and formatting
 (including bullet points, headings, etc.)."
```

**Temperature:** 0.3 — accurate, consistent

### 7.5 Language Detection Prompt

```
"Detect the language of the following text and respond with ONLY the language code.
 Supported: en, hi, te, ta
 Respond with ONLY the two-letter code."
```

Input truncated to first 500 characters.

### 7.6 Section Explanation Prompt

```
"Explain {section_type} Section {section_number} in simple, easy-to-understand language.
 Include: what it covers, punishment, when applied, example scenario.
 Keep under 150 words."
```

---

## 8. Model Details & Why Each Was Chosen

### 8.1 LLM — Meta Llama 3.3 70B Versatile (Groq)

| Property | Value |
|----------|-------|
| Model ID | `llama-3.3-70b-versatile` |
| API | Groq Cloud |
| Parameters | 70 billion |
| Context window | 128,000 tokens |
| Output speed | ~300–400 tokens/second |
| Chat temperature | 0.6 |
| Translation temperature | 0.3 |
| Analysis temperature | 0.2 |
| Cost | Per-token (Groq pricing, free tier available) |

**Chosen over GPT-4 / Claude because:**
- Groq LPU delivers 5–10x lower latency — critical for real-time chat
- Open weights (Meta) — no long-term vendor lock-in
- Comparable quality to GPT-4o on reasoning benchmarks
- Natively multilingual (Hindi, Telugu, Tamil) without fine-tuning
- Lower cost per million tokens compared to OpenAI/Anthropic

### 8.2 Embedding Model — all-mpnet-base-v2

| Property | Value |
|----------|-------|
| Architecture | MPNet (Masked + Permuted Pre-training) |
| Dimensions | 768 |
| Max tokens | 514 |
| Training data | 1B+ sentence pairs |
| Size on disk | ~420 MB |
| Inference device | CPU |
| Inference speed | ~10ms per batch |
| License | Apache 2.0 |

**Chosen over alternatives because:**
- #1 ranked on SBERT semantic similarity benchmarks at time of implementation
- 768 dims: sufficient expressiveness without excessive memory
- Local inference: no API cost, no latency for embeddings
- MPNet's masked+permuted training captures bidirectional context better than BERT
- `sentence-transformers` library provides clean Python API

**Alternatives considered:**
- `text-embedding-ada-002` (OpenAI) — API cost per call, data leaves server
- `all-MiniLM-L6-v2` — faster but 384 dims, lower accuracy
- `paraphrase-multilingual-mpnet-base-v2` — multilingual but lower English accuracy

### 8.3 Speech-to-Text — faster-whisper (tiny, int8)

| Property | Value |
|----------|-------|
| Base model | OpenAI Whisper |
| Backend | CTranslate2 (faster-whisper) |
| Model size | tiny (39M parameters) |
| Disk size | ~75 MB (int8 quantized) |
| Device | CPU |
| Quantization | int8 (4x memory vs float32) |
| Languages | 99 |
| beam_size | 5 |
| no_speech_threshold | 0.3 |
| Speed vs original Whisper | ~4x faster |

**Chosen over alternatives because:**
- No GPU required — runs on standard server hardware
- Offline — audio never leaves the machine (privacy for legal recordings)
- No API cost (vs Google STT, Azure Speech, Deepgram)
- 99-language auto-detection works well for Indian languages
- int8 quantization keeps memory footprint tiny

**Why tiny and not base/small?**
Voice input queries and legal audio are typically clear speech. The tiny model handles clear audio with >90% accuracy and is 4x faster. The base model adds ~150MB and minimal accuracy gain for this use case.

### 8.4 Vector Database — FAISS (faiss-cpu)

| Property | Value |
|----------|-------|
| Provider | Meta (Facebook AI Research) |
| Index type | Flat (exact L2) |
| Similarity metric | L2 (Euclidean distance) |
| Max vectors | Unlimited (disk-backed) |
| Query method | `similarity_search_with_score()` |
| Persistence | LangChain `save_local()` / `load_local()` |
| GPU required | No |

**Chosen over alternatives because:**
- Entirely local — no cloud dependency, no data egress cost
- Flat exact index: no approximation errors — every relevant chunk is guaranteed to be considered
- LangChain integration via `FAISS.from_documents()` and `load_local()`
- Session-scoped isolation with `{session_id}_{document_id}` key format
- No separate server or process to manage (vs Chroma, Weaviate)

---

## 9. Metrics & Configuration Numbers

### 9.1 Chunking Parameters

| Parameter | Value | Why This Value |
|-----------|-------|----------------|
| Pattern-based buffer max | 800 chars | Fits 1-2 legal sentences before forcing a split |
| `chunk_size` | 900 characters | Covers 2-3 complete legal sentences |
| `chunk_overlap` | 200 characters | ~22% overlap; ensures boundary context is not lost |
| Splitter separators | `["\n\n", "\n", ". ", " ", ""]` | Prefers paragraph then sentence then word breaks |

### 9.2 FAISS Retrieval

| Parameter | Value | Why |
|-----------|-------|-----|
| `top_k` (chat) | 5 | Enough context without overloading the prompt |
| `top_k` (analysis) | 10 | Broader document coverage for structured analysis |
| Sort order | Ascending L2 score | Lower L2 = more similar = better match |

### 9.3 LLM Context Limits

| Parameter | Value | Why |
|-----------|-------|-----|
| Chat history messages | 6 (last 3 exchanges) | Enough for follow-up questions; avoids bloating prompt |
| History message truncation | 600 chars each | Prevents very long assistant responses from dominating context |
| Analysis document input | 3,000 chars | Fits within Groq rate limits while covering key content |
| Analysis retrieved context | 2,000 chars | Supplementary context; document input is primary |
| Language detection input | 500 chars | First 500 chars are sufficient for language detection |

### 9.4 Session & Auth

| Parameter | Value |
|-----------|-------|
| Session token length | 32 bytes (64 hex chars) |
| Session expiry | 7 days |
| Password hashing | SHA256 (no salt — known limitation) |
| Token storage | In-memory Python dict (lost on restart) |

### 9.5 Whisper Configuration

| Parameter | Value | Effect |
|-----------|-------|--------|
| `beam_size` | 5 | Beam search width; higher = more accurate, slower |
| `no_speech_threshold` | 0.3 | Probability below which segment is considered silence |
| `log_prob_threshold` | -1.0 | Minimum log probability; filters very uncertain segments |
| `condition_on_previous_text` | False | Each segment decoded independently; prevents error propagation |
| `device` | cpu | No GPU needed |
| `compute_type` | int8 | 4x memory reduction vs float32 |

### 9.6 Response Timing (Approximate)

| Operation | Approx. Time |
|-----------|-------------|
| Query rewrite (LLM) | 0.5–1.5 seconds |
| FAISS embedding + search | 50–200ms |
| LLM response generation | 2–6 seconds (Groq) |
| Translation (if needed) | 1–3 seconds |
| PDF processing (10 pages) | 2–5 seconds |
| Audio transcription (1 min audio) | 3–8 seconds (CPU) |
| Video audio extraction | 2–5 seconds (ffmpeg) |

### 9.7 Supported File Sizes & Formats

| Type | Formats | Notes |
|------|---------|-------|
| PDF | .pdf | Both digital and scanned (OCR fallback) |
| Audio | .mp3, .wav, .m4a, .flac, .ogg, .webm | Converted to WAV internally before Whisper |
| Video | .mp4, .avi, .mov, .mkv, .webm | Audio extracted first via ffmpeg |
| Voice (browser) | .webm (MediaRecorder) | Transcribed live, result placed in input box |

### 9.8 Language Coverage

| Language | Code | Voice | Chat | Translation |
|----------|------|-------|------|-------------|
| English | en | Yes (Whisper) | Yes (native) | Native — no translation |
| Hindi | hi | Yes (auto-detect) | Yes (LLM) | Yes (Groq LLM) |
| Telugu | te | Yes (auto-detect) | Yes (LLM) | Yes (Groq LLM) |
| Tamil | ta | Yes (auto-detect) | Yes (LLM) | Yes (Groq LLM) |

---

## 10. Database — Tables, Columns, Indexes

SQLite database file: `backend/fir.db`

### Table: users

```sql
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,              -- SHA256 hex digest
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Table: chat_sessions

```sql
CREATE TABLE chat_sessions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT UNIQUE NOT NULL,       -- UUID string
    user_id       INTEGER,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Table: chat_messages

```sql
CREATE TABLE chat_messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role       TEXT NOT NULL,                -- "user" or "assistant"
    content    TEXT NOT NULL,               -- always stored in English
    user_role  TEXT NOT NULL,               -- language code (en/hi/te/ta)
    pdf_name   TEXT,                        -- name of uploaded doc if relevant
    timestamp  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
);

CREATE INDEX idx_session_id ON chat_messages(session_id);
CREATE INDEX idx_timestamp  ON chat_messages(timestamp);
```

### Table: session_documents

```sql
CREATE TABLE session_documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id    TEXT NOT NULL,
    document_id   TEXT UNIQUE NOT NULL,     -- UUID (= FAISS index key suffix)
    document_name TEXT NOT NULL,            -- original filename
    document_type TEXT NOT NULL,            -- "pdf", "audio", or "video"
    uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id)
);

CREATE INDEX idx_doc_session ON session_documents(session_id);
```

### Sessions query used for sidebar preview

```sql
SELECT
    cs.session_id,
    cs.created_at,
    cs.last_activity,
    COUNT(cm.id) as message_count,
    COALESCE(
        SUBSTR(MIN(CASE WHEN cm.role = 'user' THEN cm.content END), 1, 60),
        'New conversation'
    ) as preview
FROM chat_sessions cs
LEFT JOIN chat_messages cm ON cs.session_id = cm.session_id
WHERE cs.user_id = ?
GROUP BY cs.session_id
ORDER BY cs.last_activity DESC
```

---

## 11. API — All Endpoints with Details

Base URL: `http://localhost:8000/api`

### Authentication Endpoints (public — no token required)

| Method | Path | Request Body | Response |
|--------|------|-------------|---------|
| POST | `/register` | `{username, email, password}` | `{message, session_token, username}` |
| POST | `/login` | `{username, password}` | `{message, session_token, username}` |
| POST | `/logout` | `{session_token}` + `Authorization: Bearer` header | `{message}` |
| GET | `/verify-session` | — | `{valid, username}` |
| GET | `/health` | — | `{status: "ok"}` |

### Chat Endpoints (auth required)

| Method | Path | Request | Response |
|--------|------|---------|---------|
| POST | `/chat` | `{session_id, message, language, structured_output?}` | `{response, similar_cases, language, retrieved_chunks}` |
| GET | `/history/{session_id}` | — | `{messages: [{role, content, timestamp}]}` |

### Session Endpoints (auth required)

| Method | Path | Response |
|--------|------|---------|
| GET | `/sessions` | `{sessions: [{session_id, created_at, last_activity, message_count, preview}]}` |
| POST | `/sessions/new` | `{session_id}` |
| DELETE | `/sessions/{session_id}` | `{message}` |

### Document Endpoints (auth required)

| Method | Path | Request | Response |
|--------|------|---------|---------|
| POST | `/upload-document` | multipart: `file`, `session_id` | `{doc_name, chunks_created, document_id}` |
| POST | `/upload-audio-video` | multipart: `file`, `session_id` | `{doc_name, transcription, language, file_type, document_id}` |
| GET | `/documents/{session_id}` | optional `?doc_search=...` | `{documents: [{document_id, document_name, document_type, uploaded_at}]}` |
| DELETE | `/documents/{session_id}/{document_id}` | — | `{message}` |

### Analysis Endpoints (auth required)

| Method | Path | Request | Response |
|--------|------|---------|---------|
| POST | `/analyze-document` | `{session_id, document_ids: []}` | structured JSON (10 fields) |
| POST | `/extract-entities` | `{session_id, document_ids: []}` | `{entities: {ipc_sections, crpc_sections, bns_sections, case_references, dates, ...}}` |
| POST | `/transcribe-audio` | multipart: `file` + `?language=` | `{text, language}` |
| POST | `/translate` | `{text, target_language}` | `{translated_text}` |

---

## 12. Frontend — Components & Features

### Component Tree

```
App.jsx
  ├── Login.jsx           (shown when not authenticated)
  ├── Register.jsx        (shown when not authenticated)
  └── ChatInterface.jsx   (shown when authenticated)
       ├── [sidebar-overlay div]   (mobile backdrop)
       ├── [sidebar]
       │    ├── sidebar-header (logo, new chat button)
       │    ├── sidebar-content
       │    │    ├── sessions-list (chat history)
       │    │    ├── LanguageSelector.jsx
       │    │    └── Documents section (count, show/hide)
       │    └── sidebar-footer (username, logout)
       └── [chat-container]
            ├── [chat-header] (toggle btn, title, view btn)
            ├── [upload-loading-banner] (conditional)
            ├── [messages-container]
            │    ├── [empty-state] (when no messages)
            │    └── MessageList.jsx
            │         └── [message rows] with AudioRecorder output
            └── [input-container]
                 └── MessageInput.jsx
                      ├── [upload-menu] (PDF / Audio-Video items)
                      ├── [input-form]
                      │    ├── [attach-btn]
                      │    ├── [message-input textarea]
                      │    ├── AudioRecorder.jsx
                      │    └── [send-btn]
                      └── [hidden file inputs]

Modals (portal-style, overlaid on everything):
  ├── DocumentList.jsx     (triggered by showDocuments)
  │    ├── tabs: Documents | Entities
  │    ├── [document cards grid]
  │    └── [entity view]
  ├── LegalAnalysisView.jsx (triggered by showAnalysis)
  └── Toast.jsx            (triggered by toast state)
```

### State Managed in ChatInterface.jsx

| State | Type | Purpose |
|-------|------|---------|
| `sessionId` | string | Current active chat session |
| `messages` | array | Current session's messages (may be translated) |
| `originalMessages` | array | English originals (for re-translation on language change) |
| `language` | string | Selected language code (en/hi/te/ta) |
| `sessions` | array | All sessions for sidebar |
| `documents` | array | Documents in current session |
| `selectedDocs` | array | Checked document IDs |
| `entities` | object | Extracted entities from documents |
| `loading` | bool | Chat response in progress |
| `documentLoading` | bool | Upload/processing in progress |
| `sidebarOpen` | bool | Sidebar open/closed state |
| `showDocuments` | bool | Document manager modal |
| `showAnalysis` | bool | Legal analysis modal |
| `legalAnalysis` | object | Structured analysis result |
| `toast` | object | `{message, type}` for notification |

### API Service (api.js) — All Methods

| Method | HTTP | Path |
|--------|------|------|
| `register(username, email, password)` | POST | `/register` |
| `login(username, password)` | POST | `/login` |
| `logout(session_token)` | POST | `/logout` |
| `verifySession()` | GET | `/verify-session` |
| `sendMessage(sessionId, message, language, structured)` | POST | `/chat` |
| `getChatHistory(sessionId)` | GET | `/history/{sessionId}` |
| `getAllSessions()` | GET | `/sessions` |
| `createNewSession()` | POST | `/sessions/new` |
| `deleteSession(sessionId)` | DELETE | `/sessions/{sessionId}` |
| `uploadDocument(file, sessionId)` | POST | `/upload-document` |
| `uploadAudioVideo(file, sessionId)` | POST | `/upload-audio-video` |
| `getDocuments(sessionId, docSearch)` | GET | `/documents/{sessionId}` |
| `deleteDocument(sessionId, documentId)` | DELETE | `/documents/{sessionId}/{documentId}` |
| `analyzeDocument(sessionId, documentIds)` | POST | `/analyze-document` |
| `extractEntities(sessionId, documentIds)` | POST | `/extract-entities` |
| `transcribeAudio(file, language)` | POST | `/transcribe-audio` |
| `translateText(text, language)` | POST | `/translate` |

All methods inject `Authorization: Bearer {session_token}` header automatically from localStorage.

---

## 13. Key Design Decisions

### Decision 1: Local FAISS instead of cloud vector DB
**Rationale:** Legal documents may contain sensitive personal information. Storing embeddings locally means no data leaves the user's machine. Also eliminates ongoing API costs and network latency.

### Decision 2: Groq for LLM instead of self-hosting
**Rationale:** Running a 70B parameter model locally would require 2× A100 GPUs. Groq provides GPU-equivalent quality at LPU speed (300-400 tok/s) for a fraction of the cost. For a student project, this is the best quality/cost tradeoff.

### Decision 3: Two-stage chunking (pattern → character)
**Rationale:** Legal documents have section structures that standard character splitters destroy. The pattern stage preserves legal clause integrity; the character stage provides a hard cap. Both together produce better retrieval than either alone.

### Decision 4: Query rewriting before FAISS search
**Rationale:** Indian users frequently type queries with English-Indic code-switching, abbreviations, and typos. A clean query produces a better embedding which finds better chunks. The user still sees their original query — only the search step uses the rewritten version.

### Decision 5: Chat history injection (last 6 messages)
**Rationale:** Without history, every message is treated as independent. Legal consultations involve follow-up questions ("what about bail?", "explain that section again"). 6 messages = 3 exchanges — enough for context, short enough to not bloat the prompt.

### Decision 6: IPC + BNS always together
**Rationale:** India is in a transition period. Cases filed pre-July 2024 use IPC; cases filed after use BNS. A legal assistant that only gives one set of section numbers is incomplete. All prompts mandate both.

### Decision 7: Session-scoped document isolation
**Rationale:** A user may upload different FIRs in different sessions. Cross-contamination between sessions would produce incorrect retrieval. The `{session_id}_{document_id}` FAISS key ensures complete isolation.

### Decision 8: Lazy model loading
**Rationale:** The embedding model (~420MB) and Whisper (~75MB) should not be loaded on every server start, especially since some users may never use those features. Lazy loading keeps startup fast and memory lean.

### Decision 9: Separate similar cases section
**Rationale:** Case law references are useful but long. Collapsing them under a toggle button keeps the primary legal answer readable while still making case law accessible.

### Decision 10: Translation always happens server-side
**Rationale:** Keeps frontend simple — it just renders whatever text the backend returns. All translation logic is centralized in `translation_service.py`. The frontend only needs to pass the `language` parameter.

---

## 14. Limitations & Known Issues

### Security
- **No password salting:** SHA256 is used without a salt. If the database were compromised, dictionary attacks would work. Should use `bcrypt` or `argon2` in production.
- **In-memory sessions:** Sessions are stored in a Python dict. Backend restart invalidates all sessions — users get logged out. Should persist to Redis or SQLite.
- **No rate limiting:** The chat endpoint can be spammed. Each request makes 2–3 Groq API calls (rewrite + generate + maybe translate). Should add rate limiting middleware.

### Functional
- **Whisper tiny accuracy:** For heavy-accented or noisy audio, the tiny model may produce errors. The base or small model would be more accurate at the cost of speed and memory.
- **Large PDF handling:** Very large PDFs (100+ pages) may take 30–60 seconds to process. No progress indication is shown during upload beyond a generic "Processing..." banner.
- **FAISS exact search at scale:** With thousands of documents, exact flat search becomes slow. FAISS IVF or HNSW index would be needed at scale.
- **No document text edit:** If OCR produces garbled text from a poor scan, there is no way to correct it in the UI.
- **Session token lost on restart:** All active sessions are in-memory. Backend restart = all users logged out.

### Language
- **Telugu / Tamil quality:** LLM translation quality for Telugu and Tamil is lower than Hindi. Llama 3.3 70B is primarily trained on English and Hindi. Telugu/Tamil translations may have grammatical inconsistencies.
- **Mixed language input:** If a user types half in Hindi and half in English (code-switching), language detection may classify it as English and skip translation.

---

## 15. File-by-File Code Summary

### Backend

| File | Lines | What It Does |
|------|-------|-------------|
| `app/main.py` | ~80 | FastAPI app init, SQLite DB creation, CORS config, middleware registration |
| `app/api/routes.py` | ~400 | All API endpoint handlers; fetches chat history; passes params to services |
| `app/auth/auth_service.py` | ~100 | SHA256 hashing, token creation/validation, in-memory session dict |
| `app/auth/middleware.py` | ~60 | Validates `Authorization: Bearer` header on every non-public request |
| `app/services/chat_service.py` | ~366 | RAG orchestration: translate → rewrite → FAISS → LLM → parse → translate back |
| `app/services/faiss_store.py` | ~197 | FAISS index CRUD: create, query (multi-doc), delete, save/load disk |
| `app/services/document_processor.py` | ~190 | PyPDF2 extraction, Tesseract OCR, legal-aware chunking, entity regex extraction |
| `app/services/speech_to_text.py` | ~225 | faster-whisper transcription, ffmpeg/pydub audio extraction, file validation |
| `app/services/translation_service.py` | ~170 | Language detect, translate to English, translate from English (Groq LLM) |
| `app/services/legal_section_predictor.py` | ~237 | Structured JSON legal analysis, FIR analysis, section explanation |

### Frontend

| File | Lines | What It Does |
|------|-------|-------------|
| `App.jsx` | ~80 | Auth state, localStorage token, route to Login/Register/ChatInterface, logout handler |
| `App.css` | ~2000+ | All styles — sidebar, chat, messages, modals, forms, responsive breakpoints |
| `components/ChatInterface.jsx` | ~650 | Main shell: session init, all state, handlers for send/upload/analysis/language |
| `components/MessageList.jsx` | ~200 | Renders each message with formatting (bold, bullets, headings), typing indicator, similar cases toggle |
| `components/MessageInput.jsx` | ~180 | Input textarea, upload menu, audio recorder integration, file input handlers |
| `components/AudioRecorder.jsx` | ~150 | MediaRecorder API, start/pause/stop/cancel, timer, sends webm blob to API |
| `components/DocumentList.jsx` | ~300 | Grid of document cards, search, multi-select, extract entities, analyze selected |
| `components/LegalAnalysisView.jsx` | ~250 | Renders structured analysis JSON as formatted sections, entity tags, next steps list |
| `components/LanguageSelector.jsx` | ~50 | Four language buttons (en/hi/te/ta) with flag and active state |
| `components/Toast.jsx` | ~60 | Fixed-position notification with type (success/error/info), auto-dismiss 4s |
| `components/Login.jsx` | ~80 | Login form with error handling, link to register |
| `components/Register.jsx` | ~90 | Registration form with validation, link to login |
| `services/api.js` | ~280 | All fetch() calls, Authorization header injection, error handling, FormData building |

---

*This document covers the complete implementation of FIR-RAG as of February 2026.*
