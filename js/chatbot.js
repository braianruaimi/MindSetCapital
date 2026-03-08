// ============================================
// CHATBOT.JS - Asistente Financiero con IA Local
// ============================================

const ChatbotModule = {

    init() {
        this.setupEventListeners();
        this.showWelcomeMessage();
        console.log('✅ Chatbot inicializado');
    },

    setupEventListeners() {
        // Enviar mensaje
        const btnSend = document.getElementById('btnSendChat');
        if (btnSend) {
            btnSend.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Click en botón Enviar');
                this.sendMessage();
            });
        }

        // Enter para enviar
        const inputChat = document.getElementById('chatInput');
        if (inputChat) {
            inputChat.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    console.log('Enter presionado en chat');
                    this.sendMessage();
                }
            });
        }

        // Sugerencias - Configurar dinámicamente para asegurar que funcionen
        this.setupSuggestions();
        
        console.log('✅ Event listeners del chatbot configurados');
    },

    setupSuggestions() {
        const suggestionButtons = document.querySelectorAll('.suggestion-btn');
        console.log(`Configurando ${suggestionButtons.length} botones de sugerencia`);
        
        suggestionButtons.forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const query = e.target.textContent.trim();
                console.log(`Click en sugerencia ${index + 1}: "${query}"`);
                
                const inputChat = document.getElementById('chatInput');
                if (inputChat) {
                    inputChat.value = query;
                    this.sendMessage();
                }
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
        setTimeout(async () => {
            const response = await this.processQuery(query);
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

    async processQuery(query) {
        const lowerQuery = query.toLowerCase();

        // Análisis de intención
        if (this.matchesPattern(lowerQuery, ['préstamo', 'vence', 'hoy', 'cobrar', 'pago'])) {
            return await this.getPrestamosVencenHoy();
        }
        
        if (this.matchesPattern(lowerQuery, ['cliente', 'debe', 'pagar', 'semana'])) {
            return await this.getClientesDebenSemana();
        }
        
        if (this.matchesPattern(lowerQuery, ['ganancia', 'total', 'gané', 'cuánto'])) {
            return await this.getGananciaTotal();
        }
        
        if (this.matchesPattern(lowerQuery, ['ganancia', 'mes', 'este mes'])) {
            return await this.getGananciaMes();
        }
        
        if (this.matchesPattern(lowerQuery, ['capital', 'disponible', 'tengo'])) {
            return await this.getCapitalDisponible();
        }
        
        if (this.matchesPattern(lowerQuery, ['capital', 'prestado', 'invertido'])) {
            return await this.getCapitalPrestado();
        }
        
        if (this.matchesPattern(lowerQuery, ['cliente', 'riesgo', 'peligroso', 'malo'])) {
            return await this.getClientesRiesgo();
        }
        
        if (this.matchesPattern(lowerQuery, ['mejor', 'cliente', 'top', 'rentable'])) {
            return await this.getMejoresClientes();
        }
        
        if (this.matchesPattern(lowerQuery, ['resumen', 'estadística', 'general', 'overview'])) {
            return await this.getResumenGeneral();
        }
        
        if (this.matchesPattern(lowerQuery, ['recomendación', 'consejo', 'sugerencia', 'ayuda'])) {
            return await this.getRecomendaciones();
        }
        
        if (this.matchesPattern(lowerQuery, ['cliente', 'cantidad', 'cuántos'])) {
            return await this.getCantidadClientes();
        }

        if (this.matchesPattern(lowerQuery, ['préstamo', 'activo', 'cuántos'])) {
            return await this.getCantidadPrestamos();
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

    async getPrestamosVencenHoy() {
        try {
            const prestamos = (await Storage.getPrestamos()).filter(p => p.estado === 'activo');
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            const vencenHoy = [];
            const vencidos = [];

            for (const prestamo of prestamos) {
                // Verificar que PrestamosModule y su método existan
                if (typeof PrestamosModule === 'undefined' || !PrestamosModule.calculateProximoPago) {
                    continue;
                }
                
                const proximoPago = PrestamosModule.calculateProximoPago(prestamo);
                proximoPago.setHours(0, 0, 0, 0);
                const dias = Math.ceil((proximoPago - hoy) / (1000 * 60 * 60 * 24));

                const cliente = await Storage.getCliente(prestamo.clienteId);
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
            }

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
        } catch (error) {
            console.error('Error en getPrestamosVencenHoy:', error);
            return '❌ Error al obtener información de préstamos. Intenta más tarde.';
        }
    },

    async getClientesDebenSemana() {
        try {
            const prestamos = (await Storage.getPrestamos()).filter(p => p.estado === 'activo');
            const hoy = new Date();
            const proximaSemana = new Date();
            proximaSemana.setDate(hoy.getDate() + 7);

            const cobrosProximos = [];

            for (const prestamo of prestamos) {
                if (typeof PrestamosModule === 'undefined' || !PrestamosModule.calculateProximoPago) {
                    continue;
                }
                
                const proximoPago = PrestamosModule.calculateProximoPago(prestamo);
                
                if (proximoPago <= proximaSemana && proximoPago >= hoy) {
                    const cliente = await Storage.getCliente(prestamo.clienteId);
                    const dias = Math.ceil((proximoPago - hoy) / (1000 * 60 * 60 * 24));
                    
                    cobrosProximos.push({
                        cliente: cliente?.nombre || 'Desconocido',
                        monto: prestamo.valorCuota,
                        dias: dias
                    });
                }
            }

            if (cobrosProximos.length === 0) {
                return '✅ No tienes cobros programados para esta semana.';
            }

            let mensaje = `<strong>📅 Cobros próxima semana (${cobrosProximos.length}):</strong><br><br>`;
            cobrosProximos.forEach(c => {
                mensaje += `• ${c.cliente}: $${c.monto.toLocaleString()} (en ${c.dias} día${c.dias !== 1 ? 's' : ''})<br>`;
            });

            return mensaje;
        } catch (error) {
            console.error('Error en getClientesDebenSemana:', error);
            return '❌ Error al obtener cobros de la semana.';
        }
    },

    async getGananciaTotal() {
        const prestamos = await Storage.getPrestamos();
        const pagos = await Storage.getPagos();

        let gananciaTotal = 0;

        for (const prestamo of prestamos) {
            const pagosPrestamo = pagos.filter(p => p.prestamoId === prestamo.id);
            const totalPagado = pagosPrestamo.reduce((sum, p) => sum + parseFloat(p.monto), 0);
            gananciaTotal += (totalPagado - parseFloat(prestamo.montoEntregado));
        }

        return `
            <strong>💰 Ganancia Total Acumulada:</strong><br><br>
            Tu ganancia total es de <strong>$${gananciaTotal.toLocaleString()}</strong><br><br>
            Esto incluye todas las ganancias de préstamos activos y finalizados.
        `;
    },

    async getGananciaMes() {
        const pagos = await Storage.getPagos();
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        
        const pagosMes = pagos.filter(p => new Date(p.fecha) >= inicioMes);
        
        let gananciaMes = 0;
        for (const pago of pagosMes) {
            const prestamo = await Storage.getPrestamo(pago.prestamoId);
            if (prestamo) {
                const gananciaUnitaria = prestamo.ganancia / prestamo.cantidadCuotas;
                gananciaMes += gananciaUnitaria;
            }
        }

        const nombreMes = hoy.toLocaleDateString('es', { month: 'long', year: 'numeric' });

        return `
            <strong>📈 Ganancia de ${nombreMes}:</strong><br><br>
            Has ganado <strong>$${gananciaMes.toLocaleString()}</strong> este mes.<br><br>
            Se han registrado ${pagosMes.length} pago(s) en este período.
        `;
    },

    async getCapitalDisponible() {
        const prestamos = await Storage.getPrestamos();
        const pagos = await Storage.getPagos();
        const config = await Storage.getConfig();

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

    async getCapitalPrestado() {
        const prestamos = (await Storage.getPrestamos()).filter(p => p.estado === 'activo');
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

    async getClientesRiesgo() {
        try {
            const clientes = await Storage.getClientes();
            const riesgosos = [];

            for (const cliente of clientes) {
                if (typeof ClientesModule === 'undefined' || !ClientesModule.calculateScore) {
                    continue;
                }
                
                const score = await ClientesModule.calculateScore(cliente.id);
                const prestamos = await Storage.getPrestamosByCliente(cliente.id);
                const prestamosActivos = prestamos.filter(p => p.estado === 'activo');

                if (score < 60 && prestamosActivos.length > 0) {
                    riesgosos.push({
                        nombre: cliente.nombre,
                        score: score,
                        telefono: cliente.telefono
                    });
                }
            }

            if (riesgosos.length === 0) {
                return '✅ Excelente! No tienes clientes de alto riesgo en este momento.';
            }

            let mensaje = `<strong>⚠️ Clientes de Riesgo (${riesgosos.length}):</strong><br><br>`;
            mensaje += 'Estos clientes tienen pagos atrasados o un historial problemático:<br><br>';
            
            riesgosos.forEach(c => {
                const scoreLabel = ClientesModule.getScoreLabel ? ClientesModule.getScoreLabel(c.score) : 'Riesgo';
                mensaje += `• <strong>${c.nombre}</strong><br>`;
                mensaje += `  Score: ${c.score} - ${scoreLabel}<br>`;
                mensaje += `  Tel: ${c.telefono}<br><br>`;
            });

            mensaje += '<strong>Recomendación:</strong> Realiza seguimiento cercano a estos clientes.';

            return mensaje;
        } catch (error) {
            console.error('Error en getClientesRiesgo:', error);
            return '❌ Error al obtener clientes de riesgo.';
        }
    },

    async getMejoresClientes() {
        try {
            const clientes = await Storage.getClientes();
            const rankings = [];

            const pagos = await Storage.getPagos();
            
            for (const cliente of clientes) {
                const prestamos = await Storage.getPrestamosByCliente(cliente.id);
                
                let gananciaGenerada = 0;
                for (const prestamo of prestamos) {
                    const pagosPrestamo = pagos.filter(p => p.prestamoId === prestamo.id);
                    const totalPagado = pagosPrestamo.reduce((sum, p) => sum + parseFloat(p.monto), 0);
                    gananciaGenerada += (totalPagado - parseFloat(prestamo.montoEntregado));
                }

                if (gananciaGenerada > 0) {
                    const score = (typeof ClientesModule !== 'undefined' && ClientesModule.calculateScore) 
                        ? await ClientesModule.calculateScore(cliente.id) 
                        : 100;
                    
                    rankings.push({
                        nombre: cliente.nombre,
                        ganancia: gananciaGenerada,
                        score: score,
                        prestamos: prestamos.length
                    });
                }
            }

            rankings.sort((a, b) => b.ganancia - a.ganancia);
            const top3 = rankings.slice(0, 3);

            if (top3.length === 0) {
                return 'Aún no tienes suficientes datos para mostrar los mejores clientes.';
            }

            let mensaje = '<strong>🏆 Top 3 Mejores Clientes:</strong><br><br>';
            
            top3.forEach((c, i) => {
                const medalla = ['🥇', '🥈', '🥉'][i];
                const scoreLabel = (typeof ClientesModule !== 'undefined' && ClientesModule.getScoreLabel) 
                    ? ClientesModule.getScoreLabel(c.score) 
                    : 'Bueno';
                    
                mensaje += `${medalla} <strong>${c.nombre}</strong><br>`;
                mensaje += `   Ganancia generada: $${c.ganancia.toLocaleString()}<br>`;
                mensaje += `   Score: ${c.score} - ${scoreLabel}<br>`;
                mensaje += `   Préstamos: ${c.prestamos}<br><br>`;
            });

            return mensaje;
        } catch (error) {
            console.error('Error en getMejoresClientes:', error);
            return '❌ Error al obtener mejores clientes.';
        }
    },

    async getResumenGeneral() {
        const clientes = await Storage.getClientes();
        const prestamos = await Storage.getPrestamos();
        const pagos = await Storage.getPagos();
        const config = await Storage.getConfig();

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
        try {
            const prestamos = Storage.getPrestamos();
            const clientes = Storage.getClientes();
            const config = Storage.getConfig();
            const pagos = Storage.getPagos();

            const recomendaciones = [];

            // Analizar clientes de riesgo
            if (typeof ClientesModule !== 'undefined' && ClientesModule.calculateScore) {
                const clientesRiesgo = clientes.filter(c => ClientesModule.calculateScore(c.id) < 60);
                if (clientesRiesgo.length > 0) {
                    recomendaciones.push(`⚠️ Tienes ${clientesRiesgo.length} cliente(s) de riesgo. Considera hacer seguimiento más frecuente.`);
                }
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
            if (typeof PrestamosModule !== 'undefined' && PrestamosModule.calculateProximoPago) {
                const hoy = new Date();
                let pagosAtrasados = 0;
                prestamosActivos.forEach(p => {
                    const proximoPago = PrestamosModule.calculateProximoPago(p);
                    if (proximoPago < hoy) pagosAtrasados++;
                });

                if (pagosAtrasados > prestamosActivos.length * 0.2) {
                    recomendaciones.push('🚨 Más del 20% de tus préstamos tienen pagos atrasados. Aumenta la frecuencia de cobro.');
                }
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
        } catch (error) {
            console.error('Error en getRecomendaciones:', error);
            return '❌ Error al generar recomendaciones.';
        }
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
