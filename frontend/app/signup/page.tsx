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

/** Map backend error codes to user-friendly messages. */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  PHONE_ALREADY_REGISTERED: 'An account with this phone number already exists. Try logging in instead.',
  EMAIL_ALREADY_REGISTERED: 'An account with this email already exists. Try logging in instead.',
  USER_ALREADY_EXISTS: 'An account with these details already exists. Try logging in instead.',
  INVALID_CREDENTIALS: 'Invalid phone number or password.',
  ACCOUNT_DEACTIVATED: 'Your account has been deactivated. Contact support.',
};

function getApiErrorMessage(errorLike: unknown): string {
  if (typeof errorLike === 'string' && errorLike.trim()) {
    return ERROR_CODE_MESSAGES[errorLike.trim()] ?? errorLike.trim();
  }

  if (errorLike && typeof errorLike === 'object') {
    const errObj = errorLike as {
      message?: unknown;
      error?: unknown;
      details?: unknown;
    };

    // Check if message itself is a known error code
    if (typeof errObj.message === 'string' && errObj.message.trim()) {
      const msg = errObj.message.trim();
      return ERROR_CODE_MESSAGES[msg] ?? msg;
    }

    // Nested error object: { error: { message: "CODE", details: { message: "Human text" } } }
    if (errObj.error && typeof errObj.error === 'object') {
      const nestedError = errObj.error as { message?: unknown; details?: unknown };
      // details.message is always the human-readable text — check it first
      if (nestedError.details && typeof nestedError.details === 'object') {
        const nestedDetails = nestedError.details as { message?: unknown; error?: unknown };
        if (typeof nestedDetails.message === 'string' && nestedDetails.message.trim()) {
          return nestedDetails.message.trim();
        }
        if (typeof nestedDetails.error === 'string' && nestedDetails.error.trim()) {
          const code = nestedDetails.error.trim();
          return ERROR_CODE_MESSAGES[code] ?? code;
        }
      }
      // Fall back to the nested error message (may be a code)
      if (typeof nestedError.message === 'string' && nestedError.message.trim()) {
        const msg = nestedError.message.trim();
        return ERROR_CODE_MESSAGES[msg] ?? msg;
      }
    }

    // Flat error string: { error: "PHONE_ALREADY_REGISTERED" }
    if (typeof errObj.error === 'string' && errObj.error.trim()) {
      const code = errObj.error.trim();
      return ERROR_CODE_MESSAGES[code] ?? code;
    }

    // Top-level details
    if (errObj.details && typeof errObj.details === 'object') {
      const details = errObj.details as { message?: unknown; error?: unknown };
      if (typeof details.message === 'string' && details.message.trim()) {
        return details.message.trim();
      }
      if (typeof details.error === 'string' && details.error.trim()) {
        const code = details.error.trim();
        return ERROR_CODE_MESSAGES[code] ?? code;
      }
    }
  }

  return 'Something went wrong. Please try again.';
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
    const response = await api.auth.signup({
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone.trim(),
      password: payload.password,
      gymName: payload.gymName,
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.gymIcon ? { gymIcon: payload.gymIcon } : {}),
    });

    if (
      response &&
      typeof response === 'object' &&
      'success' in response &&
      (response as { success?: boolean }).success === false
    ) {
      throw new Error(getApiErrorMessage(response));
    }

    return response;
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
        phone: formData.phone,
        email: formData.email || undefined,
        password: formData.password,
        gymName,
        gymIcon,
      });
      message.success('Account created! Please log in.');
      router.push('/login?signedup=1');
    } catch (error: unknown) {
      const errorMsg = getApiErrorMessage(error);
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
        phone: formData.phone,
        email: formData.email || undefined,
        password: formData.password,
        gymName: 'My Gym',
      });
      message.success('Account created! Please log in.');
      router.push('/login?signedup=1');
    } catch (error: unknown) {
      const errorMsg = getApiErrorMessage(error);
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
