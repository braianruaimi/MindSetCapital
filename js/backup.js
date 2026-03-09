// ============================================
// BACKUP.JS - Sistema de Respaldos Automáticos
// Gestión de backups automáticos y descarga PDF
// ============================================

const BackupSystem = {
    BACKUP_KEY: 'mindset_autobackups',
    MAX_BACKUPS: 10, // Mantener últimas 10 copias
    lastBackupTime: 0,
    MIN_BACKUP_INTERVAL: 2000, // Mínimo 2 segundos entre backups
    PERIODIC_BACKUP_INTERVAL: 10 * 60 * 1000, // 10 minutos
    lastSnapshotChangeCount: 0,
    periodicTimerId: null,
    
    // Inicializar sistema de backups
    init() {
        this.lastSnapshotChangeCount = (typeof Storage !== 'undefined' && Storage.getChangeCount)
            ? Storage.getChangeCount()
            : 0;
        this.startPeriodicBackups();
        this.updateBackupStatus();
        this.setupEventListeners();
        console.log('✅ Sistema de backups automáticos inicializado');
    },

    startPeriodicBackups() {
        if (this.periodicTimerId) {
            clearInterval(this.periodicTimerId);
        }

        this.periodicTimerId = setInterval(async () => {
            try {
                const currentChangeCount = (typeof Storage !== 'undefined' && Storage.getChangeCount)
                    ? Storage.getChangeCount()
                    : 0;

                // Evitar backups vacíos: solo se respalda si hubo cambios reales.
                if (currentChangeCount > this.lastSnapshotChangeCount) {
                    const created = await this.createAutoBackup('periodic');
                    if (created) {
                        this.lastSnapshotChangeCount = currentChangeCount;
                    }
                }
            } catch (error) {
                console.error('❌ Error en backup periódico:', error);
            }
        }, this.PERIODIC_BACKUP_INTERVAL);
    },

    // ============================================
    // AUTO-BACKUP
    // ============================================

    // Crear backup automático (llamado desde Storage en cada operación)
    async createAutoBackup(source = 'event') {
        // Throttling: no crear backup si ya se creó uno hace menos de MIN_BACKUP_INTERVAL
        const now = Date.now();
        if (now - this.lastBackupTime < this.MIN_BACKUP_INTERVAL) {
            console.log('⏸️ Backup omitido (throttle)');
            return false;
        }
        
        try {
            const backup = {
                id: Date.now(),
                fecha: new Date().toISOString(),
                source,
                changeCount: (typeof Storage !== 'undefined' && Storage.getChangeCount)
                    ? Storage.getChangeCount()
                    : 0,
                datos: {
                    clientes: await Storage.getClientes() || [],
                    prestamos: await Storage.getPrestamos() || [],
                    pagos: await Storage.getPagos() || [],
                    config: await Storage.get(Storage.KEYS.CONFIG) || {},
                    profile: await Storage.get(Storage.KEYS.CAPITAL) || {}
                }
            };

            // Obtener backups existentes
            let backups = this.getAutoBackups();
            
            // Agregar nuevo backup al inicio
            backups.unshift(backup);
            
            // Mantener solo los últimos MAX_BACKUPS
            if (backups.length > this.MAX_BACKUPS) {
                backups = backups.slice(0, this.MAX_BACKUPS);
            }
            
            // Guardar en localStorage
            localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backups));
            localStorage.setItem('mindset_last_backup', backup.fecha);
            
            this.lastBackupTime = now;
            this.lastSnapshotChangeCount = backup.changeCount;
            this.updateBackupStatus();
            
            console.log('✅ Backup automático creado:', new Date(backup.fecha).toLocaleString());
            return true;
        } catch (error) {
            console.error('❌ Error al crear backup automático:', error);
            return false;
        }
    },

    // Obtener todos los backups automáticos
    getAutoBackups() {
        try {
            const data = localStorage.getItem(this.BACKUP_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error al obtener backups:', error);
            return [];
        }
    },

    // Restaurar desde un backup específico
    async restoreFromBackup(backupId) {
        const backups = this.getAutoBackups();
        const backup = backups.find(b => b.id === backupId);
        
        if (!backup) {
            alert('❌ Backup no encontrado');
            return false;
        }

        if (!confirm(`¿Restaurar datos del ${new Date(backup.fecha).toLocaleString()}?\n\n⚠️ Esto reemplazará todos tus datos actuales.`)) {
            return false;
        }

        try {
            // Restaurar todos los datos
            await Storage.set(Storage.KEYS.CLIENTES, backup.datos.clientes);
            await Storage.set(Storage.KEYS.PRESTAMOS, backup.datos.prestamos);
            await Storage.set(Storage.KEYS.PAGOS, backup.datos.pagos);
            await Storage.set(Storage.KEYS.CONFIG, backup.datos.config);
            await Storage.set(Storage.KEYS.CAPITAL, backup.datos.profile);
            
            alert('✅ Datos restaurados correctamente. Recargando aplicación...');
            location.reload();
            return true;
        } catch (error) {
            console.error('Error al restaurar backup:', error);
            alert('❌ Error al restaurar los datos');
            return false;
        }
    },

    // Eliminar un backup específico
    deleteBackup(backupId) {
        let backups = this.getAutoBackups();
        backups = backups.filter(b => b.id !== backupId);
        localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backups));
        this.showAutoBackupsList(); // Actualizar lista
    },

    // ============================================
    // EXPORTACIÓN MANUAL
    // ============================================

    // Exportar backup manual (JSON)
    async exportManualBackup() {
        try {
            const backup = {
                app: 'MindSet Capital',
                version: '2.0',
                fecha: new Date().toISOString(),
                datos: {
                    clientes: await Storage.getClientes() || [],
                    prestamos: await Storage.getPrestamos() || [],
                    pagos: await Storage.getPagos() || [],
                    config: await Storage.get(Storage.KEYS.CONFIG) || {},
                    profile: await Storage.get(Storage.KEYS.CAPITAL) || {}
                }
            };

            const dataStr = JSON.stringify(backup, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `MindSetCapital_Backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            alert('✅ Respaldo descargado correctamente');
            this.updateBackupStatus();
        } catch (error) {
            console.error('Error al exportar backup:', error);
            alert('❌ Error al crear el respaldo');
        }
    },

    // Importar backup desde archivo
    importBackup(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                
                if (!backup.datos || !backup.datos.clientes) {
                    alert('❌ Archivo de respaldo inválido');
                    return;
                }

                if (!confirm('⚠️ ¿Restaurar este respaldo?\n\nEsto reemplazará todos tus datos actuales.')) {
                    return;
                }

                // Restaurar datos
                await Storage.set(Storage.KEYS.CLIENTES, backup.datos.clientes);
                await Storage.set(Storage.KEYS.PRESTAMOS, backup.datos.prestamos);
                await Storage.set(Storage.KEYS.PAGOS, backup.datos.pagos);
                await Storage.set(Storage.KEYS.CONFIG, backup.datos.config);
                if (backup.datos.profile) {
                    await Storage.set(Storage.KEYS.CAPITAL, backup.datos.profile);
                }
                
                alert('✅ Respaldo restaurado correctamente. Recargando aplicación...');
                location.reload();
            } catch (error) {
                console.error('Error al importar backup:', error);
                alert('❌ Error al restaurar el respaldo. Verifica que el archivo sea válido.');
            }
        };
        reader.readAsText(file);
    },

    // ============================================
    // EXPORTACIÓN A PDF
    // ============================================

    // Generar y descargar PDF con todos los datos
    async exportPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const clientes = await Storage.getClientes() || [];
            const prestamos = await Storage.getPrestamos() || [];
            const pagos = await Storage.getPagos() || [];
            
            let y = 20;
            const lineHeight = 7;
            const pageHeight = 280;
            const margin = 20;
            
            // Función para verificar si necesitamos nueva página
            const checkNewPage = (extraSpace = 0) => {
                if (y + extraSpace > pageHeight) {
                    doc.addPage();
                    y = 20;
                    return true;
                }
                return false;
            };
            
            // PORTADA
            doc.setFontSize(24);
            doc.setTextColor(0, 200, 200);
            doc.text('💰 MindSet Capital', 105, y, { align: 'center' });
            y += 15;
            
            doc.setFontSize(16);
            doc.setTextColor(60, 60, 60);
            doc.text('Reporte Completo de Gestión', 105, y, { align: 'center' });
            y += 10;
            
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generado: ${new Date().toLocaleDateString('es-ES', { 
                year: 'numeric', month: 'long', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            })}`, 105, y, { align: 'center' });
            y += 25;
            
            // CALCULAR MÉTRICAS
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
            const totalGanancias = prestamos.reduce((sum, p) => sum + (parseFloat(p.ganancia) || 0), 0);
            
            // CLIENTES DETALLADOS
            checkNewPage(40);
            doc.setFontSize(16);
            doc.setTextColor(0, 150, 200);
            doc.text('👥 CLIENTES Y PRÉSTAMOS', margin, y);
            y += 12;
            
            for (const cliente of clientes) {
                const prestamosCliente = prestamos.filter(p => p.clienteId === cliente.id);
                const prestamosActivosCliente = prestamosCliente.filter(p => p.estado === 'activo');
                
                checkNewPage(30);
                
                // Encabezado del cliente
                doc.setFontSize(12);
                doc.setTextColor(40, 40, 40);
                doc.setFont(undefined, 'bold');
                doc.text(`${cliente.nombre || ''} ${cliente.apellido || ''}`, margin, y);
                doc.setFont(undefined, 'normal');
                y += lineHeight;
                
                // Datos del cliente
                doc.setFontSize(9);
                doc.setTextColor(80, 80, 80);
                doc.text(`ID: ${cliente.id}`, margin + 5, y);
                y += lineHeight;
                doc.text(`Teléfono: ${cliente.telefono || 'N/A'}`, margin + 5, y);
                y += lineHeight;
                doc.text(`Email: ${cliente.email || 'N/A'}`, margin + 5, y);
                y += lineHeight;
                doc.text(`D.N.I: ${cliente.dni || 'N/A'}`, margin + 5, y);
                y += lineHeight;
                if (cliente.direccion) {
                    doc.text(`Dirección: ${cliente.direccion}`, margin + 5, y);
                    y += lineHeight;
                }
                y += 3;
                
                // Préstamos del cliente
                if (prestamosCliente.length > 0) {
                    doc.setFontSize(10);
                    doc.setTextColor(0, 100, 150);
                    doc.text(`Préstamos (${prestamosCliente.length}):`, margin + 5, y);
                    y += lineHeight;
                    
                    for (const prestamo of prestamosCliente) {
                        checkNewPage(20);
                        
                        const cuotasRestantes = prestamo.cantidadCuotas - (prestamo.cuotasPagadas || 0);
                        const saldoPendiente = cuotasRestantes * parseFloat(prestamo.valorCuota || 0);
                        
                        doc.setFontSize(9);
                        doc.setTextColor(60, 60, 60);
                        doc.text(`• Cantidad Entregada: $${parseFloat(prestamo.montoEntregado || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, margin + 10, y);
                        y += lineHeight;
                        doc.text(`  Cuotas: ${prestamo.cuotasPagadas || 0}/${prestamo.cantidadCuotas} | Valor Cuota: $${parseFloat(prestamo.valorCuota || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, margin + 10, y);
                        y += lineHeight;
                        doc.text(`  Total a Cobrar: $${(prestamo.cantidadCuotas * parseFloat(prestamo.valorCuota || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} | Saldo Pendiente: $${saldoPendiente.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, margin + 10, y);
                        y += lineHeight;
                        doc.text(`  Estado: ${prestamo.estado.toUpperCase()} | Inicio: ${new Date(prestamo.fechaInicio || prestamo.fechaCreacion).toLocaleDateString('es-ES')}`, margin + 10, y);
                        y += lineHeight + 2;
                    }
                } else {
                    doc.setFontSize(9);
                    doc.setTextColor(120, 120, 120);
                    doc.text('Sin préstamos registrados', margin + 10, y);
                    y += lineHeight;
                }
                
                y += 8;
                
                // Línea separadora
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, y, 190, y);
                y += 10;
            }
            
            // RESUMEN FINAL
            checkNewPage(60);
            y += 5;
            doc.setFontSize(16);
            doc.setTextColor(0, 150, 100);
            doc.text('📊 RESUMEN GENERAL', margin, y);
            y += 12;
            
            doc.setFontSize(11);
            doc.setTextColor(40, 40, 40);
            
            // Cuadro de resumen
            doc.setFillColor(240, 250, 255);
            doc.rect(margin, y - 5, 170, 50, 'F');
            
            doc.setFont(undefined, 'bold');
            doc.text('Total de Clientes:', margin + 5, y);
            doc.setFont(undefined, 'normal');
            doc.text(`${clientes.length}`, 120, y);
            y += lineHeight + 2;
            
            doc.setFont(undefined, 'bold');
            doc.text('Préstamos Activos:', margin + 5, y);
            doc.setFont(undefined, 'normal');
            doc.text(`${prestamosActivos.length}`, 120, y);
            y += lineHeight + 2;
            
            doc.setFont(undefined, 'bold');
            doc.text('Dinero Entregado:', margin + 5, y);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(200, 50, 50);
            doc.text(`$${dineroEntregado.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, 120, y);
            doc.setTextColor(40, 40, 40);
            y += lineHeight + 2;
            
            doc.setFont(undefined, 'bold');
            doc.text('Capital a Cobrar:', margin + 5, y);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 150, 0);
            doc.text(`$${capitalACobrar.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, 120, y);
            doc.setTextColor(40, 40, 40);
            y += lineHeight + 2;
            
            doc.setFont(undefined, 'bold');
            doc.text('Dinero en Calle:', margin + 5, y);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(220, 120, 0);
            doc.text(`$${dineroEnCalle.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, 120, y);
            doc.setTextColor(40, 40, 40);
            y += lineHeight + 2;
            
            doc.setFont(undefined, 'bold');
            doc.text('Ganancias Totales:', margin + 5, y);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 100, 200);
            doc.text(`$${totalGanancias.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, 120, y);
            
            // PIE DE PÁGINA EN TODAS LAS PÁGINAS
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
                doc.text('MindSet Capital © 2026', margin, 290);
            }
            
            // Guardar PDF
            const fileName = `MindSetCapital_Reporte_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            alert('✅ Reporte PDF descargado correctamente');
            
        } catch (error) {
            console.error('Error al generar PDF:', error);
            alert('❌ Error al generar el PDF. Verifica que la librería jsPDF esté cargada.');
        }
    },

    // ============================================
    // UI - INTERFAZ DE USUARIO
    // ============================================

    // Actualizar estado de backups en UI
    async updateBackupStatus() {
        const backups = this.getAutoBackups();
        const ultimoBackup = backups.length > 0 ? backups[0] : null;
        
        // Actualizar contadores
        const clientes = await Storage.getClientes() || [];
        const prestamos = await Storage.getPrestamos() || [];
        const pagos = await Storage.getPagos() || [];
        const changeCount = (typeof Storage !== 'undefined' && Storage.getChangeCount)
            ? Storage.getChangeCount()
            : 0;
        
        const statusClientes = document.getElementById('statusClientes');
        const statusPrestamos = document.getElementById('statusPrestamos');
        const statusPagos = document.getElementById('statusPagos');
        const statusUltimoBackup = document.getElementById('statusUltimoBackup');
        const statusCambios = document.getElementById('statusCambios');
        
        if (statusClientes) statusClientes.textContent = clientes.length;
        if (statusPrestamos) statusPrestamos.textContent = prestamos.length;
        if (statusPagos) statusPagos.textContent = pagos.length;
        if (statusCambios) statusCambios.textContent = changeCount;
        
        if (statusUltimoBackup) {
            if (ultimoBackup) {
                const fecha = new Date(ultimoBackup.fecha);
                const ahora = new Date();
                const diff = Math.floor((ahora - fecha) / 1000 / 60); // minutos
                
                if (diff < 1) {
                    statusUltimoBackup.textContent = 'Hace unos segundos';
                } else if (diff < 60) {
                    statusUltimoBackup.textContent = `Hace ${diff} min`;
                } else if (diff < 1440) {
                    const horas = Math.floor(diff / 60);
                    statusUltimoBackup.textContent = `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
                } else {
                    const dias = Math.floor(diff / 1440);
                    statusUltimoBackup.textContent = `Hace ${dias} día${dias > 1 ? 's' : ''}`;
                }
            } else {
                statusUltimoBackup.textContent = 'Nunca';
            }
        }
    },

    // Mostrar lista de backups automáticos
    showAutoBackupsList() {
        const backups = this.getAutoBackups();
        
        let html = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h3>📦 Backups Automáticos (${backups.length}/${this.MAX_BACKUPS})</h3>
                    <button class="close-modal" onclick="document.getElementById('modalAutoBackups').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <p class="info-text">
                        💡 Se crea un backup automático cada vez que agregas, editas o eliminas datos.
                        Se mantienen las últimas ${this.MAX_BACKUPS} copias.
                    </p>
        `;
        
        if (backups.length === 0) {
            html += '<p class="empty-state">No hay backups automáticos todavía. Se crearán cuando realices cambios en tus datos.</p>';
        } else {
            html += '<div class="backups-list">';
            backups.forEach(backup => {
                const fecha = new Date(backup.fecha);
                const totalItems = backup.datos.clientes.length + backup.datos.prestamos.length + backup.datos.pagos.length;
                
                html += `
                    <div class="backup-item">
                        <div class="backup-info">
                            <div class="backup-date">📅 ${fecha.toLocaleDateString()} - ${fecha.toLocaleTimeString()}</div>
                            <div class="backup-details">
                                ${backup.datos.clientes.length} clientes, 
                                ${backup.datos.prestamos.length} préstamos, 
                                ${backup.datos.pagos.length} pagos,
                                cambios: ${backup.changeCount || 0},
                                origen: ${backup.source || 'event'}
                            </div>
                        </div>
                        <div class="backup-actions">
                            <button class="btn-primary btn-sm" onclick="BackupSystem.restoreFromBackup(${backup.id})">
                                ♻️ Restaurar
                            </button>
                            <button class="btn-danger btn-sm" onclick="BackupSystem.deleteBackup(${backup.id})">
                                🗑️
                            </button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        
        html += `
                </div>
            </div>
        `;
        
        // Crear o actualizar modal
        let modal = document.getElementById('modalAutoBackups');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'modalAutoBackups';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = html;
        modal.style.display = 'flex';
    },

    // Configurar event listeners
    setupEventListeners() {
        // Botón exportar backup manual
        const btnExport = document.getElementById('btnExportBackup');
        if (btnExport) {
            btnExport.addEventListener('click', () => this.exportManualBackup());
        }

        // Botón importar backup
        const btnImport = document.getElementById('btnImportBackup');
        const fileImport = document.getElementById('fileImportBackup');
        if (btnImport && fileImport) {
            btnImport.addEventListener('click', () => fileImport.click());
            fileImport.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.importBackup(e.target.files[0]);
                    e.target.value = ''; // Reset input
                }
            });
        }

        // Botón ver backups automáticos
        const btnViewAutoBackups = document.getElementById('btnViewAutoBackups');
        if (btnViewAutoBackups) {
            btnViewAutoBackups.addEventListener('click', () => this.showAutoBackupsList());
        }

        // Botón exportar PDF
        const btnExportPDF = document.getElementById('btnExportPDF');
        if (btnExportPDF) {
            btnExportPDF.addEventListener('click', () => this.exportPDF());
        }
    }
};

// No inicializar automáticamente, dejar que app.js lo haga
// Se exporta como módulo disponible para uso posterior
