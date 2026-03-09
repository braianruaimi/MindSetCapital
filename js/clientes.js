// ============================================
// CLIENTES.JS - Gestión de clientes
// ============================================

const ClientesModule = {
    
    listenersInitialized: false,
    
    async init() {
        if (!this.listenersInitialized) {
            this.setupEventListeners();
            this.listenersInitialized = true;
        }
        await this.renderClientes();
    },

    setupEventListeners() {
        // Botón nuevo cliente
        const btnNuevo = document.getElementById('btnNuevoCliente');
        if (btnNuevo) {
            btnNuevo.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log('Click en Nuevo Cliente');
                await this.openModal();
            });
        }

        // Formulario de cliente
        const formCliente = document.getElementById('formCliente');
        if (formCliente) {
            formCliente.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveCliente(e.target);
            });
        }

        // Búsqueda de clientes
        const searchInput = document.getElementById('searchCliente');
        if (searchInput) {
            searchInput.addEventListener('input', async (e) => {
                await this.searchClientes(e.target.value);
            });
        }

        // Cerrar modales
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModals();
            });
        });
        
        console.log('✅ Event listeners de clientes configurados');
    },

    async openModal(clienteId = null) {
        const modal = document.getElementById('modalCliente');
        const form = document.getElementById('formCliente');
        
        if (!modal || !form) {
            console.error('Modal o formulario de cliente no encontrado');
            return;
        }
        
        form.reset();

        if (clienteId) {
            const cliente = await Storage.getCliente(clienteId);
            if (cliente) {
                form.nombre.value = cliente.nombre;
                form.telefono.value = cliente.telefono;
                form.email.value = cliente.email || '';
                form.dni.value = cliente.dni || '';
                form.direccion.value = cliente.direccion || '';
                form.notas.value = cliente.notas || '';
                form.dataset.editId = clienteId;
            }
        } else {
            delete form.dataset.editId;
        }

        modal.classList.add('active');
        console.log('Modal de cliente abierto');
    },

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    },

    validateClienteData(cliente) {
        const telefonoSanitizado = (cliente.telefono || '').replace(/\s+/g, '');
        const dniSanitizado = (cliente.dni || '').replace(/\D/g, '');

        if (!cliente.nombre || cliente.nombre.trim().length < 3) {
            return { valid: false, message: 'El nombre debe tener al menos 3 caracteres' };
        }

        if (!/^\+?[0-9\-]{8,15}$/.test(telefonoSanitizado)) {
            return { valid: false, message: 'El teléfono debe tener entre 8 y 15 dígitos' };
        }

        if (cliente.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cliente.email)) {
            return { valid: false, message: 'El email no tiene un formato válido' };
        }

        if (cliente.dni && !/^\d{7,10}$/.test(dniSanitizado)) {
            return { valid: false, message: 'El DNI debe tener entre 7 y 10 dígitos' };
        }

        return {
            valid: true,
            normalized: {
                ...cliente,
                nombre: cliente.nombre.trim(),
                telefono: telefonoSanitizado,
                email: (cliente.email || '').trim().toLowerCase(),
                dni: dniSanitizado,
                direccion: (cliente.direccion || '').trim(),
                notas: (cliente.notas || '').trim()
            }
        };
    },

    async saveCliente(form) {
        const formData = new FormData(form);
        const cliente = {
            nombre: formData.get('nombre'),
            telefono: formData.get('telefono'),
            email: formData.get('email'),
            dni: formData.get('dni'),
            direccion: formData.get('direccion'),
            notas: formData.get('notas')
        };

        const validation = this.validateClienteData(cliente);
        if (!validation.valid) {
            this.showNotification(validation.message, 'error');
            return;
        }

        const clienteNormalizado = validation.normalized;

        if (form.dataset.editId) {
            await Storage.updateCliente(form.dataset.editId, clienteNormalizado);
            this.showNotification('Cliente actualizado correctamente', 'success');
        } else {
            await Storage.addCliente(clienteNormalizado);
            this.showNotification('Cliente agregado correctamente', 'success');
        }

        this.closeModals();
        await this.renderClientes();
        
        // Actualizar dashboard si está visible
        if (typeof DashboardModule !== 'undefined') {
            DashboardModule.init();
        }
    },

    async renderClientes(clientes = null) {
        const tbody = document.querySelector('#tablaClientes tbody');
        if (!tbody) return;

        const clientesList = clientes || await Storage.getClientes();
        
        if (clientesList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay clientes registrados</td></tr>';
            return;
        }

        const clientesHTML = [];
        for (const cliente of clientesList) {
            const prestamos = await Storage.getPrestamosByCliente(cliente.id);
            const prestamosActivos = prestamos.filter(p => p.estado === 'activo').length;
            const totalPrestado = prestamos.reduce((sum, p) => sum + parseFloat(p.montoEntregado || 0), 0);
            const score = await this.calculateScore(cliente.id);
            const scoreClass = this.getScoreClass(score);

            clientesHTML.push(`

                <tr>
                    <td><strong>${cliente.nombre}</strong></td>
                    <td>${cliente.telefono}</td>
                    <td><span class="score-badge ${scoreClass}">${score} - ${this.getScoreLabel(score)}</span></td>
                    <td>${prestamosActivos}</td>
                    <td>$${totalPrestado.toLocaleString()}</td>
                    <td>
                        <button class="btn-small btn-primary" onclick="ClientesModule.viewProfile('${cliente.id}')">
                            👁️ Ver Perfil
                        </button>
                        <button class="btn-small btn-secondary" onclick="ClientesModule.openModal('${cliente.id}')">
                            ✏️ Editar
                        </button>
                        <button class="btn-small btn-danger" onclick="ClientesModule.deleteCliente('${cliente.id}')">
                            🗑️ Eliminar
                        </button>
                    </td>
                </tr>
            `);
        }
        tbody.innerHTML = clientesHTML.join('');
    },

    async searchClientes(query) {
        const clientes = await Storage.getClientes();
        const filtered = clientes.filter(c => 
            c.nombre.toLowerCase().includes(query.toLowerCase()) ||
            c.telefono.includes(query)
        );
        await this.renderClientes(filtered);
    },

    async calculateScore(clienteId) {
        const prestamos = await Storage.getPrestamosByCliente(clienteId);
        if (prestamos.length === 0) return 100;

        let score = 100;
        let totalPagos = 0;
        let pagosAtrasados = 0;
        let pagosAtiempo = 0;

        for (const prestamo of prestamos) {
            const pagos = await Storage.getPagosByPrestamo(prestamo.id);
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
        }

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

    async viewProfile(clienteId) {
        const cliente = await Storage.getCliente(clienteId);
        if (!cliente) return;

        const prestamos = await Storage.getPrestamosByCliente(clienteId);
        const prestamosActivos = prestamos.filter(p => p.estado === 'activo');
        const prestamosFinalizados = prestamos.filter(p => p.estado === 'finalizado');
        
        const totalPrestado = prestamos.reduce((sum, p) => sum + parseFloat(p.montoEntregado || 0), 0);
        let totalPagado = 0;
        
        for (const prestamo of prestamos) {
            const pagos = await Storage.getPagosByPrestamo(prestamo.id);
            totalPagado += pagos.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
        }

        const score = await this.calculateScore(clienteId);
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

    async deleteCliente(clienteId) {
        const cliente = await Storage.getCliente(clienteId);
        if (!cliente) {
            this.showNotification('Cliente no encontrado', 'error');
            return;
        }

        // Verificar si tiene préstamos activos
        const prestamos = await Storage.getPrestamosByCliente(clienteId);
        const prestamosActivos = prestamos.filter(p => p.estado === 'activo');
        
        if (prestamosActivos.length > 0) {
            this.showNotification(
                `No se puede eliminar. El cliente tiene ${prestamosActivos.length} préstamo(s) activo(s).`,
                'error'
            );
            return;
        }

        if (!confirm(`¿Estás seguro de eliminar al cliente "${cliente.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        try {
            await Storage.deleteCliente(clienteId);
            this.showNotification('Cliente eliminado correctamente', 'success');
            await this.renderClientes();
            
            // Actualizar dashboard
            if (typeof DashboardModule !== 'undefined') {
                await DashboardModule.init();
            }
        } catch (error) {
            console.error('Error al eliminar cliente:', error);
            this.showNotification('Error al eliminar el cliente', 'error');
        }
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
