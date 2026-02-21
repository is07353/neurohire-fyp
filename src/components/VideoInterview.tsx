import { Language } from '../App';
import { Video, Play, Square, Eye } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useUploadThing } from '../../lib/uploadthing';
import { getApiBase } from '@/lib/apiConfig';

interface VideoInterviewProps {
  language: Language;
  jobId: string | null;
  onComplete: () => void;
}

const translations = {
  english: {
    title: 'Video Interview',
    questionLabel: 'Question',
    of: 'of',
    instruction: 'Please answer the following question clearly. You will have up to 2 minutes to record your response.',
    startRecording: 'Start Recording',
    stopRecording: 'Stop Recording',
    previewRecording: 'Preview Recording',
    submitNext: 'Submit Answer & Next',
    submitFinal: 'Submit Final Answer',
    recording: 'Recording...',
    recordingTime: 'Recording Time',
  },
  urdu: {
    title: 'ویڈیو انٹرویو',
    questionLabel: 'سوال',
    of: 'میں سے',
    instruction: 'براہ کرم اس سوال کا واضح جواب دیں۔ آپ کے پاس اپنے جواب کو ریکارڈ کرنے کے لیے 2 منٹ تک کا وقت ہوگا۔',
    startRecording: 'ریکارڈنگ شروع کریں',
    stopRecording: 'ریکارڈنگ بند کریں',
    previewRecording: 'ریکارڈنگ دیکھیں',
    submitNext: 'جواب جمع کریں اور اگلا',
    submitFinal: 'آخری جواب جمع کریں',
    recording: 'ریکارڈنگ جاری ہے...',
    recordingTime: 'ریکارڈنگ کا وقت',
  },
};

type RecordingState = 'idle' | 'recording' | 'recorded' | 'previewing';

export function VideoInterview({ language, jobId, onComplete }: VideoInterviewProps) {
  const t = translations[language || 'english'];
  const [questions, setQuestions] = useState<string[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const langParam = language === 'urdu' ? 'ur' : 'en';

  useEffect(() => {
    if (!jobId) {
      setQuestions([]);
      setQuestionsLoading(false);
      return;
    }
    let cancelled = false;
    setQuestionsLoading(true);
    setQuestionsError(null);
    fetch(`${getApiBase()}/candidate/jobs/${encodeURIComponent(jobId)}/questions?lang=${langParam}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'No questions for this job' : 'Failed to load questions');
        return res.json();
      })
      .then((data: { questions?: string[] }) => {
        if (!cancelled) {
          setQuestions(Array.isArray(data.questions) ? data.questions : []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setQuestionsError(err instanceof Error ? err.message : 'Failed to load questions');
          setQuestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setQuestionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, langParam]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const previewUrlRef = useRef<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  const resetVideoToCamera = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.src = '';
      videoRef.current.muted = true;
      videoRef.current.controls = false;
    }
  };

  const { startUpload, isUploading } = useUploadThing('videoUploader', {
    onClientUploadComplete: (res) => {
      console.log('[UploadThing][videoUploader] Client upload complete:', res);
    },
    onUploadError: (err) => {
      console.error('[UploadThing][videoUploader] Upload error:', err);
    },
  });

  useEffect(() => {
    // Initialize camera
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.log('Camera access not available - using preview mode');
      }
    };

    initCamera();

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleStartRecording = () => {
    if (!streamRef.current) {
      console.warn('[VideoInterview] No media stream available for recording');
      return;
    }

    setRecordingState('recording');
    setRecordingTime(0);
    setRecordedBlob(null);
    chunksRef.current = [];

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        console.log('[VideoInterview] Recorded blob size:', blob.size);
      };

      recorderRef.current = mediaRecorder;
      mediaRecorder.start();
    } catch (err) {
      console.error('[VideoInterview] Failed to start MediaRecorder:', err);
      return;
    }
    
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= 120) {
          handleStopRecording();
          return 120;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    setRecordingState('recorded');
    setHasRecorded(true);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePreview = () => {
    if (recordedBlob && videoRef.current) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const url = URL.createObjectURL(recordedBlob);
      previewUrlRef.current = url;
      videoRef.current.srcObject = null;
      videoRef.current.src = url;
      videoRef.current.muted = false;
      videoRef.current.controls = true;
      void videoRef.current.play();
    }
    setRecordingState('previewing');
  };

  const handleSubmitAndNext = async () => {
    if (!recordedBlob) {
      console.warn('[VideoInterview] No recorded video to upload');
    } else {
      try {
        const file = new File(
          [recordedBlob],
          `interview-q${currentQuestionIndex + 1}.webm`,
          { type: recordedBlob.type || 'video/webm' },
        );

        console.log('[VideoInterview] Starting upload of recorded video...', {
          name: file.name,
          size: file.size,
          type: file.type,
        });

        const result = await startUpload([file]);
        const first = Array.isArray(result) ? result[0] : undefined;
        const url = first?.url as string | undefined;
        const key = (first as { key?: string } | undefined)?.key;

        if (url) {
          await fetch(`${getApiBase()}/candidate/video-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_url: url,
              file_key: key ?? null,
              file_size: file.size,
              mime_type: file.type,
              question_index: currentQuestionIndex,
              question_text: currentQuestion,
            }),
          }).catch(() => {
            // best-effort; don't block UI on network failure
          });
        }
      } catch (err) {
        console.error('[VideoInterview] Error uploading video:', err);
      }
    }

    if (currentQuestionIndex < questions.length - 1) {
      resetVideoToCamera();
      setRecordedBlob(null);
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setRecordingState('idle');
      setRecordingTime(0);
      setHasRecorded(false);
    } else {
      resetVideoToCamera();
      onComplete();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  if (questionsLoading) {
    return (
      <div className="py-8 text-center">
        <h1 className="text-4xl font-medium text-[#000000] mb-3">{t.title}</h1>
        <p className="text-lg text-gray-600">Loading interview questions...</p>
      </div>
    );
  }

  if (questionsError || questions.length === 0) {
    return (
      <div className="py-8 text-center">
        <h1 className="text-4xl font-medium text-[#000000] mb-3">{t.title}</h1>
        <p className="text-lg text-gray-600 mb-6">
          {questionsError || 'No video questions are set for this job. You can continue to the next step.'}
        </p>
        <button
          type="button"
          onClick={onComplete}
          className="py-5 px-8 rounded-lg text-xl font-medium bg-[#000000] text-white hover:bg-[#333333] transition-all"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-medium text-[#000000] mb-3">
          {t.title}
        </h1>
        <div className="text-xl text-gray-600 mt-4">
          {t.questionLabel} {currentQuestionIndex + 1} {t.of} {questions.length}
        </div>
      </div>
      
      <div className="mb-8">
        <div className="bg-[#f5f5f5] border-4 border-[#000000] rounded-lg p-8">
          <p className="text-2xl text-[#000000] text-center leading-relaxed">
            {currentQuestion}
          </p>
        </div>
        <p className="text-lg text-gray-600 text-center mt-4">
          {t.instruction}
        </p>
      </div>
      
      <div className="mb-8">
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={recordingState !== 'previewing'}
            className="w-full h-full object-cover"
          />
          
          {recordingState === 'idle' && !hasRecorded && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Video className="w-24 h-24 text-white opacity-50" strokeWidth={1.5} />
            </div>
          )}
          
          {recordingState === 'recording' && (
            <div className="absolute top-6 left-6 bg-red-600 text-white px-6 py-3 rounded-lg flex items-center gap-3">
              <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
              <span className="text-xl font-medium">{t.recording}</span>
            </div>
          )}
          
          {(recordingState === 'recording' || recordingState === 'recorded') && (
            <div className="absolute bottom-6 left-6 bg-[#000000] text-white px-6 py-3 rounded-lg">
              <div className="text-lg">{t.recordingTime}: {formatTime(recordingTime)}</div>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-4">
        {recordingState === 'idle' && (
          <button
            onClick={handleStartRecording}
            className="w-full py-5 px-8 rounded-lg text-xl font-medium bg-[#000000] text-white hover:bg-[#333333] active:bg-[#000000] transition-all flex items-center justify-center gap-3"
          >
            <Play className="w-6 h-6" />
            {t.startRecording}
          </button>
        )}
        
        {recordingState === 'recording' && (
          <button
            onClick={handleStopRecording}
            className="w-full py-5 px-8 rounded-lg text-xl font-medium bg-red-600 text-white hover:bg-red-700 active:bg-red-800 transition-all flex items-center justify-center gap-3"
          >
            <Square className="w-6 h-6" />
            {t.stopRecording}
          </button>
        )}
        
        {recordingState === 'recorded' && (
          <div className="space-y-4">
            <button
              onClick={handlePreview}
              className="w-full py-5 px-8 rounded-lg text-xl font-medium border-2 border-[#000000] text-[#000000] hover:bg-[#f5f5f5] transition-all flex items-center justify-center gap-3"
            >
              <Eye className="w-6 h-6" />
              {t.previewRecording}
            </button>
            
            <button
              onClick={handleSubmitAndNext}
              disabled={isUploading}
              className="w-full py-5 px-8 rounded-lg text-xl font-medium bg-[#000000] text-white hover:bg-[#333333] active:bg-[#000000] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isUploading
                ? 'Uploading...'
                : isLastQuestion
                  ? t.submitFinal
                  : t.submitNext}
            </button>
          </div>
        )}
        
        {recordingState === 'previewing' && (
          <button
            onClick={handleSubmitAndNext}
            disabled={isUploading}
            className="w-full py-5 px-8 rounded-lg text-xl font-medium bg-[#000000] text-white hover:bg-[#333333] active:bg-[#000000] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isUploading
              ? 'Uploading...'
              : isLastQuestion
                ? t.submitFinal
                : t.submitNext}
          </button>
        )}
      </div>
    </div>
  );
}