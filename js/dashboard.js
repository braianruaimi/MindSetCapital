// ============================================
// DASHBOARD.JS - Dashboard principal con métricas y gráficos
// ============================================

const DashboardModule = {

    charts: {},

    init() {
        this.calculateMetrics();
        this.showAlerts();
        this.showAlertasCobros();
        this.showCobrosHoy();
        this.renderCharts();
        
        document.getElementById('refreshDashboard')?.addEventListener('click', async () => {
            await this.init();
            ClientesModule.showNotification('Dashboard actualizado', 'info');
        });
    },

    async showAlertasCobros() {
        const container = document.getElementById('alertasCobros');
        if (!container) return;

        const prestamos = (await Storage.getPrestamos()).filter(p => p.estado === 'activo');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const cobrosProximos = [];

        for (const prestamo of prestamos) {
            const proximoPago = PrestamosModule.calculateProximoPago(prestamo);
            proximoPago.setHours(0, 0, 0, 0);
            const dias = Math.ceil((proximoPago - hoy) / (1000 * 60 * 60 * 24));

            // Mostrar cobros de hoy y próximos 3 días
            if (dias >= 0 && dias <= 3) {
                const cliente = await Storage.getCliente(prestamo.clienteId);
                cobrosProximos.push({
                    cliente: cliente?.nombre || 'Desconocido',
                    clienteId: cliente?.id,
                    monto: prestamo.valorCuota,
                    dias: dias,
                    prestamoId: prestamo.id,
                    fecha: proximoPago,
                    telefono: cliente?.telefono || ''
                });
            }
        }

        if (cobrosProximos.length === 0) {
            container.innerHTML = '';
            return;
        }

        // Ordenar por días (más próximos primero)
        cobrosProximos.sort((a, b) => a.dias - b.dias);

        const getDiaTexto = (dias) => {
            if (dias === 0) return '🔴 HOY';
            if (dias === 1) return '🟡 Mañana';
            return `🟢 En ${dias} días`;
        };

        const getColorClase = (dias) => {
            if (dias === 0) return 'alerta-hoy';
            if (dias === 1) return 'alerta-manana';
            return 'alerta-proximos';
        };

        container.innerHTML = `
            <div class="alertas-cobros-card">
                <div class="alertas-header">
                    <h3>⚡ Alertas de Cobros Próximos</h3>
                    <span class="alertas-count">${cobrosProximos.length} pendiente(s)</span>
                </div>
                <div class="alertas-list">
                    ${cobrosProximos.map(cobro => `
                        <div class="alerta-cobro-item ${getColorClase(cobro.dias)}">
                            <div class="alerta-info">
                                <div class="alerta-cliente">
                                    <span class="cliente-nombre">${cobro.cliente}</span>
                                    ${cobro.telefono ? `<span class="cliente-tel">📞 ${cobro.telefono}</span>` : ''}
                                </div>
                                <div class="alerta-detalles">
                                    <span class="alerta-monto">$${parseFloat(cobro.monto).toLocaleString()}</span>
                                    <span class="alerta-fecha">${cobro.fecha.toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div class="alerta-estado">
                                <span class="estado-badge">${getDiaTexto(cobro.dias)}</span>
                                <button class="btn-small btn-success" 
                                        onclick="PagosModule.openModalPago('${cobro.prestamoId}')" 
                                        title="Registrar Pago">
                                    💰 Cobrar
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    async calculateMetrics() {
        const prestamos = await Storage.getPrestamos();
        const clientes = await Storage.getClientes();
        const pagos = await Storage.getPagos();
        const config = await Storage.getConfig();

        // Capital disponible = capital inicial + ganancias - dinero prestado activo
        const prestamosActivos = prestamos.filter(p => p.estado === 'activo');
        const totalPrestado = prestamosActivos.reduce((sum, p) => sum + parseFloat(p.montoEntregado), 0);
        
        const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        const capitalDisponible = (config.capitalInicial || 0) + totalPagado - totalPrestado;

        // Total a cobrar
        const totalCobrar = prestamosActivos.reduce((sum, p) => {
            const cuotasRestantes = p.cantidadCuotas - p.cuotasPagadas;
            return sum + (cuotasRestantes * p.valorCuota);
        }, 0);

        // Ganancia total
        const gananciaTotal = prestamos.reduce((sum, p) => {
            const pagosPrestamo = pagos.filter(pago => pago.prestamoId === p.id);
            const pagado = pagosPrestamo.reduce((s, pago) => s + parseFloat(pago.monto), 0);
            return sum + (pagado - parseFloat(p.montoEntregado));
        }, 0);

        // Ganancia del mes
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const pagosMes = pagos.filter(p => new Date(p.fecha) >= inicioMes);
        let gananciaMes = 0;
        for (const p of pagosMes) {
            const prestamo = await Storage.getPrestamo(p.prestamoId);
            if (prestamo) {
                const gananciaUnitaria = prestamo.ganancia / prestamo.cantidadCuotas;
                gananciaMes += gananciaUnitaria;
            }
        }

        // Actualizar DOM
        document.getElementById('capitalDisponible').textContent = `$${capitalDisponible.toLocaleString()}`;
        document.getElementById('totalPrestado').textContent = `$${totalPrestado.toLocaleString()}`;
        document.getElementById('totalCobrar').textContent = `$${totalCobrar.toLocaleString()}`;
        document.getElementById('gananciaTotal').textContent = `$${gananciaTotal.toLocaleString()}`;
        document.getElementById('gananciaMes').textContent = `$${gananciaMes.toLocaleString()}`;
        document.getElementById('totalClientes').textContent = clientes.length;
        document.getElementById('prestamosActivos').textContent = prestamosActivos.length;
        document.getElementById('prestamosFinalizados').textContent = 
            prestamos.filter(p => p.estado === 'finalizado').length;
    },

    async showAlerts() {
        const container = document.getElementById('alertsContainer');
        if (!container) return;

        const alertas = [];
        const prestamos = (await Storage.getPrestamos()).filter(p => p.estado === 'activo');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        let pagosVencidos = 0;
        let pagosHoy = 0;
        let pagosProximos = 0;

        prestamos.forEach(prestamo => {
            const proximoPago = PrestamosModule.calculateProximoPago(prestamo);
            proximoPago.setHours(0, 0, 0, 0);
            const dias = Math.ceil((proximoPago - hoy) / (1000 * 60 * 60 * 24));

            if (dias < 0) {
                pagosVencidos++;
            } else if (dias === 0) {
                pagosHoy++;
            } else if (dias <= 3) {
                pagosProximos++;
            }
        });

        if (pagosVencidos > 0) {
            alertas.push(`
                <div class="alert alert-danger">
                    🚨 <strong>Atención:</strong> Tienes ${pagosVencidos} pago(s) vencido(s)
                </div>
            `);
        }

        if (pagosHoy > 0) {
            alertas.push(`
                <div class="alert alert-warning">
                    ⏰ <strong>Hoy:</strong> ${pagosHoy} pago(s) programado(s) para hoy
                </div>
            `);
        }

        if (pagosProximos > 0) {
            alertas.push(`
                <div class="alert alert-info">
                    📅 <strong>Próximos:</strong> ${pagosProximos} pago(s) en los próximos 3 días
                </div>
            `);
        }

        // Actualizar métricas de alertas
        document.getElementById('prestamosActivos').textContent = prestamos.length;

        container.innerHTML = alertas.join('');
    },

    async showCobrosHoy() {
        const container = document.getElementById('cobrosHoy');
        if (!container) return;

        const prestamos = (await Storage.getPrestamos()).filter(p => p.estado === 'activo');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const cobrosHoy = [];

        for (const prestamo of prestamos) {
            const proximoPago = PrestamosModule.calculateProximoPago(prestamo);
            proximoPago.setHours(0, 0, 0, 0);
            const dias = Math.ceil((proximoPago - hoy) / (1000 * 60 * 60 * 24));

            if (dias <= 0) {
                const cliente = await Storage.getCliente(prestamo.clienteId);
                cobrosHoy.push({
                    cliente: cliente?.nombre || 'Desconocido',
                    monto: prestamo.valorCuota,
                    dias: dias,
                    prestamoId: prestamo.id
                });
            }
        }

        if (cobrosHoy.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay cobros programados para hoy</p>';
            return;
        }

        container.innerHTML = cobrosHoy.map(cobro => `
            <div class="cobro-item ${cobro.dias < 0 ? 'vencido' : 'hoy'}">
                <div>
                    <strong>${cobro.cliente}</strong>
                    <p class="text-muted">
                        ${cobro.dias < 0 ? `Vencido hace ${Math.abs(cobro.dias)} día(s)` : 'Vence hoy'}
                    </p>
                </div>
                <div style="text-align: right;">
                    <strong>$${parseFloat(cobro.monto).toLocaleString()}</strong>
                    <br>
                    <button class="btn-small btn-success" 
                            onclick="PagosModule.openModalPago('${cobro.prestamoId}')" 
                            style="margin-top: 0.5rem;">
                        Cobrar
                    </button>
                </div>
            </div>
        `).join('');
    },

    renderCharts() {
        this.renderGananciasChart();
        this.renderPrestadoChart();
        this.renderCrecimientoChart();
        this.renderCobrosChart();
    },

    async renderGananciasChart() {
        const ctx = document.getElementById('chartGanancias');
        if (!ctx) return;

        const meses = this.getUltimos6Meses();
        const pagos = await Storage.getPagos();

        const dataPromises = meses.map(async mes => {
            const pagosMes = pagos.filter(p => {
                const fecha = new Date(p.fecha);
                return fecha.getMonth() === mes.month && fecha.getFullYear() === mes.year;
            });

            let total = 0;
            for (const pago of pagosMes) {
                const prestamo = await Storage.getPrestamo(pago.prestamoId);
                if (prestamo) {
                    const gananciaUnitaria = prestamo.ganancia / prestamo.cantidadCuotas;
                    total += gananciaUnitaria;
                }
            }
            return total;
        });

        const data = await Promise.all(dataPromises);

        if (this.charts.ganancias) {
            this.charts.ganancias.destroy();
        }

        this.charts.ganancias = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses.map(m => m.label),
                datasets: [{
                    label: 'Ganancias ($)',
                    data: data,
                    borderColor: '#0f9d58',
                    backgroundColor: 'rgba(15, 157, 88, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '$' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    },

    async renderPrestadoChart() {
        const ctx = document.getElementById('chartPrestado');
        if (!ctx) return;

        const meses = this.getUltimos6Meses();
        const prestamos = await Storage.getPrestamos();

        const data = meses.map(mes => {
            return prestamos
                .filter(p => {
                    const fecha = new Date(p.fechaInicio);
                    return fecha.getMonth() === mes.month && fecha.getFullYear() === mes.year;
                })
                .reduce((sum, p) => sum + parseFloat(p.montoEntregado), 0);
        });

        if (this.charts.prestado) {
            this.charts.prestado.destroy();
        }

        this.charts.prestado = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: meses.map(m => m.label),
                datasets: [{
                    label: 'Capital Prestado ($)',
                    data: data,
                    backgroundColor: '#1a73e8',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '$' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    },

    async renderCrecimientoChart() {
        const ctx = document.getElementById('chartCrecimiento');
        if (!ctx) return;

        const meses = this.getUltimos6Meses();
        const pagos = await Storage.getPagos();
        const prestamos = await Storage.getPrestamos();
        const config = await Storage.getConfig();
        
        let capitalAcumulado = config.capitalInicial || 0;
        const data = [];

        for (const mes of meses) {
            // Sumar ganancias del mes
            const pagosMes = pagos.filter(p => {
                const fecha = new Date(p.fecha);
                return fecha.getMonth() === mes.month && fecha.getFullYear() === mes.year;
            });

            let gananciasMes = 0;
            for (const pago of pagosMes) {
                const prestamo = await Storage.getPrestamo(pago.prestamoId);
                if (prestamo) {
                    const gananciaUnitaria = prestamo.ganancia / prestamo.cantidadCuotas;
                    gananciasMes += gananciaUnitaria;
                }
            }

            capitalAcumulado += gananciasMes;
            data.push(capitalAcumulado);
        }

        if (this.charts.crecimiento) {
            this.charts.crecimiento.destroy();
        }

        this.charts.crecimiento = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses.map(m => m.label),
                datasets: [{
                    label: 'Capital Acumulado ($)',
                    data: data,
                    borderColor: '#f4b400',
                    backgroundColor: 'rgba(244, 180, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '$' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    },

    async renderCobrosChart() {
        const ctx = document.getElementById('chartCobros');
        if (!ctx) return;

        const meses = this.getUltimos6Meses();
        const pagos = await Storage.getPagos();

        const data = meses.map(mes => {
            return pagos
                .filter(p => {
                    const fecha = new Date(p.fecha);
                    return fecha.getMonth() === mes.month && fecha.getFullYear() === mes.year;
                })
                .reduce((sum, p) => sum + parseFloat(p.monto), 0);
        });

        if (this.charts.cobros) {
            this.charts.cobros.destroy();
        }

        this.charts.cobros = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: meses.map(m => m.label),
                datasets: [{
                    label: 'Cobros Recibidos ($)',
                    data: data,
                    backgroundColor: '#4285f4',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '$' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    },

    getUltimos6Meses() {
        const meses = [];
        const hoy = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            meses.push({
                month: fecha.getMonth(),
                year: fecha.getFullYear(),
                label: fecha.toLocaleDateString('es', { month: 'short', year: 'numeric' })
            });
        }
        
        return meses;
    }
};
