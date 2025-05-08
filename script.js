let mapa;
let aeroportos = [];
let marcadores = [];
let linhaVoo;

async function carregarDadosAeroportos() {
  const response = await fetch("AerodromosPublicos.json");
  const dados = await response.json();
  aeroportos = dados.map(a => ({
    codigo_oaci: a["CódigoOACI"],
    ciad: a["CIAD"],
    nome: a["Nome"],
    municipio: a["Município"],
    uf: a["UF"],
    municipio_servido: a["MunicípioServido"],
    uf_servido: a["UFSERVIDO"],
    latitude: parseFloat(a["LatGeoPoint"]),
    longitude: parseFloat(a["LonGeoPoint"]),
    latitude_gms: a["Latitude"],
    longitude_gms: a["Longitude"],
    altitude: a["Altitude"],
    operacao_diurna: a["OperaçãoDiurna"],
    operacao_noturna: a["OperaçãoNoturna"],
    designacao1: a["Designação1"],
    comprimento1: a["Comprimento1"],
    largura1: a["Largura1"],
    resistencia1: a["Resistência1"],
    superficie1: a["Superfície1"],
    designacao2: a["Designação2"],
    comprimento2: a["Comprimento2"],
    largura2: a["Largura2"],
    resistencia2: a["Resistência2"],
    superficie2: a["Superfície2"],
    situacao: a["SITUAÇÃO"],
    validade_registro: a["ValidadedoRegistro"],
    portaria_registro: a["PortariadeRegistro"],
    link_portaria: a["LinkPortaria"]
  })).filter(a => a.latitude && a.longitude);

  inicializarMapa();
  preencherMunicipios();
}

function inicializarMapa() {
  mapa = L.map('map').setView([-15.78, -47.93], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);

  // Exibe os aeroportos apenas depois do mapa estar pronto
  setTimeout(exibirTodosOsAeroportos, 500);  // Aguarda meio segundo antes de exibir os marcadores
}


function exibirTodosOsAeroportos() {
  marcadores.forEach(m => mapa.removeLayer(m));
  marcadores = [];

  aeroportos.forEach(aero => {
    if (aero.latitude && aero.longitude) {
      const popupContent = gerarPopup(aero);
      const marcador = L.marker([aero.latitude, aero.longitude])
        .bindPopup(popupContent)
        .addTo(mapa);
      marcadores.push(marcador);
    }
  });
}

function gerarPopup(aero) {
  let conteudo = `<strong>${aero.nome}</strong><br>`;
  for (const [chave, valor] of Object.entries(aero)) {
    if (valor && chave !== 'latitude' && chave !== 'longitude' && chave !== 'nome') {
      const chaveFormatada = chave.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      conteudo += `<strong>${chaveFormatada}:</strong> ${valor}<br>`;
    }
  }
  return conteudo;
}

function preencherMunicipios() {
  const listaMunicipios = [...new Set(aeroportos
    .map(a => a.municipio)
    .filter(m => m && m.trim() !== "")
  )].sort((a, b) => a.localeCompare(b));

  console.log("Lista de Municípios:", listaMunicipios); // Verificar se a lista de municípios está sendo gerada corretamente

  const selectOrigem = document.getElementById("municipio-origem");
  const selectDestino = document.getElementById("municipio-destino");

  listaMunicipios.forEach(m => {
    const optionOrigem = new Option(m, m);
    const optionDestino = new Option(m, m);
    selectOrigem.add(optionOrigem);
    selectDestino.add(optionDestino);
  });

  selectOrigem.addEventListener("change", () => filtrarAeroportosPorMunicipio("origem"));
  selectDestino.addEventListener("change", () => filtrarAeroportosPorMunicipio("destino"));
}

function filtrarAeroportosPorMunicipio(tipo) {
  console.log("Municipio selecionado:", municipio);
  const municipio = document.getElementById(`municipio-${tipo}`).value.trim().toLowerCase();
  const selectAeroporto = document.getElementById(`aeroporto-${tipo}`);

  selectAeroporto.innerHTML = "";

  aeroportos
    .filter(a => {
    console.log("Comparando:", a.municipio.trim().toLowerCase(), "===", municipio);
    return a.municipio.trim().toLowerCase() === municipio;
    })
    .filter(a => a.municipio.trim().toLowerCase() === municipio)
    .forEach(aero => {
      const label = `${aero.nome} - ${aero.municipio}/${aero.uf} (${aero.codigo_oaci})`;
      const option = new Option(label, aero.codigo_oaci);
      selectAeroporto.add(option);
    });
}


function obterAeroportoPorCodigo(codigo) {
  return aeroportos.find(a => a.codigo_oaci === codigo);
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calcularTrajeto() {
  const origem = obterAeroportoPorCodigo(document.getElementById("aeroporto-origem").value);
  const destino = obterAeroportoPorCodigo(document.getElementById("aeroporto-destino").value);
  const tipoVel = document.getElementById("aeronave").value;
  const velCustom = document.getElementById("velocidade-personalizada").value;

  const velocidade = tipoVel === "custom" ? parseFloat(velCustom) : parseFloat(tipoVel);
  if (!origem || !destino || !velocidade) return;

  const dist = calcularDistancia(origem.latitude, origem.longitude, destino.latitude, destino.longitude);
  const tempo = dist / velocidade;

  marcadores.forEach(m => mapa.removeLayer(m));
  marcadores = [];

  const marcadorOrigem = L.marker([origem.latitude, origem.longitude])
    .bindPopup(gerarPopup(origem))
    .addTo(mapa);
  const marcadorDestino = L.marker([destino.latitude, destino.longitude])
    .bindPopup(gerarPopup(destino))
    .addTo(mapa);
  marcadores.push(marcadorOrigem, marcadorDestino);

  if (linhaVoo) mapa.removeLayer(linhaVoo);
  linhaVoo = L.polyline([
    [origem.latitude, origem.longitude],
    [destino.latitude, destino.longitude]
  ], { color: 'red' }).addTo(mapa);

  mapa.fitBounds(linhaVoo.getBounds());

  linhaVoo.bindPopup(
    `<strong>Distância:</strong> ${dist.toFixed(2)} km<br>
     <strong>Tempo estimado:</strong> ${(tempo * 60).toFixed(0)} min`
  ).openPopup();
}

function exportarPDF() {
  const container = document.getElementById('container');

  html2canvas(container).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = canvas.height * pageWidth / canvas.width;
    const yOffset = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight);
    pdf.save("trajeto_aereo.pdf");
  });
}

carregarDadosAeroportos();
