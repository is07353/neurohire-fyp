import { Language } from '../App';

interface LanguageSelectionProps {
  language: Language;
  onLanguageSelect: (language: Language) => void;
  onContinue: () => void;
}

export function LanguageSelection({ language, onLanguageSelect, onContinue }: LanguageSelectionProps) {
  
  const handleContinue = () => {
  fetch("http://127.0.0.1:8000/candidate/language", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ language }),
  })
    .then(res => res.json())
    .then(data => {
      console.log("Language sent to backend:", data);
      onContinue(); // move to next screen
    })
    .catch(err => {
      console.error("Failed to send language:", err);
    });
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
      
      <button
        onClick={handleContinue}
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