// ============================================
// PRESTAMOS.JS - Gestión de préstamos
// ============================================

const PrestamosModule = {

    currentFilter: 'activos',

    init() {
        this.setupEventListeners();
        this.renderPrestamos();
        this.loadClientesSelect();
    },

    setupEventListeners() {
        // Botón nuevo préstamo
        document.getElementById('btnNuevoPrestamo')?.addEventListener('click', () => {
            this.openModal();
        });

        // Formulario
        document.getElementById('formPrestamo')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePrestamo(e.target);
        });

        // Calcular valores en tiempo real
        const form = document.getElementById('formPrestamo');
        ['montoEntregado', 'cantidadCuotas', 'valorCuota'].forEach(field => {
            form?.[field]?.addEventListener('input', () => {
                this.calculateLoanDetails();
            });
        });

        // Tabs de filtro
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.tab;
                this.renderPrestamos();
            });
        });
    },

    loadClientesSelect() {
        const select = document.getElementById('selectCliente');
        if (!select) return;

        const clientes = Storage.getClientes();
        select.innerHTML = '<option value="">Seleccione un cliente</option>' +
            clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    },

    openModal() {
        const modal = document.getElementById('modalPrestamo');
        const form = document.getElementById('formPrestamo');
        form.reset();
        
        // Establecer fecha de hoy por defecto
        const hoy = new Date().toISOString().split('T')[0];
        form.fechaInicio.value = hoy;
        form.fechaPrimerPago.value = hoy;
        
        this.loadClientesSelect();
        modal.classList.add('active');
    },

    calculateLoanDetails() {
        const form = document.getElementById('formPrestamo');
        const montoEntregado = parseFloat(form.montoEntregado.value) || 0;
        const cantidadCuotas = parseInt(form.cantidadCuotas.value) || 0;
        const valorCuota = parseFloat(form.valorCuota.value) || 0;

        const totalCobrar = cantidadCuotas * valorCuota;
        const ganancia = totalCobrar - montoEntregado;
        const tasa = montoEntregado > 0 ? ((ganancia / montoEntregado) * 100) : 0;

        document.getElementById('totalCobrarCalc').textContent = `$${totalCobrar.toLocaleString()}`;
        document.getElementById('gananciaCalc').textContent = `$${ganancia.toLocaleString()}`;
        document.getElementById('tasaCalc').textContent = `${tasa.toFixed(2)}%`;
    },

    savePrestamo(form) {
        const formData = new FormData(form);
        
        const prestamo = {
            clienteId: formData.get('clienteId'),
            montoEntregado: parseFloat(formData.get('montoEntregado')),
            cantidadCuotas: parseInt(formData.get('cantidadCuotas')),
            valorCuota: parseFloat(formData.get('valorCuota')),
            frecuencia: formData.get('frecuencia'),
            fechaInicio: formData.get('fechaInicio'),
            fechaPrimerPago: formData.get('fechaPrimerPago'),
            notas: formData.get('notas')
        };

        // Calcular totales
        prestamo.totalCobrar = prestamo.cantidadCuotas * prestamo.valorCuota;
        prestamo.ganancia = prestamo.totalCobrar - prestamo.montoEntregado;
        prestamo.tasaInteres = (prestamo.ganancia / prestamo.montoEntregado) * 100;

        Storage.addPrestamo(prestamo);
        
        ClientesModule.showNotification('Préstamo creado exitosamente', 'success');
        ClientesModule.closeModals();
        this.renderPrestamos();
        
        if (typeof DashboardModule !== 'undefined') {
            DashboardModule.init();
        }
    },

    renderPrestamos() {
        const container = document.getElementById('listaPrestamos');
        if (!container) return;

        let prestamos = Storage.getPrestamos();
        
        // Filtrar según tab activo
        if (this.currentFilter === 'activos') {
            prestamos = prestamos.filter(p => p.estado === 'activo');
        } else if (this.currentFilter === 'finalizados') {
            prestamos = prestamos.filter(p => p.estado === 'finalizado');
        }

        if (prestamos.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No hay préstamos para mostrar</p>';
            return;
        }

        container.innerHTML = prestamos.map(prestamo => {
            const cliente = Storage.getCliente(prestamo.clienteId);
            const progreso = (prestamo.cuotasPagadas / prestamo.cantidadCuotas) * 100;
            const cuotasRestantes = prestamo.cantidadCuotas - prestamo.cuotasPagadas;
            const montoRestante = cuotasRestantes * prestamo.valorCuota;
            
            // Calcular próximo pago
            const proximoPago = this.calculateProximoPago(prestamo);
            const diasHastaPago = this.getDiasHastaPago(proximoPago);
            const estadoPago = this.getEstadoPago(diasHastaPago);

            return `
                <div class="prestamo-card">
                    <div class="prestamo-header">
                        <div>
                            <h4>${cliente?.nombre || 'Cliente desconocido'}</h4>
                            <p class="text-muted">Préstamo iniciado: ${new Date(prestamo.fechaInicio).toLocaleDateString()}</p>
                        </div>
                        <span class="score-badge ${prestamo.estado === 'activo' ? 'score-bueno' : 'score-regular'}">
                            ${prestamo.estado.toUpperCase()}
                        </span>
                    </div>

                    <div class="prestamo-progress">
                        <div class="prestamo-progress-bar" style="width: ${progreso}%"></div>
                    </div>

                    <div class="prestamo-info">
                        <div class="prestamo-info-item">
                            <span>Monto Prestado</span>
                            <span>$${parseFloat(prestamo.montoEntregado).toLocaleString()}</span>
                        </div>
                        <div class="prestamo-info-item">
                            <span>Total a Cobrar</span>
                            <span>$${parseFloat(prestamo.totalCobrar).toLocaleString()}</span>
                        </div>
                        <div class="prestamo-info-item">
                            <span>Ganancia</span>
                            <span class="text-success">$${parseFloat(prestamo.ganancia).toLocaleString()}</span>
                        </div>
                        <div class="prestamo-info-item">
                            <span>Tasa</span>
                            <span>${prestamo.tasaInteres.toFixed(2)}%</span>
                        </div>
                        <div class="prestamo-info-item">
                            <span>Cuotas</span>
                            <span>${prestamo.cuotasPagadas} / ${prestamo.cantidadCuotas}</span>
                        </div>
                        <div class="prestamo-info-item">
                            <span>Valor Cuota</span>
                            <span>$${parseFloat(prestamo.valorCuota).toLocaleString()}</span>
                        </div>
                        <div class="prestamo-info-item">
                            <span>Monto Restante</span>
                            <span>$${montoRestante.toLocaleString()}</span>
                        </div>
                        <div class="prestamo-info-item">
                            <span>Frecuencia</span>
                            <span>${prestamo.frecuencia}</span>
                        </div>
                    </div>

                    ${prestamo.estado === 'activo' ? `
                        <div class="alert ${estadoPago.class}">
                            ${estadoPago.icon} ${estadoPago.mensaje}
                        </div>
                    ` : ''}

                    <div class="prestamo-actions">
                        ${prestamo.estado === 'activo' ? `
                            <button class="btn-success btn-small" onclick="PagosModule.openModalPago('${prestamo.id}')">
                                💰 Registrar Pago
                            </button>
                        ` : ''}
                        <button class="btn-secondary btn-small" onclick="PrestamosModule.viewDetails('${prestamo.id}')">
                            📊 Ver Detalle
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    calculateProximoPago(prestamo) {
        const fechaInicio = new Date(prestamo.fechaPrimerPago);
        const cuotaActual = prestamo.cuotasPagadas + 1;
        let dias = 0;

        switch(prestamo.frecuencia) {
            case 'semanal':
                dias = (cuotaActual - 1) * 7;
                break;
            case 'quincenal':
                dias = (cuotaActual - 1) * 15;
                break;
            case 'mensual':
                dias = (cuotaActual - 1) * 30;
                break;
        }

        const proximoPago = new Date(fechaInicio);
        proximoPago.setDate(proximoPago.getDate() + dias);
        return proximoPago;
    },

    getDiasHastaPago(fecha) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fecha.setHours(0, 0, 0, 0);
        const diff = fecha - hoy;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },

    getEstadoPago(dias) {
        if (dias < 0) {
            return {
                class: 'alert-danger',
                icon: '🚨',
                mensaje: `Pago vencido hace ${Math.abs(dias)} día(s)`
            };
        } else if (dias === 0) {
            return {
                class: 'alert-warning',
                icon: '⏰',
                mensaje: 'Pago vence HOY'
            };
        } else if (dias <= 3) {
            return {
                class: 'alert-info',
                icon: '📅',
                mensaje: `Próximo pago en ${dias} día(s)`
            };
        } else {
            return {
                class: 'alert-info',
                icon: '✅',
                mensaje: `Próximo pago: ${dias} día(s)`
            };
        }
    },

    viewDetails(prestamoId) {
        const prestamo = Storage.getPrestamo(prestamoId);
        const cliente = Storage.getCliente(prestamo.clienteId);
        const pagos = Storage.getPagosByPrestamo(prestamoId);

        const modal = document.getElementById('modalPerfilCliente');
        document.getElementById('perfilClienteNombre').textContent = `Préstamo - ${cliente?.nombre}`;
        
        const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        const cuotasRestantes = prestamo.cantidadCuotas - prestamo.cuotasPagadas;
        const montoRestante = cuotasRestantes * prestamo.valorCuota;

        const contenido = document.getElementById('perfilClienteContenido');
        contenido.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-card">
                    <h4>Monto Prestado</h4>
                    <span class="big-number">$${parseFloat(prestamo.montoEntregado).toLocaleString()}</span>
                </div>
                <div class="metric-card">
                    <h4>Total Pagado</h4>
                    <span class="big-number">$${totalPagado.toLocaleString()}</span>
                </div>
                <div class="metric-card">
                    <h4>Monto Restante</h4>
                    <span class="big-number">$${montoRestante.toLocaleString()}</span>
                </div>
                <div class="metric-card">
                    <h4>Ganancia</h4>
                    <span class="big-number text-success">$${parseFloat(prestamo.ganancia).toLocaleString()}</span>
                </div>
            </div>

            <div class="card">
                <h3>Información del Préstamo</h3>
                <p><strong>Cliente:</strong> ${cliente?.nombre}</p>
                <p><strong>Fecha de Inicio:</strong> ${new Date(prestamo.fechaInicio).toLocaleDateString()}</p>
                <p><strong>Cuotas:</strong> ${prestamo.cuotasPagadas} de ${prestamo.cantidadCuotas} pagadas</p>
                <p><strong>Valor de Cuota:</strong> $${parseFloat(prestamo.valorCuota).toLocaleString()}</p>
                <p><strong>Frecuencia:</strong> ${prestamo.frecuencia}</p>
                <p><strong>Tasa de Interés:</strong> ${prestamo.tasaInteres.toFixed(2)}%</p>
                <p><strong>Estado:</strong> <span class="estado-${prestamo.estado}">${prestamo.estado.toUpperCase()}</span></p>
                ${prestamo.notas ? `<p><strong>Notas:</strong> ${prestamo.notas}</p>` : ''}
            </div>

            <div class="card">
                <h3>Historial de Pagos (${pagos.length})</h3>
                ${pagos.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Monto</th>
                                <th>Notas</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pagos.map(pago => `
                                <tr>
                                    <td>${new Date(pago.fecha).toLocaleDateString()}</td>
                                    <td>$${parseFloat(pago.monto).toLocaleString()}</td>
                                    <td>${pago.notas || '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p>No hay pagos registrados</p>'}
            </div>
        `;

        modal.classList.add('active');
    }
};
