// ============================================
// STORAGE.JS - Sistema de almacenamiento local
// Gestión de datos con LocalStorage
// ============================================

const Storage = {
    // Claves de almacenamiento
    KEYS: {
        CLIENTES: 'mindset_clientes',
        PRESTAMOS: 'mindset_prestamos',
        PAGOS: 'mindset_pagos',
        CONFIG: 'mindset_config',
        CAPITAL: 'mindset_capital'
    },

    // Inicializar storage
    init() {
        if (!this.get(this.KEYS.CLIENTES)) {
            this.set(this.KEYS.CLIENTES, []);
        }
        if (!this.get(this.KEYS.PRESTAMOS)) {
            this.set(this.KEYS.PRESTAMOS, []);
        }
        if (!this.get(this.KEYS.PAGOS)) {
            this.set(this.KEYS.PAGOS, []);
        }
        if (!this.get(this.KEYS.CONFIG)) {
            this.set(this.KEYS.CONFIG, {
                capitalInicial: 0,
                fechaInicio: new Date().toISOString()
            });
        }
    },

    // Guardar datos
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error al guardar:', error);
            return false;
        }
    },

    // Obtener datos
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error al obtener:', error);
            return null;
        }
    },

    // Eliminar datos
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error al eliminar:', error);
            return false;
        }
    },

    // Limpiar todo
    clear() {
        if (confirm('¿Estás seguro de eliminar todos los datos? Esta acción no se puede deshacer.')) {
            localStorage.clear();
            this.init();
            location.reload();
        }
    },

    // ============================================
    // CLIENTES
    // ============================================

    getClientes() {
        return this.get(this.KEYS.CLIENTES) || [];
    },

    getCliente(id) {
        const clientes = this.getClientes();
        return clientes.find(c => c.id === id);
    },

    addCliente(cliente) {
        const clientes = this.getClientes();
        cliente.id = Date.now().toString();
        cliente.fechaRegistro = new Date().toISOString();
        cliente.score = 100; // Score inicial
        clientes.push(cliente);
        this.set(this.KEYS.CLIENTES, clientes);
        return cliente;
    },

    updateCliente(id, data) {
        const clientes = this.getClientes();
        const index = clientes.findIndex(c => c.id === id);
        if (index !== -1) {
            clientes[index] = { ...clientes[index], ...data };
            this.set(this.KEYS.CLIENTES, clientes);
            return true;
        }
        return false;
    },

    deleteCliente(id) {
        const clientes = this.getClientes();
        const filtered = clientes.filter(c => c.id !== id);
        this.set(this.KEYS.CLIENTES, filtered);
        return true;
    },

    // ============================================
    // PRÉSTAMOS
    // ============================================

    getPrestamos() {
        return this.get(this.KEYS.PRESTAMOS) || [];
    },

    getPrestamo(id) {
        const prestamos = this.getPrestamos();
        return prestamos.find(p => p.id === id);
    },

    getPrestamosByCliente(clienteId) {
        const prestamos = this.getPrestamos();
        return prestamos.filter(p => p.clienteId === clienteId);
    },

    addPrestamo(prestamo) {
        const prestamos = this.getPrestamos();
        prestamo.id = Date.now().toString();
        prestamo.fechaCreacion = new Date().toISOString();
        prestamo.estado = 'activo';
        prestamo.cuotasPagadas = 0;
        prestamos.push(prestamo);
        this.set(this.KEYS.PRESTAMOS, prestamos);
        return prestamo;
    },

    updatePrestamo(id, data) {
        const prestamos = this.getPrestamos();
        const index = prestamos.findIndex(p => p.id === id);
        if (index !== -1) {
            prestamos[index] = { ...prestamos[index], ...data };
            this.set(this.KEYS.PRESTAMOS, prestamos);
            return true;
        }
        return false;
    },

    deletePrestamo(id) {
        const prestamos = this.getPrestamos();
        const filtered = prestamos.filter(p => p.id !== id);
        this.set(this.KEYS.PRESTAMOS, filtered);
        return true;
    },

    // ============================================
    // PAGOS
    // ============================================

    getPagos() {
        return this.get(this.KEYS.PAGOS) || [];
    },

    getPagosByPrestamo(prestamoId) {
        const pagos = this.getPagos();
        return pagos.filter(p => p.prestamoId === prestamoId);
    },

    addPago(pago) {
        const pagos = this.getPagos();
        pago.id = Date.now().toString();
        pago.fechaRegistro = new Date().toISOString();
        pagos.push(pago);
        this.set(this.KEYS.PAGOS, pagos);

        // Actualizar préstamo
        const prestamo = this.getPrestamo(pago.prestamoId);
        if (prestamo) {
            prestamo.cuotasPagadas++;
            if (prestamo.cuotasPagadas >= prestamo.cantidadCuotas) {
                prestamo.estado = 'finalizado';
                prestamo.fechaFinalizacion = new Date().toISOString();
            }
            this.updatePrestamo(prestamo.id, prestamo);
        }

        return pago;
    },

    // ============================================
    // CONFIGURACIÓN Y CAPITAL
    // ============================================

    getConfig() {
        return this.get(this.KEYS.CONFIG) || {};
    },

    updateConfig(config) {
        const current = this.getConfig();
        this.set(this.KEYS.CONFIG, { ...current, ...config });
    },

    // ============================================
    // EXPORTAR/IMPORTAR DATOS
    // ============================================

    exportData() {
        const data = {
            clientes: this.getClientes(),
            prestamos: this.getPrestamos(),
            pagos: this.getPagos(),
            config: this.getConfig(),
            exportDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `mindset-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.clientes) this.set(this.KEYS.CLIENTES, data.clientes);
                    if (data.prestamos) this.set(this.KEYS.PRESTAMOS, data.prestamos);
                    if (data.pagos) this.set(this.KEYS.PAGOS, data.pagos);
                    if (data.config) this.set(this.KEYS.CONFIG, data.config);
                    
                    resolve(true);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
};

// Inicializar al cargar
Storage.init();
