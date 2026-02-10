import { Language, CandidateInfo } from '../App';
import { User, Phone, Mail, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';




interface ReviewInformationProps {
  language: Language;
  candidateInfo: CandidateInfo;
  onInfoUpdate: (info: CandidateInfo) => void;
  onReupload: () => void;
  onContinue: () => void;
}

const translations = {
  english: {
    title: 'Review Your Information',
    subtitle: 'Please confirm or correct the information extracted from your CV',
    fullName: 'Full Name',
    phone: 'Phone Number',
    email: 'Email Address',
    address: 'Address',
    reuploadButton: 'Re-upload CV',
    continueButton: 'Confirm and Continue',
  },
  urdu: {
    title: 'اپنی معلومات کا جائزہ لیں',
    subtitle: 'براہ کرم اپنے سی وی سے نکالی گئی معلومات کی تصدیق یا درست کریں',
    fullName: 'پورا نام',
    phone: 'فون نمبر',
    email: 'ای میل پتہ',
    address: 'پتہ',
    reuploadButton: 'سی وی دوبارہ اپ لوڈ کریں',
    continueButton: 'تصدیق کریں اور جاری رکھیں',
  },
};

export function ReviewInformation({
  language,
  candidateInfo,
  onInfoUpdate,
  onReupload,
  onContinue,
}: ReviewInformationProps) {
  const t = translations[language || 'english'];

  // ✅ DO NOT initialize from candidateInfo
  const [info, setInfo] = useState<CandidateInfo>({
    fullName: '',
    phone: '',
    email: '',
    address: '',
  });

  const [loading, setLoading] = useState(true);

  // ✅ FETCH DATA FROM BACKEND
  useEffect(() => {
    fetch("http://127.0.0.1:8000/candidate/overview")
      .then(res => res.json())
      .then(data => {
        console.log("CV data from backend:", data);

        const parsedInfo: CandidateInfo = {
          fullName: data.name ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          address: data.address ?? '',
        };

        setInfo(parsedInfo);
        onInfoUpdate(parsedInfo); // sync parent
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch CV info:", err);
        setLoading(false);
      });
  }, []);


  const handleChange = (field: keyof CandidateInfo, value: string) => {
    const updatedInfo = { ...info, [field]: value };
    setInfo(updatedInfo);
    onInfoUpdate(updatedInfo);
  };

  const isFormComplete = info.fullName && info.phone && info.email && info.address;

  return (
    <div className="py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-medium text-[#000000] mb-3">
          {t.title}
        </h1>
        <p className="text-xl text-gray-600 mt-4 max-w-3xl mx-auto">
          {t.subtitle}
        </p>
      </div>
      
      <div className="space-y-6 mb-12">
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-xl text-gray-700">
            <User className="w-6 h-6 text-[#000000]" />
            {t.fullName}
          </label>
          <input
            type="text"
            value={info.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            className="w-full px-6 py-4 border-4 border-gray-300 rounded-lg text-xl focus:outline-none focus:border-[#000000] transition-colors"
            placeholder={t.fullName}
          />
        </div>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-xl text-gray-700">
            <Phone className="w-6 h-6 text-[#000000]" />
            {t.phone}
          </label>
          <input
            type="tel"
            value={info.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-6 py-4 border-4 border-gray-300 rounded-lg text-xl focus:outline-none focus:border-[#000000] transition-colors"
            placeholder={t.phone}
          />
        </div>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-xl text-gray-700">
            <Mail className="w-6 h-6 text-[#000000]" />
            {t.email}
          </label>
          <input
            type="email"
            value={info.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full px-6 py-4 border-4 border-gray-300 rounded-lg text-xl focus:outline-none focus:border-[#000000] transition-colors"
            placeholder={t.email}
          />
        </div>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-xl text-gray-700">
            <MapPin className="w-6 h-6 text-[#000000]" />
            {t.address}
          </label>
          <textarea
            value={info.address}
            onChange={(e) => handleChange('address', e.target.value)}
            rows={3}
            className="w-full px-6 py-4 border-4 border-gray-300 rounded-lg text-xl focus:outline-none focus:border-[#000000] transition-colors resize-none"
            placeholder={t.address}
          />
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <button
          onClick={onReupload}
          className="flex-1 py-5 px-8 rounded-lg text-xl font-medium border-2 border-[#000000] text-[#000000] hover:bg-[#f5f5f5] transition-all"
        >
          {t.reuploadButton}
        </button>
        
        <button
          onClick={onContinue}
          disabled={!isFormComplete}
          className={`flex-1 py-5 px-8 rounded-lg text-xl font-medium transition-all ${
            isFormComplete
              ? 'bg-[#000000] text-white hover:bg-[#333333] active:bg-[#000000]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {t.continueButton}
        </button>
      </div>
    </div>
  );
}