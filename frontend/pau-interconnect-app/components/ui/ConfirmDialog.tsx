"use client";
import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Typography } from "./Typography";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info" | "success";
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}) => {
  const icons = {
    danger: <AlertTriangle className="w-6 h-6 text-danger" />,
    warning: <AlertTriangle className="w-6 h-6 text-warning" />,
    info: <Info className="w-6 h-6 text-info" />,
    success: <CheckCircle2 className="w-6 h-6 text-success" />,
  };

  const bgTints = {
    danger: "bg-danger-subtle",
    warning: "bg-warning-subtle",
    info: "bg-info-subtle",
    success: "bg-success-subtle",
  };

  const colorType = variant === "danger" ? "danger" : "primary";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      ariaLabel={title}
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="solid"
            colorType={colorType}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${bgTints[variant]}`}
        >
          {icons[variant]}
        </div>
        <div>
          <Typography variant="h4" weight="bold" className="mb-2">
            {title}
          </Typography>
          <Typography variant="body2" color="muted" className="leading-relaxed">
            {message}
          </Typography>
        </div>
      </div>
    </Modal>
  );
};
