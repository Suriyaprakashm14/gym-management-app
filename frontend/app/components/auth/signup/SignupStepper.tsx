'use client';

import { Steps } from 'antd';

const steps = [
  { title: 'Account' },
  { title: 'Gym Setup' },
];

interface SignupStepperProps {
  current: number;
}

export function SignupStepper({ current }: SignupStepperProps) {
  return (
    <Steps
      current={current}
      size="small"
      items={steps.map((s) => ({ title: s.title }))}
      style={{ marginBottom: 24 }}
    />
  );
}
