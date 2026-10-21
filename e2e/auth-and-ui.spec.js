import { test, expect } from '@playwright/test';

test.describe('Matriz de Pruebas Automatizadas - PDFReader (E2E Completo)', () => {

  test('TC-001: Login Exitoso con credenciales válidas y navegación a Home', async ({ page }) => {
    await page.goto('/#/login');

    // Llenar formulario con credenciales válidas
    await page.fill('input[type="email"]', 'user@test.com');
    await page.fill('input[type="password"]', 'Valida123');
    await page.click('button[type="submit"]');

    // Verificar redirección a /home
    await expect(page).toHaveURL(/.*home/);
    await expect(page.locator('#homeTitle')).toHaveText('Lectura y Audio');
  });

  test('TC-002: Login Negativo - Correo y Contraseña Inválidos', async ({ page }) => {
    await page.goto('/#/login');

    // 1. Email inválido
    await page.fill('input[type="email"]', 'invalido-email');
    await page.fill('input[type="password"]', 'Valida123');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-text')).toContainText('Introduce un correo válido');

    // 2. Contraseña sin mayúscula
    await page.fill('input[type="email"]', 'user@test.com');
    await page.fill('input[type="password"]', 'minuscula123');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-text')).toContainText('Contraseña inválida. 8–16 caracteres y al menos una mayúscula.');
  });

  test('TC-003 / TC-004 / TC-005: Datos Límite en Contraseña', async ({ page }) => {
    await page.goto('/#/login');

    // Límite inferior inválido (7 caracteres)
    await page.fill('input[type="email"]', 'user@test.com');
    await page.fill('input[type="password"]', 'Abc1234'); // 7 chars
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-text')).toBeVisible();

    // Límite superior inválido (17 caracteres)
    await page.fill('input[type="password"]', 'Abcdefghijk123456'); // 17 chars
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-text')).toBeVisible();

    // Límite exacto válido (8 caracteres con mayúscula)
    await page.fill('input[type="password"]', 'Abcdefg1'); // 8 chars
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*home/);
  });

  test('TC-006: Validación en Formulario de Registro', async ({ page }) => {
    await page.goto('/#/register');

    // Intentar registrar sin datos
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-text').first()).toBeVisible();

    // Nombre demasiado corto
    await page.fill('input[placeholder="Tu nombre"]', 'A');
    await page.fill('input[placeholder="tu@email.com"]', 'nuevo@test.com');
    await page.fill('input[placeholder="Crea una contraseña segura"]', 'Password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('.error-text')).toContainText('Nombre demasiado corto');

    // Registro completo válido
    await page.fill('input[placeholder="Tu nombre"]', 'Juan Pérez');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*home/);
  });

  test('TC-011: Accesibilidad por Teclado y Atributos ARIA', async ({ page }) => {
    await page.goto('/#/login');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute('aria-required', 'true');

    // Provocar error y verificar aria-invalid
    await page.click('button[type="submit"]');
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('TC-012: Cambio de Tema Visual y Persistencia en LocalStorage', async ({ page }) => {
    await page.goto('/#/home');

    // Abrir panel de temas
    await page.click('button[title="Apariencia"]');
    await expect(page.locator('#themeTitle')).toBeVisible();

    // Seleccionar tema "Negro total"
    await page.click('text="Negro total"');

    // Verificar en localStorage
    const savedMode = await page.evaluate(() => localStorage.getItem('librook_mode'));
    expect(savedMode).toBe('black');

    // Recargar la página y verificar persistencia
    await page.reload();
    const persistedMode = await page.evaluate(() => localStorage.getItem('librook_mode'));
    expect(persistedMode).toBe('black');
  });

  test('TC-013: Navegación y Carga del Visor de PDF', async ({ page }) => {
    await page.goto('/#/home');

    // Clic en el botón "Abrir Lector"
    await page.click('text="Abrir Lector"');
    await expect(page).toHaveURL(/.*reader/);

    // Verificar controles del visor
    await expect(page.locator('h1')).toContainText('PDFReader');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.locator('text="Cargar PDF"')).toBeVisible();
    await expect(page.locator('button:has-text("Leer Página")')).toBeVisible();
  });

  test('TC-014: Sección de Texto a Voz (TTS) en Home', async ({ page }) => {
    await page.goto('/#/home');

    const ttsInput = page.locator('#ttsInput');
    await expect(ttsInput).toBeVisible();

    // Escribir texto para TTS
    await ttsInput.fill('Prueba de síntesis de voz accesible en PDFReader');
    const speakButton = page.locator('button[aria-label="Leer en voz alta"]');
    await expect(speakButton).toBeEnabled();
  });

});
