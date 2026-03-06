'use client';

import React from 'react';
import { Modal } from 'antd';
import AddMemberForm from './AddMemberForm';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddMemberModal({ open, onClose }: AddMemberModalProps) {
  return (
    <Modal
      title="Add member"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
      styles={{
        body: {
          maxHeight: '75vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 0',
        },
        content: {
          overflow: 'hidden',
        },
      }}
      style={{ top: 24 }}
      wrapClassName="add-member-modal-wrap"
    >
      <div style={{ paddingRight: 8 }}>
        <AddMemberForm onSuccess={onClose} onCancel={onClose} />
      </div>
    </Modal>
  );
}
