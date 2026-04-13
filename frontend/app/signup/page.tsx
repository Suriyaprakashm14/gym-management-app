'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Typography, App } from 'antd';
import { SignupSteps } from '../components/auth/signup/SignupSteps';
import { AccountStepForm, type AccountFormValues } from '../components/auth/signup/AccountStepForm';
import { GymSetupStepForm, type GymSetupFormValues } from '../components/auth/signup/GymSetupStepForm';
import { api } from '../utils/api';
import { AuthShell } from '../components/auth/AuthShell';

const { Title, Text } = Typography;

export interface SignupFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  password: string;
  gymName: string;
  gymLogo: string | null;
}

const INITIAL_FORM_DATA: SignupFormData = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  password: '',
  gymName: '',
  gymLogo: null,
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<SignupFormData>(INITIAL_FORM_DATA);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();
  const { message } = App.useApp();

  const handleAccountFinish = (values: AccountFormValues) => {
    setFormData((prev) => ({
      ...prev,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      phone: values.phone.trim(),
      email: (values.email || '').trim(),
      password: values.password,
    }));
    setErrorMessage('');
    setCurrentStep(1);
  };

  const submitSignup = async (payload: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    password: string;
    gymName: string;
    gymIcon?: string;
  }) => {
    return api.auth.signup({
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone.trim(),
      password: payload.password,
      gymName: payload.gymName,
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.gymIcon ? { gymIcon: payload.gymIcon } : {}),
    });
  };

  const assertSignupSucceeded = (response: any) => {
    if (!response || response.success === false) {
      const msg =
        (typeof response?.error === 'string' && response.error) ||
        (typeof response?.message === 'string' && response.message) ||
        'Signup failed. Please try again.';
      throw new Error(msg);
    }
  };

  const handleGymFinish = async (values: GymSetupFormValues, logoFile: File | null) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const gymIcon =
        logoFile ? await fileToDataUrl(logoFile) : (formData.gymLogo ?? undefined);
      const gymName = (values.gymName ?? '').trim() || 'My Gym';
      const response = await submitSignup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email || undefined,
        password: formData.password,
        gymName,
        gymIcon,
      });
      assertSignupSucceeded(response);
      message.success('Account created! Please log in.');
      router.push('/login?signedup=1');
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMsg =
        typeof err?.message === 'string' ? err.message : 'Something went wrong. Please try again.';
      setErrorMessage(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await submitSignup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        email: formData.email || undefined,
        password: formData.password,
        gymName: 'My Gym',
      });
      assertSignupSucceeded(response);
      message.success('Account created! Please log in.');
      router.push('/login?signedup=1');
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMsg =
        typeof err?.message === 'string' ? err.message : 'Something went wrong. Please try again.';
      setErrorMessage(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => setCurrentStep(0);

  const handleLogoChange = useCallback((dataUrl: string | null) => {
    setFormData((prev) => ({ ...prev, gymLogo: dataUrl }));
  }, []);

  const handleGymNameChange = useCallback((gymName: string) => {
    setFormData((prev) => (prev.gymName === gymName ? prev : { ...prev, gymName }));
  }, []);

  return (
    <AuthShell
      title="Create Your Account"
      subtitle="Start your 14‑day free trial. Set up your gym in minutes."
      footer={
        <div className="text-center">
          <Text className="!text-muted-foreground">Already have an account? </Text>
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </div>
      }
      bullets={[
        'Set up your gym in minutes',
        'Automated billing + renewals',
        'Dashboards and multi-branch support',
      ]}
    >
      <div className="text-center mb-6">
        <Title level={5} className="!mb-2 !text-foreground !font-display">
          {currentStep === 0 ? 'Account details' : 'Gym setup'}
        </Title>
        <div className="flex justify-center">
          <SignupSteps current={currentStep} />
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 text-sm text-destructive" role="alert">
          {errorMessage}
        </div>
      )}

      {currentStep === 0 && (
        <AccountStepForm
          initialValues={{
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            email: formData.email,
            password: formData.password,
          }}
          onFinish={handleAccountFinish}
          loading={loading}
        />
      )}

      {currentStep === 1 && (
        <GymSetupStepForm
          initialGymName={formData.gymName}
          initialLogoUrl={formData.gymLogo}
          onLogoChange={handleLogoChange}
          onGymNameChange={handleGymNameChange}
          onFinish={handleGymFinish}
          onSkip={handleSkip}
          onBack={handleBack}
          loading={loading}
        />
      )}
    </AuthShell>
  );
}
