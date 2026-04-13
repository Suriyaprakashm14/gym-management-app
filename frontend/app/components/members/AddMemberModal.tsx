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
      width={"60%"}
      height={"90%"}
      centered={true}
      destroyOnHidden={false}
      rootClassName="add-member-modal"
      styles={{
        body: {
          maxHeight: 'min(80vh, 760px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px 20px 20px',
        },
        content: {
          overflow: 'hidden',
        },
      }}
      style={{ top: 24 }}
    >
      <AddMemberForm visible={open} onSuccess={onClose} onCancel={onClose} />
    </Modal>
  );
}
