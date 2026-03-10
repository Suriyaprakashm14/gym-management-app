'use client';

import { useEffect } from 'react';
import { Form, Input, Button } from 'antd';

export interface AccountFormValues {
  name: string;
  email: string;
  password: string;
}

interface AccountStepFormProps {
  initialValues?: Partial<AccountFormValues>;
  onFinish: (values: AccountFormValues) => void;
  loading?: boolean;
}

export function AccountStepForm({ initialValues, onFinish, loading }: AccountStepFormProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue({
        name: initialValues.name ?? '',
        email: initialValues.email ?? '',
        password: initialValues.password ?? '',
      });
    }
  }, [form, initialValues?.name, initialValues?.email, initialValues?.password]);

  return (
    <Form
      form={form}
      name="account"
      layout="vertical"
      initialValues={{
        name: initialValues?.name ?? '',
        email: initialValues?.email ?? '',
        password: initialValues?.password ?? '',
      }}
      onFinish={onFinish}
      requiredMark={false}
      size="large"
    >
      <Form.Item
        label="User Name"
        name="name"
        rules={[{ required: true, message: 'Please enter your name!' }]}
      >
        <Input placeholder="Enter your name" />
      </Form.Item>
      <Form.Item
        label="Email"
        name="email"
        rules={[
          { required: true, message: 'Please enter your email!' },
          { type: 'email', message: 'Please enter a valid email address' },
        ]}
      >
        <Input placeholder="Enter your email" type="email" autoComplete="email" />
      </Form.Item>
      <Form.Item
        label="Password"
        name="password"
        rules={[
          { required: true, message: 'Please enter your password!' },
          { min: 8, message: 'Password must be at least 8 characters' },
        ]}
      >
        <Input.Password placeholder="Enter your password" autoComplete="new-password" />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" block loading={loading}>
          Continue
        </Button>
      </Form.Item>
    </Form>
  );
}
