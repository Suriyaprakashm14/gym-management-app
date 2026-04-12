'use client';

import { useEffect } from 'react';
import { Form, Input, Button, Row, Col } from 'antd';
import { Lock, User, Mail } from 'lucide-react';
import { IndianMobileFormField } from '../../forms/IndianMobileFormField';

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

function normalizePhoneInput(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export interface AccountFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
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
        phone: initialValues.phone ?? '',
        email: initialValues.email ?? '',
        password: initialValues.password ?? '',
      });
    }
  }, [form, initialValues?.firstName, initialValues?.lastName, initialValues?.phone, initialValues?.email, initialValues?.password]);

  return (
    <Form
      form={form}
      name="account"
      layout="vertical"
      initialValues={{
        firstName: initialValues?.firstName ?? '',
        lastName: initialValues?.lastName ?? '',
        phone: initialValues?.phone ?? '',
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
      <IndianMobileFormField
        name="phone"
        label={<span className="text-sm text-muted-foreground">Mobile number</span>}
        rules={[
          { required: true, message: 'Please enter your mobile number' },
          {
            validator: (_, v) => {
              const local = normalizePhoneInput(String(v || '').trim());
              if (!INDIAN_MOBILE.test(local)) {
                return Promise.reject(new Error('Enter a valid 10-digit Indian mobile number'));
              }
              return Promise.resolve();
            },
          },
        ]}
      />
      <Form.Item
        label={<span className="text-sm text-muted-foreground">Recovery email (optional)</span>}
        name="email"
        rules={[{ type: 'email', message: 'Please enter a valid email' }]}
      >
        <Input
          placeholder="For password reset notifications"
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
