import { Language } from '../App';
import { CheckCircle } from 'lucide-react';

interface SubmissionCompleteProps {
  language: Language;
  onFinish: () => void;
}

const translations = {
  english: {
    title: 'Thank You',
    message:
      'Your application has been successfully submitted. Our team will review your information and contact you if shortlisted.',
    finishButton: 'Finish',
  },
  urdu: {
    title: 'شکریہ',
    message:
      'آپ کی درخواست کامیابی سے جمع ہو گئی ہے۔ ہماری ٹیم آپ کی معلومات کا جائزہ لے گی اور منتخب ہونے کی صورت میں آپ سے رابطہ کرے گی۔',
    finishButton: 'ختم کریں',
  },
};

export function SubmissionComplete({ language, onFinish }: SubmissionCompleteProps) {
  const t = translations[language || 'english'];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <CheckCircle className="w-32 h-32 mb-8 text-[#000000]" strokeWidth={1.5} />
      
      <h1 className="text-5xl font-medium text-[#000000] mb-8">
        {t.title}
      </h1>
      
      <p className="text-2xl text-gray-700 mb-16 max-w-3xl leading-relaxed">
        {t.message}
      </p>
      
      <button
        onClick={onFinish}
        className="bg-[#000000] text-white px-16 py-6 rounded-lg text-xl font-medium hover:bg-[#333333] active:bg-[#000000] transition-all"
      >
        {t.finishButton}
      </button>
    </div>
  );
}