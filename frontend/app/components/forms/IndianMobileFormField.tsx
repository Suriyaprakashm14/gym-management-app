'use client';

import type { ReactNode } from 'react';
import { Form, Input, Space } from 'antd';
import type { FormItemProps } from 'antd/es/form';
import type { Rule } from 'antd/es/form';
import type { InputProps } from 'antd';
import { Smartphone } from 'lucide-react';

const defaultAddon = (
  <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium tabular-nums select-none">
    <Smartphone className="w-4 h-4 shrink-0 opacity-80" />
    +91
  </span>
);

export type IndianMobileFormFieldProps = {
  name: string;
  label: ReactNode;
  rules: Rule[];
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  /** Replaces default Smartphone +91 */
  addonBefore?: ReactNode;
  inputClassName?: string;
  inputProps?: Omit<InputProps, 'addonBefore' | 'addonAfter' | 'prefix'>;
  formItemProps?: Omit<FormItemProps, 'name' | 'label' | 'rules' | 'children'>;
};

/**
 * Indian mobile (+91) field using Space.Compact + Space.Addon (antd replacement for deprecated Input.addonBefore).
 */
export function IndianMobileFormField({
  name,
  label,
  rules,
  placeholder = 'Enter 10 Digit Mobile Number',
  autoComplete = 'tel-national',
  maxLength = 14,
  addonBefore = defaultAddon,
  inputClassName = '',
  inputProps,
  formItemProps,
}: IndianMobileFormFieldProps) {
  const inputClass = `member-phone-field__input ${inputClassName}`.trim();

  return (
    <Form.Item label={label} {...formItemProps}>
      <Space.Compact block style={{ width: '100%' }} className="member-phone-field">
        <Space.Addon className="member-phone-field__addon">{addonBefore}</Space.Addon>
        <Form.Item name={name} noStyle rules={rules}>
          <Input
            placeholder={placeholder}
            autoComplete={autoComplete}
            maxLength={maxLength}
            className={inputClass}
            style={{ width: '100%', minWidth: 0 }}
            {...inputProps}
          />
        </Form.Item>
      </Space.Compact>
    </Form.Item>
  );
}
