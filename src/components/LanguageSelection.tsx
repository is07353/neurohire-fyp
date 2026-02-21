import { useEffect } from 'react';
import { Language } from '../App';
import { Volume2 } from 'lucide-react';
import { useTts, type TtsLanguage } from '@/components/candidate/tts/useTts';

/** Phrases spoken in order when user enables Audio Guidance (English then Urdu for each). */
const AUDIO_GUIDANCE_ON_SEQUENCE: { text: string; language: TtsLanguage }[] = [
  { text: 'Audio guidance is on: Questions will be read aloud in the Video Interview step.', language: 'eng' },
  { text: 'سوالات ویڈیو انٹرویو کے مرحلے میں بلند آواز سے پڑھے جائیں گے۔', language: 'urd' },
  { text: 'Select Your Language', language: 'eng' },
  { text: 'اپنی زبان منتخب کریں۔', language: 'urd' },
];

interface LanguageSelectionProps {
  language: Language;
  onLanguageSelect: (language: Language) => void;
  onContinue: () => void;
  audioGuidanceEnabled?: boolean;
  onAudioGuidanceChange?: (enabled: boolean) => void;
}

export function LanguageSelection({ language, onLanguageSelect, onContinue, audioGuidanceEnabled = false, onAudioGuidanceChange }: LanguageSelectionProps) {
  const { speakSequence, preload } = useTts(language);

  // Preload first phrase when language is selected so voice starts within ~2s of clicking Enable
  useEffect(() => {
    if (!language || audioGuidanceEnabled) return;
    const id = setTimeout(() => {
      preload(AUDIO_GUIDANCE_ON_SEQUENCE[0]);
    }, 300);
    return () => clearTimeout(id);
  }, [language, audioGuidanceEnabled, preload]);

  const handleAudioGuidanceClick = () => {
    const next = !audioGuidanceEnabled;
    onAudioGuidanceChange?.(next);
    if (next) {
      speakSequence(AUDIO_GUIDANCE_ON_SEQUENCE);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <h1 className="text-4xl font-medium text-[#000000] mb-3 text-center">
        Select Your Language
      </h1>
      
      <p className="text-xl text-gray-600 mb-12 text-center max-w-2xl">
        Please choose your preferred language for the assessment
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-12">
        <button
          onClick={() => onLanguageSelect('english')}
          className={`p-12 rounded-lg border-4 transition-all ${
            language === 'english'
              ? 'border-[#000000] bg-[#000000] text-white'
              : 'border-gray-300 bg-white text-[#000000] hover:border-[#000000]'
          }`}
        >
          <div className="text-3xl font-medium">English</div>
        </button>
        
        <button
          onClick={() => onLanguageSelect('urdu')}
          className={`p-12 rounded-lg border-4 transition-all ${
            language === 'urdu'
              ? 'border-[#000000] bg-[#000000] text-white'
              : 'border-gray-300 bg-white text-[#000000] hover:border-[#000000]'
          }`}
        >
          <div className="text-3xl font-medium">اردو</div>
        </button>
      </div>

      {onAudioGuidanceChange && (
        <div className="mb-8 max-w-md w-full">
          <button
            type="button"
            onClick={handleAudioGuidanceClick}
            className={`flex items-center gap-3 w-full justify-center py-4 px-6 rounded-lg border-2 transition-all cursor-pointer ${
              audioGuidanceEnabled
                ? 'bg-[#000000] border-[#000000] text-white hover:bg-[#333333]'
                : 'bg-white border-gray-300 text-[#000000] hover:border-[#000000] hover:bg-gray-50'
            }`}
          >
            <Volume2 className="w-6 h-6 shrink-0" />
            <span className="text-lg font-medium">
              {audioGuidanceEnabled ? 'Audio Guidance: On' : 'Enable Audio Guidance'}
            </span>
          </button>
          {audioGuidanceEnabled && (
            <p className="text-sm text-gray-600 text-center mt-2">
              {language === 'urdu' ? 'ویڈیو انٹرویو میں سوالات سنائی دیں گے۔' : 'Questions will be read aloud in the Video Interview step.'}
            </p>
          )}
        </div>
      )}
      
      <button
        onClick={onContinue}
        disabled={!language}
        className={`w-full max-w-md py-5 px-8 rounded-lg text-xl font-medium transition-all ${
          language
            ? 'bg-[#000000] text-white hover:bg-[#333333] active:bg-[#000000]'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {language === 'urdu' ? 'جاری رکھیں' : 'Continue'}
      </button>
    </div>
  );
}