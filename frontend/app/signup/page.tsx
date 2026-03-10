'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Form, Input, Typography, App, Row, Col, Card } from 'antd';
import { User, Mail, Lock, Camera, Pencil, Dumbbell } from 'lucide-react';
import { api } from '../utils/api';
import styles from './signup.module.css';

interface SignupFormValues {
  gymName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const labelStyle = { color: 'var(--signup-muted)', fontSize: 13, fontWeight: 500 };
const prefixStyle = { color: 'var(--signup-muted)', width: 16, height: 16 };

/** Click-to-edit gym name: display text that switches to input on click */
function ClickToEditGymName({
  value,
  onChange,
  placeholder = 'Click to add your gym name',
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const startEdit = () => setEditing(true);

  if (editing) {
    return (
      <Input
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={() => setEditing(false)}
        onPressEnter={() => setEditing(false)}
        placeholder={placeholder}
        className={styles.gymNameInput}
        style={{ fontSize: 18, fontWeight: 600 }}
        autoFocus
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEdit}
      className={styles.gymNameDisplay}
      aria-label="Edit gym name"
    >
      <span className={value?.trim() ? styles.gymNameText : styles.gymNameTextMuted}>
        {value?.trim() || placeholder}
      </span>
      <Pencil className={styles.gymNameIcon} aria-hidden />
    </button>
  );
}

/** Click-to-edit gym logo: one clickable area to add or change logo */
function ClickToEditGymLogo({
  file,
  previewUrl,
  onFileChange,
}: {
  file: File | null;
  previewUrl: string | null;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => inputRef.current?.click();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith('image/')) onFileChange(f);
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className={styles.logoInputHidden}
        aria-hidden
      />
      <button
        type="button"
        onClick={handleClick}
        className={styles.logoBlock}
        aria-label="Add or change gym logo"
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Gym logo" className={styles.logoPreview} />
            <span className={styles.logoOverlay}>
              <Camera size={20} />
              Change logo
            </span>
          </>
        ) : (
          <span className={styles.logoPlaceholder}>
            <Camera size={28} />
          </span>
        )}
      </button>
    </>
  );
}

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const handleLogoFileChange = (file: File | null) => {
    setIconFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setLogoPreview(null);
  };

  const onFinish = async (values: SignupFormValues) => {
    setLoading(true);
    setErrorMessage('');
    try {
      let gymIcon: string | undefined;
      if (iconFile) {
        gymIcon = await fileToDataUrl(iconFile);
      }
      await api.auth.signup({
        gymName: (values.gymName ?? '').trim(),
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        password: values.password,
        ...(gymIcon ? { gymIcon } : {}),
      });
      message.success('Account created! Please log in.');
      router.push('/login?signedup=1');
    } catch (error: unknown) {
      const err = error as { message?: string };
      const errorMsg = typeof err?.message === 'string' ? err.message : 'Something went wrong. Please try again.';
      setErrorMessage(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.outer}>
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <Link href="/landing" className={styles.logoLink}>
            <div className={styles.logoIcon}>
              <Dumbbell size={22} strokeWidth={2.2} />
            </div>
            <span className={styles.logoText}>GymPro Manager</span>
          </Link>
          <Link href="/login" className={styles.loginLink}>Log in</Link>
        </header>

        <main className={styles.main}>
          <Card className={styles.card}>
            <div className={styles.formHeader}>
              <Typography.Title level={4} className={styles.formTitle}>
                Create your account
              </Typography.Title>
              <Typography.Text className={styles.formSubtitle}>
                Takes about a minute — you’ll need your gym name and email.
              </Typography.Text>
            </div>

            <Form
              form={form}
              name="signup"
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
              size="large"
              className={styles.form}
            >
              {/* Click-to-edit: Gym identity (name + logo) */}
              <div className={styles.gymIdentity}>
                <div className={styles.logoColumn}>
                  <ClickToEditGymLogo
                    file={iconFile}
                    previewUrl={logoPreview}
                    onFileChange={handleLogoFileChange}
                  />
                </div>
                <div className={styles.nameColumn}>
                  <Form.Item
                    name="gymName"
                    rules={[{ required: true, message: 'Please enter your gym name' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <ClickToEditGymName placeholder="Click to add your gym name" />
                  </Form.Item>
                  <Typography.Text className={styles.gymHint}>Click the name or logo to edit</Typography.Text>
                </div>
              </div>
              <Row gutter={12}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<span style={labelStyle}>First name</span>}
                    name="firstName"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input prefix={<User style={prefixStyle} />} placeholder="First name" className={styles.input} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<span style={labelStyle}>Last name</span>}
                    name="lastName"
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <Input placeholder="Last name" className={styles.input} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                label={<span style={labelStyle}>Email</span>}
                name="email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email address' },
                ]}
              >
                <Input
                  prefix={<Mail style={prefixStyle} />}
                  placeholder="you@example.com"
                  type="email"
                  autoComplete="email"
                  className={styles.input}
                />
              </Form.Item>
              <Form.Item
                label={<span style={labelStyle}>Password</span>}
                name="password"
                rules={[
                  { required: true, message: 'Please choose a password' },
                  { min: 6, message: 'Use at least 6 characters' },
                ]}
                help="At least 6 characters"
              >
                <Input.Password
                  prefix={<Lock style={prefixStyle} />}
                  placeholder="Choose a password"
                  autoComplete="new-password"
                  className={styles.input}
                />
              </Form.Item>
              {errorMessage && (
                <div role="alert" className={styles.errorBlock}>
                  {errorMessage}
                </div>
              )}
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                  size="large"
                  className={styles.submitBtn}
                >
                  Create account
                </Button>
              </Form.Item>
            </Form>

            <div className={styles.footer}>
              <Typography.Text className={styles.footerText}>Already have an account? </Typography.Text>
              <Link href="/login" className={styles.footerLink}>
                Log in
              </Link>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
