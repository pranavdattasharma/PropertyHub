
import { useState } from "react";
import { login, register } from "../services/authService";

export default function Login({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const result = isRegistering
        ? await register(name, email, password)
        : await login(email, password);

      if (!result.token) {
        throw new Error("Authentication succeeded without a token.");
      }
      localStorage.setItem("token", result.token);
      onLogin(result.user);
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <span className="brand-mark">P.</span>
          <span>PROPERTY MANAGEMENT</span>
        </div>

        <h1>{isRegistering ? "Create your account" : "Welcome back"}</h1>
        <p className="login-subtitle">
          {isRegistering
            ? "Create your tenant account to get started."
            : "Sign in to manage your property."}
        </p>

        <form className="stack-form login-form" onSubmit={handleSubmit}>
          {isRegistering && (
            <label>
              Full name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your full name"
                required
              />
            </label>
          )}

          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete={isRegistering ? "new-password" : "current-password"}
              required
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button className="primary-button login-button" disabled={busy}>
            {busy
              ? "Please wait..."
              : isRegistering
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <button
          className="text-button login-toggle"
          onClick={() => {
            setIsRegistering((value) => !value);
            setError("");
          }}
        >
          {isRegistering
            ? "Already registered? Sign in"
            : "New tenant? Create an account"}
        </button>
      </section>
    </div>
  );
}
