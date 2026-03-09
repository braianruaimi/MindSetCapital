const { test, expect } = require('@playwright/test');

test.describe('MindSet Capital - flujos criticos', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.setItem('mindset_authenticated', 'true');
      localStorage.setItem('mindset_config', JSON.stringify({
        capitalInicial: 1000000,
        fechaInicio: new Date().toISOString()
      }));
    });

    await page.goto('/');
    await expect(page.locator('#mainApp')).toBeVisible();
  });

  test('crear cliente y editarlo', async ({ page }) => {
    await page.click('.nav-btn[data-section="clientes"]');
    await page.click('#btnNuevoCliente');

    const unique = Date.now();
    await page.fill('#formCliente input[name="nombre"]', `Cliente QA ${unique}`);
    await page.fill('#formCliente input[name="telefono"]', `11222${String(unique).slice(-5)}`);
    await page.fill('#formCliente input[name="email"]', `qa${unique}@mail.com`);
    await page.fill('#formCliente input[name="dni"]', `30${String(unique).slice(-6)}`);
    await page.click('#formCliente button[type="submit"]');

    await expect(page.locator('#tablaClientes tbody')).toContainText(`Cliente QA ${unique}`);

    await page.locator('#tablaClientes tbody tr').filter({ hasText: `Cliente QA ${unique}` }).first().locator('button:has-text("Editar")').click();
    await page.fill('#formCliente input[name="telefono"]', `11999${String(unique).slice(-5)}`);
    await page.click('#formCliente button[type="submit"]');

    await expect(page.locator('#tablaClientes tbody')).toContainText(`11999${String(unique).slice(-5)}`);
  });

  test('crear prestamo y registrar pago', async ({ page }) => {
    await page.click('.nav-btn[data-section="prestamos"]');
    await page.click('#btnNuevoPrestamo');

    const unique = Date.now();
    await page.fill('#clienteNombre', `Prestamo QA ${unique}`);
    await page.fill('#clienteApellido', 'Test');
    await page.fill('#clienteTelefono', `11333${String(unique).slice(-5)}`);
    await page.fill('#clienteEmail', `prestamo${unique}@mail.com`);
    await page.fill('#clienteDni', `31${String(unique).slice(-6)}`);
    await page.fill('#montoEntregado', '100000');
    await page.fill('#cantidadCuotas', '10');
    await page.fill('#valorCuota', '13000');
    await page.click('#btnSubmitPrestamo');

    await expect(page.locator('#listaPrestamos')).toContainText(`Prestamo QA ${unique}`);

    await page.locator('.prestamo-card').filter({ hasText: `Prestamo QA ${unique}` }).first().locator('button:has-text("Registrar Pago")').click();
    await page.fill('#pagoMonto', '13000');
    await page.click('#formPago button[type="submit"]');

    await page.click('.nav-btn[data-section="pagos"]');
    await expect(page.locator('#tablaPagos tbody tr')).toHaveCount(1);
  });

  test('exportaciones JSON y PDF responden', async ({ page }) => {
    await page.click('.nav-btn[data-section="perfil"]');

    const jsonDownload = page.waitForEvent('download');
    await page.click('#btnExportBackup');
    await expect(await jsonDownload).toBeTruthy();

    page.on('dialog', dialog => dialog.accept());
    await page.click('#btnExportPDF');
    await expect(page.locator('#mainApp')).toBeVisible();
  });
});
