import { Language } from '../App';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  language: Language;
}

export function ProgressIndicator({ currentStep, totalSteps, language }: ProgressIndicatorProps) {
  const stepText = language === 'urdu' ? 'مرحلہ' : 'Step';
  const ofText = language === 'urdu' ? 'میں سے' : 'of';

  return (
    <div className="py-6 px-6 relative">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-medium text-[#000000]">
            {stepText} {currentStep} {ofText} {totalSteps}
          </div>
          <div className="text-sm text-[#000000] opacity-70">
            NeuroHire
          </div>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{
          background: 'linear-gradient(to right, #9333EA, #000000)'
        }}>
          <div
            className="bg-[#FF13F0] h-full rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}