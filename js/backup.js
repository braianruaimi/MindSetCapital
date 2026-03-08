// ============================================
// BACKUP.JS - Sistema de Respaldos Automáticos
// Gestión de backups automáticos y descarga PDF
// ============================================

const BackupSystem = {
    BACKUP_KEY: 'mindset_autobackups',
    MAX_BACKUPS: 10, // Mantener últimas 10 copias
    lastBackupTime: 0,
    MIN_BACKUP_INTERVAL: 2000, // Mínimo 2 segundos entre backups
    
    // Inicializar sistema de backups
    init() {
        this.updateBackupStatus();
        this.setupEventListeners();
        console.log('✅ Sistema de backups automáticos inicializado');
    },

    // ============================================
    // AUTO-BACKUP
    // ============================================

    // Crear backup automático (llamado desde Storage en cada operación)
    createAutoBackup() {
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
                datos: {
                    clientes: Storage.getClientes() || [],
                    prestamos: Storage.getPrestamos() || [],
                    pagos: Storage.getPagos() || [],
                    config: Storage.get(Storage.KEYS.CONFIG) || {},
                    profile: Storage.get(Storage.KEYS.CAPITAL) || {}
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
            
            this.lastBackupTime = now;
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
    restoreFromBackup(backupId) {
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
            Storage.set(Storage.KEYS.CLIENTES, backup.datos.clientes);
            Storage.set(Storage.KEYS.PRESTAMOS, backup.datos.prestamos);
            Storage.set(Storage.KEYS.PAGOS, backup.datos.pagos);
            Storage.set(Storage.KEYS.CONFIG, backup.datos.config);
            Storage.set(Storage.KEYS.CAPITAL, backup.datos.profile);
            
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
    exportManualBackup() {
        try {
            const backup = {
                app: 'MindSet Capital',
                version: '2.0',
                fecha: new Date().toISOString(),
                datos: {
                    clientes: Storage.getClientes() || [],
                    prestamos: Storage.getPrestamos() || [],
                    pagos: Storage.getPagos() || [],
                    config: Storage.get(Storage.KEYS.CONFIG) || {},
                    profile: Storage.get(Storage.KEYS.CAPITAL) || {}
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
        reader.onload = (e) => {
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
                Storage.set(Storage.KEYS.CLIENTES, backup.datos.clientes);
                Storage.set(Storage.KEYS.PRESTAMOS, backup.datos.prestamos);
                Storage.set(Storage.KEYS.PAGOS, backup.datos.pagos);
                Storage.set(Storage.KEYS.CONFIG, backup.datos.config);
                if (backup.datos.profile) {
                    Storage.set(Storage.KEYS.CAPITAL, backup.datos.profile);
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
            
            const clientes = Storage.getClientes() || [];
            const prestamos = Storage.getPrestamos() || [];
            const pagos = Storage.getPagos() || [];
            const config = Storage.get(Storage.KEYS.CONFIG) || {};
            
            let y = 20;
            const lineHeight = 7;
            const pageHeight = 280;
            
            // Función para verificar si necesitamos nueva página
            const checkNewPage = () => {
                if (y > pageHeight) {
                    doc.addPage();
                    y = 20;
                }
            };
            
            // PORTADA
            doc.setFontSize(24);
            doc.setTextColor(0, 255, 255);
            doc.text('💰 MindSet Capital', 105, y, { align: 'center' });
            y += 15;
            
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text('Reporte Completo de Datos', 105, y, { align: 'center' });
            y += 10;
            
            doc.setFontSize(10);
            doc.text(`Fecha: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`, 105, y, { align: 'center' });
            y += 20;
            
            // RESUMEN GENERAL
            doc.setFontSize(14);
            doc.setTextColor(255, 0, 255);
            doc.text('📊 Resumen General', 20, y);
            y += 10;
            
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            doc.text(`• Total de Clientes: ${clientes.length}`, 25, y);
            y += lineHeight;
            doc.text(`• Préstamos Activos: ${prestamos.length}`, 25, y);
            y += lineHeight;
            doc.text(`• Pagos Registrados: ${pagos.length}`, 25, y);
            y += lineHeight;
            doc.text(`• Capital Inicial: $${config.capitalInicial || 0}`, 25, y);
            y += 15;
            
            checkNewPage();
            
            // CLIENTES
            if (clientes.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(255, 0, 255);
                doc.text('👥 Listado de Clientes', 20, y);
                y += 10;
                
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                
                clientes.forEach((cliente, index) => {
                    checkNewPage();
                    
                    doc.text(`${index + 1}. ${cliente.nombre} ${cliente.apellido || ''}`, 25, y);
                    y += lineHeight;
                    doc.text(`   Tel: ${cliente.telefono || 'N/A'} | Email: ${cliente.email || 'N/A'}`, 30, y);
                    y += lineHeight;
                    if (cliente.direccion) {
                        doc.text(`   Dir: ${cliente.direccion}`, 30, y);
                        y += lineHeight;
                    }
                    doc.text(`   Score: ${cliente.score || 100} | Registrado: ${new Date(cliente.fechaRegistro).toLocaleDateString()}`, 30, y);
                    y += lineHeight + 2;
                });
                
                y += 10;
            }
            
            checkNewPage();
            
            // PRÉSTAMOS
            if (prestamos.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(255, 0, 255);
                doc.text('💰 Listado de Préstamos', 20, y);
                y += 10;
                
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                
                prestamos.forEach((prestamo, index) => {
                    checkNewPage();
                    
                    const cliente = clientes.find(c => c.id === prestamo.clienteId);
                    const nombreCliente = cliente ? `${cliente.nombre} ${cliente.apellido || ''}` : 'Cliente desconocido';
                    
                    doc.text(`${index + 1}. ${nombreCliente}`, 25, y);
                    y += lineHeight;
                    doc.text(`   Monto: $${prestamo.monto} | Cuotas: ${prestamo.cuotasPagadas || 0}/${prestamo.cuotas}`, 30, y);
                    y += lineHeight;
                    doc.text(`   Total a Cobrar: $${prestamo.totalCobrar} | Ganancia: $${prestamo.ganancia}`, 30, y);
                    y += lineHeight;
                    doc.text(`   Estado: ${prestamo.estado} | Creado: ${new Date(prestamo.fechaCreacion).toLocaleDateString()}`, 30, y);
                    y += lineHeight + 2;
                });
                
                y += 10;
            }
            
            checkNewPage();
            
            // PAGOS
            if (pagos.length > 0) {
                doc.setFontSize(14);
                doc.setTextColor(255, 0, 255);
                doc.text('📝 Historial de Pagos', 20, y);
                y += 10;
                
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                
                // Ordenar pagos por fecha (más recientes primero)
                const pagosOrdenados = [...pagos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
                
                pagosOrdenados.slice(0, 50).forEach((pago, index) => { // Limitar a últimos 50 pagos
                    checkNewPage();
                    
                    const prestamo = prestamos.find(p => p.id === pago.prestamoId);
                    const cliente = prestamo ? clientes.find(c => c.id === prestamo.clienteId) : null;
                    const nombreCliente = cliente ? `${cliente.nombre} ${cliente.apellido || ''}` : 'N/A';
                    
                    doc.text(`${index + 1}. ${new Date(pago.fecha).toLocaleDateString()} - $${pago.monto}`, 25, y);
                    y += lineHeight;
                    doc.text(`   Cliente: ${nombreCliente}`, 30, y);
                    y += lineHeight;
                    if (pago.notas) {
                        doc.text(`   Notas: ${pago.notas.substring(0, 60)}`, 30, y);
                        y += lineHeight;
                    }
                    y += 2;
                });
                
                if (pagos.length > 50) {
                    y += 5;
                    doc.text(`... y ${pagos.length - 50} pagos más`, 25, y);
                }
            }
            
            // PIE DE PÁGINA
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
                doc.text('MindSet Capital © 2026', 20, 290);
            }
            
            // Guardar PDF
            const fileName = `MindSetCapital_Reporte_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            
            alert('✅ PDF descargado correctamente');
            
        } catch (error) {
            console.error('Error al generar PDF:', error);
            alert('❌ Error al generar el PDF. Verifica que la librería jsPDF esté cargada.');
        }
    },

    // ============================================
    // UI - INTERFAZ DE USUARIO
    // ============================================

    // Actualizar estado de backups en UI
    updateBackupStatus() {
        const backups = this.getAutoBackups();
        const ultimoBackup = backups.length > 0 ? backups[0] : null;
        
        // Actualizar contadores
        const clientes = Storage.getClientes() || [];
        const prestamos = Storage.getPrestamos() || [];
        const pagos = Storage.getPagos() || [];
        
        const statusClientes = document.getElementById('statusClientes');
        const statusPrestamos = document.getElementById('statusPrestamos');
        const statusPagos = document.getElementById('statusPagos');
        const statusUltimoBackup = document.getElementById('statusUltimoBackup');
        
        if (statusClientes) statusClientes.textContent = clientes.length;
        if (statusPrestamos) statusPrestamos.textContent = prestamos.length;
        if (statusPagos) statusPagos.textContent = pagos.length;
        
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
                                ${backup.datos.pagos.length} pagos
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

// Inicializar cuando el documento esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BackupSystem.init());
} else {
    BackupSystem.init();
}
