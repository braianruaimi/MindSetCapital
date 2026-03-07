// ============================================
// CLIENTES.JS - Gestión de clientes
// ============================================

const ClientesModule = {
    
    init() {
        this.setupEventListeners();
        this.renderClientes();
    },

    setupEventListeners() {
        // Botón nuevo cliente
        document.getElementById('btnNuevoCliente')?.addEventListener('click', () => {
            this.openModal();
        });

        // Formulario de cliente
        document.getElementById('formCliente')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCliente(e.target);
        });

        // Búsqueda de clientes
        document.getElementById('searchCliente')?.addEventListener('input', (e) => {
            this.searchClientes(e.target.value);
        });

        // Cerrar modales
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModals();
            });
        });
    },

    openModal(clienteId = null) {
        const modal = document.getElementById('modalCliente');
        const form = document.getElementById('formCliente');
        form.reset();

        if (clienteId) {
            const cliente = Storage.getCliente(clienteId);
            if (cliente) {
                form.nombre.value = cliente.nombre;
                form.telefono.value = cliente.telefono;
                form.direccion.value = cliente.direccion || '';
                form.notas.value = cliente.notas || '';
                form.dataset.editId = clienteId;
            }
        } else {
            delete form.dataset.editId;
        }

        modal.classList.add('active');
    },

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    },

    saveCliente(form) {
        const formData = new FormData(form);
        const cliente = {
            nombre: formData.get('nombre'),
            telefono: formData.get('telefono'),
            direccion: formData.get('direccion'),
            notas: formData.get('notas')
        };

        if (form.dataset.editId) {
            Storage.updateCliente(form.dataset.editId, cliente);
            this.showNotification('Cliente actualizado correctamente', 'success');
        } else {
            Storage.addCliente(cliente);
            this.showNotification('Cliente agregado correctamente', 'success');
        }

        this.closeModals();
        this.renderClientes();
        
        // Actualizar dashboard si está visible
        if (typeof DashboardModule !== 'undefined') {
            DashboardModule.init();
        }
    },

    renderClientes(clientes = null) {
        const tbody = document.querySelector('#tablaClientes tbody');
        if (!tbody) return;

        const clientesList = clientes || Storage.getClientes();
        
        if (clientesList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay clientes registrados</td></tr>';
            return;
        }

        tbody.innerHTML = clientesList.map(cliente => {
            const prestamos = Storage.getPrestamosByCliente(cliente.id);
            const prestamosActivos = prestamos.filter(p => p.estado === 'activo').length;
            const totalPrestado = prestamos.reduce((sum, p) => sum + parseFloat(p.montoEntregado || 0), 0);
            const score = this.calculateScore(cliente.id);
            const scoreClass = this.getScoreClass(score);

            return `
                <tr>
                    <td><strong>${cliente.nombre}</strong></td>
                    <td>${cliente.telefono}</td>
                    <td><span class="score-badge ${scoreClass}">${score} - ${this.getScoreLabel(score)}</span></td>
                    <td>${prestamosActivos}</td>
                    <td>$${totalPrestado.toLocaleString()}</td>
                    <td>
                        <button class="btn-small btn-primary" onclick="ClientesModule.viewProfile('${cliente.id}')">
                            Ver Perfil
                        </button>
                        <button class="btn-small btn-secondary" onclick="ClientesModule.openModal('${cliente.id}')">
                            Editar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    searchClientes(query) {
        const clientes = Storage.getClientes();
        const filtered = clientes.filter(c => 
            c.nombre.toLowerCase().includes(query.toLowerCase()) ||
            c.telefono.includes(query)
        );
        this.renderClientes(filtered);
    },

    calculateScore(clienteId) {
        const prestamos = Storage.getPrestamosByCliente(clienteId);
        if (prestamos.length === 0) return 100;

        let score = 100;
        let totalPagos = 0;
        let pagosAtrasados = 0;
        let pagosAtiempo = 0;

        prestamos.forEach(prestamo => {
            const pagos = Storage.getPagosByPrestamo(prestamo.id);
            totalPagos += pagos.length;

            pagos.forEach(pago => {
                const fechaPago = new Date(pago.fecha);
                const fechaEsperada = this.calculateFechaPago(prestamo, pagos.indexOf(pago) + 1);
                
                if (fechaPago > fechaEsperada) {
                    pagosAtrasados++;
                } else {
                    pagosAtiempo++;
                }
            });

            // Penalizar préstamos activos con pagos vencidos
            if (prestamo.estado === 'activo') {
                const proximoPago = this.calculateFechaPago(prestamo, prestamo.cuotasPagadas + 1);
                const hoy = new Date();
                const diasAtraso = Math.floor((hoy - proximoPago) / (1000 * 60 * 60 * 24));
                
                if (diasAtraso > 0) {
                    score -= Math.min(diasAtraso * 2, 30); // Máximo 30 puntos por préstamo atrasado
                }
            }
        });

        // Ajustar score por comportamiento general
        if (totalPagos > 0) {
            const tasaPuntualidad = pagosAtiempo / totalPagos;
            score = score * tasaPuntualidad;
        }

        // Bonus por préstamos finalizados exitosamente
        const prestamosFinalizados = prestamos.filter(p => p.estado === 'finalizado').length;
        score += prestamosFinalizados * 5;

        return Math.max(0, Math.min(100, Math.round(score)));
    },

    calculateFechaPago(prestamo, numeroCuota) {
        const fechaInicio = new Date(prestamo.fechaPrimerPago);
        let dias = 0;

        switch(prestamo.frecuencia) {
            case 'semanal':
                dias = (numeroCuota - 1) * 7;
                break;
            case 'quincenal':
                dias = (numeroCuota - 1) * 15;
                break;
            case 'mensual':
                dias = (numeroCuota - 1) * 30;
                break;
        }

        const fechaPago = new Date(fechaInicio);
        fechaPago.setDate(fechaPago.getDate() + dias);
        return fechaPago;
    },

    getScoreClass(score) {
        if (score >= 80) return 'score-excelente';
        if (score >= 60) return 'score-bueno';
        if (score >= 40) return 'score-regular';
        return 'score-malo';
    },

    getScoreLabel(score) {
        if (score >= 80) return 'Excelente';
        if (score >= 60) return 'Bueno';
        if (score >= 40) return 'Regular';
        return 'Riesgoso';
    },

    viewProfile(clienteId) {
        const cliente = Storage.getCliente(clienteId);
        if (!cliente) return;

        const prestamos = Storage.getPrestamosByCliente(clienteId);
        const prestamosActivos = prestamos.filter(p => p.estado === 'activo');
        const prestamosFinalizados = prestamos.filter(p => p.estado === 'finalizado');
        
        const totalPrestado = prestamos.reduce((sum, p) => sum + parseFloat(p.montoEntregado || 0), 0);
        let totalPagado = 0;
        
        prestamos.forEach(prestamo => {
            const pagos = Storage.getPagosByPrestamo(prestamo.id);
            totalPagado += pagos.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
        });

        const score = this.calculateScore(clienteId);
        const scoreClass = this.getScoreClass(score);

        const modal = document.getElementById('modalPerfilCliente');
        document.getElementById('perfilClienteNombre').textContent = cliente.nombre;
        
        const contenido = document.getElementById('perfilClienteContenido');
        contenido.innerHTML = `
            <div class="metrics-grid">
                <div class="metric-card">
                    <h4>Score de Confiabilidad</h4>
                    <span class="score-badge ${scoreClass}">${score} - ${this.getScoreLabel(score)}</span>
                </div>
                <div class="metric-card">
                    <h4>Total Prestado</h4>
                    <span class="big-number">$${totalPrestado.toLocaleString()}</span>
                </div>
                <div class="metric-card">
                    <h4>Total Pagado</h4>
                    <span class="big-number">$${totalPagado.toLocaleString()}</span>
                </div>
                <div class="metric-card">
                    <h4>Préstamos Activos</h4>
                    <span class="big-number">${prestamosActivos.length}</span>
                </div>
            </div>

            <div class="card">
                <h3>Información de Contacto</h3>
                <p><strong>Teléfono:</strong> ${cliente.telefono}</p>
                ${cliente.direccion ? `<p><strong>Dirección:</strong> ${cliente.direccion}</p>` : ''}
                ${cliente.notas ? `<p><strong>Notas:</strong> ${cliente.notas}</p>` : ''}
                <p><strong>Fecha de Registro:</strong> ${new Date(cliente.fechaRegistro).toLocaleDateString()}</p>
            </div>

            <div class="card">
                <h3>Préstamos Activos (${prestamosActivos.length})</h3>
                ${prestamosActivos.length > 0 ? this.renderPrestamosTable(prestamosActivos) : '<p>No tiene préstamos activos</p>'}
            </div>

            <div class="card">
                <h3>Historial de Préstamos (${prestamosFinalizados.length})</h3>
                ${prestamosFinalizados.length > 0 ? this.renderPrestamosTable(prestamosFinalizados) : '<p>No tiene préstamos finalizados</p>'}
            </div>
        `;

        modal.classList.add('active');
    },

    renderPrestamosTable(prestamos) {
        return `
            <table>
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Monto</th>
                        <th>Cuotas</th>
                        <th>Progreso</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${prestamos.map(p => `
                        <tr>
                            <td>${new Date(p.fechaInicio).toLocaleDateString()}</td>
                            <td>$${parseFloat(p.montoEntregado).toLocaleString()}</td>
                            <td>${p.cantidadCuotas}</td>
                            <td>${p.cuotasPagadas} / ${p.cantidadCuotas}</td>
                            <td><span class="estado-${p.estado}">${p.estado}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

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
