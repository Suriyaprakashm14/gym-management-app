'use client';

import { useEffect } from 'react';
import { Form, Input, Button, Row, Col } from 'antd';
import { Mail, Lock, User } from 'lucide-react';

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
            label={<span className="text-sm text-muted-foreground">First Name</span>}
            name="firstName"
            rules={[{ required: true, message: 'Please enter your first name' }]}
          >
            <Input
              placeholder="First name"
              autoComplete="given-name"
              prefix={<User className="w-4 h-4 text-muted-foreground" />}
              className="!bg-secondary/40 !border-border/60 !text-foreground placeholder:!text-muted-foreground/70 !rounded-xl"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label={<span className="text-sm text-muted-foreground">Last Name</span>}
            name="lastName"
            rules={[{ required: true, message: 'Please enter your last name' }]}
          >
            <Input
              placeholder="Last name"
              autoComplete="family-name"
              prefix={<User className="w-4 h-4 text-muted-foreground" />}
              className="!bg-secondary/40 !border-border/60 !text-foreground placeholder:!text-muted-foreground/70 !rounded-xl"
            />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        label={<span className="text-sm text-muted-foreground">Email</span>}
        name="email"
        rules={[
          { required: true, message: 'Please enter your email!' },
          { type: 'email', message: 'Please enter a valid email address' },
        ]}
      >
        <Input
          placeholder="you@company.com"
          type="email"
          autoComplete="email"
          prefix={<Mail className="w-4 h-4 text-muted-foreground" />}
          className="!bg-secondary/40 !border-border/60 !text-foreground placeholder:!text-muted-foreground/70 !rounded-xl"
        />
      </Form.Item>
      <Form.Item
        label={<span className="text-sm text-muted-foreground">Password</span>}
        name="password"
        rules={[
          { required: true, message: 'Please enter your password!' },
          { min: 8, message: 'Password must be at least 8 characters' },
        ]}
      >
        <Input.Password
          placeholder="Create a password"
          autoComplete="new-password"
          prefix={<Lock className="w-4 h-4 text-muted-foreground" />}
          className="!bg-secondary/40 !border-border/60 !text-foreground placeholder:!text-muted-foreground/70 !rounded-xl"
        />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={loading}
          className="!h-11 !rounded-xl !font-semibold !shadow-md hover:!opacity-95"
        >
          Continue
        </Button>
      </Form.Item>
    </Form>
  );
}
