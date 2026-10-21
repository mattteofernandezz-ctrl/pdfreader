import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validatePasswordRules = (p) => {
    const lenOk = p.length >= 8 && p.length <= 16;
    const upper = /[A-Z]/.test(p);
    return { ok: lenOk && upper };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let ok = true;
    setEmailError('');
    setPasswordError('');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Introduce un correo válido');
      ok = false;
    }

    const v = validatePasswordRules(password);
    if (!v.ok) {
      setPasswordError('Contraseña inválida. 8–16 caracteres y al menos una mayúscula.');
      ok = false;
    }

    if (ok) {
      // Mockup login succesful, navigate to Home
      navigate('/home');
    }
  };

  return (
    <div className="relative min-h-screen">
      <header className="absolute top-0 left-0 p-4 z-10">
        <h1 className="text-lg font-bold">PDFReader</h1>
      </header>
      <section className="min-h-screen p-6 flex flex-col justify-center" aria-labelledby="loginTitle">
        <div className="max-w-md w-full mx-auto">
          <h2 id="loginTitle" className="text-2xl font-bold mb-4 text-center">Iniciar Sesión</h2>
        <form onSubmit={handleSubmit} noValidate>
          <label className="block text-sm mb-1 text-left">Email</label>
          <input
            type="email"
            placeholder="tu@email.com"
            className={`w-full mb-2 p-3 rounded-lg surface ${emailError ? 'input-error' : ''}`}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
            required
            aria-required="true"
            aria-invalid={!!emailError}
          />
          {emailError && <div className="error-text" aria-live="polite">{emailError}</div>}

          <label className="block text-sm mb-1 text-left mt-2">Contraseña</label>
          <input
            type="password"
            placeholder="••••••••"
            className={`w-full mb-2 p-3 rounded-lg surface ${passwordError ? 'input-error' : ''}`}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
            required
            aria-invalid={!!passwordError}
          />
          {passwordError && <div className="error-text" aria-live="polite">{passwordError}</div>}

          <button type="submit" className="w-full mt-4 p-3 rounded-lg accent" aria-label="Iniciar sesión">
            Entrar
          </button>
        </form>

        <div className="flex justify-between mt-4 text-sm">
          <button type="button" onClick={() => navigate('/forgot')} className="text-left underline">¿Olvidaste tu contraseña?</button>
          <button type="button" onClick={() => navigate('/register')} className="underline">Crear cuenta</button>
        </div>
      </div>
    </section>
  </div>
  );
}
