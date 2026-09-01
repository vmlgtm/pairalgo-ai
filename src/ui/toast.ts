import { iconCheckCircle, iconXCircle, iconLightbulb } from './icons';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export function showToast(message: string, type: ToastType = 'info', durationMs: number = 3000): void {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon =
    type === 'success'
      ? iconCheckCircle({ size: 14, className: 'icon' })
      : type === 'error'
      ? iconXCircle({ size: 14, className: 'icon' })
      : iconLightbulb({ size: 14, className: 'icon' });

  toast.innerHTML = `<span class="toast-icon">${icon}</span> <span class="toast-message">${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 200);
  }, durationMs);
}
