interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
  duration?: number;
}

export function useToast() {
  const toast = ({ title, description, variant = "default", duration = 5000 }: ToastOptions) => {
    // Simple toast implementation - can be replaced with proper toast library later
    const toastElement = document.createElement("div");
    toastElement.className = `fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg max-w-sm transform-gpu ${
      variant === "destructive"
        ? "bg-red-50 border border-red-200 text-red-800"
        : variant === "success"
          ? "bg-green-50 border border-green-200 text-green-800"
          : "bg-blue-50 border border-blue-200 text-blue-800"
    }`;

    toastElement.innerHTML = `
      <div class="font-medium">${title}</div>
      ${description ? `<div class="text-sm mt-1">${description}</div>` : ""}
    `;

    document.body.appendChild(toastElement);

    // Auto remove after duration
    setTimeout(() => {
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
    }, duration);

    // Also allow manual removal by clicking
    toastElement.addEventListener("click", () => {
      if (toastElement.parentNode) {
        toastElement.parentNode.removeChild(toastElement);
      }
    });
  };

  return { toast };
}
