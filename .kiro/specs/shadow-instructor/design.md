# Design Document

## Overview

The Shadow Instructor is an AI-powered interview simulation platform that provides realistic, voice-first interview practice using Google's Gemini Multimodal Live API. The system employs a hybrid client-server-cloud architecture with a dual-agent approach: an Interviewer agent conducts the interview while an Instructor agent provides detailed feedback analysis.

The architecture prioritizes security by keeping API keys on the backend while maintaining sub-second voice latency through direct client-to-Gemini WebSocket connections. Resume processing and feedback generation occur server-side to leverage more powerful computational resources.

## Architecture

### High-Level Architecture

The system follows a **Hybrid Client-Server-Cloud** architecture:

- **Frontend (Client):** Next.js 16 application handling UI, audio capture/playback, and direct WebSocket connection to Google's Gemini API
- **Backend (Server):** FastAPI Python server managing API keys, token generation, and document processing
- **AI Core (Cloud):** Google Gemini Multimodal Live API for real-time interview streaming and Gemini Pro for feedback analysis

```mermaid
graph TD
    User[User / Browser] -- HTTPS --> NextJS[Frontend (Next.js)]
    User -- WebSocket (Audio) --> Gemini[Google Gemini Live API]
    NextJS -- HTTPS (Upload Resume) --> Backend[FastAPI Backend]
    Backend -- Auth --> GoogleAuth[Google Cloud IAM]
    Backend -- Analysis --> GeminiPro[Gemini Pro (Instructor Agent)]
    NextJS -- Fetch Token --> Backend
```

### Technology Stack

| Component               | Technology       | Version                                         |
| :---------------------- | :--------------- | :---------------------------------------------- |
| **Frontend Framework**  | Next.js          | 16.1                                            |
| **Language**            | TypeScript       | 5.x                                             |
| **Styling**             | Tailwind CSS     | 4.0                                             |
| **Backend Framework**   | FastAPI          | Latest                                          |
| **Language**            | Python           | 3.10+                                           |
| **AI Model (Live)**     | Gemini 2.5 Flash | `gemini-2.5-flash-native-audio-preview-12-2025` |
| **AI Model (Analysis)** | Gemini 3 Pro     | `gemini-3-pro-preview`                          |
| **Protocol**            | WebSocket (Bidi) | RFC 6455                                        |

## Components and Interfaces

### Backend Components (Python/FastAPI)

#### Resume Processor
- **Purpose**: Extract text content from uploaded PDF documents
- **Implementation**: Uses `pypdf` library for PDF text extraction
- **Interface**: 
  - Input: PDF file upload via HTTP multipart
  - Output: Extracted text string
- **Error Handling**: Returns descriptive errors for corrupted or unsupported files

#### Auth Manager
- **Purpose**: Generate ephemeral OAuth tokens for Gemini API access
- **Implementation**: Google Cloud Application Default Credentials with environment key fallback
- **Interface**:
  - Input: Token request from authenticated frontend
  - Output: Short-lived OAuth token with limited scope
- **Security**: Never exposes master API keys to client applications

#### Instructor Agent
- **Purpose**: Analyze interview transcripts and generate structured feedback
- **Implementation**: Dedicated module using Gemini 3 Pro Preview
- **Interface**:
  - Input: Complete interview transcript and user context
  - Output: JSON structured feedback report
- **Analysis Areas**: Technical accuracy, communication clarity, problem-solving approach

### Frontend Components (TypeScript/React)

#### useGeminiLive Hook
- **Purpose**: Manage WebSocket lifecycle for real-time voice interaction
- **Audio Input**: Web Audio API captures microphone at 16kHz PCM
- **Voice Activity Detection**: Client-side RMS calculation for interruption detection
- **Audio Output**: Queues and schedules PCM chunks using AudioBufferSourceNode
- **State Management**: React useState and useRef for volatile audio state

#### Session Controller
- **Purpose**: Manage interview session lifecycle and user controls
- **Controls**: Start, Stop, Mute functionality
- **Visual Feedback**: Real-time audio visualizers and connection status
- **Error Handling**: User-friendly error messages and recovery options

#### Resume Upload Component
- **Purpose**: Handle PDF resume uploads and display processing status
- **Validation**: File type, size, and format validation
- **Integration**: Communicates with backend Resume Processor
- **User Experience**: Progress indicators and error feedback

## Data Models

### Session Model
```typescript
interface Session {
  id: string;
  userId: string;
  resumeText: string;
  targetRole: string;
  status: 'initializing' | 'active' | 'completed' | 'error';
  transcript: ConversationTurn[];
  feedback?: FeedbackReport;
  createdAt: Date;
  completedAt?: Date;
}
```

### Conversation Model
```typescript
interface ConversationTurn {
  id: string;
  speaker: 'user' | 'interviewer';
  content: string;
  timestamp: Date;
  audioData?: AudioBuffer;
}
```

### Feedback Model
```typescript
interface FeedbackReport {
  overallScore: number;
  technicalAccuracy: {
    score: number;
    strengths: string[];
    improvements: string[];
    examples: FeedbackExample[];
  };
  communicationClarity: {
    score: number;
    strengths: string[];
    improvements: string[];
    examples: FeedbackExample[];
  };
  problemSolving: {
    score: number;
    strengths: string[];
    improvements: string[];
    examples: FeedbackExample[];
  };
  actionableRecommendations: string[];
}
```

### Audio Processing Model
```typescript
interface AudioConfig {
  sampleRate: 16000;
  channels: 1;
  format: 'PCM';
  bufferSize: 4096;
}
```

## Data Flow

### Session Initialization Flow
1. User uploads Resume PDF → Backend `/upload-resume` endpoint
2. Backend parses PDF using Resume Processor → Returns extracted text
3. Frontend requests Auth Token → Backend `/auth/token` returns scoped OAuth token
4. Frontend establishes WebSocket connection to Gemini Live API using token

### Live Interview Flow
1. Frontend opens WebSocket to Gemini Live API with authentication token
2. Initial setup: Frontend sends system prompt with interviewer persona and resume context
3. Conversation loop:
   - User speaks → Audio captured → PCM conversion → Base64 encoding → WebSocket transmission
   - AI responds → WebSocket receives text/audio chunks → Audio queue → Speaker playback
4. Interruption handling: User speech detection clears audio queue and sends new audio chunks

### Feedback Generation Flow
1. Session completion triggers transcript compilation
2. Backend Instructor Agent receives complete conversation history
3. Gemini 3 Pro analyzes transcript with structured prompting
4. Generated feedback formatted as JSON and returned to frontend
5. Frontend displays structured feedback with actionable recommendations

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: PDF Text Extraction Consistency
*For any* valid PDF document, extracting text should produce consistent results when the same document is processed multiple times
**Validates: Requirements 1.1**

### Property 2: Resume Context Propagation
*For any* extracted resume text, the Interviewer_Agent should receive the complete text content as part of its initialization context
**Validates: Requirements 1.2**

### Property 3: Upload Error Handling
*For any* invalid file upload (corrupted, wrong format, oversized), the system should return a descriptive error message without crashing
**Validates: Requirements 1.3**

### Property 4: Memory-Only Processing
*For any* resume processing operation, no permanent files should be created on the server filesystem during or after processing
**Validates: Requirements 1.5**

### Property 5: Token Generation Properties
*For any* authentication request, generated OAuth tokens should have expiration times within the configured lifetime limits and proper scope restrictions
**Validates: Requirements 2.1, 2.2**

### Property 6: API Key Security
*For any* client-facing response, the response should never contain master API keys or sensitive credential information
**Validates: Requirements 2.3**

### Property 7: Token Refresh Mechanism
*For any* expired token, the refresh mechanism should generate a new valid token with updated expiration time
**Validates: Requirements 2.4**

### Property 8: Audio Format Compliance
*For any* captured audio data, the output should conform to 16kHz PCM format specifications
**Validates: Requirements 3.1**

### Property 9: Audio Interruption Handling
*For any* active audio playback, detecting user voice activity should immediately stop the current audio output
**Validates: Requirements 3.3**

### Property 10: WebSocket Connection Stability
*For any* established WebSocket connection, the connection should remain active throughout normal session operations without unexpected disconnections
**Validates: Requirements 3.4**

### Property 11: Voice Activity Data Transmission
*For any* detected voice activity, audio data should be transmitted to the Live API within the configured time window
**Validates: Requirements 3.5**

### Property 12: Audio Queue Management
*For any* sequence of incoming audio chunks, they should be queued and played in the correct chronological order without gaps or overlaps
**Validates: Requirements 3.6**

### Property 13: Session Context Initialization
*For any* new interview session, the Interviewer_Agent should receive both resume context and target role information in its initialization payload
**Validates: Requirements 4.1**

### Property 14: Conversation Context Retention
*For any* ongoing session, earlier conversation turns should remain accessible to the agent throughout the entire session duration
**Validates: Requirements 4.4**

### Property 15: Feedback Analysis Trigger
*For any* completed interview session, the Instructor_Agent analysis should be automatically initiated within the configured time window
**Validates: Requirements 5.1**

### Property 16: Feedback Structure Completeness
*For any* generated feedback report, it should contain all required sections: technical accuracy, communication clarity, and problem-solving approach
**Validates: Requirements 5.2**

### Property 17: Feedback Example Integration
*For any* feedback report, it should include specific examples extracted from the actual conversation transcript
**Validates: Requirements 5.3**

### Property 18: UI Audio State Indicators
*For any* audio capture or playback operation, corresponding visual indicators should be displayed to reflect the current audio state
**Validates: Requirements 6.2**

### Property 19: Connection Status Display
*For any* WebSocket connection state change, the UI should accurately reflect the current connection status
**Validates: Requirements 6.3**

### Property 20: Permission Request Handling
*For any* operation requiring microphone access, appropriate permission requests should be triggered when permissions are not already granted
**Validates: Requirements 6.4**

### Property 21: Voice Activity Visual Feedback
*For any* detected voice activity, visual feedback indicators should respond appropriately to indicate voice detection status
**Validates: Requirements 6.5**

### Property 22: Automatic Reconnection Behavior
*For any* WebSocket connection loss, the system should attempt reconnection according to the configured retry strategy
**Validates: Requirements 7.1**

### Property 23: Resource Cleanup
*For any* completed or terminated session, all associated resources (connections, buffers, timers) should be properly cleaned up
**Validates: Requirements 7.3**

### Property 24: Session State Persistence
*For any* temporary network interruption lasting less than the configured timeout, session state should be maintained without data loss
**Validates: Requirements 7.4**

### Property 25: Error Message Generation
*For any* error condition during a session, clear and descriptive error messages should be generated for user display
**Validates: Requirements 7.5**

### Property 26: Microphone Permission Handling
*For any* microphone access request, the system should properly handle both granted and denied permission scenarios
**Validates: Requirements 8.2**

### Property 27: Audio Format Compatibility
*For any* browser-specific audio format requirements, the system should adapt audio processing to meet those requirements
**Validates: Requirements 8.5**

## Error Handling

### Resume Processing Errors
- **Invalid PDF Format**: Return structured error with file format requirements
- **File Size Exceeded**: Return error with size limits and suggestions
- **Corrupted Files**: Graceful handling with user-friendly error messages
- **Processing Timeout**: Implement timeout with retry mechanism

### Authentication Errors
- **Token Generation Failure**: Fallback to alternative authentication methods
- **Expired Tokens**: Automatic refresh with user notification
- **Invalid Credentials**: Clear error messages without exposing sensitive details
- **Rate Limiting**: Implement backoff strategy with user feedback

### WebSocket Connection Errors
- **Connection Failure**: Automatic retry with exponential backoff
- **Message Transmission Errors**: Queue messages for retry when connection restored
- **Protocol Errors**: Graceful degradation with fallback to HTTP polling
- **Timeout Handling**: Configurable timeouts with user notification

### Audio Processing Errors
- **Microphone Access Denied**: Clear instructions for enabling permissions
- **Audio Format Errors**: Automatic format conversion with fallback options
- **Buffer Overflow**: Dynamic buffer management with memory cleanup
- **Playback Errors**: Alternative audio output methods with user notification

## Testing Strategy

### Dual Testing Approach

The system requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points between components. Unit tests should verify concrete scenarios like specific file uploads, authentication flows, and UI interactions.

**Property Tests**: Verify universal properties across all inputs using randomized test data. Property tests should validate that system behaviors hold consistently across the wide range of possible inputs and states.

### Property-Based Testing Configuration

- **Testing Library**: Use `fast-check` for TypeScript/JavaScript components and `hypothesis` for Python components
- **Test Iterations**: Minimum 100 iterations per property test to ensure comprehensive input coverage
- **Test Tagging**: Each property test must reference its corresponding design document property using the format: **Feature: shadow-instructor, Property {number}: {property_text}**

### Unit Testing Focus Areas

- **Resume Upload Component**: Test specific file types, size limits, and error conditions
- **Authentication Flow**: Test token generation, refresh, and expiration scenarios
- **Audio Processing**: Test specific audio formats, buffer management, and playback scenarios
- **UI Components**: Test user interactions, state changes, and error displays
- **WebSocket Management**: Test connection establishment, message handling, and reconnection logic

### Property Testing Focus Areas

- **PDF Processing**: Test text extraction consistency across various PDF documents
- **Token Security**: Test that no sensitive information leaks in any response
- **Audio Pipeline**: Test audio format compliance and queue management across all audio data
- **Session Management**: Test state consistency and resource cleanup across all session types
- **Error Handling**: Test that appropriate errors are generated for all invalid inputs

### Integration Testing

- **End-to-End Flows**: Test complete user journeys from resume upload through feedback generation
- **API Integration**: Test interactions with Google Gemini Live API under various conditions
- **Cross-Browser Testing**: Verify functionality across supported browsers and devices
- **Performance Testing**: Validate latency requirements and concurrent user handling

### Test Data Management

- **Resume Samples**: Maintain collection of test PDF documents with various formats and content types
- **Audio Test Data**: Generate test audio samples in different formats and quality levels
- **Mock Services**: Implement mock Gemini API responses for consistent testing
- **State Scenarios**: Create test scenarios covering all possible session states and transitions