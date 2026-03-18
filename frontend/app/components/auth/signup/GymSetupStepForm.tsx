'use client';

import { useState, useRef, useEffect } from 'react';
import { Form, Input, Button } from 'antd';
import { CameraOutlined } from '@ant-design/icons';
import { Building2 } from 'lucide-react';

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
          label={<span className="text-sm text-muted-foreground">Gym Name (optional)</span>}
          name="gymName"
          rules={[]}
        >
          <Input
            placeholder="Gym name (optional)"
            autoComplete="organization"
            prefix={<Building2 className="w-4 h-4 text-muted-foreground" />}
            className="!bg-secondary/40 !border-border/60 !text-foreground placeholder:!text-muted-foreground/70 !rounded-xl"
          />
        </Form.Item>

        <Form.Item
          label={<span className="text-sm text-muted-foreground">Gym Logo (optional)</span>}
          style={{ marginBottom: 16 }}
        >
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
            className="w-24 h-24 rounded-2xl border-2 border-dashed border-border/70 bg-secondary/30 flex items-center justify-center cursor-pointer overflow-hidden hover:bg-secondary/40 transition-colors"
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
                  className="absolute bottom-1 right-2 text-[11px] text-destructive cursor-pointer underline"
                >
                  Remove
                </span>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <CameraOutlined style={{ fontSize: 28, marginBottom: 4 }} />
                <div className="text-[11px]">Upload</div>
              </div>
            )}
          </div>
        </Form.Item>

        <Form.Item style={{ marginBottom: 12 }}>
          <Button
            type="primary"
            htmlType="button"
            block
            loading={loading}
            onClick={handleSubmit}
            className="!h-11 !rounded-xl !font-semibold !shadow-md hover:!opacity-95"
          >
            Create Account
          </Button>
        </Form.Item>
        <Form.Item style={{ marginBottom: 12 }}>
          <Button
            block
            onClick={onBack}
            disabled={loading}
            className="!h-11 !rounded-xl !bg-secondary/40 !border-border/60 !text-foreground hover:!bg-secondary/60"
          >
            Back
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
