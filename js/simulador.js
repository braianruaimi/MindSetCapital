// ============================================
// SIMULADOR.JS - Simulador de crecimiento
// ============================================

const SimuladorModule = {

    chart: null,

    async init() {
        this.setupEventListeners();
        await this.loadDefaultValues();
    },

    setupEventListeners() {
        document.getElementById('btnSimular')?.addEventListener('click', () => {
            this.simular();
        });
    },

    async loadDefaultValues() {
        const config = await Storage.getConfig();
        const prestamos = await Storage.getPrestamos();
        
        // Capital inicial = configuración
        document.getElementById('simCapitalInicial').value = config.capitalInicial || 10000;

        // Calcular ganancia promedio
        let totalTasa = 0;
        let count = 0;
        prestamos.forEach(p => {
            if (p.tasaInteres) {
                totalTasa += p.tasaInteres;
                count++;
            }
        });
        const tasaPromedio = count > 0 ? (totalTasa / count) : 20;
        document.getElementById('simGananciaPromedio').value = tasaPromedio.toFixed(0);

        // Préstamos por mes (promedio del último mes)
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const prestamosEsteMes = prestamos.filter(p => {
            const fecha = new Date(p.fechaInicio);
            return fecha >= inicioMes;
        });
        document.getElementById('simPrestamosMes').value = Math.max(1, prestamosEsteMes.length);

        // Reinversión 100% por defecto
        document.getElementById('simReinversion').value = 100;
    },

    simular() {
        const capitalInicial = parseFloat(document.getElementById('simCapitalInicial').value) || 10000;
        const gananciaPromedio = parseFloat(document.getElementById('simGananciaPromedio').value) || 20;
        const prestamosMes = parseInt(document.getElementById('simPrestamosMes').value) || 10;
        const reinversion = parseFloat(document.getElementById('simReinversion').value) || 100;

        // Simular 12 meses
        const meses = 12;
        const resultados = {
            capital: [capitalInicial],
            ganancias: [0],
            labels: ['Inicio']
        };

        let capitalActual = capitalInicial;

        for (let mes = 1; mes <= meses; mes++) {
            // Ganancia del mes = (capital * ganancia% * préstamos)
            const gananciaMes = (capitalActual * (gananciaPromedio / 100)) * (prestamosMes / 30);
            
            // Reinvertir según porcentaje
            const montoReinvertir = gananciaMes * (reinversion / 100);
            capitalActual += montoReinvertir;

            resultados.capital.push(capitalActual);
            resultados.ganancias.push(gananciaMes);
            resultados.labels.push(`Mes ${mes}`);
        }

        this.renderSimulacionChart(resultados);
        this.showResultados(resultados, capitalInicial);
    },

    renderSimulacionChart(resultados) {
        const ctx = document.getElementById('chartSimulacion');
        if (!ctx) return;

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: resultados.labels,
                datasets: [
                    {
                        label: 'Capital Total',
                        data: resultados.capital,
                        borderColor: '#1a73e8',
                        backgroundColor: 'rgba(26, 115, 232, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Ganancia Mensual',
                        data: resultados.ganancias,
                        borderColor: '#0f9d58',
                        backgroundColor: 'rgba(15, 157, 88, 0.1)',
                        tension: 0.4,
                        fill: true,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': $' + 
                                       context.parsed.y.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => '$' + value.toLocaleString()
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        grid: {
                            drawOnChartArea: false
                        },
                        ticks: {
                            callback: (value) => '$' + value.toLocaleString()
                        }
                    }
                }
            }
        });
    },

    showResultados(resultados, capitalInicial) {
        const container = document.getElementById('resultadosSimulacion');
        if (!container) return;

        const capital3Meses = resultados.capital[3];
        const capital6Meses = resultados.capital[6];
        const capital12Meses = resultados.capital[12];

        const gananciaTotal = capital12Meses - capitalInicial;
        const roi = ((gananciaTotal / capitalInicial) * 100).toFixed(2);

        container.innerHTML = `
            <div class="metric-card">
                <h4>Capital en 3 Meses</h4>
                <span class="big-number">$${capital3Meses.toLocaleString()}</span>
                <p class="text-success">+${((capital3Meses / capitalInicial - 1) * 100).toFixed(1)}%</p>
            </div>
            <div class="metric-card">
                <h4>Capital en 6 Meses</h4>
                <span class="big-number">$${capital6Meses.toLocaleString()}</span>
                <p class="text-success">+${((capital6Meses / capitalInicial - 1) * 100).toFixed(1)}%</p>
            </div>
            <div class="metric-card">
                <h4>Capital en 12 Meses</h4>
                <span class="big-number">$${capital12Meses.toLocaleString()}</span>
                <p class="text-success">+${((capital12Meses / capitalInicial - 1) * 100).toFixed(1)}%</p>
            </div>
            <div class="metric-card">
                <h4>ROI Anual</h4>
                <span class="big-number">${roi}%</span>
                <p class="text-muted">Ganancia: $${gananciaTotal.toLocaleString()}</p>
            </div>
        `;
    }
};
