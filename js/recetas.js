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
  cocina: document.getElementById("filtro-cocina"),
  dificultad: document.getElementById("filtro-dificultad"),
  tiempo: document.getElementById("filtro-tiempo"),
  limpiar: document.getElementById("btn-limpiar-filtros"),
  lista: document.getElementById("lista-recetas"),
  resumen: document.getElementById("resumen"),
  modal: document.getElementById("modal-detalle"),
  modalContenido: document.getElementById("modal-contenido"),
  // Despensa ("¿Qué tienes en casa?")
  elegidos: document.getElementById("despensa-elegidos"),
  buscarIngrediente: document.getElementById("buscar-ingrediente"),
  listaIngredientes: document.getElementById("lista-ingredientes"),
  faltantes: document.getElementById("filtro-faltantes"),
  limpiarDespensa: document.getElementById("btn-limpiar-despensa"),
};

// Lee el estado actual de los controles
function leerFiltros() {
  return {
    texto: el.buscar.value,
    categoria: el.categoria.value,
    cocina: el.cocina.value,
    dificultad: el.dificultad.value,
    tiempo: el.tiempo.value,
  };
}

/* Devuelve lo que se va a mostrar: [{ receta, info }].
   1) Búsqueda + filtros.  2) Si hay ingredientes elegidos, además se filtra y ordena por despensa. */
function obtenerResultados() {
  const filtradas = ChefFiltros.filtrarRecetas(todasLasRecetas, leerFiltros());
  const despensa = ChefStorage.obtenerDespensa();
  if (despensa.length === 0) {
    return filtradas.map((receta) => ({ receta, info: null }));
  }
  const maxFaltan = el.faltantes.value === "todas" ? Infinity : Number(el.faltantes.value);
  return ChefFiltros.aplicarDespensa(filtradas, despensa, maxFaltan);
}

/* ---------- Renderizado ---------- */
function renderizar() {
  const resultados = obtenerResultados();
  const despensa = ChefStorage.obtenerDespensa();
  el.lista.innerHTML = "";

  if (resultados.length === 0) {
    // ESTADO VACÍO (con sugerencia distinta si hay ingredientes elegidos)
    const sugerencia = despensa.length > 0
      ? "Con esos ingredientes no hay recetas que cumplan. Agrega más ingredientes o cambia «Cuánto me puede faltar»."
      : "Prueba con otra palabra o presiona «Limpiar filtros».";
    el.lista.innerHTML = `<p class="mensaje mensaje--vacio">😕 No se encontraron recetas. ${sugerencia}</p>`;
  } else {
    resultados.forEach(({ receta, info }) => el.lista.appendChild(crearTarjetaReceta(receta, true, info)));
  }

  // Procesamiento de datos: conteos y promedio
  const recetas = resultados.map((x) => x.receta);
  const favs = ChefStorage.obtenerFavoritos().length;
  el.resumen.textContent =
    `Mostrando ${resultados.length} de ${todasLasRecetas.length} recetas` +
    (resultados.length ? ` · Tiempo promedio: ${ChefFiltros.tiempoPromedio(recetas)} min` : "") +
    (despensa.length ? ` · Con tus ${despensa.length} ingredientes` : "") +
    ` · Favoritos: ${favs}`;
}

// Llena un <select> con valores que salen de los datos (no escritos a mano)
function llenarSelect(select, valores) {
  valores.forEach((valor) => {
    const opcion = document.createElement("option");
    opcion.value = valor;
    opcion.textContent = valor;
    select.appendChild(opcion);
  });
}

/* ---------- Despensa ---------- */
// Crea la lista de casillas con todos los ingredientes (los más usados primero)
function construirListaIngredientes() {
  el.listaIngredientes.innerHTML = "";
  ChefFiltros.obtenerIngredientes(todasLasRecetas).forEach(({ clave, usos }) => {
    const li = document.createElement("li");
    li.dataset.nombre = ChefFiltros.normalizar(clave);   // para el buscador interno

    const etiqueta = document.createElement("label");
    etiqueta.className = "ingrediente";
    const casilla = document.createElement("input");
    casilla.type = "checkbox";
    casilla.value = clave;
    const texto = document.createElement("span");
    texto.textContent = `${clave} (${usos})`;

    etiqueta.append(casilla, texto);
    li.appendChild(etiqueta);
    el.listaIngredientes.appendChild(li);
  });
}

// Sincroniza casillas, chips de elegidos y el select de "cuánto me puede faltar"
function actualizarDespensaUI() {
  const despensa = ChefStorage.obtenerDespensa();
  const elegidos = new Set(despensa.map(ChefFiltros.comparable));

  el.listaIngredientes.querySelectorAll("input[type=checkbox]").forEach((c) => {
    c.checked = elegidos.has(ChefFiltros.comparable(c.value));
  });

  el.elegidos.innerHTML = "";
  if (despensa.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "campo__ayuda";
    vacio.textContent = "Aún no elegiste ingredientes.";
    el.elegidos.appendChild(vacio);
  }
  despensa.forEach((clave) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.quitar = clave;
    chip.setAttribute("aria-label", "Quitar " + clave);
    chip.textContent = clave + " ✕";
    el.elegidos.appendChild(chip);
  });

  el.faltantes.disabled = despensa.length === 0;
  el.limpiarDespensa.disabled = despensa.length === 0;
}

function cambiarDespensa(clave) {
  ChefStorage.alternarDespensa(clave);
  actualizarDespensaUI();
  renderizar();
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
    <div class="etiquetas">
      <span class="etiqueta">${escaparHTML(r.categoria)}</span>
      <span class="etiqueta etiqueta--cocina">${escaparHTML(r.cocina)}</span>
    </div>
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
  [el.categoria, el.cocina, el.dificultad, el.tiempo, el.faltantes]
    .forEach((s) => s.addEventListener("change", renderizar));

  el.limpiar.addEventListener("click", () => {
    el.buscar.value = "";
    el.categoria.value = "";
    el.cocina.value = "";
    el.dificultad.value = "";
    el.tiempo.value = "todos";
    renderizar();
    mostrarToast("Filtros limpiados", "aviso");
    el.buscar.focus();
  });

  // Despensa: casillas (delegación), chips para quitar, buscador interno y botón de limpiar
  el.listaIngredientes.addEventListener("change", (e) => {
    if (e.target.matches("input[type=checkbox]")) cambiarDespensa(e.target.value);
  });
  el.elegidos.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-quitar]");
    if (chip) cambiarDespensa(chip.dataset.quitar);
  });
  el.buscarIngrediente.addEventListener("input", () => {
    const texto = ChefFiltros.normalizar(el.buscarIngrediente.value);
    el.listaIngredientes.querySelectorAll("li").forEach((li) => {
      li.hidden = texto !== "" && !li.dataset.nombre.includes(texto);
    });
  });
  el.limpiarDespensa.addEventListener("click", () => {
    ChefStorage.limpiarDespensa();
    actualizarDespensaUI();
    renderizar();
    mostrarToast("Ingredientes quitados", "aviso");
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
    llenarSelect(el.categoria, ChefFiltros.obtenerCategorias(todasLasRecetas));
    llenarSelect(el.cocina, ChefFiltros.obtenerCocinas(todasLasRecetas));

    // Viene desde el inicio con ?cocina=Italiana → deja ese filtro aplicado
    const cocinaEnUrl = new URLSearchParams(location.search).get("cocina");
    if (cocinaEnUrl && ChefFiltros.obtenerCocinas(todasLasRecetas).includes(cocinaEnUrl)) {
      el.cocina.value = cocinaEnUrl;
    }

    construirListaIngredientes();
    actualizarDespensaUI();
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
