import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/context/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { AuthShell } from "@/components/layout/AuthShell";
import { errorMessage } from "@/lib/errors";

export function RegisterPage() {
  const { register } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password);
      push({ type: "success", title: "Workspace created", description: "Your workspace is ready." });
      navigate("/");
    } catch (err) {
      setError(errorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Start answering from your documents in minutes."
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form onSubmit={submit} className="stack" style={{ "--gap": "16px" } as React.CSSProperties}>
        <Field label="Your name" htmlFor="register-name">
          <Input
            id="register-name"
            type="text"
            placeholder="Sara Ali"
            icon={<User size={16} />}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </Field>
        <Field label="Work email" htmlFor="register-email">
          <Input
            id="register-email"
            type="email"
            placeholder="you@company.com"
            icon={<Mail size={16} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password" hint="At least 8 characters" htmlFor="register-password">
          <div className="input" style={{ gap: 8 }}>
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="msg-action"
              aria-label="Toggle password visibility"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </Field>

        {error && (
          <div className="field-error" role="alert">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" block variant="gradient" loading={loading}>
          {!loading && "Create workspace"}
        </Button>
      </form>
    </AuthShell>
  );
}