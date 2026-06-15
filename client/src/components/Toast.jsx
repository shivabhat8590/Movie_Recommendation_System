import { useState, useEffect } from 'react';

const toasts = [];
let setToastsRef = null;

export const toast = {
  success: (msg) => addToast(msg, 'success'),
  error: (msg) => addToast(msg, 'error'),
  info: (msg) => addToast(msg, 'info'),
};

function addToast(message, type) {
  const id = Date.now();
  const newToast = { id, message, type };
  if (setToastsRef) {
    setToastsRef((prev) => [...prev, newToast]);
    setTimeout(() => {
      if (setToastsRef) setToastsRef((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { setToastsRef = setToasts; return () => { setToastsRef = null; }; }, []);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' && '✅ '}
          {t.type === 'error' && '❌ '}
          {t.type === 'info' && 'ℹ️ '}
          {t.message}
        </div>
      ))}
    </div>
  );
}
