import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useToast } from "@/context/ToastProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { AuthShell } from "@/components/layout/AuthShell";
import { errorMessage } from "@/lib/errors";

export function LoginPage() {
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      push({ type: "success", title: "Welcome back", description: "Signed in successfully." });
      navigate("/");
    } catch (err) {
      setError(errorMessage(err, "Sign-in failed. Please check your credentials."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your workspace to continue."
      footer={
        <>
          Don&apos;t have an account? <Link to="/register">Create a workspace</Link>
        </>
      }
    >
      <form onSubmit={submit} className="stack" style={{ "--gap": "16px" } as React.CSSProperties}>
        <Field label="Email address" htmlFor="login-email">
          <Input
            id="login-email"
            type="email"
            placeholder="you@company.com"
            icon={<Mail size={16} />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <Input
            id="login-password"
            type="password"
            placeholder="••••••••"
            icon={<Lock size={16} />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        {error && (
          <div className="field-error" role="alert">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" block loading={loading}>
          {!loading && "Continue"}
        </Button>
      </form>
    </AuthShell>
  );
}