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
        CAPITAL: 'mindset_capital',
        CHANGE_COUNT: 'mindset_change_count'
    },

    // Indicador de encriptación
    encryptionEnabled: true,

    // Contador para IDs únicos
    idCounter: 0,

    // Generar ID único garantizado
    generateUniqueId() {
        // Combinar timestamp, contador incremental y random para garantizar unicidad
        const timestamp = Date.now();
        const counter = ++this.idCounter;
        const random = Math.random().toString(36).substring(2, 9);
        return `${timestamp}-${counter}-${random}`;
    },

    stampEntity(data) {
        return {
            ...data,
            updatedAt: new Date().toISOString()
        };
    },

    // Inicializar storage
    async init() {
        // Inicializar sistema de seguridad
        if (typeof SecurityModule !== 'undefined') {
            await SecurityModule.init();
        }

        if (!await this.get(this.KEYS.CLIENTES)) {
            await this.set(this.KEYS.CLIENTES, []);
        }
        if (!await this.get(this.KEYS.PRESTAMOS)) {
            await this.set(this.KEYS.PRESTAMOS, []);
        }
        if (!await this.get(this.KEYS.PAGOS)) {
            await this.set(this.KEYS.PAGOS, []);
        }
        if (!await this.get(this.KEYS.CONFIG)) {
            await this.set(this.KEYS.CONFIG, {
                capitalInicial: 0,
                fechaInicio: new Date().toISOString()
            });
        }
        if (!localStorage.getItem(this.KEYS.CHANGE_COUNT)) {
            localStorage.setItem(this.KEYS.CHANGE_COUNT, '0');
        }
    },

    // Guardar datos (con encriptación)
    async set(key, value) {
        try {
            // Validar datos
            if (this.encryptionEnabled && typeof SecurityModule !== 'undefined') {
                if (!SecurityModule.validateData(value)) {
                    console.error('Datos inválidos');
                    return false;
                }
            }

            let dataToStore;
            
            // Encriptar datos sensibles
            if (this.encryptionEnabled && typeof SecurityModule !== 'undefined' && SecurityModule.masterKey) {
                const encrypted = await SecurityModule.encrypt(value);
                if (encrypted) {
                    dataToStore = encrypted;
                    // Marcar como encriptado
                    localStorage.setItem(key + '_enc', 'true');
                } else {
                    // Fallback sin encriptación
                    dataToStore = JSON.stringify(value);
                    localStorage.removeItem(key + '_enc');
                }
            } else {
                dataToStore = JSON.stringify(value);
                localStorage.removeItem(key + '_enc');
            }

            localStorage.setItem(key, dataToStore);
            return true;
        } catch (error) {
            console.error('Error al guardar:', error);
            return false;
        }
    },

    // Obtener datos (con desencriptación)
    async get(key) {
        try {
            const data = localStorage.getItem(key);
            if (!data) return null;

            // Verificar si está encriptado
            const isEncrypted = localStorage.getItem(key + '_enc') === 'true';

            if (isEncrypted && typeof SecurityModule !== 'undefined' && SecurityModule.masterKey) {
                // Desencriptar
                const decrypted = await SecurityModule.decrypt(data);
                return decrypted;
            } else {
                // Parsear normalmente
                return JSON.parse(data);
            }
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

    async getClientes() {
        return await this.get(this.KEYS.CLIENTES) || [];
    },

    async getCliente(id) {
        const clientes = await this.getClientes();
        return clientes.find(c => c.id === id);
    },

    async addCliente(cliente) {
        const clientes = await this.getClientes();
        
        // Generar ID único
        let newId;
        let attempts = 0;
        do {
            newId = this.generateUniqueId();
            attempts++;
            // Esperar 1ms si hay colisión (muy raro)
            if (clientes.some(c => c.id === newId) && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        } while (clientes.some(c => c.id === newId) && attempts < 10);
        
        const stamped = this.stampEntity({
            ...cliente,
            id: newId,
            fechaRegistro: new Date().toISOString(),
            score: 100 // Score inicial
        });
        clientes.push(stamped);
        await this.set(this.KEYS.CLIENTES, clientes);
        this.triggerAutoBackup();
        return stamped;
    },

    async updateCliente(id, data) {
        const clientes = await this.getClientes();
        const index = clientes.findIndex(c => c.id === id);
        if (index !== -1) {
            clientes[index] = this.stampEntity({ ...clientes[index], ...data });
            await this.set(this.KEYS.CLIENTES, clientes);
            this.triggerAutoBackup();
            return true;
        }
        return false;
    },

    async deleteCliente(id) {
        const clientes = await this.getClientes();
        const filtered = clientes.filter(c => c.id !== id);
        await this.set(this.KEYS.CLIENTES, filtered);
        this.triggerAutoBackup();
        return true;
    },

    // ============================================
    // PRÉSTAMOS
    // ============================================

    async getPrestamos() {
        return await this.get(this.KEYS.PRESTAMOS) || [];
    },

    async getPrestamo(id) {
        const prestamos = await this.getPrestamos();
        return prestamos.find(p => p.id === id);
    },

    async getPrestamosByCliente(clienteId) {
        const prestamos = await this.getPrestamos();
        return prestamos.filter(p => p.clienteId === clienteId);
    },

    async addPrestamo(prestamo) {
        const prestamos = await this.getPrestamos();
        
        // Generar ID único
        let newId;
        let attempts = 0;
        do {
            newId = this.generateUniqueId();
            attempts++;
            if (prestamos.some(p => p.id === newId) && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        } while (prestamos.some(p => p.id === newId) && attempts < 10);
        
        const stamped = this.stampEntity({
            ...prestamo,
            id: newId,
            fechaCreacion: new Date().toISOString(),
            estado: 'activo',
            cuotasPagadas: 0
        });
        prestamos.push(stamped);
        await this.set(this.KEYS.PRESTAMOS, prestamos);
        this.triggerAutoBackup();
        return stamped;
    },

    async updatePrestamo(id, data) {
        const prestamos = await this.getPrestamos();
        const index = prestamos.findIndex(p => p.id === id);
        if (index !== -1) {
            prestamos[index] = this.stampEntity({ ...prestamos[index], ...data });
            await this.set(this.KEYS.PRESTAMOS, prestamos);
            this.triggerAutoBackup();
            return true;
        }
        return false;
    },

    async deletePrestamo(id) {
        const prestamos = await this.getPrestamos();
        const filtered = prestamos.filter(p => p.id !== id);
        await this.set(this.KEYS.PRESTAMOS, filtered);
        this.triggerAutoBackup();
        return true;
    },

    // ============================================
    // PAGOS
    // ============================================

    async getPagos() {
        return await this.get(this.KEYS.PAGOS) || [];
    },

    async getPagosByPrestamo(prestamoId) {
        const pagos = await this.getPagos();
        return pagos.filter(p => p.prestamoId === prestamoId);
    },

    async addPago(pago) {
        const pagos = await this.getPagos();
        
        // Generar ID único
        let newId;
        let attempts = 0;
        do {
            newId = this.generateUniqueId();
            attempts++;
            if (pagos.some(p => p.id === newId) && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 1));
            }
        } while (pagos.some(p => p.id === newId) && attempts < 10);
        
        const stamped = this.stampEntity({
            ...pago,
            id: newId,
            fechaRegistro: new Date().toISOString()
        });
        pagos.push(stamped);
        await this.set(this.KEYS.PAGOS, pagos);

        // Actualizar préstamo
        const prestamo = await this.getPrestamo(stamped.prestamoId);
        if (prestamo) {
            prestamo.cuotasPagadas++;
            if (prestamo.cuotasPagadas >= prestamo.cantidadCuotas) {
                prestamo.estado = 'finalizado';
                prestamo.fechaFinalizacion = new Date().toISOString();
            }
            await this.updatePrestamo(prestamo.id, prestamo);
        }

        this.triggerAutoBackup();
        return stamped;
    },

    async getPago(id) {
        const pagos = await this.getPagos();
        return pagos.find(p => p.id === id);
    },

    async updatePago(id, data) {
        const pagos = await this.getPagos();
        const index = pagos.findIndex(p => p.id === id);
        if (index !== -1) {
            pagos[index] = this.stampEntity({ ...pagos[index], ...data });
            await this.set(this.KEYS.PAGOS, pagos);
            this.triggerAutoBackup();
            return pagos[index];
        }
        return null;
    },

    async deletePago(id) {
        const pago = await this.getPago(id);
        if (!pago) return false;

        const pagos = await this.getPagos();
        const filtered = pagos.filter(p => p.id !== id);
        await this.set(this.KEYS.PAGOS, filtered);

        // Actualizar préstamo (restar una cuota pagada)
        const prestamo = await this.getPrestamo(pago.prestamoId);
        if (prestamo && prestamo.cuotasPagadas > 0) {
            prestamo.cuotasPagadas--;
            if (prestamo.estado === 'finalizado' && prestamo.cuotasPagadas < prestamo.cantidadCuotas) {
                prestamo.estado = 'activo';
                prestamo.fechaFinalizacion = null;
            }
            await this.updatePrestamo(prestamo.id, prestamo);
        }

        this.triggerAutoBackup();
        return true;
    },

    // ============================================
    // LIMPIEZA DE DUPLICADOS Y MANTENIMIENTO
    // ============================================

    async removeDuplicateClientes() {
        const clientes = await this.getClientes();
        const prestamos = await this.getPrestamos();
        
        // Agrupar clientes por nombre+teléfono
        const clientesMap = new Map();
        const duplicados = [];
        
        for (const cliente of clientes) {
            const key = `${cliente.nombre?.toLowerCase()}_${cliente.telefono}`;
            
            if (clientesMap.has(key)) {
                // Ya existe un cliente con mismo nombre y teléfono
                const existente = clientesMap.get(key);
                
                // Determinar cuál mantener (el más reciente)
                const fechaExistente = new Date(existente.fechaRegistro || 0);
                const fechaActual = new Date(cliente.fechaRegistro || 0);
                
                if (fechaActual > fechaExistente) {
                    // El actual es más reciente, reemplazar
                    duplicados.push({
                        mantener: cliente.id,
                        eliminar: existente.id
                    });
                    clientesMap.set(key, cliente);
                } else {
                    // El existente es más reciente, eliminar el actual
                    duplicados.push({
                        mantener: existente.id,
                        eliminar: cliente.id
                    });
                }
            } else {
                clientesMap.set(key, cliente);
            }
        }
        
        // Si hay duplicados, limpiar
        if (duplicados.length > 0) {
            console.log(`⚠️ Encontrados ${duplicados.length} cliente(s) duplicado(s)`);
            
            for (const dup of duplicados) {
                // Reasignar préstamos del cliente duplicado al cliente principal
                const prestamosDelDuplicado = prestamos.filter(p => p.clienteId === dup.eliminar);
                for (const prestamo of prestamosDelDuplicado) {
                    await this.updatePrestamo(prestamo.id, { clienteId: dup.mantener });
                }
                
                // Eliminar cliente duplicado
                await this.deleteCliente(dup.eliminar);
            }
            
            console.log(`✅ ${duplicados.length} duplicado(s) eliminado(s)`);
            return duplicados.length;
        }
        
        return 0;
    },

    async verifyDataIntegrity() {
        const clientes = await this.getClientes();
        const prestamos = await this.getPrestamos();
        const pagos = await this.getPagos();
        
        const report = {
            clientes: clientes.length,
            prestamos: prestamos.length,
            pagos: pagos.length,
            issues: []
        };
        
        // Verificar IDs únicos
        const clienteIds = new Set();
        const duplicateClienteIds = [];
        for (const cliente of clientes) {
            if (clienteIds.has(cliente.id)) {
                duplicateClienteIds.push(cliente.id);
            }
            clienteIds.add(cliente.id);
        }
        if (duplicateClienteIds.length > 0) {
            report.issues.push(`IDs de cliente duplicados: ${duplicateClienteIds.length}`);
        }
        
        // Verificar préstamos huérfanos (sin cliente)
        const prestamosHuerfanos = prestamos.filter(p => 
            !clientes.some(c => c.id === p.clienteId)
        );
        if (prestamosHuerfanos.length > 0) {
            report.issues.push(`Préstamos sin cliente: ${prestamosHuerfanos.length}`);
        }
        
        // Verificar pagos huérfanos (sin préstamo)
        const pagosHuerfanos = pagos.filter(p => 
            !prestamos.some(pr => pr.id === p.prestamoId)
        );
        if (pagosHuerfanos.length > 0) {
            report.issues.push(`Pagos sin préstamo: ${pagosHuerfanos.length}`);
        }
        
        return report;
    },

    // ============================================
    // AUTO-BACKUP
    // ============================================

    registerDataChange() {
        const current = parseInt(localStorage.getItem(this.KEYS.CHANGE_COUNT) || '0', 10);
        localStorage.setItem(this.KEYS.CHANGE_COUNT, String(current + 1));
    },

    getChangeCount() {
        return parseInt(localStorage.getItem(this.KEYS.CHANGE_COUNT) || '0', 10);
    },

    triggerAutoBackup() {
        this.registerDataChange();
        // Disparar backup automático si el sistema existe
        if (typeof BackupSystem !== 'undefined' && BackupSystem.createAutoBackup) {
            setTimeout(() => BackupSystem.createAutoBackup(), 100);
        }
        if (typeof CloudSync !== 'undefined' && CloudSync.scheduleSync) {
            CloudSync.scheduleSync('storage-change');
        }
    },

    // ============================================
    // CONFIGURACIÓN Y CAPITAL
    // ============================================

    async getConfig() {
        return await this.get(this.KEYS.CONFIG) || {};
    },

    async updateConfig(config) {
        const current = await this.getConfig();
        await this.set(this.KEYS.CONFIG, this.stampEntity({ ...current, ...config }));
        this.triggerAutoBackup();
    },

    // ============================================
    // EXPORTAR/IMPORTAR DATOS
    // ============================================

    async exportData() {
        const clientes = await this.getClientes();
        const prestamos = await this.getPrestamos();
        const pagos = await this.getPagos();
        
        // Calcular resumen general
        const totalClientes = clientes.length;
        const prestamosActivos = prestamos.filter(p => p.estado === 'activo');
        const dineroEntregado = prestamos.reduce((sum, p) => sum + (parseFloat(p.montoEntregado) || 0), 0);
        const capitalACobrar = prestamosActivos.reduce((sum, p) => {
            const cuotasRestantes = p.cantidadCuotas - (p.cuotasPagadas || 0);
            return sum + (cuotasRestantes * parseFloat(p.valorCuota || 0));
        }, 0);
        const dineroEnCalle = prestamosActivos.reduce((sum, p) => {
            const pagado = (p.cuotasPagadas || 0) * parseFloat(p.valorCuota || 0);
            const entregado = parseFloat(p.montoEntregado) || 0;
            const enCalle = entregado - pagado;
            return sum + (enCalle > 0 ? enCalle : 0);
        }, 0);
        
        // Crear estructura detallada por cliente
        const clientesDetallados = await Promise.all(clientes.map(async (cliente) => {
            const prestamosCliente = prestamos.filter(p => p.clienteId === cliente.id);
            const prestamosActivosCliente = prestamosCliente.filter(p => p.estado === 'activo');
            
            const prestamosDetallados = prestamosCliente.map(prestamo => ({
                id: prestamo.id,
                estado: prestamo.estado,
                cantidadEntregada: parseFloat(prestamo.montoEntregado) || 0,
                cantidadCuotas: prestamo.cantidadCuotas || 0,
                valorCuota: parseFloat(prestamo.valorCuota) || 0,
                cuotasPagadas: prestamo.cuotasPagadas || 0,
                cuotasRestantes: (prestamo.cantidadCuotas || 0) - (prestamo.cuotasPagadas || 0),
                totalCobrar: (prestamo.cantidadCuotas || 0) * (parseFloat(prestamo.valorCuota) || 0),
                totalPagado: (prestamo.cuotasPagadas || 0) * (parseFloat(prestamo.valorCuota) || 0),
                saldoPendiente: ((prestamo.cantidadCuotas || 0) - (prestamo.cuotasPagadas || 0)) * (parseFloat(prestamo.valorCuota) || 0),
                frecuencia: prestamo.frecuencia,
                fechaInicio: prestamo.fechaInicio,
                fechaPrimerPago: prestamo.fechaPrimerPago
            }));
            
            return {
                id: cliente.id,
                nombre: cliente.nombre || '',
                apellido: cliente.apellido || '',
                nombreCompleto: `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim(),
                telefono: cliente.telefono || '',
                email: cliente.email || '',
                dni: cliente.dni || '',
                direccion: cliente.direccion || '',
                fechaRegistro: cliente.fechaRegistro || '',
                score: cliente.score || 100,
                prestamos: prestamosDetallados,
                resumen: {
                    totalPrestamos: prestamosCliente.length,
                    prestamosActivos: prestamosActivosCliente.length,
                    totalEntregado: prestamosCliente.reduce((sum, p) => sum + (parseFloat(p.montoEntregado) || 0), 0),
                    totalACobrar: prestamosActivosCliente.reduce((sum, p) => {
                        const cuotasRestantes = p.cantidadCuotas - (p.cuotasPagadas || 0);
                        return sum + (cuotasRestantes * parseFloat(p.valorCuota || 0));
                    }, 0)
                }
            };
        }));
        
        const data = {
            resumenGeneral: {
                totalClientes,
                prestamosActivos: prestamosActivos.length,
                prestamosFinalizados: prestamos.filter(p => p.estado === 'finalizado').length,
                dineroEntregado,
                capitalACobrar,
                dineroEnCalle,
                totalPagos: pagos.length
            },
            clientes: clientesDetallados,
            exportDate: new Date().toISOString(),
            version: '2.0'
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
        
        return data;
    },

    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.clientes) await this.set(this.KEYS.CLIENTES, data.clientes);
                    if (data.prestamos) await this.set(this.KEYS.PRESTAMOS, data.prestamos);
                    if (data.pagos) await this.set(this.KEYS.PAGOS, data.pagos);
                    if (data.config) await this.set(this.KEYS.CONFIG, data.config);
                    if (data.profile) localStorage.setItem('mindset_profile', JSON.stringify(data.profile));
                    
                    resolve(data);
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
