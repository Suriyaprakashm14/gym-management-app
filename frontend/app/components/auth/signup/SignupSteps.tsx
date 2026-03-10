'use client';

import { Steps } from 'antd';

const STEP_ITEMS = [
  { title: 'Account Details' },
  { title: 'Gym Configuration' },
];

interface SignupStepsProps {
  current: number;
}

export function SignupSteps({ current }: SignupStepsProps) {
  return (
    <Steps
      current={current}
      size="small"
      items={STEP_ITEMS.map((s) => ({ title: s.title }))}
      style={{ marginBottom: 24 }}
    />
  );
}
