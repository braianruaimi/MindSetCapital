// ============================================
// CHATBOT.JS - Asistente Financiero con IA Local
// ============================================

const ChatbotModule = {

    init() {
        this.setupEventListeners();
        this.showWelcomeMessage();
    },

    setupEventListeners() {
        // Enviar mensaje
        document.getElementById('btnSendChat')?.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter para enviar
        document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Sugerencias
        document.querySelectorAll('.suggestion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const query = e.target.textContent;
                document.getElementById('chatInput').value = query;
                this.sendMessage();
            });
        });
    },

    showWelcomeMessage() {
        this.addBotMessage(`
            👋 ¡Hola! Soy tu asistente financiero de MindSet Capital.<br><br>
            Puedo ayudarte a:<br>
            • Consultar información sobre tus préstamos y clientes<br>
            • Analizar tus ganancias y capital<br>
            • Identificar pagos pendientes y clientes de riesgo<br>
            • Darte recomendaciones para mejorar tu negocio<br><br>
            ¿En qué puedo ayudarte hoy?
        `);
    },

    sendMessage() {
        const input = document.getElementById('chatInput');
        const query = input.value.trim();
        
        if (!query) return;

        // Mostrar mensaje del usuario
        this.addUserMessage(query);
        input.value = '';

        // Procesar consulta
        setTimeout(() => {
            const response = this.processQuery(query);
            this.addBotMessage(response);
        }, 500);
    },

    addUserMessage(message) {
        const container = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.className = 'chat-message user';
        div.textContent = message;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    addBotMessage(message) {
        const container = document.getElementById('chatMessages');
        const div = document.createElement('div');
        div.className = 'chat-message bot';
        div.innerHTML = message;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    },

    processQuery(query) {
        const lowerQuery = query.toLowerCase();

        // Análisis de intención
        if (this.matchesPattern(lowerQuery, ['préstamo', 'vence', 'hoy', 'cobrar', 'pago'])) {
            return this.getPrestamosVencenHoy();
        }
        
        if (this.matchesPattern(lowerQuery, ['cliente', 'debe', 'pagar', 'semana'])) {
            return this.getClientesDebenSemana();
        }
        
        if (this.matchesPattern(lowerQuery, ['ganancia', 'total', 'gané', 'cuánto'])) {
            return this.getGananciaTotal();
        }
        
        if (this.matchesPattern(lowerQuery, ['ganancia', 'mes', 'este mes'])) {
            return this.getGananciaMes();
        }
        
        if (this.matchesPattern(lowerQuery, ['capital', 'disponible', 'tengo'])) {
            return this.getCapitalDisponible();
        }
        
        if (this.matchesPattern(lowerQuery, ['capital', 'prestado', 'invertido'])) {
            return this.getCapitalPrestado();
        }
        
        if (this.matchesPattern(lowerQuery, ['cliente', 'riesgo', 'peligroso', 'malo'])) {
            return this.getClientesRiesgo();
        }
        
        if (this.matchesPattern(lowerQuery, ['mejor', 'cliente', 'top', 'rentable'])) {
            return this.getMejoresClientes();
        }
        
        if (this.matchesPattern(lowerQuery, ['resumen', 'estadística', 'general', 'overview'])) {
            return this.getResumenGeneral();
        }
        
        if (this.matchesPattern(lowerQuery, ['recomendación', 'consejo', 'sugerencia', 'ayuda'])) {
            return this.getRecomendaciones();
        }
        
        if (this.matchesPattern(lowerQuery, ['cliente', 'cantidad', 'cuántos'])) {
            return this.getCantidadClientes();
        }

        if (this.matchesPattern(lowerQuery, ['préstamo', 'activo', 'cuántos'])) {
            return this.getCantidadPrestamos();
        }

        // Respuesta por defecto
        return `
            No estoy seguro de cómo responder esa pregunta. 
            Intenta preguntarme sobre:<br><br>
            • Préstamos que vencen hoy<br>
            • Ganancias totales o del mes<br>
            • Capital disponible o prestado<br>
            • Clientes de riesgo o mejores clientes<br>
            • Resumen general del negocio<br>
            • Recomendaciones financieras
        `;
    },

    matchesPattern(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    },

    getPrestamosVencenHoy() {
        const prestamos = Storage.getPrestamos().filter(p => p.estado === 'activo');
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const vencenHoy = [];
        const vencidos = [];

        prestamos.forEach(prestamo => {
            const proximoPago = PrestamosModule.calculateProximoPago(prestamo);
            proximoPago.setHours(0, 0, 0, 0);
            const dias = Math.ceil((proximoPago - hoy) / (1000 * 60 * 60 * 24));

            const cliente = Storage.getCliente(prestamo.clienteId);
            const info = {
                cliente: cliente?.nombre || 'Desconocido',
                monto: prestamo.valorCuota,
                dias: dias
            };

            if (dias === 0) {
                vencenHoy.push(info);
            } else if (dias < 0) {
                vencidos.push(info);
            }
        });

        let mensaje = '<strong>📅 Cobros de Hoy:</strong><br><br>';

        if (vencidos.length > 0) {
            mensaje += `🚨 <strong>Pagos Vencidos (${vencidos.length}):</strong><br>`;
            vencidos.slice(0, 5).forEach(v => {
                mensaje += `• ${v.cliente}: $${v.monto.toLocaleString()} (${Math.abs(v.dias)} días atrasado)<br>`;
            });
            mensaje += '<br>';
        }

        if (vencenHoy.length > 0) {
            mensaje += `⏰ <strong>Vencen Hoy (${vencenHoy.length}):</strong><br>`;
            vencenHoy.forEach(v => {
                mensaje += `• ${v.cliente}: $${v.monto.toLocaleString()}<br>`;
            });
        } else if (vencidos.length === 0) {
            mensaje += '✅ No tienes cobros para hoy ni pagos vencidos.';
        }

        return mensaje;
    },

    getClientesDebenSemana() {
        const prestamos = Storage.getPrestamos().filter(p => p.estado === 'activo');
        const hoy = new Date();
        const proximaSemana = new Date();
        proximaSemana.setDate(hoy.getDate() + 7);

        const cobrosProximos = [];

        prestamos.forEach(prestamo => {
            const proximoPago = PrestamosModule.calculateProximoPago(prestamo);
            
            if (proximoPago <= proximaSemana && proximoPago >= hoy) {
                const cliente = Storage.getCliente(prestamo.clienteId);
                const dias = Math.ceil((proximoPago - hoy) / (1000 * 60 * 60 * 24));
                
                cobrosProximos.push({
                    cliente: cliente?.nombre || 'Desconocido',
                    monto: prestamo.valorCuota,
                    dias: dias
                });
            }
        });

        if (cobrosProximos.length === 0) {
            return '✅ No tienes cobros programados para esta semana.';
        }

        let mensaje = `<strong>📅 Cobros próxima semana (${cobrosProximos.length}):</strong><br><br>`;
        cobrosProximos.forEach(c => {
            mensaje += `• ${c.cliente}: $${c.monto.toLocaleString()} (en ${c.dias} día${c.dias !== 1 ? 's' : ''})<br>`;
        });

        return mensaje;
    },

    getGananciaTotal() {
        const prestamos = Storage.getPrestamos();
        const pagos = Storage.getPagos();

        let gananciaTotal = 0;

        prestamos.forEach(prestamo => {
            const pagosPrestamo = pagos.filter(p => p.prestamoId === prestamo.id);
            const totalPagado = pagosPrestamo.reduce((sum, p) => sum + parseFloat(p.monto), 0);
            gananciaTotal += (totalPagado - parseFloat(prestamo.montoEntregado));
        });

        return `
            <strong>💰 Ganancia Total Acumulada:</strong><br><br>
            Tu ganancia total es de <strong>$${gananciaTotal.toLocaleString()}</strong><br><br>
            Esto incluye todas las ganancias de préstamos activos y finalizados.
        `;
    },

    getGananciaMes() {
        const pagos = Storage.getPagos();
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        const pagosMes = pagos.filter(p => new Date(p.fecha) >= inicioMes);
        
        let gananciaMes = 0;
        pagosMes.forEach(pago => {
            const prestamo = Storage.getPrestamo(pago.prestamoId);
            if (prestamo) {
                const gananciaUnitaria = prestamo.ganancia / prestamo.cantidadCuotas;
                gananciaMes += gananciaUnitaria;
            }
        });

        const nombreMes = hoy.toLocaleDateString('es', { month: 'long', year: 'numeric' });

        return `
            <strong>📈 Ganancia de ${nombreMes}:</strong><br><br>
            Has ganado <strong>$${gananciaMes.toLocaleString()}</strong> este mes.<br><br>
            Se han registrado ${pagosMes.length} pago(s) en este período.
        `;
    },

    getCapitalDisponible() {
        const prestamos = Storage.getPrestamos();
        const pagos = Storage.getPagos();
        const config = Storage.getConfig();

        const prestamosActivos = prestamos.filter(p => p.estado === 'activo');
        const totalPrestado = prestamosActivos.reduce((sum, p) => sum + parseFloat(p.montoEntregado), 0);
        const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        const capitalDisponible = (config.capitalInicial || 0) + totalPagado - totalPrestado;

        return `
            <strong>💵 Capital Disponible:</strong><br><br>
            Tienes <strong>$${capitalDisponible.toLocaleString()}</strong> disponibles.<br><br>
            Este es el dinero que puedes prestar actualmente.
        `;
    },

    getCapitalPrestado() {
        const prestamos = Storage.getPrestamos().filter(p => p.estado === 'activo');
        const totalPrestado = prestamos.reduce((sum, p) => sum + parseFloat(p.montoEntregado), 0);
        const totalCobrar = prestamos.reduce((sum, p) => {
            const restantes = p.cantidadCuotas - p.cuotasPagadas;
            return sum + (restantes * p.valorCuota);
        }, 0);

        return `
            <strong>💰 Capital Prestado:</strong><br><br>
            Dinero prestado actualmente: <strong>$${totalPrestado.toLocaleString()}</strong><br>
            Dinero por cobrar: <strong>$${totalCobrar.toLocaleString()}</strong><br>
            Préstamos activos: <strong>${prestamos.length}</strong>
        `;
    },

    getClientesRiesgo() {
        const clientes = Storage.getClientes();
        const riesgosos = [];

        clientes.forEach(cliente => {
            const score = ClientesModule.calculateScore(cliente.id);
            const prestamos = Storage.getPrestamosByCliente(cliente.id);
            const prestamosActivos = prestamos.filter(p => p.estado === 'activo');

            if (score < 60 && prestamosActivos.length > 0) {
                riesgosos.push({
                    nombre: cliente.nombre,
                    score: score,
                    telefono: cliente.telefono
                });
            }
        });

        if (riesgosos.length === 0) {
            return '✅ Excelente! No tienes clientes de alto riesgo en este momento.';
        }

        let mensaje = `<strong>⚠️ Clientes de Riesgo (${riesgosos.length}):</strong><br><br>`;
        mensaje += 'Estos clientes tienen pagos atrasados o un historial problemático:<br><br>';
        
        riesgosos.forEach(c => {
            mensaje += `• <strong>${c.nombre}</strong><br>`;
            mensaje += `  Score: ${c.score} - ${ClientesModule.getScoreLabel(c.score)}<br>`;
            mensaje += `  Tel: ${c.telefono}<br><br>`;
        });

        mensaje += '<strong>Recomendación:</strong> Realiza seguimiento cercano a estos clientes.';

        return mensaje;
    },

    getMejoresClientes() {
        const clientes = Storage.getClientes();
        const rankings = [];

        clientes.forEach(cliente => {
            const prestamos = Storage.getPrestamosByCliente(cliente.id);
            const pagos = Storage.getPagos();
            
            let gananciaGenerada = 0;
            prestamos.forEach(prestamo => {
                const pagosPrestamo = pagos.filter(p => p.prestamoId === prestamo.id);
                const totalPagado = pagosPrestamo.reduce((sum, p) => sum + parseFloat(p.monto), 0);
                gananciaGenerada += (totalPagado - parseFloat(prestamo.montoEntregado));
            });

            if (gananciaGenerada > 0) {
                rankings.push({
                    nombre: cliente.nombre,
                    ganancia: gananciaGenerada,
                    score: ClientesModule.calculateScore(cliente.id),
                    prestamos: prestamos.length
                });
            }
        });

        rankings.sort((a, b) => b.ganancia - a.ganancia);
        const top3 = rankings.slice(0, 3);

        if (top3.length === 0) {
            return 'Aún no tienes suficientes datos para mostrar los mejores clientes.';
        }

        let mensaje = '<strong>🏆 Top 3 Mejores Clientes:</strong><br><br>';
        
        top3.forEach((c, i) => {
            const medalla = ['🥇', '🥈', '🥉'][i];
            mensaje += `${medalla} <strong>${c.nombre}</strong><br>`;
            mensaje += `   Ganancia generada: $${c.ganancia.toLocaleString()}<br>`;
            mensaje += `   Score: ${c.score} - ${ClientesModule.getScoreLabel(c.score)}<br>`;
            mensaje += `   Préstamos: ${c.prestamos}<br><br>`;
        });

        return mensaje;
    },

    getResumenGeneral() {
        const clientes = Storage.getClientes();
        const prestamos = Storage.getPrestamos();
        const pagos = Storage.getPagos();
        const config = Storage.getConfig();

        const prestamosActivos = prestamos.filter(p => p.estado === 'activo');
        const prestamosFinalizados = prestamos.filter(p => p.estado === 'finalizado');
        
        const totalPrestado = prestamosActivos.reduce((sum, p) => sum + parseFloat(p.montoEntregado), 0);
        const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        const capitalDisponible = (config.capitalInicial || 0) + totalPagado - totalPrestado;

        let gananciaTotal = 0;
        prestamos.forEach(prestamo => {
            const pagosPrestamo = pagos.filter(p => p.prestamoId === prestamo.id);
            const pagado = pagosPrestamo.reduce((s, p) => s + parseFloat(p.monto), 0);
            gananciaTotal += (pagado - parseFloat(prestamo.montoEntregado));
        });

        return `
            <strong>📊 Resumen General de MindSet Capital</strong><br><br>
            
            <strong>Clientes:</strong><br>
            • Total de clientes: ${clientes.length}<br><br>
            
            <strong>Préstamos:</strong><br>
            • Préstamos activos: ${prestamosActivos.length}<br>
            • Préstamos finalizados: ${prestamosFinalizados.length}<br>
            • Total de préstamos: ${prestamos.length}<br><br>
            
            <strong>Finanzas:</strong><br>
            • Capital disponible: $${capitalDisponible.toLocaleString()}<br>
            • Capital prestado: $${totalPrestado.toLocaleString()}<br>
            • Ganancia total: $${gananciaTotal.toLocaleString()}<br>
            • Pagos recibidos: ${pagos.length}
        `;
    },

    getRecomendaciones() {
        const prestamos = Storage.getPrestamos();
        const clientes = Storage.getClientes();
        const config = Storage.getConfig();
        const pagos = Storage.getPagos();

        const recomendaciones = [];

        // Analizar clientes de riesgo
        const clientesRiesgo = clientes.filter(c => ClientesModule.calculateScore(c.id) < 60);
        if (clientesRiesgo.length > 0) {
            recomendaciones.push(`⚠️ Tienes ${clientesRiesgo.length} cliente(s) de riesgo. Considera hacer seguimiento más frecuente.`);
        }

        // Analizar capital ocioso
        const prestamosActivos = prestamos.filter(p => p.estado === 'activo');
        const totalPrestado = prestamosActivos.reduce((sum, p) => sum + parseFloat(p.montoEntregado), 0);
        const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
        const capitalDisponible = (config.capitalInicial || 0) + totalPagado - totalPrestado;

        if (capitalDisponible > (config.capitalInicial || 0) * 0.3) {
            recomendaciones.push(`💡 Tienes mucho capital disponible ($${capitalDisponible.toLocaleString()}). Considera hacer más préstamos para aumentar tu rentabilidad.`);
        }

        // Analizar diversificación
        if (clientes.length < 5 && prestamosActivos.length > 10) {
            recomendaciones.push('📊 Considera diversificar tu cartera con más clientes para reducir el riesgo.');
        }

        // Analizar pagos atrasados
        const hoy = new Date();
        let pagosAtrasados = 0;
        prestamosActivos.forEach(p => {
            const proximoPago = PrestamosModule.calculateProximoPago(p);
            if (proximoPago < hoy) pagosAtrasados++;
        });

        if (pagosAtrasados > prestamosActivos.length * 0.2) {
            recomendaciones.push('🚨 Más del 20% de tus préstamos tienen pagos atrasados. Aumenta la frecuencia de cobro.');
        }

        // Si todo va bien
        if (recomendaciones.length === 0) {
            recomendaciones.push('✅ ¡Excelente gestión! Tu negocio va por buen camino.');
            recomendaciones.push('💡 Considera reinvertir tus ganancias para acelerar el crecimiento.');
            recomendaciones.push('📈 Usa el simulador para proyectar tu crecimiento a 12 meses.');
        }

        let mensaje = '<strong>💼 Recomendaciones Personalizadas:</strong><br><br>';
        mensaje += recomendaciones.join('<br><br>');

        return mensaje;
    },

    getCantidadClientes() {
        const clientes = Storage.getClientes();
        return `
            <strong>👥 Clientes Registrados:</strong><br><br>
            Tienes un total de <strong>${clientes.length}</strong> cliente(s) registrado(s).<br><br>
            ${clientes.length > 0 ? 'Puedes ver el detalle completo en la sección de Clientes.' : 'Comienza agregando tu primer cliente!'}
        `;
    },

    getCantidadPrestamos() {
        const prestamos = Storage.getPrestamos();
        const activos = prestamos.filter(p => p.estado === 'activo').length;
        const finalizados = prestamos.filter(p => p.estado === 'finalizado').length;

        return `
            <strong>📋 Préstamos:</strong><br><br>
            • Préstamos activos: <strong>${activos}</strong><br>
            • Préstamos finalizados: <strong>${finalizados}</strong><br>
            • Total: <strong>${prestamos.length}</strong>
        `;
    }
};
