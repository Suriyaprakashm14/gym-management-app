'use client';

import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function StaffsPage() {
  return (
    <div style={{ padding: 24 }}>
      <Title level={3}>Staffs</Title>
      <Paragraph type="secondary">
        Staff management coming soon. You will be able to manage staff members, roles, and branch assignments here.
      </Paragraph>
    </div>
  );
}
