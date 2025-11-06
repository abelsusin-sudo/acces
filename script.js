// ⚠️ CONFIGURA: URL del teu Google Apps Script desplegat
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyeOiU5mpQWsgsusaXVEi3Z0jKDAOvidn538lJnUP5tzNxopevmEadG7kOi5D15knii/exec';

// Variables globals
let immobleSeleccionat = 'Loft Barcelona';
let preuPerNit = 120;
let datesOcupades = [];
let dataIniciSeleccionada = null;
let dataFiSeleccionada = null;

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
        const url = new URL(SCRIPT_URL);
        url.searchParams.append('action', accio);
        
        Object.keys(parametres).forEach(key => {
            url.searchParams.append(key, parametres[key]);
        });
        
        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        return await response.json();
        
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
    const ultimDia = new Date(any, mes + 1, 
