'use client';

import { useState, useRef, useEffect } from 'react';
import { Form, Input, Button } from 'antd';
import { CameraOutlined } from '@ant-design/icons';

export interface GymSetupFormValues {
  gymName: string;
}

interface GymSetupStepFormProps {
  initialGymName?: string;
  initialLogoUrl?: string | null;
  onLogoChange?: (dataUrl: string | null) => void;
  onGymNameChange?: (gymName: string) => void;
  onFinish: (values: GymSetupFormValues, logoFile: File | null) => void;
  onSkip: () => void;
  onBack: () => void;
  loading?: boolean;
}

export function GymSetupStepForm({
  initialGymName = '',
  initialLogoUrl = null,
  onLogoChange,
  onGymNameChange,
  onFinish,
  onSkip,
  onBack,
  loading,
}: GymSetupStepFormProps) {
  const [form] = Form.useForm();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialLogoUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onGymNameChangeRef = useRef(onGymNameChange);
  onGymNameChangeRef.current = onGymNameChange;
  const gymName = Form.useWatch('gymName', form);

  useEffect(() => {
    setPreviewUrl(initialLogoUrl);
  }, [initialLogoUrl]);

  useEffect(() => {
    if (gymName !== undefined) onGymNameChangeRef.current?.((gymName ?? '').trim());
  }, [gymName]);

  useEffect(() => {
    form.setFieldsValue({ gymName: initialGymName ?? '' });
  }, [form, initialGymName]);

  const handleLogoClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onLogoChange?.(dataUrl);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    if (previewUrl && previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onLogoChange?.(null);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onFinish(
        { gymName: values.gymName?.trim() ?? '' },
        logoFile
      );
    } catch {
      // validation errors shown by form
    }
  };

  return (
    <>
      <Form
        form={form}
        name="gymSetup"
        layout="vertical"
        requiredMark={false}
        size="large"
        initialValues={{ gymName: initialGymName }}
      >
        <Form.Item
          label="Gym Name(optional)"
          name="gymName"
          rules={[]}
        >
          <Input placeholder="Enter your gym name" />
        </Form.Item>

        <Form.Item label="Gym Logo(optional)" style={{ marginBottom: 16 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
            aria-hidden
          />
          <div
            role="button"
            tabIndex={0}
            onClick={handleLogoClick}
            onKeyDown={(e) => e.key === 'Enter' && handleLogoClick()}
            style={{
              width: 96,
              height: 96,
              borderRadius: 12,
              border: '2px dashed #d9d9d9',
              background: '#fafafa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            {previewUrl ? (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <img
                  src={previewUrl}
                  alt="Gym logo preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span
                  onClick={(e) => { e.stopPropagation(); handleRemoveLogo(); }}
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    fontSize: 11,
                    color: '#ff4d4f',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Remove
                </span>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#8c8c8c' }}>
                <CameraOutlined style={{ fontSize: 28, marginBottom: 4 }} />
                <div style={{ fontSize: 11 }}>Upload</div>
              </div>
            )}
          </div>
        </Form.Item>

        <Form.Item style={{ marginBottom: 12 }}>
          <Button type="primary" htmlType="button" block loading={loading} onClick={handleSubmit}>
            Create Account
          </Button>
        </Form.Item>
        <Form.Item style={{ marginBottom: 12 }}>
          <Button block onClick={onBack} disabled={loading}>
            Back
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
