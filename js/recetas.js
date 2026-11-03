/* =====================================================
   recetas.js — Página "Solución Interactiva" (recetas.html)
   Usa: storage.js, app.js (cargarRecetas, crearTarjetaReceta,
   mostrarToast, escaparHTML) y filtros.js
   ===================================================== */

let todasLasRecetas = [];   // copia completa (JSON + recetas del usuario)

// Referencias al DOM (se buscan una sola vez)
const el = {
  buscar: document.getElementById("buscar"),
  categoria: document.getElementById("filtro-categoria"),
  dificultad: document.getElementById("filtro-dificultad"),
  tiempo: document.getElementById("filtro-tiempo"),
  limpiar: document.getElementById("btn-limpiar-filtros"),
  lista: document.getElementById("lista-recetas"),
  resumen: document.getElementById("resumen"),
  modal: document.getElementById("modal-detalle"),
  modalContenido: document.getElementById("modal-contenido"),
};

// Lee el estado actual de los controles
function leerFiltros() {
  return {
    texto: el.buscar.value,
    categoria: el.categoria.value,
    dificultad: el.dificultad.value,
    tiempo: el.tiempo.value,
  };
}

/* ---------- Renderizado ---------- */
function renderizar() {
  const resultados = ChefFiltros.filtrarRecetas(todasLasRecetas, leerFiltros());
  el.lista.innerHTML = "";

  if (resultados.length === 0) {
    // ESTADO VACÍO
    el.lista.innerHTML =
      '<p class="mensaje mensaje--vacio">😕 No se encontraron recetas con esos criterios. ' +
      "Prueba con otra palabra o presiona «Limpiar filtros».</p>";
  } else {
    resultados.forEach((r) => el.lista.appendChild(crearTarjetaReceta(r, true)));
  }

  // Procesamiento de datos: conteos y promedio
  const favs = ChefStorage.obtenerFavoritos().length;
  el.resumen.textContent =
    `Mostrando ${resultados.length} de ${todasLasRecetas.length} recetas` +
    (resultados.length ? ` · Tiempo promedio: ${ChefFiltros.tiempoPromedio(resultados)} min` : "") +
    ` · Favoritos: ${favs}`;
}

// Llena el <select> de categorías con los datos reales (no escrito a mano)
function llenarCategorias() {
  ChefFiltros.obtenerCategorias(todasLasRecetas).forEach((cat) => {
    const opcion = document.createElement("option");
    opcion.value = cat;
    opcion.textContent = cat;
    el.categoria.appendChild(opcion);
  });
}

/* ---------- Favoritos ---------- */
function alternarFavoritoUI(id, boton) {
  const ahoraEsFav = ChefStorage.alternarFavorito(id);
  if (boton) {
    boton.classList.toggle("activo", ahoraEsFav);
    boton.setAttribute("aria-pressed", ahoraEsFav);
    boton.textContent = ahoraEsFav ? "♥ En favoritos" : "♡ Guardar favorito";
  }
  mostrarToast(ahoraEsFav ? "Receta guardada en favoritos" : "Receta quitada de favoritos",
               ahoraEsFav ? "exito" : "aviso");
  actualizarContadorFavoritos();
  renderizar(); // refresca tarjetas y el resumen
}

/* ---------- Modal de detalle ---------- */
function abrirDetalle(id) {
  const r = todasLasRecetas.find((x) => x.id === id);
  if (!r) return;
  const esFav = ChefStorage.esFavorito(r.id);
  const ingredientes = r.ingredientes.map((i) => `<li>${escaparHTML(i)}</li>`).join("");
  const pasos = (r.pasos && r.pasos.length)
    ? r.pasos.map((p) => `<li>${escaparHTML(p)}</li>`).join("")
    : "<li>Esta receta no tiene pasos registrados.</li>";

  el.modalContenido.innerHTML = `
    <img src="${escaparHTML(r.imagen)}" alt="Imagen de ${escaparHTML(r.nombre)}">
    <span class="etiqueta">${escaparHTML(r.categoria)}</span>
    <h2 id="modal-titulo">${escaparHTML(r.nombre)}</h2>
    <p>${escaparHTML(r.descripcion)}</p>
    <p class="tarjeta__meta">⏱ ${r.tiempo} min · ${escaparHTML(r.dificultad)}</p>
    <h3>Ingredientes</h3><ul class="lista">${ingredientes}</ul>
    <h3>Preparación</h3><ol class="lista">${pasos}</ol>
    <button type="button" class="btn btn--fav ${esFav ? "activo" : ""}" data-modal-fav="${r.id}"
            aria-pressed="${esFav}">${esFav ? "♥ En favoritos" : "♡ Guardar favorito"}</button>`;
  el.modal.showModal();
}

/* ---------- Eventos ---------- */
function registrarEventos() {
  // input: se dispara en cada tecla → búsqueda instantánea
  el.buscar.addEventListener("input", renderizar);
  // change: se dispara al elegir una opción en un <select>
  [el.categoria, el.dificultad, el.tiempo].forEach((s) => s.addEventListener("change", renderizar));

  el.limpiar.addEventListener("click", () => {
    el.buscar.value = "";
    el.categoria.value = "";
    el.dificultad.value = "";
    el.tiempo.value = "todos";
    renderizar();
    mostrarToast("Filtros limpiados", "aviso");
    el.buscar.focus();
  });

  // Delegación: un listener para los botones de TODAS las tarjetas
  el.lista.addEventListener("click", (e) => {
    const tarjeta = e.target.closest(".tarjeta");
    if (!tarjeta) return;
    const id = Number(tarjeta.dataset.id);
    if (e.target.closest('[data-accion="favorito"]')) {
      alternarFavoritoUI(id, null);
    } else if (e.target.closest('[data-accion="detalle"]')) {
      abrirDetalle(id);
    }
  });

  // Favorito dentro del modal
  el.modalContenido.addEventListener("click", (e) => {
    const boton = e.target.closest("[data-modal-fav]");
    if (boton) alternarFavoritoUI(Number(boton.dataset.modalFav), boton);
  });

  document.getElementById("modal-cerrar").addEventListener("click", () => el.modal.close());
  // Clic fuera del cuadro cierra el modal
  el.modal.addEventListener("click", (e) => { if (e.target === el.modal) el.modal.close(); });
}

/* ---------- Arranque ---------- */
async function iniciarRecetas() {
  try {
    todasLasRecetas = await cargarRecetas();
    llenarCategorias();
    registrarEventos();
    renderizar();
  } catch (error) {
    console.error(error);
    el.lista.innerHTML =
      '<p class="mensaje mensaje--error">No se pudieron cargar las recetas. ' +
      "Abre el sitio con un servidor local (Live Server) o desde GitHub Pages.</p>";
  }
}

iniciarRecetas();
