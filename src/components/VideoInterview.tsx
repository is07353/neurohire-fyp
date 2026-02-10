import { Language } from '../App';
import { Video, Play, Square, Eye } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface VideoInterviewProps {
  language: Language;
  onComplete: () => void;
}

const questionsData = {
  english: [
    'Tell us about yourself and why you want to work with us.',
    'Describe a time when you helped a customer or colleague.',
    'What would you do if you faced a difficult situation at work?',
  ],
  urdu: [
    'اپنے بارے میں بتائیں اور آپ ہمارے ساتھ کیوں کام کرنا چاہتے ہیں۔',
    'ایک وقت بیان کریں جب آپ نے کسی گاہک یا ساتھی کی مدد کی۔',
    'اگر آپ کو کام پر کسی مشکل صورتحال کا سامنا ہو تو آپ کیا کریں گے؟',
  ],
};

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

export function VideoInterview({ language, onComplete }: VideoInterviewProps) {
  const t = translations[language || 'english'];
  const questions = questionsData[language || 'english'];
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecorded, setHasRecorded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleStartRecording = () => {
    setRecordingState('recording');
    setRecordingTime(0);
    
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
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePreview = () => {
    setRecordingState('previewing');
  };

  const handleSubmitAndNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setRecordingState('idle');
      setRecordingTime(0);
      setHasRecorded(false);
    } else {
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
              className="w-full py-5 px-8 rounded-lg text-xl font-medium bg-[#000000] text-white hover:bg-[#333333] active:bg-[#000000] transition-all"
            >
              {isLastQuestion ? t.submitFinal : t.submitNext}
            </button>
          </div>
        )}
        
        {recordingState === 'previewing' && (
          <button
            onClick={handleSubmitAndNext}
            className="w-full py-5 px-8 rounded-lg text-xl font-medium bg-[#000000] text-white hover:bg-[#333333] active:bg-[#000000] transition-all"
          >
            {isLastQuestion ? t.submitFinal : t.submitNext}
          </button>
        )}
      </div>
    </div>
  );
}