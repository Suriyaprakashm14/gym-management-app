'use client';

import { useEffect } from 'react';
import { Form, Input, Button, Row, Col } from 'antd';

export interface AccountFormValues {
  firstName: string;
  lastName: string;
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
        firstName: initialValues.firstName ?? '',
        lastName: initialValues.lastName ?? '',
        email: initialValues.email ?? '',
        password: initialValues.password ?? '',
      });
    }
  }, [form, initialValues?.firstName, initialValues?.lastName, initialValues?.email, initialValues?.password]);

  return (
    <Form
      form={form}
      name="account"
      layout="vertical"
      initialValues={{
        firstName: initialValues?.firstName ?? '',
        lastName: initialValues?.lastName ?? '',
        email: initialValues?.email ?? '',
        password: initialValues?.password ?? '',
      }}
      onFinish={onFinish}
      requiredMark={false}
      size="large"
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="First Name"
            name="firstName"
            rules={[{ required: true, message: 'Please enter your first name' }]}
          >
            <Input placeholder="Enter first name" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Last Name"
            name="lastName"
            rules={[{ required: true, message: 'Please enter your last name' }]}
          >
            <Input placeholder="Enter last name" />
          </Form.Item>
        </Col>
      </Row>
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
