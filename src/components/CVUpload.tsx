import { Language } from '../App';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { useRef } from 'react';

interface CVUploadProps {
  language: Language;
  cvFile: File | null;
  onCVUpload: (file: File) => void;
  onContinue: () => void;
}

const translations = {
  english: {
    title: 'Upload Your CV',
    dragDrop: 'Drag and drop your CV here',
    or: 'or',
    uploadButton: 'Upload CV',
    supportedFormats: 'PDF, JPG, or PNG supported',
    uploadSuccess: 'CV uploaded successfully',
    continueButton: 'Continue',
  },
  urdu: {
    title: 'اپنا سی وی اپ لوڈ کریں',
    dragDrop: 'اپنا سی وی یہاں ڈراپ کریں',
    or: 'یا',
    uploadButton: 'سی وی اپ لوڈ کریں',
    supportedFormats: 'PDF، JPG، یا PNG معاون ہیں',
    uploadSuccess: 'سی وی کامیابی سے اپ لوڈ ہو گیا',
    continueButton: 'جاری رکھیں',
  },
};

export function CVUpload({ language, cvFile, onCVUpload, onContinue }: CVUploadProps) {
  const t = translations[language || 'english'];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (validTypes.includes(file.type)) {
      onCVUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="py-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-medium text-[#000000] mb-3">
          {t.title}
        </h1>
      </div>
      
      <div className="mb-12">
        {!cvFile ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-4 border-dashed border-gray-300 rounded-lg p-16 text-center bg-gray-50 hover:border-[#000000] hover:bg-[#f5f5f5] transition-all"
          >
            <Upload className="w-20 h-20 text-[#000000] mx-auto mb-6" strokeWidth={1.5} />
            
            <p className="text-2xl text-gray-700 mb-4">{t.dragDrop}</p>
            
            <p className="text-xl text-gray-500 mb-8">{t.or}</p>
            
            <button
              onClick={handleUploadClick}
              className="bg-[#000000] text-white px-12 py-5 rounded-lg text-xl font-medium hover:bg-[#333333] active:bg-[#000000] transition-all"
            >
              {t.uploadButton}
            </button>
            
            <p className="text-lg text-gray-500 mt-6">{t.supportedFormats}</p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="border-4 border-[#000000] rounded-lg p-16 text-center bg-[#f5f5f5]">
            <CheckCircle className="w-20 h-20 text-[#000000] mx-auto mb-6" strokeWidth={1.5} />
            
            <p className="text-2xl text-[#000000] font-medium mb-6">{t.uploadSuccess}</p>
            
            <div className="flex items-center justify-center gap-3 mb-8">
              <FileText className="w-8 h-8 text-[#000000]" />
              <span className="text-xl text-gray-700">{cvFile.name}</span>
            </div>
            
            <button
              onClick={handleUploadClick}
              className="text-[#000000] px-8 py-3 rounded-lg text-lg border-2 border-[#000000] hover:bg-[#000000] hover:text-white transition-all"
            >
              {t.uploadButton}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        )}
      </div>
      
      <button
        onClick={onContinue}
        disabled={!cvFile}
        className={`w-full py-5 px-8 rounded-lg text-xl font-medium transition-all ${
          cvFile
            ? 'bg-[#000000] text-white hover:bg-[#333333] active:bg-[#000000]'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {t.continueButton}
      </button>
    </div>
  );
}