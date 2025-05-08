let mapa;
let aeroportos = [];
let marcadores = [];
let linhaVoo;
let origemSelecionada, destinoSelecionada;

// Função para carregar o JSON localmente
async function carregarDados() {
  const resposta = await fetch('AerodromosPublicos.json');
  const dados = await resposta.json();

  // Padronizar os campos do JSON
  aeroportos = dados.map(a => ({
    codigo_oaci: a["CódigoOACI"],
    nome: a["Nome"],
    municipio: a["Município"],
    uf: a["UF"],
    latitude: parseFloat(a["LatGeoPoint"]),
    longitude: parseFloat(a["LonGeoPoint"]),
    tipo: "Público" // ou derive de outro campo, se necessário
  }));

  const dataArquivo = new Date(resposta.headers.get("last-modified") || Date.now());
  document.getElementById("data-atualizacao").textContent = `Data de atualização: ${dataArquivo.toLocaleDateString()}`;

  inicializarMapa();
  preencherMunicipios();
}

function inicializarMapa() {
  mapa = L.map('map').setView([-15.78, -47.93], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapa);

  aeroportos.forEach(aero => {
    if (aero.latitude && aero.longitude) {
      const marcador = L.marker([aero.latitude, aero.longitude])
        .bindPopup(`<strong>${aero.nome}</strong><br>
                    Código OACI: ${aero.codigo_oaci}<br>
                    Município: ${aero.municipio}<br>
                    UF: ${aero.uf}<br>
                    Tipo: ${aero.tipo}
                   `)
        .addTo(mapa);
      marcadores.push(marcador);
    }
  });
}

function preencherMunicipios() {
  const municipiosOrigem = document.getElementById("municipio-origem");
  const municipiosDestino = document.getElementById("municipio-destino");

  const municipios = [...new Set(aeroportos.map(a => a.municipio))].sort();
  municipios.forEach(m => {
    const opt1 = new Option(m, m);
    const opt2 = new Option(m, m);
    municipiosOrigem.appendChild(opt1);
    municipiosDestino.appendChild(opt2);
  });

  new Choices(municipiosOrigem, { searchEnabled: true });
  new Choices(municipiosDestino, { searchEnabled: true });

  municipiosOrigem.addEventListener('change', e => preencherAeroportos("origem", e.target.value));
  municipiosDestino.addEventListener('change', e => preencherAeroportos("destino", e.target.value));
}

function preencherAeroportos(tipo, municipio) {
  const seletor = tipo === "origem" ? "aeroporto-origem" : "aeroporto-destino";
  const select = document.getElementById(seletor);
  select.innerHTML = "";

  const filtrados = aeroportos.filter(a => a.municipio === municipio);
  filtrados.forEach(a => {
    const opt = new Option(`${a.nome} (${a.codigo_oaci})`, a.codigo_oaci);
    select.appendChild(opt);
  });

  new Choices(select, { searchEnabled: true });
}

function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function obterAeroportoPorCodigo(codigo) {
  return aeroportos.find(a => a.codigo_oaci === codigo);
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

document.getElementById("aeronave").addEventListener("change", e => {
  const input = document.getElementById("velocidade-personalizada");
  input.style.display = e.target.value === "custom" ? "block" : "none";
});

document.getElementById("calcular").addEventListener("click", calcularTrajeto);

document.addEventListener("DOMContentLoaded", carregarDados);
