// migracion.js - Motor independiente para Firestore y Generación de PDF
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// 0. Inyectar librería para descargar PDF automáticamente
const scriptPdf = document.createElement('script');
scriptPdf.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
document.head.appendChild(scriptPdf);

// 1. Configuración de la "Segunda Biblioteca" (Refacciones)
const firebaseConfigRefacciones = {
    apiKey: "AIzaSyCcA4WzZolfHyfVE7YZso37iAZn5Ppt7hI",
    authDomain: "refacciones-hyundai.firebaseapp.com",
    projectId: "refacciones-hyundai",
    storageBucket: "refacciones-hyundai.firebasestorage.app",
    messagingSenderId: "866017744551",
    appId: "1:866017744551:web:32e03be4b8152f504aad82"
};

const appRefacciones = initializeApp(firebaseConfigRefacciones, "AppRefacciones");
const dbFirestore = getFirestore(appRefacciones);

// 2. Estilos Clonados exactamente del PDF original
const estilosModal = `
    <style>
        .modal-presupuesto-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10000; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .modal-presupuesto-wrapper { background: #e0e0e0; padding: 20px; border-radius: 8px; position: relative; max-height: 95vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
        
        /* Controles de la ventana flotante */
        .pres-controles { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 15px; }
        .btn-accion-pres { border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; border-radius: 5px; font-family: 'Poppins', sans-serif; font-size: 0.9rem; transition: 0.2s; }
        .btn-cerrar { background: #ff4757; color: white; }
        .btn-cerrar:hover { background: #ff6b81; }
        .btn-descargar { background: #002b5e; color: white; }
        .btn-descargar:hover { background: #004aad; }

        /* HOJA A4 EXACTA AL DISEÑO */
        .hoja-impresion { background: #fff; width: 210mm; min-height: 250mm; padding: 20mm; font-family: Arial, Helvetica, sans-serif; color: #333; box-sizing: border-box; position: relative; }
        
        /* Encabezado */
        .hoja-header { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .h-izq h1 { color: #002b5e; margin: 0; font-size: 28pt; font-weight: normal; }
        .h-izq p { color: #666; margin: 5px 0 0 0; font-size: 11pt; text-transform: uppercase; }
        .h-der { text-align: left; margin-top: 10px; }
        .h-der p { margin: 5px 0; font-size: 11pt; color: #333; }

        /* Datos del Vehículo */
        .hoja-vehiculo { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .v-izq p, .v-der p { margin: 5px 0; font-size: 12pt; }
        
        /* Tabla Principal */
        .hoja-tabla { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .hoja-tabla th { background-color: #002b5e; color: #fff; text-align: left; padding: 8px 10px; font-size: 10pt; font-weight: bold; }
        .hoja-tabla td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; font-size: 10pt; color: #444; }
        .hoja-tabla tr:nth-child(even) { background-color: #fafafa; }
        .text-right { text-align: right !important; }
        .text-center { text-align: center !important; }

        /* Totales */
        .hoja-totales { width: 250px; margin-left: auto; font-size: 12pt; margin-bottom: 40px; }
        .hoja-totales div { display: flex; justify-content: space-between; padding: 5px 0; }
        .total-final { color: #002b5e; font-size: 14pt; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd; }

        /* Términos y Condiciones */
        .hoja-terminos { font-size: 8pt; color: #555; line-height: 1.4; border-top: 1px solid #002b5e; padding-top: 10px; margin-top: auto; }
        .hoja-terminos p { margin: 2px 0; }
    </style>
`;
document.head.insertAdjacentHTML('beforeend', estilosModal);

const modalHTML = `
    <div id="modalVistaPresupuesto" class="modal-presupuesto-overlay">
        <div class="modal-presupuesto-wrapper">
            
            <div class="pres-controles">
                <button class="btn-accion-pres btn-descargar" onclick="window.descargarPDF()">📥 Descargar PDF</button>
                <button class="btn-accion-pres btn-cerrar" onclick="document.getElementById('modalVistaPresupuesto').style.display='none'">✖ Cerrar</button>
            </div>

            <!-- Zona exacta que se convertirá en PDF -->
            <div id="documentoImprimir" class="hoja-impresion">
                
                <div class="hoja-header">
                    <div class="h-izq">
                        <h1>HYUNDAI COATZACOALCOS</h1>
                        <p>CRUFER 2000 S. DE R.L. DE C.V.</p>
                    </div>
                    <div class="h-der">
                        <p>Folio: <span id="p-folio"></span></p>
                        <p>Fecha: <span id="p-fecha"></span></p>
                    </div>
                </div>
                
                <div class="hoja-vehiculo">
                    <div class="v-izq">
                        <p>VIN: <span id="p-vin"></span></p>
                        <p>Modelo: <span id="p-modelo" style="text-transform:uppercase;"></span></p>
                    </div>
                    <div class="v-der">
                        <p>Tipo: <span id="p-tipo"></span></p>
                    </div>
                </div>
                
                <table class="hoja-tabla">
                    <thead>
                        <tr>
                            <th class="text-center">Cant.</th>
                            <th>No. Parte</th>
                            <th>Descripción</th>
                            <th class="text-center">Disp.</th>
                            <th class="text-right">P. Unitario</th>
                            <th class="text-right">Importe</th>
                        </tr>
                    </thead>
                    <tbody id="p-tbody"></tbody>
                </table>
                
                <div class="hoja-totales">
                    <div><span>Subtotal:</span> <span id="p-sub" class="text-right"></span></div>
                    <div><span>IVA (16%):</span> <span id="p-iva" class="text-right"></span></div>
                    <div class="total-final"><span>Total:</span> <span id="p-total" class="text-right"></span></div>
                </div>

                <div class="hoja-terminos">
                    <p style="font-weight:bold; color:#002b5e;">TÉRMINOS Y CONDICIONES IMPORTANTES:</p>
                    <p>1. NO SE ACEPTAN CAMBIOS NI DEVOLUCIONES UNA VEZ ENTREGADAS LAS REFACCIONES. PIEZAS ELÉCTRICAS NO TIENEN GARANTÍA.</p>
                    <p>2. Precios expresados en Moneda Nacional (MXN) sin I.V.A. Precios y existencias sujetos a cambio sin previo aviso.</p>
                    <p>3. La presente cotización tiene una vigencia de 5 días hábiles.</p>
                    <p>4. Los tiempos de entrega para piezas en BACKORDER dependen de la logística del fabricante e importación.</p>
                </div>

            </div> <!-- Fin de Zona PDF -->

        </div>
    </div>
`;
document.body.insertAdjacentHTML('beforeend', modalHTML);

// 3. Formateadores (Acepta hasta 3 decimales como en tu PDF original)
const formatoMoneda = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 3 });

// 4. Función de Búsqueda y Relleno
window.abrirPresupuesto = async function(vin, btnElement) {
    if(!vin || vin === 'S/V') { alert("⚠️ No hay un VIN válido registrado en esta fila."); return; }
    
    let textoOriginal = btnElement.innerText;
    btnElement.innerText = "⏳ Buscando...";
    btnElement.disabled = true;

    try {
        const q = query(collection(dbFirestore, "cotizaciones"), where("vin", "==", vin), orderBy("timestamp", "desc"), limit(1));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("No se encontraron presupuestos digitales para el VIN: " + vin);
            btnElement.innerText = textoOriginal;
            btnElement.disabled = false;
            return;
        }

        const data = querySnapshot.docs[0].data();
        
        document.getElementById('p-folio').innerText = data.folio || 'N/A';
        document.getElementById('p-fecha').innerText = data.fecha || 'N/A';
        document.getElementById('p-vin').innerText = data.vin || 'N/A';
        document.getElementById('p-modelo').innerText = data.modelo || 'N/A';
        document.getElementById('p-tipo').innerText = data.tipoCotizacion || 'MOSTRADOR';
        
        let tbodyHTML = '';
        if(data.refacciones && data.refacciones.length > 0) {
            data.refacciones.forEach(item => {
                tbodyHTML += `<tr>
                    <td class="text-center">${item.cantidad || '-'}</td>
                    <td>${item.numeroParte || '-'}</td>
                    <td>${item.descripcion || '-'}</td>
                    <td class="text-center">${item.disponibilidad || '-'}</td>
                    <td class="text-right">${formatoMoneda.format(item.precioUnitario || 0)}</td>
                    <td class="text-right">${formatoMoneda.format(item.importe || 0)}</td>
                </tr>`;
            });
        } else {
            tbodyHTML = `<tr><td colspan="6" class="text-center">No hay refacciones detalladas</td></tr>`;
        }
        document.getElementById('p-tbody').innerHTML = tbodyHTML;
        
        document.getElementById('p-sub').innerText = formatoMoneda.format(data.totales?.subtotal || 0);
        document.getElementById('p-iva').innerText = formatoMoneda.format(data.totales?.iva || 0);
        document.getElementById('p-total').innerText = formatoMoneda.format(data.totales?.total || 0);

        document.getElementById('modalVistaPresupuesto').style.display = 'flex';

    } catch(error) {
        console.error("Error en Firestore:", error);
        alert("⚠️ Hubo un error al conectar. Revisa tu internet.");
    } finally {
        btnElement.innerText = textoOriginal;
        btnElement.disabled = false;
    }
};

// 5. Función para Descargar PDF Mágicamente
window.descargarPDF = function() {
    const elemento = document.getElementById('documentoImprimir');
    const folioText = document.getElementById('p-folio').innerText;
    
    // Ocultar bordes de scroll temporales para una captura limpia
    elemento.style.border = "none";
    
    const opciones = {
        margin:       [0, 0, 0, 0], // Sin margen extra porque la hoja-impresion ya tiene padding de 20mm
        filename:     `${folioText}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opciones).from(elemento).save();
};