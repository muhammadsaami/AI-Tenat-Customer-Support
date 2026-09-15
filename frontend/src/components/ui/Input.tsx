import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/util";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("field", className)}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? (
        <div className="field-error" role="alert">
          <AlertCircle size={14} />
          {error}
        </div>
      ) : hint ? (
        <div className="field-hint">{hint}</div>
      ) : null}
    </div>
  );
}

export function Input({
  icon,
  className,
  isError,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
  isError?: boolean;
}) {
  return (
    <div className={cn("input", isError && "is-error", className)}>
      {icon}
      <input {...rest} />
    </div>
  );
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("textarea", className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("select", className)} {...rest}>
      {children}
    </select>
  );
}