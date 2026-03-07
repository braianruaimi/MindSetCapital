// ============================================
// PAGOS.JS - Gestión de pagos
// ============================================

const PagosModule = {

    init() {
        this.setupEventListeners();
        this.renderPagos();
        this.loadFilters();
    },

    setupEventListeners() {
        // Formulario de pago
        document.getElementById('formPago')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePago(e.target);
        });

        // Filtros
        document.getElementById('filtroPagosCliente')?.addEventListener('change', () => {
            this.renderPagos();
        });

        document.getElementById('filtroPagosMes')?.addEventListener('change', () => {
            this.renderPagos();
        });
    },

    loadFilters() {
        const selectCliente = document.getElementById('filtroPagosCliente');
        if (selectCliente) {
            const clientes = Storage.getClientes();
            selectCliente.innerHTML = '<option value="">Todos los clientes</option>' +
                clientes.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        }

        const selectMes = document.getElementById('filtroPagosMes');
        if (selectMes) {
            const meses = this.getUltimosMeses(12);
            selectMes.innerHTML = '<option value="">Todos los meses</option>' +
                meses.map(m => `<option value="${m.value}">${m.label}</option>`).join('');
        }
    },

    getUltimosMeses(cantidad) {
        const meses = [];
        const hoy = new Date();
        
        for (let i = 0; i < cantidad; i++) {
            const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            meses.push({
                value: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`,
                label: fecha.toLocaleDateString('es', { month: 'long', year: 'numeric' })
            });
        }
        
        return meses;
    },

    openModalPago(prestamoId) {
        const modal = document.getElementById('modalPago');
        const form = document.getElementById('formPago');
        form.reset();

        const prestamo = Storage.getPrestamo(prestamoId);
        if (!prestamo) return;

        // Limpiar ID de edición
        document.getElementById('pagoId').value = '';
        document.getElementById('pagoPrestamoId').value = prestamoId;
        document.getElementById('pagoMonto').value = prestamo.valorCuota;
        document.getElementById('pagoFecha').value = new Date().toISOString().split('T')[0];

        // Cambiar título
        const modalHeader = modal.querySelector('.modal-header h3');
        if (modalHeader) modalHeader.textContent = '💰 Registrar Pago';

        modal.classList.add('active');
    },

    openEditPago(pagoId) {
        const pago = Storage.getPago(pagoId);
        if (!pago) return;

        const prestamo = Storage.getPrestamo(pago.prestamoId);
        if (!prestamo) return;

        const modal = document.getElementById('modalPago');
        const form = document.getElementById('formPago');

        // Llenar formulario
        document.getElementById('pagoId').value = pago.id;
        document.getElementById('pagoPrestamoId').value = pago.prestamoId;
        document.getElementById('pagoMonto').value = pago.monto;
        document.getElementById('pagoFecha').value = pago.fecha;
        document.getElementById('pagoNotas').value = pago.notas || '';

        // Cambiar título
        const modalHeader = modal.querySelector('.modal-header h3');
        if (modalHeader) modalHeader.textContent = '✏️ Editar Pago';

        modal.classList.add('active');
    },

    deletePago(pagoId) {
        if (!confirm('¿Estás seguro de eliminar este pago? Esta acción no se puede deshacer.')) {
            return;
        }

        const pago = Storage.getPago(pagoId);
        if (!pago) return;

        Storage.deletePago(pagoId);
        
        ClientesModule.showNotification('Pago eliminado exitosamente', 'success');
        
        // Actualizar vistas
        this.renderPagos();
        if (typeof PrestamosModule !== 'undefined') {
            PrestamosModule.renderPrestamos();
        }
        if (typeof DashboardModule !== 'undefined') {
            DashboardModule.init();
        }
    },

    savePago(form) {
        const formData = new FormData(form);
        
        const pagoId = formData.get('pagoId');
        const pago = {
            prestamoId: formData.get('prestamoId'),
            monto: parseFloat(formData.get('monto')),
            fecha: formData.get('fecha'),
            notas: formData.get('notas')
        };

        if (pagoId) {
            // Editar pago existente
            Storage.updatePago(pagoId, pago);
            ClientesModule.showNotification('Pago actualizado exitosamente', 'success');
        } else {
            // Crear nuevo pago
            Storage.addPago(pago);
            ClientesModule.showNotification('Pago registrado exitosamente', 'success');
        }
        
        ClientesModule.closeModals();
        
        // Actualizar vistas
        this.renderPagos();
        if (typeof PrestamosModule !== 'undefined') {
            PrestamosModule.renderPrestamos();
        }
        if (typeof DashboardModule !== 'undefined') {
            DashboardModule.init();
        }
    },

    renderPagos() {
        const tbody = document.querySelector('#tablaPagos tbody');
        if (!tbody) return;

        let pagos = Storage.getPagos();
        
        // Aplicar filtros
        const filtroCliente = document.getElementById('filtroPagosCliente')?.value;
        const filtroMes = document.getElementById('filtroPagosMes')?.value;

        if (filtroCliente) {
            pagos = pagos.filter(pago => {
                const prestamo = Storage.getPrestamo(pago.prestamoId);
                return prestamo && prestamo.clienteId === filtroCliente;
            });
        }

        if (filtroMes) {
            pagos = pagos.filter(pago => {
                const fecha = pago.fecha.substring(0, 7);
                return fecha === filtroMes;
            });
        }

        // Ordenar por fecha descendente
        pagos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        if (pagos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay pagos registrados</td></tr>';
            return;
        }

        tbody.innerHTML = pagos.map(pago => {
            const prestamo = Storage.getPrestamo(pago.prestamoId);
            const cliente = prestamo ? Storage.getCliente(prestamo.clienteId) : null;

            return `
                <tr>
                    <td>${new Date(pago.fecha).toLocaleDateString()}</td>
                    <td>${cliente?.nombre || 'Desconocido'}</td>
                    <td>$${parseFloat(prestamo?.montoEntregado || 0).toLocaleString()}</td>
                    <td>$${parseFloat(pago.monto).toLocaleString()}</td>
                    <td><span class="score-badge score-excelente">Pagado</span></td>
                    <td>
                        <button class="btn-small btn-info" onclick="PagosModule.openEditPago('${pago.id}')" title="Editar">
                            ✏️
                        </button>
                        <button class="btn-small btn-danger" onclick="PagosModule.deletePago('${pago.id}')" title="Eliminar">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
};
