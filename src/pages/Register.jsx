import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  const validatePasswordRules = (p) => {
    const lenOk = p.length >= 8 && p.length <= 16;
    const upper = /[A-Z]/.test(p);
    return { ok: lenOk && upper, details: { lenOk, upper } };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let ok = true;
    const newErrors = {};

    if (!name || name.trim().length < 2) {
      newErrors.name = 'Nombre demasiado corto';
      ok = false;
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Introduce un correo válido';
      ok = false;
    }

    const vp = validatePasswordRules(password);
    if (!vp.ok) {
      const parts = [];
      if (!vp.details.lenOk) parts.push('8–16 caracteres');
      if (!vp.details.upper) parts.push('al menos una mayúscula');
      newErrors.password = 'Contraseña debe tener: ' + parts.join(', ');
      ok = false;
    }

    setErrors(newErrors);

    if (ok) {
      navigate('/home');
    }
  };

  return (
    <div className="relative min-h-screen">
      <header className="absolute top-0 left-0 p-4 z-10">
        <h1 className="text-lg font-bold">PDFReader</h1>
      </header>
      <section className="p-6 min-h-screen flex flex-col justify-center" aria-labelledby="signupTitle">
        <div className="max-w-md w-full mx-auto pt-10">
          <button type="button" onClick={() => navigate('/login')} className="mb-4 flex items-center gap-1">
          <span className="material-symbols-outlined">chevron_left</span> Volver
        </button>
        <h2 id="signupTitle" className="text-2xl font-bold mb-4">Crear Cuenta</h2>
        
        <form onSubmit={handleSubmit} noValidate>
          <label className="block text-sm mb-1 text-left">Nombre</label>
          <input
            type="text"
            placeholder="Tu nombre"
            className={`w-full mb-2 p-3 rounded-lg surface ${errors.name ? 'input-error' : ''}`}
            value={name}
            onChange={(e) => { setName(e.target.value); setErrors(prev => ({...prev, name: ''})); }}
            required
            aria-invalid={!!errors.name}
          />
          {errors.name && <div className="error-text" aria-live="polite">{errors.name}</div>}

          <label className="block text-sm mb-1 text-left mt-2">Email</label>
          <input
            type="email"
            placeholder="tu@email.com"
            className={`w-full mb-2 p-3 rounded-lg surface ${errors.email ? 'input-error' : ''}`}
            value={email}
            onChange={(e) => { setEmail(e.target.value); setErrors(prev => ({...prev, email: ''})); }}
            required
            aria-invalid={!!errors.email}
          />
          {errors.email && <div className="error-text" aria-live="polite">{errors.email}</div>}

          <label className="block text-sm mb-1 text-left mt-2">Contraseña</label>
          <input
            type="password"
            placeholder="Crea una contraseña segura"
            className={`w-full mb-1 p-3 rounded-lg surface ${errors.password ? 'input-error' : ''}`}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors(prev => ({...prev, password: ''})); }}
            required
            aria-describedby="pwdHelp"
            aria-invalid={!!errors.password}
          />
          {errors.password && <div className="error-text" aria-live="polite">{errors.password}</div>}
          <div id="pwdHelp" className="text-xs opacity-70 mb-2">8–16 caracteres, una mayúscula mínimo. Puedes usar números y símbolos.</div>

          <button type="submit" className="w-full mt-2 p-3 rounded-lg accent">Crear cuenta</button>
        </form>
      </div>
    </section>
  </div>
  );
}
