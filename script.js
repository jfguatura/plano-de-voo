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
  })).filter(a => !isNaN(a.latitude) && !isNaN(a.longitude));

  inicializarMapa();
  preencherMunicipios();
}

function inicializarMapa() {
  mapa = L.map('map').setView([-15.78, -47.93], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);

  exibirTodosOsAeroportos();
}

function exibirTodosOsAeroportos() {
  marcadores.forEach(m => mapa.removeLayer(m));
  marcadores = [];

  aeroportos.forEach(aero => {
    const popupContent = gerarPopup(aero);
    const marcador = L.marker([aero.latitude, aero.longitude])
      .bindPopup(popupContent)
      .addTo(mapa);
    marcadores.push(marcador);
  });
}

function gerarPopup(aero) {
  let conteudo = `<strong>${aero.nome}</strong><br>`;
  for (const [chave, valor] of Object.entries(aero)) {
    if (valor && !['latitude', 'longitude', 'nome'].includes(chave)) {
      const chaveFormatada = chave.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      conteudo += `<strong>${chaveFormatada}:</strong> ${valor}<br>`;
    }
  }
  return conteudo;
}

function preencherMunicipios() {
  const municipios = [...new Set(aeroportos.map(a => a.municipio))].sort();

  const selectOrigem = document.getElementById("municipio-origem");
  const selectDestino = document.getElementById("municipio-destino");

  municipios.forEach(m => {
    selectOrigem.add(new Option(m, m));
    selectDestino.add(new Option(m, m));
  });

  selectOrigem.addEventListener("change", () => filtrarAeroportosPorMunicipio("origem"));
  selectDestino.addEventListener("change", () => filtrarAeroportosPorMunicipio("destino"));
}

function filtrarAeroportosPorMunicipio(tipo) {
  const municipio = document.getElementById(`municipio-${tipo}`).value;
  const selectAeroporto = document.getElementById(`aeroporto-${tipo}`);
  selectAeroporto.innerHTML = "";

  aeroportos
    .filter(a => a.municipio === municipio)
    .forEach(aero => {
      const label = `${aero.nome} - ${aero.municipio}/${aero.uf} (${aero.codigo_oaci})`;
      selectAeroporto.add(new Option(label, aero.codigo_oaci));
    });
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Aguarda o carregamento completo do DOM
document.addEventListener('DOMContentLoaded', function () {
  // Adiciona o listener ao botão "Calcular Trajeto"
  document.getElementById('calcular').addEventListener('click', function () {
    console.log('Botão clicado');
    calcularTrajeto();
  });

  // Função para calcular o trajeto entre os aeroportos
  function calcularTrajeto() {
    const codOrigem = document.getElementById("aeroporto-origem").value;
    const codDestino = document.getElementById("aeroporto-destino").value;
    const tipoVel = document.getElementById("aeronave").value;
    const velCustom = document.getElementById("velocidade-personalizada").value;

    const origem = obterAeroportoPorCodigo(codOrigem);
    const destino = obterAeroportoPorCodigo(codDestino);
    const velocidade = tipoVel === "custom" ? parseFloat(velCustom) : parseFloat(tipoVel);

    // Verifica se os aeroportos de origem e destino são válidos
    if (!origem || !destino) {
      alert("Por favor, selecione aeroportos de origem e destino válidos.");
      return;
    }

    // Verifica se a velocidade é válida
    if (isNaN(velocidade) || velocidade <= 0) {
      alert("Por favor, informe uma velocidade válida.");
      return;
    }

    // Calcula a distância entre os aeroportos
    const dist = calcularDistancia(origem.latitude, origem.longitude, destino.latitude, destino.longitude);
    const tempo = dist / velocidade;

    // Remove marcadores anteriores do mapa
    marcadores.forEach(m => mapa.removeLayer(m));
    marcadores = [];

    // Adiciona marcadores para origem e destino no mapa
    const marcadorOrigem = L.marker([origem.latitude, origem.longitude])
      .bindPopup(gerarPopup(origem))
      .addTo(mapa);
    const marcadorDestino = L.marker([destino.latitude, destino.longitude])
      .bindPopup(gerarPopup(destino))
      .addTo(mapa);
    marcadores.push(marcadorOrigem, marcadorDestino);

    // Desenha a linha do voo
    if (linhaVoo) mapa.removeLayer(linhaVoo);
    linhaVoo = L.polyline([
      [origem.latitude, origem.longitude],
      [destino.latitude, destino.longitude]
    ], { color: 'red' }).addTo(mapa);

    // Ajusta o mapa para mostrar a linha de voo
    mapa.fitBounds(linhaVoo.getBounds());

    // Exibe um popup com a distância e tempo estimado de voo
    linhaVoo.bindPopup(
      `<strong>Distância:</strong> ${dist.toFixed(2)} km<br>
       <strong>Tempo estimado:</strong> ${(tempo * 60).toFixed(0)} min`
    ).openPopup();
  }

  // Função para obter informações do aeroporto por código
 function obterAeroportoPorCodigo(codigo) {
  return aeroportos.find(aeroporto => aeroporto.codigo_oaci === codigo);
}

  // Função para calcular a distância entre dois pontos geográficos
  function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distância em km
  }

  // Função para gerar o popup para cada aeroporto
  function gerarPopup(aeroporto) {
    return `<strong>${aeroporto.nome}</strong><br>
            Código: ${aeroporto.codigo}<br>
            Localização: ${aeroporto.municipio}, ${aeroporto.uf}`;
  }
});


function exportarPDF() {
  const container = document.getElementById('container');
  html2canvas(container).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    const yOffset = (pdf.internal.pageSize.getHeight() - imgHeight) / 2;

    pdf.addImage(imgData, 'PNG', 0, yOffset, imgWidth, imgHeight);
    pdf.save("trajeto_aereo.pdf");
  });
}

carregarDadosAeroportos();
