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
        const btnNuevo = document.getElementById('btnNuevoPrestamo');
        if (btnNuevo) {
            btnNuevo.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('Click en Nuevo Préstamo');
                await this.openModal();
            });
        }

        // Formulario
        const formPrestamo = document.getElementById('formPrestamo');
        if (formPrestamo) {
            formPrestamo.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.savePrestamo(e.target);
            });
        }

        // Toggle cliente nuevo/existente
        document.querySelectorAll('input[name="tipoCliente"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.toggleTipoCliente(e.target.value);
            });
        });

        // Calcular valores en tiempo real
        const form = document.getElementById('formPrestamo');
        if (form) {
            ['montoEntregado', 'cantidadCuotas', 'valorCuota'].forEach(field => {
                const input = form[field];
                if (input) {
                    input.addEventListener('input', () => {
                        this.calculateLoanDetails();
                        this.updateCuotasSelector();
                    });
                }
            });
        }

        // Tabs de filtro
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.tab;
                await this.renderPrestamos();
            });
        });
        
        // Cerrar modales
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModals();
            });
        });
        
        console.log('✅ Event listeners de préstamos configurados');
    },

    async loadClientesSelect() {
        const select = document.getElementById('selectCliente');
        if (!select) return;

        const clientes = await Storage.getClientes();
        select.innerHTML = '<option value="">Seleccione un cliente</option>' +
            clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    },

    async openModal(prestamoId = null) {
        const modal = document.getElementById('modalPrestamo');
        const form = document.getElementById('formPrestamo');
        form.reset();
        
        // Modo crear o editar
        const isEdit = prestamoId !== null;
        document.getElementById('tituloModalPrestamo').textContent = isEdit ? 'Editar Préstamo' : 'Nuevo Préstamo';
        document.getElementById('btnSubmitPrestamo').textContent = isEdit ? 'Actualizar Préstamo' : 'Crear Préstamo';
        
        // Mostrar/ocultar campos según modo
        document.querySelector('.tipo-cliente-selector').style.display = isEdit ? 'none' : 'block';
        document.getElementById('grupoCuotasPagadas').style.display = isEdit ? 'block' : 'none';
        
        if (isEdit) {
            // Cargar datos del préstamo
            const prestamo = await Storage.getPrestamo(prestamoId);
            if (prestamo) {
                document.getElementById('prestamoId').value = prestamoId;
                document.getElementById('montoEntregado').value = prestamo.montoEntregado;
                document.getElementById('cantidadCuotas').value = prestamo.cantidadCuotas;
                document.getElementById('valorCuota').value = prestamo.valorCuota;
                document.getElementById('frecuencia').value = prestamo.frecuencia;
                document.getElementById('fechaInicio').value = prestamo.fechaInicio;
                document.getElementById('fechaPrimerPago').value = prestamo.fechaPrimerPago;
                document.getElementById('notasPrestamo').value = prestamo.notas || '';
                
                // Cargar selector de cuotas pagadas
                this.updateCuotasSelector();
                document.getElementById('selectCuotasPagadas').value = prestamo.cuotasPagadas || 0;
                
                // Ocultar sección de cliente
                document.getElementById('datosClienteNuevo').style.display = 'none';
                document.getElementById('grupoClienteExistente').style.display = 'none';
                
                this.calculateLoanDetails();
            }
        } else {
            // Modo crear: establecer valores por defecto
            const hoy = new Date().toISOString().split('T')[0];
            form.fechaInicio.value = hoy;
            form.fechaPrimerPago.value = hoy;
            document.getElementById('prestamoId').value = '';
            
            // Seleccionar "nuevo cliente" por defecto
            document.querySelector('input[name="tipoCliente"][value="nuevo"]').checked = true;
            this.toggleTipoCliente('nuevo');
            
            await this.loadClientesSelect();
        }
        
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

    async savePrestamo(form) {
        const formData = new FormData(form);
        const prestamoId = formData.get('prestamoId');
        const isEdit = prestamoId && prestamoId !== '';
        
        let clienteId;
        
        if (isEdit) {
            // Modo edición: mantener el cliente existente
            const prestamoExistente = await Storage.getPrestamo(prestamoId);
            clienteId = prestamoExistente.clienteId;
        } else {
            // Modo creación: determinar cliente
            const tipoCliente = formData.get('tipoCliente');
            
            if (tipoCliente === 'existente') {
                // Usar cliente existente
                clienteId = formData.get('clienteExistenteId');
                if (!clienteId) {
                    this.showNotification('Por favor selecciona un cliente', 'error');
                    return;
                }
            } else {
                // Crear o encontrar cliente nuevo
                const clienteData = {
                    nombre: formData.get('clienteNombre') || 'Cliente',
                    apellido: formData.get('clienteApellido') || '',
                    telefono: formData.get('clienteTelefono') || '',
                    email: formData.get('clienteEmail') || '',
                    direccion: formData.get('clienteDireccion') || ''
                };
                
                // Buscar cliente por teléfono si se proporcionó
                if (clienteData.telefono) {
                    const clienteExistente = await this.buscarClientePorTelefono(clienteData.telefono);
                    if (clienteExistente) {
                        clienteId = clienteExistente.id;
                        this.showNotification(`Cliente existente encontrado: ${clienteExistente.nombre}`, 'info');
                    } else {
                        const nuevoCliente = await Storage.addCliente(clienteData);
                        clienteId = nuevoCliente.id;
                    }
                } else {
                    const nuevoCliente = await Storage.addCliente(clienteData);
                    clienteId = nuevoCliente.id;
                }
            }
        }
        
        const prestamo = {
            clienteId: clienteId,
            montoEntregado: parseFloat(formData.get('montoEntregado')) || 0,
            cantidadCuotas: parseInt(formData.get('cantidadCuotas')) || 1,
            valorCuota: parseFloat(formData.get('valorCuota')) || 0,
            frecuencia: formData.get('frecuencia') || 'semanal',
            fechaInicio: formData.get('fechaInicio') || new Date().toISOString().split('T')[0],
            fechaPrimerPago: formData.get('fechaPrimerPago') || new Date().toISOString().split('T')[0],
            notas: formData.get('notas') || ''
        };

        // Calcular totales
        prestamo.totalCobrar = prestamo.cantidadCuotas * prestamo.valorCuota;
        prestamo.ganancia = prestamo.totalCobrar - prestamo.montoEntregado;
        prestamo.tasaInteres = prestamo.montoEntregado > 0 ? (prestamo.ganancia / prestamo.montoEntregado) * 100 : 0;

        if (isEdit) {
            // Actualizar cuotas pagadas si se especificó
            const cuotasPagadas = parseInt(formData.get('cuotasPagadas')) || 0;
            prestamo.cuotasPagadas = cuotasPagadas;
            prestamo.estado = cuotasPagadas >= prestamo.cantidadCuotas ? 'finalizado' : 'activo';
            
            await Storage.updatePrestamo(prestamoId, prestamo);
            this.showNotification('Préstamo actualizado exitosamente', 'success');
        } else {
            await Storage.addPrestamo(prestamo);
            this.showNotification('Préstamo creado exitosamente', 'success');
        }
        
        this.closeModals();
        await this.renderPrestamos();
        
        if (typeof DashboardModule !== 'undefined') {
            DashboardModule.init();
        }
        if (typeof ClientesModule !== 'undefined') {
            ClientesModule.init();
        }
    },

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    },

    async renderPrestamos() {
        const container = document.getElementById('listaPrestamos');
        if (!container) return;

        let prestamos = await Storage.getPrestamos();
        
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

        const prestamosHTML = [];
        for (const prestamo of prestamos) {
            const cliente = await Storage.getCliente(prestamo.clienteId);
            const progreso = (prestamo.cuotasPagadas / prestamo.cantidadCuotas) * 100;
            const cuotasRestantes = prestamo.cantidadCuotas - prestamo.cuotasPagadas;
            const montoRestante = cuotasRestantes * prestamo.valorCuota;
            
            // Calcular próximo pago
            const proximoPago = this.calculateProximoPago(prestamo);
            const diasHastaPago = this.getDiasHastaPago(proximoPago);
            const estadoPago = this.getEstadoPago(diasHastaPago);

            prestamosHTML.push(`
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
                        <button class="btn-primary btn-small" onclick="PrestamosModule.editPrestamo('${prestamo.id}')">
                            ✏️ Editar
                        </button>
                        <button class="btn-secondary btn-small" onclick="PrestamosModule.viewDetails('${prestamo.id}')">
                            📊 Ver Detalle
                        </button>
                    </div>
                </div>
            `);
        }
        container.innerHTML = prestamosHTML.join('');
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

    async viewDetails(prestamoId) {
        const prestamo = await Storage.getPrestamo(prestamoId);
        const cliente = await Storage.getCliente(prestamo.clienteId);
        const pagos = await Storage.getPagosByPrestamo(prestamoId);

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
    },

    /**
     * Toggle between nuevo/existente cliente
     */
    toggleTipoCliente(tipo) {
        const datosNuevo = document.getElementById('datosClienteNuevo');
        const grupoExistente = document.getElementById('grupoClienteExistente');
        
        if (tipo === 'nuevo') {
            datosNuevo.style.display = 'block';
            grupoExistente.style.display = 'none';
        } else {
            datosNuevo.style.display = 'none';
            grupoExistente.style.display = 'block';
        }
    },

    /**
     * Buscar cliente por teléfono
     */
    async buscarClientePorTelefono(telefono) {
        if (!telefono) return null;
        const clientes = await Storage.getClientes();
        return clientes.find(c => c.telefono === telefono);
    },

    /**
     * Actualizar selector de cuotas pagadas
     */
    updateCuotasSelector() {
        const cantidadCuotas = parseInt(document.getElementById('cantidadCuotas').value) || 0;
        const select = document.getElementById('selectCuotasPagadas');
        
        if (!select || cantidadCuotas <=  0) return;
        
        select.innerHTML = '';
        for (let i = 0; i <= cantidadCuotas; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i === 0 ? 'Ninguna cuota pagada' : 
                                i === 1 ? '1 cuota pagada' :
                                `${i} cuotas pagadas`;
            select.appendChild(option);
        }
    },

    /**
     * Abrir modal para editar préstamo
     */
    async editPrestamo(prestamoId) {
        await this.openModal(prestamoId);
    },

    /**
     * Mostrar notificación
     */
    showNotification(message, type = 'info') {
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '10000';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
};
