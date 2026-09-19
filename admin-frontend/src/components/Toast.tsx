import React from 'react';
import { useAdmin } from '../context/AdminContext';

export const Toast: React.FC = () => {
  const { toastMessage } = useAdmin();

  if (!toastMessage) return null;

  return (
    <div className={`toast ${toastMessage ? 'show' : ''}`}>
      {toastMessage}
    </div>
  );
};
