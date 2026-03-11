'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Typography, App } from 'antd';
import { SignupSteps } from '../components/auth/signup/SignupSteps';
import { AccountStepForm, type AccountFormValues } from '../components/auth/signup/AccountStepForm';
import { GymSetupStepForm, type GymSetupFormValues } from '../components/auth/signup/GymSetupStepForm';
import { api } from '../utils/api';

const { Title, Text } = Typography;

export interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  gymName: string;
  gymLogo: string | null;
}

const INITIAL_FORM_DATA: SignupFormData = {
  firstName: '',
  lastName: '',
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
      email: values.email.trim(),
      password: values.password,
    }));
    setErrorMessage('');
    setCurrentStep(1);
  };

  const submitSignup = async (payload: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    gymName: string;
    gymIcon?: string;
  }) => {
    return api.auth.signup({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email.trim(),
      password: payload.password,
      gymName: payload.gymName,
      ...(payload.gymIcon ? { gymIcon: payload.gymIcon } : {}),
    });
  };

  const handleGymFinish = async (values: GymSetupFormValues, logoFile: File | null) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const gymIcon =
        logoFile ? await fileToDataUrl(logoFile) : (formData.gymLogo ?? undefined);
      const gymName = (values.gymName ?? '').trim() || 'My Gym';
      await submitSignup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        gymName,
        gymIcon,
      });
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
      await submitSignup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        gymName: 'My Gym',
      });
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
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 8 }}>
            Sign Up
          </Title>
          <SignupSteps current={currentStep} />
        </div>

        {currentStep === 0 && (
          <>
            {errorMessage && (
              <div style={{ color: '#ff4d4f', fontSize: 14, marginBottom: 8, textAlign: 'left' }}>
                {errorMessage}
              </div>
            )}
            <AccountStepForm
              initialValues={{
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                password: formData.password,
              }}
              onFinish={handleAccountFinish}
              loading={loading}
            />
          </>
        )}

        {currentStep === 1 && (
          <>
            {errorMessage && (
              <div style={{ color: '#ff4d4f', fontSize: 14, marginBottom: 8, textAlign: 'left' }}>
                {errorMessage}
              </div>
            )}
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
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary">Already have an account? </Text>
          <Link href="/login">Log in</Link>
        </div>
      </Card>
    </div>
  );
}
