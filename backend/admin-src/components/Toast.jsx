import React from 'react';

export const Toast = ({ toast }) => {
  if (!toast || !toast.message) return null;
  return (
    <div className={`toast show ${toast.type || 'info'}`}>
      {toast.message}
    </div>
  );
};
