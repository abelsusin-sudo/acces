// ⚠️ CONFIGURA: URL del teu Google Apps Script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwupu7ULsIG9nsVYCdMlLUBRTF1G7xVj0COTw38LG28oiG7AoH2dPhnCjRSCVzju1ua/exec';

// Funció JSONP per evitar CORS
function ferPeticioJSONP(accio, parametres = {}) {
    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
        
        parametres.callback = callbackName;
        parametres.action = accio;
        
        // Crear l'script tag
        const script = document.createElement('script');
        const url = SCRIPT_URL + '?' + new URLSearchParams(parametres).toString();
        script.src = url;
        
        // Definir la funció de callback global
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(data);
        };
        
        // Gestionar errors
        script.onerror = function() {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('Error de càrrega JSONP'));
        };
        
        document.body.appendChild(script);
        
        // Timeout per seguretat
        setTimeout(() => {
            if (window[callbackName]) {
                delete window[callbackName];
                document.body.removeChild(script);
                reject(new Error('Timeout JSONP'));
            }
        }, 10000);
    });
}

// Modifica la funció carregarDatesOcupades:
async function carregarDatesOcupades() {
    try {
        const resultat = await ferPeticioJSONP('obtenirDatesOcupades', {
            immoble: immobleSeleccionat
        });
        
        if (resultat.error) {
            throw new Error(resultat.error);
        }
        
        datesOcupades = resultat.dates || [];
        console.log('Dates ocupades carregades:', datesOcupades);
        generarCalendaris();
        
    } catch (error) {
        console.error('Error carregant dates ocupades:', error);
        datesOcupades = [];
        mostrarMissatge('missatge-disponibilitat', 'Error carregant disponibilitat', 'error');
        generarCalendaris();
    }
}

// Modifica la funció ferReserva:
async function ferReserva() {
    const nom = document.getElementById('nom').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefon = document.getElementById('telefon').value.trim();
    
    if (!nom || !email || !telefon) {
        mostrarMissatge('missatge-reserva', 'Si us plau, completa tots els camps', 'error');
        return;
    }
    
    if (!dataIniciSeleccionada || !dataFiSeleccionada) {
        mostrarMissatge('missatge-reserva', 'Selecciona les dates de la reserva', 'error');
        return;
    }
    
    const nits = Math.ceil((dataFiSeleccionada - dataIniciSeleccionada) / (1000 * 60 * 60 * 24));
    const total = nits * preuPerNit;
    
    const dadesReserva = {
        nom: nom,
        email: email,
        telefon: telefon,
        immoble: immobleSeleccionat,
        data_inici: dataIniciSeleccionada.toISOString().split('T')[0],
        data_fi: dataFiSeleccionada.toISOString().split('T')[0],
        nits: nits,
        preu_total: total
    };
    
    const btnReservar = document.getElementById('btn-reservar');
    btnReservar.disabled = true;
    btnReservar.textContent = '⏳ Processant...';
    
    try {
        const resultat = await ferPeticioJSONP('ferReserva', dadesReserva);
        
        if (resultat.exit) {
            document.getElementById('missatge-confirmacio').textContent = resultat.missatge;
            mostrarSeccio('confirmacio');
        } else {
            throw new Error(resultat.missatge || 'Error desconegut');
        }
    } catch (error) {
        mostrarMissatge('missatge-reserva', 'Error realitzant la reserva: ' + error.message, 'error');
    } finally {
        btnReservar.disabled = false;
        btnReservar.textContent = '🚀 Confirmar Reserva';
    }
}
