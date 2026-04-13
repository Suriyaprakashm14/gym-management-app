'use client';

import React, { useState, useEffect } from 'react';
import {
  App,
  Modal,
  Form,
  Input,
  Select,
  Button,
  Card,
  Row,
  Col,
  Upload,
  Space,
  Typography,
  Divider,
  DatePicker,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  UploadOutlined,
  HomeOutlined,
  PlusOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import {
  fetchMemberPersonalDetailsAsync,
  updateMemberAsync,
  updateMemberProfileImageAsync,
  updateMemberPersonalDetailsAsync,
  createMemberPersonalDetailsAsync,
  clearPersonalDetails,
  selectMemberPersonalDetails,
  selectMemberPersonalDetailsLoading,
  selectUpdateMemberLoading,
} from '../../redux/membersSlice';
import {
  emailRule,
  emailPatternRule,
  mobileRequiredRule,
  mobilePatternRule,
  sanitizeIndianMobileDigits,
  indianMobileTenDigitsRule,
  blockNonDigitKeysOnPhoneField,
  toE164IndiaLocal,
  parseIndianMobileToTenDigits,
} from '../../utils/validation';
import { IndianMobileFormField } from '../forms/IndianMobileFormField';

const { Option } = Select;

interface EditMemberModalProps {
  visible: boolean;
  onClose: () => void;
  member: any;
}

const EditMemberModal: React.FC<EditMemberModalProps> = ({ visible, onClose, member }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [submitLoading, setSubmitLoading] = useState(false);

  const dispatch = useAppDispatch();

  // ── Redux state ─────────────────────────────────────────────────────────────
  const personalDetails = useAppSelector(selectMemberPersonalDetails);
  const personalDetailsLoading = useAppSelector(selectMemberPersonalDetailsLoading);
  const updateLoading = useAppSelector(selectUpdateMemberLoading);

  // ── Load member data when modal opens ────────────────────────────────────────
  useEffect(() => {
    if (!visible || !member?.id) return;

    // Basic member fields
    form.setFieldsValue({
      firstName: member.firstName ?? '',
      lastName: member.lastName ?? '',
      email: member.email ?? '',
      phone: parseIndianMobileToTenDigits(member.phone ?? member.profile?.phone ?? ''),
      age: member.age ?? member.profile?.age ?? undefined,
      gender: member.gender ?? member.profile?.gender ?? 'male',
      role: member.role ?? 'member',
      status: member.status ?? 'active',
    });

    // Profile photo preview
    if (member.image) {
      const src =
        typeof member.image === 'string' && member.image.startsWith('data:')
          ? member.image
          : `data:image/jpeg;base64,${member.image}`;
      setFileList([{ uid: '-1', name: 'current-image.jpg', status: 'done', url: src }]);
    } else {
      setFileList([]);
    }

    // Fetch personal details via Redux
    dispatch(fetchMemberPersonalDetailsAsync(member.id));
  }, [visible, member?.id]);

  // ── Populate personal detail fields once Redux resolves ─────────────────────
  useEffect(() => {
    if (!visible) return;
    form.setFieldsValue({
      dateOfBirth: personalDetails?.dateOfBirth
        ? dayjs(personalDetails.dateOfBirth)
        : undefined,
      streetAddress: personalDetails?.streetAddress ?? '',
      city: personalDetails?.city ?? '',
      zipcode: personalDetails?.zipcode ?? '',
      state: personalDetails?.state ?? '',
      country: personalDetails?.country ?? '',
      phoneNumber: parseIndianMobileToTenDigits(personalDetails?.phoneNumber ?? ''),
      emergencyContacts: personalDetails?.emergencyContacts ?? [],
    });
  }, [personalDetails, visible]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (values: any) => {
    setSubmitLoading(true);
    try {
      // 1. Upload new profile image if changed
      const newImageFile =
        fileList.length > 0 && fileList[0].originFileObj ? fileList[0].originFileObj : null;
      if (newImageFile) {
        const imageForm = new FormData();
        imageForm.append('image', newImageFile);
        await dispatch(
          updateMemberProfileImageAsync({ id: member.id, formData: imageForm })
        ).unwrap();
      }

      // 2. Update basic member info
      await dispatch(
        updateMemberAsync({
          id: member.id,
          data: {
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phone: toE164IndiaLocal(values.phone),
            age: values.age,
            gender: values.gender,
            role: values.role,
            status: values.status,
          },
        })
      ).unwrap();

      // 3. Update or create personal details (non-critical)
      const personalDetailsData = {
        gender: values.gender,
        streetAddress: values.streetAddress || '',
        city: values.city || '',
        zipcode: values.zipcode || '',
        state: values.state || '',
        country: values.country || '',
        phoneNumber: values.phoneNumber ? toE164IndiaLocal(values.phoneNumber) : toE164IndiaLocal(values.phone),
        dateOfBirth: values.dateOfBirth
          ? (values.dateOfBirth.toISOString
              ? values.dateOfBirth.toISOString().split('T')[0]
              : new Date(values.dateOfBirth).toISOString().split('T')[0])
          : '',
        emergencyContacts: (values.emergencyContacts || []).map(
          (c: { name?: string; phone?: string; relation?: string }) => ({
            ...c,
            phone:
              c?.phone != null && String(c.phone).trim() !== ''
                ? toE164IndiaLocal(String(c.phone))
                : c.phone,
          })
        ),
      };

      try {
        if (personalDetails != null) {
          await dispatch(
            updateMemberPersonalDetailsAsync({ memberId: member.id, data: personalDetailsData })
          ).unwrap();
        } else {
          await dispatch(
            createMemberPersonalDetailsAsync({
              memberId: member.id,
              ...personalDetailsData,
              membership: member?.membership ?? '',
              paidAmount: '0',
            })
          ).unwrap();
        }
      } catch (personalErr: any) {
        message.warning(
          personalErr?.message ||
            'Member updated but personal details could not be saved.'
        );
      }

      message.success('Member updated successfully');
      handleCancel();
    } catch (err: any) {
      message.error(err?.message || 'Failed to update member');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setFileList([]);
    dispatch(clearPersonalDetails());
    onClose();
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Modal
      title={
        <Space>
          <UserOutlined />
          <span>Edit Member Details</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={"60%"}
      height={"90%"}
      destroyOnHidden={false}
      rootClassName="member-edit-modal"
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(100vh - 140px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px 0',
        },
        content: { overflow: 'hidden' },
      }}
    >
      <Card size="small" style={{ margin: 0 }}>
        <Form
          form={form}
          layout="vertical"
          size="small"
          onFinish={handleSubmit}
          initialValues={{ gender: 'male', role: 'member', status: 'active' }}
        >
          {/* ── Basic info ─────────────────────────────────────────────────── */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="First Name"
                name="firstName"
                rules={[{ required: true, message: 'Please enter first name' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Enter first name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Last Name"
                name="lastName"
                rules={[{ required: true, message: 'Please enter last name' }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Enter last name" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Email"
                name="email"
                rules={[emailPatternRule()]}
              >
                <Input prefix={<MailOutlined />} placeholder="Enter email address" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <IndianMobileFormField
                name="phone"
                label="Phone"
                rules={[mobileRequiredRule, mobilePatternRule()]}
                placeholder="Enter 10 digit number"
                addonBefore={
                  <span className="inline-flex items-center gap-1 font-medium tabular-nums select-none">
                    <PhoneOutlined className="opacity-80" />
                    +91
                  </span>
                }
                inputProps={{ inputMode: 'numeric' }}
              />
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Age" name="age">
                <Input type="number" placeholder="Enter age" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Gender"
                name="gender"
                rules={[{ required: true, message: 'Please select gender' }]}
              >
                <Select placeholder="Select gender">
                  <Option value="male">Male</Option>
                  <Option value="female">Female</Option>
                  <Option value="other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Role"
                name="role"
                rules={[{ required: true, message: 'Please select role' }]}
              >
                <Select placeholder="Select role">
                  <Option value="member">Member</Option>
                  <Option value="trainer">Trainer</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Status"
            name="status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select placeholder="Select status">
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
              <Option value="long term inactive">Long term inactive</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Profile photo"
            tooltip="Upload a new image to replace the current one."
          >
            <Upload
              name="image"
              multiple={false}
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: fl }) => setFileList(fl)}
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

          {/* ── Personal details ───────────────────────────────────────────── */}
          <Divider>Personal details</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Date of Birth" name="dateOfBirth">
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="Select date of birth"
                  format="DD-MM-YYYY"
                  disabled={personalDetailsLoading}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <IndianMobileFormField
                name="phoneNumber"
                label="Personal Phone"
                rules={[indianMobileTenDigitsRule()]}
                placeholder="9876543210"
                addonBefore={
                  <span className="inline-flex items-center gap-1 font-medium tabular-nums select-none">
                    <PhoneOutlined className="opacity-80" />
                    +91
                  </span>
                }
                inputProps={{ inputMode: 'numeric' }}
              />
            </Col>
          </Row>

          <Form.Item label="Street Address" name="streetAddress">
            <Input prefix={<HomeOutlined />} placeholder="Enter street address" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="City" name="city">
                <Input placeholder="Enter city" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="State" name="state">
                <Input placeholder="Enter state" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Zipcode" name="zipcode">
                <Input placeholder="Enter zipcode" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Country" name="country">
            <Input placeholder="Enter country" />
          </Form.Item>

          {/* ── Emergency contacts ─────────────────────────────────────────── */}
          <Divider>Emergency Contacts</Divider>
          <Form.List name="emergencyContacts">
            {(fields, { add, remove }) => (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontWeight: 500 }}>Contacts</span>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    icon={<PlusOutlined />}
                    size="small"
                  >
                    Add Contact
                  </Button>
                </div>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <Row gutter={12} align="middle">
                      <Col span={8}>
                        <Form.Item
                          {...rest}
                          name={[name, 'name']}
                          rules={[{ required: true, message: 'Missing name' }]}
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
                            { required: true, message: 'Missing phone' },
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

          {/* ── Submit ─────────────────────────────────────────────────────── */}
          <Form.Item style={{ marginTop: 16 }}>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitLoading || updateLoading}
                size="large"
              >
                Update Member
              </Button>
              <Button onClick={handleCancel} size="large">
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </Modal>
  );
};

export default EditMemberModal;
