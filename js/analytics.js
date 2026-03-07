// ============================================
// ANALYTICS.JS - Análisis del negocio
// ============================================

const AnalyticsModule = {

    init() {
        this.calculateAnalytics();
        this.showTopClientes();
        this.showClientesRiesgo();
    },

    calculateAnalytics() {
        const prestamos = Storage.getPrestamos();
        const pagos = Storage.getPagos();

        // Tasa promedio de ganancia
        let totalTasa = 0;
        let count = 0;
        
        prestamos.forEach(p => {
            if (p.tasaInteres) {
                totalTasa += p.tasaInteres;
                count++;
            }
        });
        
        const tasaPromedio = count > 0 ? (totalTasa / count).toFixed(2) : 0;
        document.getElementById('tasaGanancia').textContent = `${tasaPromedio}%`;

        // Capital promedio invertido
        const prestamosActivos = prestamos.filter(p => p.estado === 'activo');
        const totalPrestadoActivo = prestamosActivos.reduce((sum, p) => 
            sum + parseFloat(p.montoEntregado), 0
        );
        const capitalPromedio = prestamosActivos.length > 0 
            ? (totalPrestadoActivo / prestamosActivos.length) 
            : 0;
        
        document.getElementById('capitalPromedio').textContent = 
            `$${capitalPromedio.toLocaleString()}`;

        // Rentabilidad mensual
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const pagosMes = pagos.filter(p => new Date(p.fecha) >= inicioMes);
        
        const gananciaMes = pagosMes.reduce((sum, pago) => {
            const prestamo = Storage.getPrestamo(pago.prestamoId);
            if (!prestamo) return sum;
            const gananciaUnitaria = prestamo.ganancia / prestamo.cantidadCuotas;
            return sum + gananciaUnitaria;
        }, 0);

        const rentabilidad = totalPrestadoActivo > 0 
            ? ((gananciaMes / totalPrestadoActivo) * 100).toFixed(2)
            : 0;
        
        document.getElementById('rentabilidadMensual').textContent = `${rentabilidad}%`;

        // Rotación de capital (cuántas veces se usa el capital por mes)
        const prestamosEsteMes = prestamos.filter(p => {
            const fecha = new Date(p.fechaInicio);
            return fecha >= inicioMes;
        });
        
        const rotacion = prestamosEsteMes.length > 0 
            ? (prestamosEsteMes.length / 30 * hoy.getDate()).toFixed(1)
            : 0;
        
        document.getElementById('rotacionCapital').textContent = `${rotacion}x`;
    },

    showTopClientes() {
        const container = document.getElementById('topClientes');
        if (!container) return;

        const clientes = Storage.getClientes();
        const rankings = [];

        clientes.forEach(cliente => {
            const prestamos = Storage.getPrestamosByCliente(cliente.id);
            let gananciaGenerada = 0;

            prestamos.forEach(prestamo => {
                const pagos = Storage.getPagosByPrestamo(prestamo.id);
                const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
                gananciaGenerada += (totalPagado - parseFloat(prestamo.montoEntregado));
            });

            if (gananciaGenerada > 0) {
                rankings.push({
                    cliente: cliente.nombre,
                    ganancia: gananciaGenerada,
                    prestamos: prestamos.length,
                    score: ClientesModule.calculateScore(cliente.id)
                });
            }
        });

        // Ordenar por ganancia
        rankings.sort((a, b) => b.ganancia - a.ganancia);
        const top5 = rankings.slice(0, 5);

        if (top5.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay datos suficientes</p>';
            return;
        }

        container.innerHTML = top5.map((item, index) => {
            const scoreClass = ClientesModule.getScoreClass(item.score);
            return `
                <div class="ranking-item">
                    <div class="rank">${index + 1}</div>
                    <div class="info">
                        <strong>${item.cliente}</strong>
                        <p class="text-muted">${item.prestamos} préstamos</p>
                        <span class="score-badge ${scoreClass}">${item.score}</span>
                    </div>
                    <div class="value">$${item.ganancia.toLocaleString()}</div>
                </div>
            `;
        }).join('');
    },

    showClientesRiesgo() {
        const container = document.getElementById('clientesRiesgo');
        if (!container) return;

        const clientes = Storage.getClientes();
        const riesgosos = [];

        clientes.forEach(cliente => {
            const score = ClientesModule.calculateScore(cliente.id);
            const prestamos = Storage.getPrestamosByCliente(cliente.id);
            const prestamosActivos = prestamos.filter(p => p.estado === 'activo');

            if (score < 60 && prestamosActivos.length > 0) {
                riesgosos.push({
                    cliente: cliente.nombre,
                    score: score,
                    prestamosActivos: prestamosActivos.length,
                    deuda: prestamosActivos.reduce((sum, p) => {
                        const restantes = p.cantidadCuotas - p.cuotasPagadas;
                        return sum + (restantes * p.valorCuota);
                    }, 0)
                });
            }
        });

        // Ordenar por score (peor primero)
        riesgosos.sort((a, b) => a.score - b.score);

        if (riesgosos.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay clientes de alto riesgo</p>';
            return;
        }

        container.innerHTML = riesgosos.map(item => {
            const scoreClass = ClientesModule.getScoreClass(item.score);
            return `
                <div class="ranking-item">
                    <div class="info">
                        <strong>${item.cliente}</strong>
                        <p class="text-muted">${item.prestamosActivos} préstamo(s) activo(s)</p>
                        <span class="score-badge ${scoreClass}">${item.score} - ${ClientesModule.getScoreLabel(item.score)}</span>
                    </div>
                    <div>
                        <strong class="text-danger">$${item.deuda.toLocaleString()}</strong>
                        <p class="text-muted">Deuda pendiente</p>
                    </div>
                </div>
            `;
        }).join('');
    }
};
