import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Forgot() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Introduce un correo válido');
      return;
    }

    alert('Se ha enviado un enlace de recuperación (simulado).');
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen">
      <header className="absolute top-0 left-0 p-4 z-10">
        <h1 className="text-lg font-bold">PDFReader</h1>
      </header>
      <section className="p-6 min-h-screen flex flex-col justify-center" aria-labelledby="forgotTitle">
        <div className="max-w-md w-full mx-auto pt-10">
          <button type="button" onClick={() => navigate('/login')} className="mb-4 flex items-center gap-1">
            <span className="material-symbols-outlined">chevron_left</span> Volver
          </button>
          <h2 id="forgotTitle" className="text-2xl font-bold mb-4">Recuperar Contraseña</h2>
          
          <form onSubmit={handleSubmit} noValidate>
            <label className="block text-sm mb-1 text-left">Email</label>
            <input
              type="email"
              placeholder="tu@email.com"
              className={`w-full mb-2 p-3 rounded-lg surface ${error ? 'input-error' : ''}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              required
              aria-invalid={!!error}
            />
            {error && <div className="error-text" aria-live="polite">{error}</div>}

            <button type="submit" className="w-full mt-4 p-3 rounded-lg accent">Enviar enlace</button>
          </form>
        </div>
      </section>
    </div>
  );
}
