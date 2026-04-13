'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Upload,
  App,
  Row,
  Col,
  DatePicker,
  Divider,
  InputNumber,
  Card,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import {
  UploadOutlined,
  HomeOutlined,
  PhoneOutlined,
  PlusOutlined,
  MinusCircleOutlined,
  CheckOutlined,
  VideoCameraOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import {
  mobileRequiredRule,
  mobilePatternRule,
  normalizeIndianMobileDigits,
  sanitizeIndianMobileDigits,
  indianMobileTenDigitsRule,
  normalizeIndianMobileDigits,
  blockNonDigitKeysOnPhoneField,
  toE164IndiaLocal,
} from '../../utils/validation';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchMembers,
  normalizeMember,
  createMemberAsync,
  createMemberPersonalDetailsAsync,
  selectCreateMemberLoading,
} from '../../redux/membersSlice';
import {
  fetchMembershipPrices,
  selectMembershipPrices,
  selectMembershipPricesLoading,
} from '../../redux/membershipsSlice';
import {
  fetchBranchesAsync,
  selectBranches,
  selectBranchesLoading,
} from '../../redux/branchesSlice';
import FaceCapture from '../biometrics/FaceCapture';
import { Fingerprint } from 'lucide-react';
import { useMemberFingerprintWebAuthn } from '../../hooks/useMemberFingerprintWebAuthn';
import { IndianMobileFormField } from '../forms/IndianMobileFormField';
import {
  DEFAULT_CITY_CODE,
  DEFAULT_COUNTRY_CODE,
  DEFAULT_STATE_CODE,
  getCityOptions,
  getCountryOptions,
  getStateOptions,
  hasCityOptions,
} from '../../utils/addressOptions';

const { Option } = Select;
const { Text } = Typography;

interface AddMemberFormProps {
  visible?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AddMemberForm({ visible = true, onSuccess, onCancel }: AddMemberFormProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [fingerprintRegistered, setFingerprintRegistered] = useState(false);
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [facePersonId, setFacePersonId] = useState<string | null>(null);
  const [faceScanning, setFaceScanning] = useState(false);
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [fingerprintEnrolling, setFingerprintEnrolling] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const { registerPendingFingerprint, attachPendingFingerprintToMember } = useMemberFingerprintWebAuthn();

  // ── Redux state ──────────────────────────────────────────────────────────────
  const reduxPlans = useAppSelector(selectMembershipPrices);
  const plansLoading = useAppSelector(selectMembershipPricesLoading);
  const branches = useAppSelector(selectBranches);
  const branchesLoading = useAppSelector(selectBranchesLoading);
  const createLoading = useAppSelector(selectCreateMemberLoading);
  const selectedCountry = Form.useWatch('country', form) as string | undefined;
  const selectedState = Form.useWatch('state', form) as string | undefined;
  const countryOptions = React.useMemo(() => getCountryOptions(), []);
  const stateOptions = React.useMemo(
    () => getStateOptions(selectedCountry || DEFAULT_COUNTRY_CODE),
    [selectedCountry]
  );
  const cityOptions = React.useMemo(
    () => getCityOptions(selectedState || DEFAULT_STATE_CODE),
    [selectedState]
  );

  // Derive active plans with the shape the form needs
  const membershipTypes = React.useMemo(
    () =>
      reduxPlans
        .filter((m) => m.isActive !== false)
        .map((m) => ({
          id: m.id,
          type: typeof m.type === 'string' ? m.type.trim() : m.name || String(m.id || ''),
          name: m.name ?? m.type,
          price: m.price,
          duration: m.duration,
        })),
    [reduxPlans]
  );

  // ── Fetch on mount / visibility change ───────────────────────────────────────
  const prevVisibleRef = React.useRef(false);
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      dispatch(fetchMembershipPrices());
      if (user?.role === 'gym_owner' && user?.gymId) {
        dispatch(fetchBranchesAsync(user.gymId));
      }
    }
    prevVisibleRef.current = visible;
  }, [visible, dispatch, user?.role, user?.gymId]);

  useEffect(() => {
    if (!visible) return;
    const country = form.getFieldValue('country');
    const state = form.getFieldValue('state');
    const city = form.getFieldValue('city');

    if (!country) {
      form.setFieldValue('country', DEFAULT_COUNTRY_CODE);
    }
    if (!state) {
      form.setFieldValue('state', DEFAULT_STATE_CODE);
    }
    if (!city) {
      form.setFieldValue('city', DEFAULT_CITY_CODE);
    }
  }, [visible, form]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (values: any) => {
    setSubmitLoading(true);
    let memberId: string | null = null;
    try {
      // Build FormData for member creation
      const formData = new FormData();
      formData.append('firstName', values.firstName);
      formData.append('lastName', values.lastName);
      formData.append('phone', normalizeIndianMobileDigits(values.phoneNumber));
      formData.append('role', values.role ?? 'member');
      formData.append('branchId', values.branchId);
      if (facePersonId) formData.append('facePersonId', facePersonId);
      if (values.dateOfBirth) {
        const d = values.dateOfBirth instanceof Date
          ? values.dateOfBirth
          : new Date(values.dateOfBirth);
        if (!Number.isNaN(d.getTime())) {
          formData.append('dateOfBirth', d.toISOString().split('T')[0]);
        }
      }
      if (fileList.length > 0 && fileList[0].originFileObj) {
        formData.append('image', fileList[0].originFileObj);
      }

      // ── Dispatch create member (goes directly to backend via axiosClient) ──
      const memberObj = await dispatch(createMemberAsync(formData)).unwrap();
      memberId = memberObj?.id ?? memberObj?._id ?? null;
      if (memberId != null && typeof memberId !== 'string') memberId = String(memberId);
      if (!memberId) throw new Error('Failed to get member ID from response');

      // ── Dispatch create personal details (non-critical) ───────────────────
      const gender = values.personalGender === 'other' ? 'others' : values.personalGender;
      try {
        await dispatch(
          createMemberPersonalDetailsAsync({
            memberId,
            gender,
            streetAddress: values.streetAddress || '',
            city: values.city || '',
            zipcode: values.zipcode || '',
            state: values.state || '',
            country: values.country || '',
            phoneNumber: toE164IndiaLocal(values.phoneNumber),
            emergencyContacts: (values.emergencyContacts || []).map(
              (c: { name?: string; phone?: string; relation?: string }) => ({
                ...c,
                phone:
                  c?.phone != null && String(c.phone).trim() !== ''
                    ? toE164IndiaLocal(String(c.phone))
                    : c.phone,
              })
            ),
            dateOfBirth: values.dateOfBirth
              ? new Date(values.dateOfBirth).toISOString().split('T')[0]
              : '',
            membership: values.membership ? String(values.membership).trim() : '',
            planQuantity: values.planQuantity ?? 1,
            paidAmount: values.paidAmount ? String(values.paidAmount) : '0',
            membershipStartDate: values.membershipStartDate
              ? (values.membershipStartDate instanceof Date
                  ? values.membershipStartDate
                  : new Date(values.membershipStartDate)
                ).toISOString()
              : undefined,
          })
        ).unwrap();
      } catch (detailsErr: any) {
        message.warning(
          detailsErr?.message ||
            'Member created but membership/personal details could not be saved. You can edit the member to add details.'
        );
      }

      // ── Refresh members list ───────────────────────────────────────────────
      try {
        await dispatch(fetchMembers(undefined)).unwrap();
      } catch {
        // 403 for owner is expected; store already has new member from createMemberAsync
      }

      message.success('Member created successfully');
      form.resetFields();
      setFileList([]);
      setFingerprintRegistered(false);
      setFaceRegistered(false);
      setFacePersonId(null);

      // ── Attach pending fingerprint to the newly created member ─────────────
      if (memberId) {
        const attachRes = await attachPendingFingerprintToMember(memberId);
        if (!attachRes.success) {
          message.error(attachRes.message || 'Failed to attach fingerprint to member');
          return;
        }
      }

      onSuccess?.();
    } catch (err: any) {
      message.error(err?.message || 'Failed to create member');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRegisterPendingFingerprint = async () => {
    if (fingerprintEnrolling || fingerprintRegistered) return;
    setFingerprintEnrolling(true);
    try {
      const firstName = form.getFieldValue('firstName') as string | undefined;
      const lastName = form.getFieldValue('lastName') as string | undefined;
      const phoneDigits = normalizeIndianMobileDigits(
        form.getFieldValue('phoneNumber') as string | undefined
      );
      const fullName =
        `${firstName || ''} ${lastName || ''}`.trim() ||
        (phoneDigits ? `+91${phoneDigits}` : 'Pending Member');

      const res = await registerPendingFingerprint({
        userName: phoneDigits ? `+91${phoneDigits}` : fullName,
        displayName: fullName,
      });
      if (!res.success) {
        message.error(res.message || 'Fingerprint enrollment failed');
        return;
      }
      setFingerprintRegistered(true);
      message.success('Fingerprint registered successfully!');
    } finally {
      setFingerprintEnrolling(false);
    }
  };

  const handleFaceCaptured = async (blob: Blob) => {
    try {
      await form.validateFields(['firstName', 'lastName', 'phoneNumber', 'branchId']);
      setFaceScanning(true);
      const result = await api.biometrics.createFacePerson(blob);
      if (
        result &&
        typeof result === 'object' &&
        (result as { success?: boolean }).success === false
      ) {
        const errMsg = (result as { error?: string }).error || 'Face registration failed';
        if (String(errMsg).toLowerCase().includes('face')) {
          message.warning('Face not detected clearly. Please retake the photo.');
        } else {
          message.error(errMsg);
        }
        return;
      }
      const personId = (result as any)?.personId ?? (result as any)?.data?.personId;
      if (!personId) {
        message.error('Face registration failed');
        return;
      }
      setFacePersonId(String(personId));
      setFaceRegistered(true);
      setFaceModalOpen(false);
      message.success('Face registered successfully');
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || 'Failed to register face');
    } finally {
      setFaceScanning(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        role: 'member',
        personalGender: 'male',
        country: DEFAULT_COUNTRY_CODE,
        state: DEFAULT_STATE_CODE,
        city: DEFAULT_CITY_CODE,
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="First Name"
            name="firstName"
            rules={[{ required: true, message: 'Please enter first name' }]}
          >
            <Input placeholder="Enter first name" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Last Name"
            name="lastName"
            rules={[{ required: true, message: 'Please enter last name' }]}
          >
            <Input placeholder="Enter last name" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <IndianMobileFormField
            name="phoneNumber"
            label="Mobile number"
            rules={[mobileRequiredRule, mobilePatternRule()]}
            placeholder="Enter 10 Digit Mobile Number"
            addonBefore={
              <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium tabular-nums select-none">
                <PhoneOutlined className="opacity-80" />
                +91
              </span>
            }
            inputProps={{ inputMode: 'numeric' }}
          />
        </Col>
      </Row>

      {user?.role === 'gym_owner' ? (
        <Form.Item
          label="Branch"
          name="branchId"
          rules={[{ required: true, message: 'Please select branch' }]}
        >
          <Select placeholder="Select branch" loading={branchesLoading}>
            {branches.map((b) => (
              <Option key={b._id} value={b._id}>
                {b.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
      ) : (
        <>
          <Form.Item name="branchId" initialValue={user?.branchId} hidden>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item label="Branch">
            <Input disabled value={(user as any)?.branchName || 'My Branch'} />
          </Form.Item>
        </>
      )}

      <Form.Item label="Profile photo" tooltip="Optional. Shown in members list and details.">
        <Upload
          fileList={fileList}
          onChange={({ fileList: newFileList }) => setFileList(newFileList)}
          beforeUpload={() => false}
          accept="image/*"
          listType="picture-card"
          maxCount={1}
        >
          <div>
            <UploadOutlined />
            <div style={{ marginTop: 8 }}>Upload</div>
          </div>
        </Upload>
      </Form.Item>

      <Divider>Personal details</Divider>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="Gender"
            name="personalGender"
            rules={[{ required: true, message: 'Please select gender' }]}
          >
            <Select placeholder="Select gender">
              <Option value="male">Male</Option>
              <Option value="female">Female</Option>
              <Option value="other">Other</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="Date of Birth" name="dateOfBirth">
        <DatePicker
          style={{ width: '100%' }}
          placeholder="Select date of birth"
          format="DD-MM-YYYY"
        />
      </Form.Item>

      <Form.Item label="Street Address" name="streetAddress">
        <Input prefix={<HomeOutlined />} placeholder="Enter street address" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="City" name="city">
            <Select
              placeholder="Select city"
              options={cityOptions}
              showSearch
              optionFilterProp="label"
              disabled={!hasCityOptions(selectedState || DEFAULT_STATE_CODE)}
              notFoundContent="No city options available"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="State" name="state">
            <Select
              placeholder="Select state"
              options={stateOptions}
              showSearch
              optionFilterProp="label"
              onChange={(value) => {
                form.setFieldValue('state', value);
                form.setFieldValue('city', undefined);
              }}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Zipcode" name="zipcode">
            <Input placeholder="Enter zipcode" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="Country" name="country">
        <Select
          placeholder="Select country"
          options={countryOptions}
          showSearch
          optionFilterProp="label"
          onChange={(value) => {
            form.setFieldsValue({
              country: value,
              state: undefined,
              city: undefined,
            });
          }}
        />
      </Form.Item>

      <Divider>Plan & payment</Divider>
      <Card size="small" style={{ marginBottom: 16, background: '#fafafa' }}>
        <Row gutter={16}>
          <Col span={14}>
            <Form.Item
              label="Membership plan"
              name="membership"
              rules={[{ required: true, message: 'Please select a plan' }]}
            >
              <Select
                placeholder={
                  plansLoading
                    ? 'Loading plans...'
                    : membershipTypes.length === 0
                      ? 'No active plans found'
                      : 'Select plan'
                }
                loading={plansLoading}
                showSearch
                optionFilterProp="children"
                notFoundContent={
                  !plansLoading && membershipTypes.length === 0
                    ? 'No active membership plans. Add plans in Memberships first.'
                    : null
                }
                options={membershipTypes.map((m) => ({
                  key: m.id,
                  value: m.type,
                  label: `${m.type} – ₹${Number(m.price) ?? 0} (${Number(m.duration) ?? 0} days)`,
                }))}
              />
            </Form.Item>
          </Col>
          <Col span={10} />
        </Row>

        <Form.Item
          label="Start date"
          name="membershipStartDate"
          tooltip="Membership period starts from this date."
          initialValue={undefined}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD-MM-YYYY"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prev, curr) => prev.membership !== curr.membership}
        >
          {() => {
            const plan = membershipTypes.find(
              (m) => m.type === form.getFieldValue('membership')
            );
            const maxAmount =
              plan && typeof plan.price === 'number' ? plan.price : null;
            return maxAmount != null ? (
              <div style={{ marginBottom: 12 }}>
                <Text type="secondary">Maximum amount for selected plan: </Text>
                <Text strong>₹{maxAmount.toLocaleString('en-IN')}</Text>
              </div>
            ) : null;
          }}
        </Form.Item>

        <Form.Item
          label="Paid amount"
          name="paidAmount"
          initialValue={0}
          rules={[
            { type: 'number', min: 0, message: 'Amount must be ≥ 0' },
            () => ({
              validator(_, value) {
                if (value == null || value === '' || !membershipTypes.length) {
                  return Promise.resolve();
                }
                const selectedType = form.getFieldValue('membership');
                if (!selectedType) return Promise.resolve();
                const plan = membershipTypes.find((m) => m.type === selectedType);
                if (!plan || typeof plan.price !== 'number') return Promise.resolve();
                const maxAmount = plan.price;
                if (value > maxAmount) {
                  return Promise.reject(
                    new Error(`Cannot exceed maximum (₹${maxAmount.toLocaleString('en-IN')})`)
                  );
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="Enter amount (max shown above)"
            min={0}
          />
        </Form.Item>
      </Card>

      <Form.List name="emergencyContacts">
        {(fields, { add, remove }) => (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <label style={{ fontWeight: 500 }}>Emergency Contacts</label>
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} size="small">
                Add Contact
              </Button>
            </div>
            {fields.map(({ key, name, ...rest }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <Row gutter={16} align="middle">
                  <Col span={8}>
                    <Form.Item
                      {...rest}
                      name={[name, 'name']}
                      rules={[{ required: true, message: 'Missing contact name' }]}
                    >
                      <Input placeholder="Contact name" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      {...rest}
                      name={[name, 'phone']}
                      normalize={(v) => sanitizeIndianMobileDigits(v as string)}
                      rules={[
                        { required: true, message: 'Missing phone number' },
                        indianMobileTenDigitsRule(),
                      ]}
                    >
                      <Input
                        prefix="+91"
                        placeholder="9876543210"
                        maxLength={10}
                        inputMode="numeric"
                        autoComplete="tel-national"
                        onKeyDown={blockNonDigitKeysOnPhoneField}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      {...rest}
                      name={[name, 'relation']}
                      rules={[{ required: true, message: 'Missing relation' }]}
                    >
                      <Select placeholder="Relation">
                        <Option value="spouse">Spouse</Option>
                        <Option value="parent">Parent</Option>
                        <Option value="sibling">Sibling</Option>
                        <Option value="friend">Friend</Option>
                        <Option value="other">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={2}>
                    <Button
                      type="text"
                      danger
                      icon={<MinusCircleOutlined />}
                      onClick={() => remove(name)}
                    />
                  </Col>
                </Row>
              </div>
            ))}
          </>
        )}
      </Form.List>

      <Form.Item style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <Button
            onClick={handleRegisterPendingFingerprint}
            type={fingerprintRegistered ? 'primary' : 'default'}
            loading={fingerprintEnrolling}
            disabled={fingerprintEnrolling || fingerprintRegistered}
            icon={fingerprintRegistered ? <CheckOutlined /> : <Fingerprint className="w-4 h-4" />}
            style={fingerprintRegistered ? { background: '#52c41a', borderColor: '#52c41a' } : {}}
          >
            {fingerprintRegistered ? 'Fingerprint Registered' : 'Register Fingerprint'}
          </Button>

          <Button
            onClick={() => setFaceModalOpen(true)}
            loading={faceScanning}
            type={faceRegistered ? 'primary' : 'default'}
            disabled={!fingerprintRegistered || faceRegistered}
            icon={faceRegistered ? <CheckOutlined /> : <VideoCameraOutlined />}
            style={
              faceRegistered
                ? { background: '#52c41a', borderColor: '#52c41a', color: '#fff' }
                : undefined
            }
          >
            {faceRegistered ? 'Face Added' : 'Add Face Recognition'}
          </Button>

          <Button
            type="primary"
            htmlType="submit"
            loading={submitLoading || createLoading}
            size="large"
            disabled={!fingerprintRegistered || !faceRegistered || fingerprintEnrolling}
          >
            Create Member
          </Button>
          <Button onClick={onCancel}>Cancel</Button>
        </div>
      </Form.Item>

      <FaceCapture
        visible={faceModalOpen}
        onCancel={() => setFaceModalOpen(false)}
        onCapture={handleFaceCaptured}
      />
    </Form>
  );
}
