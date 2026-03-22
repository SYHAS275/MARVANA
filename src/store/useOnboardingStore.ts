import { create } from 'zustand';
import { OnboardingStep } from '../types';

interface OnboardingState {
  step: OnboardingStep;
  setStep: (step: OnboardingStep) => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  step: 'name',
  setStep: (step: OnboardingStep) => set({ step }),
}));
