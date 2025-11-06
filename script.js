// ⚠️ CONFIGURA: URL del teu Google Apps Script desplegat
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwupu7ULsIG9nsVYCdMlLUBRTF1G7xVj0COTw38LG28oiG7AoH2dPhnCjRSCVzju1ua/exec';

// Variables globals
let immobleSeleccionat = 'Loft Barcelona';
let preuPerNit = 120;
let datesOcupades = [];
let dataIniciSeleccionada = null;
let dataFiSeleccionada = null;

// Variables globals del calendari
let mesActual = new Date().getMonth();
let anyActual = new Date().getFullYear();

// Inicialització
document.addEventListener('DOMContentLoaded', function() {
    inicialitzarBotonsImmoble();
    inicialitzarCalendaris();
});

function inicialitzarBotonsImmoble() {
    document.querySelectorAll('.btn-immoble').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.btn-immoble').forEach(b => b.classList.remove('seleccionat'));
            this.classList.add('seleccionat');
            immobleSeleccionat = this.getAttribute('data-immoble');
            
            // Actualitzar preu
            preuPerNit = immobleSeleccionat === 'Loft Barcelona' ? 120 : 85;
            
            // Netejar seleccions anteriors
            netejarSeleccions();
            
            // Carregar dates ocupades del nou immoble
            carregarDatesOcupades();
        });
    });
}

function mostrarSeccio(seccioId) {
    // Amagar totes les seccions
    document.querySelectorAll('.section').forEach(seccio => {
        seccio.classList.add('hidden');
    });
    
    // Mostrar la secció seleccionada
    document.getElementById(seccioId).classList.remove('hidden');
    
    // Accions específiques per secció
    if (seccioId === 'seleccio-dates') {
        carregarDatesOcupades();
    } else if (seccioId === 'formulari-reserva') {
        actualitzarResumReserva();
    }
}

// Funcions per comunicar amb Google Apps Script
async function ferPeticioGS(accio, parametres = {}) {
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: accio,
                ...parametres
            })
        });
        
        // Amb 'no-cors' no podràs llegir la resposta directament
        // Haurem de canviar l'enfocament
        return { exit: true }; // Resposta temporal
        
    } catch (error) {
        console.error('Error en ferPeticioGS:', error);
        throw error;
    }
}

async function carregarDatesOcupades() {
    try {
        const resultat = await ferPeticioGS('obtenirDatesOcupades', {
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

// Funcions del calendari
function inicialitzarCalendaris() {
    const avui = new Date();
    mesActual = avui.getMonth();
    anyActual = avui.getFullYear();
    generarCalendaris();
}

function generarCalendaris() {
    generarCalendari('calendari-inici', mesActual, anyActual, 'inici');
    generarCalendari('calendari-fi', mesActual, anyActual, 'fi');
}

function generarCalendari(containerId, mes, any, tipus) {
    const container = document.getElementById(containerId);
    const nomsMesos = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 
                       'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
    
    const avui = new Date();
    avui.setHours(0, 0, 0, 0);
    
    let html = `
        <div class="calendari-header">
            <button class="btn-nav" onclick="canviarMes('${containerId}', -1)">←</button>
            <div class="calendari-mes">${nomsMesos[mes]} ${any}</div>
            <button class="btn-nav" onclick="canviarMes('${containerId}', 1)">→</button>
        </div>
        <div class="dies-setmana">
            <div>Dl</div><div>Dt</div><div>Dc</div><div>Dj</div><div>Dv</div><div>Ds</div><div>Dg</div>
        </div>
        <div class="dies-mes">
    `;
    
    const primerDia = new Date(any, mes, 1);
    const ultimDia = new Date(any, mes + 1, 0);
    
    let diaIniciSetmana = primerDia.getDay();
    diaIniciSetmana = diaIniciSetmana === 0 ? 6 : diaIniciSetmana - 1;
    
    // Dies buits inicials
    for (let i = 0; i < diaIniciSetmana; i++) {
        html += '<div class="dia buit"></div>';
    }
    
    // Dies del mes
    for (let dia = 1; dia <= ultimDia.getDate(); dia++) {
        const dataActual = new Date(any, mes, dia);
        dataActual.setHours(0, 0, 0, 0);
        
        let classe = 'dia';
        let disabled = false;
        
        // Verificar disponibilitat
        const dataString = dataActual.toISOString().split('T')[0];
        const estaOcupada = datesOcupades.includes(dataString);
        
        if (dataActual < avui) {
            classe += ' passat';
            disabled = true;
        } else if (estaOcupada) {
            classe += ' ocupat';
            disabled = true;
        } else if (tipus === 'inici' && dataIniciSeleccionada && 
                  dataActual.getTime() === dataIniciSeleccionada.getTime()) {
            classe += ' seleccionat';
        } else if (tipus === 'fi' && dataFiSeleccionada && 
                  dataActual.getTime() === dataFiSeleccionada.getTime()) {
            classe += ' seleccionat';
        }
        
        if (dataActual.toDateString() === avui.toDateString()) {
            classe += ' avui';
        }
        
        if (disabled) {
            html += `<div class="${classe}">${dia}</div>`;
        } else {
            html += `<div class="${classe}" onclick="seleccionarData(${dia}, ${mes}, ${any}, '${tipus}')">${dia}</div>`;
        }
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function canviarMes(containerId, direccio) {
    // Implementació simplificada - en una versió completa gestionaries mesos diferents
    mesActual += direccio;
    if (mesActual < 0) {
        mesActual = 11;
        anyActual--;
    } else if (mesActual > 11) {
        mesActual = 0;
        anyActual++;
    }
    generarCalendaris();
}

function seleccionarData(dia, mes, any, tipus) {
    const data = new Date(any, mes, dia);
    
    if (tipus === 'inici') {
        dataIniciSeleccionada = data;
        document.getElementById('data-inici').value = formatarData(data);
        
        // Si la data fi és anterior, netejar-la
        if (dataFiSeleccionada && dataFiSeleccionada <= data) {
            dataFiSeleccionada = null;
            document.getElementById('data-fi').value = '';
        }
    } else {
        if (!dataIniciSeleccionada) {
            mostrarMissatge('missatge-disponibilitat', 'Selecciona primer la data d\'entrada', 'error');
            return;
        }
        
        if (data <= dataIniciSeleccionada) {
            mostrarMissatge('missatge-disponibilitat', 'La data de sortida ha de ser posterior', 'error');
            return;
        }
        
        dataFiSeleccionada = data;
        document.getElementById('data-fi').value = formatarData(data);
    }
    
    verificarDisponibilitat();
    generarCalendaris();
}

function verificarDisponibilitat() {
    if (dataIniciSeleccionada && dataFiSeleccionada) {
        const nits = Math.ceil((dataFiSeleccionada - dataIniciSeleccionada) / (1000 * 60 * 60 * 24));
        const total = nits * preuPerNit;
        
        mostrarMissatge('missatge-disponibilitat', 
                       `✅ Disponible! ${nits} nits - Total: ${total}€`, 
                       'exit');
        
        document.getElementById('boto-continuar-dates').disabled = false;
    } else {
        document.getElementById('boto-continuar-dates').disabled = true;
    }
}

function actualitzarResumReserva() {
    if (dataIniciSeleccionada && dataFiSeleccionada) {
        const nits = Math.ceil((dataFiSeleccionada - dataIniciSeleccionada) / (1000 * 60 * 60 * 24));
        const total = nits * preuPerNit;
        
        document.getElementById('resum-immoble').textContent = immobleSeleccionat;
        document.getElementById('resum-data-inici').textContent = formatarData(dataIniciSeleccionada);
        document.getElementById('resum-data-fi').textContent = formatarData(dataFiSeleccionada);
        document.getElementById('resum-nits').textContent = nits;
        document.getElementById('resum-total').textContent = total.toFixed(2);
    }
}

async function ferReserva() {
    const nom = document.getElementById('nom').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefon = document.getElementById('telefon').value.trim();
    
    // Validacions bàsiques
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
        const resultat = await ferPeticioGS('ferReserva', dadesReserva);
        
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

// Funcions auxiliars
function formatarData(data) {
    return data.toLocaleDateString('ca-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function mostrarMissatge(elementId, text, tipus) {
    const element = document.getElementById(elementId);
    element.textContent = text;
    element.className = `missatge ${tipus}`;
    element.style.display = 'block';
}

function netejarSeleccions() {
    dataIniciSeleccionada = null;
    dataFiSeleccionada = null;
    document.getElementById('data-inici').value = '';
    document.getElementById('data-fi').value = '';
    document.getElementById('missatge-disponibilitat').style.display = 'none';
}

function reiniciarProces() {
    netejarSeleccions();
    document.getElementById('nom').value = '';
    document.getElementById('email').value = '';
    document.getElementById('telefon').value = '';
    document.getElementById('missatge-reserva').style.display = 'none';
    mostrarSeccio('seleccio-immoble');
}
