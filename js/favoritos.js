/* =====================================================
   favoritos.js — Página "Registro o Gestión" (favoritos.html)
   Usa: storage.js, app.js, filtros.js
   Contiene:
     1. ChefValidar  → reglas de validación (lógica pura, probable con Node)
     2. Interfaz     → formulario, listas, eliminar, limpiar con confirmación
   ===================================================== */

/* ---------- 1. VALIDACIONES (sin DOM) ---------- */
const ChefValidar = (() => {
  // Cada función devuelve un texto de error, o "" si el valor es correcto.

  function nombre(valor, nombresExistentes) {
    const v = valor.trim();
    if (v === "") return "El nombre es obligatorio.";
    if (v.length < 3) return "El nombre debe tener al menos 3 caracteres.";
    if (v.length > 60) return "El nombre no puede superar los 60 caracteres.";
    const normalizado = ChefFiltros.normalizar(v);
    if (nombresExistentes.some((n) => ChefFiltros.normalizar(n) === normalizado)) {
      return "Ya existe una receta con ese nombre.";
    }
    return "";
  }

  function seleccion(valor, etiqueta) {
    return valor === "" ? `Selecciona ${etiqueta}.` : "";
  }

  function tiempo(valor) {
    if (valor.trim() === "") return "Indica el tiempo de preparación.";
    const n = Number(valor);
    if (!Number.isInteger(n)) return "Escribe un número entero de minutos.";
    if (n < 1 || n > 600) return "El tiempo debe estar entre 1 y 600 minutos.";
    return "";
  }

  function descripcion(valor) {
    const v = valor.trim();
    if (v === "") return "La descripción es obligatoria.";
    if (v.length < 10) return `Faltan ${10 - v.length} caracteres para llegar al mínimo de 10.`;
    if (v.length > 200) return "La descripción no puede superar los 200 caracteres.";
    return "";
  }

  // Convierte el texto de un textarea en un arreglo (una línea = un elemento)
  function aLineas(valor) {
    return valor.split("\n").map((l) => l.trim()).filter((l) => l !== "");
  }

  function lista(valor, minimo, singular, plural) {
    const items = aLineas(valor);
    if (items.length === 0) return `Escribe al menos ${minimo} ${plural}, uno por línea.`;
    if (items.length < minimo) return `Agrega al menos ${minimo} ${plural} (llevas ${items.length}).`;
    if (items.some((i) => i.length < 2)) return `Cada ${singular} debe tener al menos 2 caracteres.`;
    return "";
  }

  return { nombre, seleccion, tiempo, descripcion, aLineas, lista };
})();

/* ---------- 2. INTERFAZ ---------- */
let todasLasRecetas = [];
let el = {};

// Campos del formulario y su regla de validación
function reglasCampos() {
  return {
    nombre: (v) => ChefValidar.nombre(v, todasLasRecetas.map((r) => r.nombre)),
    categoria: (v) => ChefValidar.seleccion(v, "una categoría"),
    dificultad: (v) => ChefValidar.seleccion(v, "una dificultad"),
    tiempo: (v) => ChefValidar.tiempo(v),
    descripcion: (v) => ChefValidar.descripcion(v),
    ingredientes: (v) => ChefValidar.lista(v, 2, "ingrediente", "ingredientes"),
    pasos: (v) => ChefValidar.lista(v, 2, "paso", "pasos"),
  };
}

// Muestra u oculta el error de un campo y marca su estado visual
function pintarEstadoCampo(idCampo, mensaje) {
  const campo = document.getElementById(idCampo);
  document.getElementById("error-" + idCampo).textContent = mensaje;
  campo.classList.toggle("invalido", mensaje !== "");
  campo.classList.toggle("valido", mensaje === "" && campo.value.trim() !== "");
  campo.setAttribute("aria-invalid", mensaje !== "" ? "true" : "false");
}

function validarCampo(idCampo) {
  const mensaje = reglasCampos()[idCampo](document.getElementById(idCampo).value);
  pintarEstadoCampo(idCampo, mensaje);
  return mensaje;
}

// Valida todo. Devuelve los ids de los campos con error.
function validarFormulario() {
  return Object.keys(reglasCampos()).filter((id) => validarCampo(id) !== "");
}

function limpiarFormulario() {
  el.formulario.reset();
  Object.keys(reglasCampos()).forEach((id) => {
    const campo = document.getElementById(id);
    campo.classList.remove("valido", "invalido");
    campo.removeAttribute("aria-invalid");
    document.getElementById("error-" + id).textContent = "";
  });
  el.resumenErrores.textContent = "";
  el.resumenErrores.hidden = true;
  actualizarContador();
}

function actualizarContador() {
  el.contador.textContent = `${el.descripcion.value.length} / 200`;
}

/* ---------- Envío del formulario ---------- */
function manejarEnvio(evento) {
  evento.preventDefault(); // evita que el navegador recargue la página

  const invalidos = validarFormulario();
  if (invalidos.length > 0) {
    // Prevención de errores: decirle al usuario exactamente qué corregir
    const nombres = invalidos.map((id) => document.querySelector(`label[for="${id}"]`).textContent.replace(" *", ""));
    el.resumenErrores.textContent = "Corrige estos campos: " + nombres.join(", ") + ".";
    el.resumenErrores.hidden = false;
    document.getElementById(invalidos[0]).focus();
    mostrarToast("El formulario tiene errores", "error");
    return;
  }

  const receta = {
    id: ChefStorage.generarId(),
    nombre: el.nombre.value.trim(),
    categoria: el.categoria.value,
    ingredientes: ChefValidar.aLineas(el.ingredientes.value),
    tiempo: Number(el.tiempo.value),
    dificultad: el.dificultad.value,
    imagen: "assets/imagenes/receta-propia.svg",
    descripcion: el.descripcion.value.trim(),
    estado: "Mi receta",
    pasos: ChefValidar.aLineas(el.pasos.value),
  };

  if (!ChefStorage.agregarRecetaUsuario(receta)) {
    mostrarToast("No se pudo guardar (almacenamiento lleno o bloqueado)", "error");
    return;
  }

  todasLasRecetas.push(receta);
  limpiarFormulario();
  mostrarToast(`Receta «${receta.nombre}» guardada correctamente`, "exito");
  renderizarTodo();
}

/* ---------- Tarjetas ---------- */
function listasDetalle(r) {
  const ing = r.ingredientes.map((i) => `<li>${escaparHTML(i)}</li>`).join("");
  const pasos = (r.pasos || []).map((p) => `<li>${escaparHTML(p)}</li>`).join("");
  return `
    <details class="detalle">
      <summary>Ver ingredientes y pasos</summary>
      <h4>Ingredientes</h4><ul class="lista">${ing}</ul>
      <h4>Preparación</h4><ol class="lista">${pasos || "<li>Sin pasos registrados.</li>"}</ol>
    </details>`;
}

// tipo: "favorito" (receta guardada) | "propia" (creada por el usuario)
function crearTarjetaGestion(r, tipo) {
  const articulo = document.createElement("article");
  articulo.className = "tarjeta";
  articulo.dataset.id = r.id;

  let botones = "";
  if (tipo === "favorito") {
    const probada = ChefStorage.esProbada(r.id);
    botones = `
      <button type="button" class="btn btn--secundario ${probada ? "activo-ok" : ""}"
              data-accion="probada" aria-pressed="${probada}">
        ${probada ? "✔ Ya la probé" : "Marcar como probada"}
      </button>
      <button type="button" class="btn btn--peligro" data-accion="quitar-favorito">Quitar de favoritos</button>`;
  } else {
    const esFav = ChefStorage.esFavorito(r.id);
    botones = `
      <button type="button" class="btn btn--fav ${esFav ? "activo" : ""}" data-accion="favorito"
              aria-pressed="${esFav}">${esFav ? "♥ En favoritos" : "♡ Guardar favorito"}</button>
      <button type="button" class="btn btn--peligro" data-accion="eliminar-receta">Eliminar receta</button>`;
  }

  const insigniaProbada = tipo === "favorito" && ChefStorage.esProbada(r.id)
    ? '<span class="etiqueta etiqueta--ok">Probada</span>' : "";

  articulo.innerHTML = `
    <img src="${escaparHTML(r.imagen)}" alt="Imagen de ${escaparHTML(r.nombre)}" loading="lazy">
    <div class="tarjeta__cuerpo">
      <div class="etiquetas"><span class="etiqueta">${escaparHTML(r.categoria)}</span>${insigniaProbada}</div>
      <h3>${escaparHTML(r.nombre)}</h3>
      <p>${escaparHTML(r.descripcion)}</p>
      <p class="tarjeta__meta">⏱ ${r.tiempo} min · ${escaparHTML(r.dificultad)}</p>
      ${listasDetalle(r)}
      <div class="tarjeta__acciones">${botones}</div>
    </div>`;
  return articulo;
}

/* ---------- Renderizado ---------- */
function renderizarTodo() {
  const idsFav = ChefStorage.obtenerFavoritos();
  const favoritas = todasLasRecetas.filter((r) => idsFav.includes(r.id));
  const propias = ChefStorage.obtenerRecetasUsuario();

  el.listaFavoritos.innerHTML = "";
  if (favoritas.length === 0) {
    el.listaFavoritos.innerHTML =
      '<p class="mensaje mensaje--vacio">Aún no tienes favoritos. ' +
      '<a href="recetas.html">Explora el catálogo</a> y guarda las que te gusten.</p>';
  } else {
    favoritas.forEach((r) => el.listaFavoritos.appendChild(crearTarjetaGestion(r, "favorito")));
  }

  el.listaPropias.innerHTML = "";
  if (propias.length === 0) {
    el.listaPropias.innerHTML =
      '<p class="mensaje mensaje--vacio">Todavía no has agregado recetas. Usa el formulario para crear la primera.</p>';
  } else {
    propias.forEach((r) => el.listaPropias.appendChild(crearTarjetaGestion(r, "propia")));
  }

  // Procesamiento de datos: conteos y promedio
  const probadas = favoritas.filter((r) => ChefStorage.esProbada(r.id)).length;
  el.statFavoritos.textContent = favoritas.length;
  el.statPropias.textContent = propias.length;
  el.statProbadas.textContent = probadas;
  el.statPromedio.textContent = favoritas.length ? ChefFiltros.tiempoPromedio(favoritas) + " min" : "–";

  // Los botones de limpieza se desactivan si no hay nada que limpiar
  el.btnVaciarFavoritos.disabled = favoritas.length === 0;
  el.btnBorrarPropias.disabled = propias.length === 0;

  actualizarContadorFavoritos();
}

/* ---------- Confirmación (reemplaza a confirm() del navegador) ---------- */
function confirmar(titulo, mensaje) {
  return new Promise((resolver) => {
    el.confTitulo.textContent = titulo;
    el.confMensaje.textContent = mensaje;
    el.confirmar.returnValue = "";
    // "close" se dispara con los botones y también con Esc (en ese caso returnValue queda vacío)
    el.confirmar.addEventListener("close", () => resolver(el.confirmar.returnValue === "si"), { once: true });
    el.confirmar.showModal();
  });
}

/* ---------- Acciones sobre tarjetas (delegación de eventos) ---------- */
async function manejarAccion(evento) {
  const boton = evento.target.closest("[data-accion]");
  const tarjeta = evento.target.closest(".tarjeta");
  if (!boton || !tarjeta) return;

  const id = Number(tarjeta.dataset.id);
  const receta = todasLasRecetas.find((r) => r.id === id);
  const accion = boton.dataset.accion;

  if (accion === "probada") {
    const ahora = ChefStorage.alternarProbada(id);   // ACTUALIZAR dato guardado
    mostrarToast(ahora ? "Marcada como probada" : "Marcada como pendiente", ahora ? "exito" : "aviso");
  } else if (accion === "quitar-favorito") {
    ChefStorage.eliminarFavorito(id);                 // ELIMINAR dato específico
    mostrarToast(`«${receta.nombre}» quitada de favoritos`, "aviso");
  } else if (accion === "favorito") {
    const ahora = ChefStorage.alternarFavorito(id);
    mostrarToast(ahora ? "Receta guardada en favoritos" : "Receta quitada de favoritos", ahora ? "exito" : "aviso");
  } else if (accion === "eliminar-receta") {
    const si = await confirmar("¿Eliminar receta?", `Se borrará «${receta.nombre}» de forma permanente.`);
    if (!si) return;
    ChefStorage.eliminarRecetaUsuario(id);
    todasLasRecetas = todasLasRecetas.filter((r) => r.id !== id);
    mostrarToast("Receta eliminada", "aviso");
  }
  renderizarTodo();
}

async function vaciarFavoritos() {
  const si = await confirmar("¿Vaciar favoritos?", "Se quitarán todas las recetas de tu lista de favoritos.");
  if (!si) return;
  ChefStorage.limpiarFavoritos();
  mostrarToast("Favoritos vaciados", "aviso");
  renderizarTodo();
}

async function borrarMisRecetas() {
  const si = await confirmar("¿Borrar todas tus recetas?", "Se eliminarán todas las recetas que agregaste. Esta acción no se puede deshacer.");
  if (!si) return;
  ChefStorage.limpiarRecetasUsuario();
  todasLasRecetas = todasLasRecetas.filter((r) => r.id < 1000); // quedan solo las del JSON
  mostrarToast("Tus recetas fueron eliminadas", "aviso");
  renderizarTodo();
}

/* ---------- Arranque ---------- */
async function iniciarGestion() {
  const porId = (id) => document.getElementById(id);
  el = {
    formulario: porId("formulario-receta"), resumenErrores: porId("resumen-errores"),
    nombre: porId("nombre"), categoria: porId("categoria"), dificultad: porId("dificultad"),
    tiempo: porId("tiempo"), descripcion: porId("descripcion"), contador: porId("contador"),
    ingredientes: porId("ingredientes"), pasos: porId("pasos"),
    btnLimpiarForm: porId("btn-limpiar-form"),
    listaFavoritos: porId("lista-favoritos"), listaPropias: porId("lista-propias"),
    btnVaciarFavoritos: porId("btn-vaciar-favoritos"), btnBorrarPropias: porId("btn-borrar-propias"),
    statFavoritos: porId("stat-favoritos"), statPropias: porId("stat-propias"),
    statProbadas: porId("stat-probadas"), statPromedio: porId("stat-promedio"),
    confirmar: porId("modal-confirmar"), confTitulo: porId("confirmar-titulo"), confMensaje: porId("confirmar-mensaje"),
  };

  try {
    todasLasRecetas = await cargarRecetas();
  } catch (error) {
    console.error(error);
    el.listaFavoritos.innerHTML =
      '<p class="mensaje mensaje--error">No se pudieron cargar las recetas. Usa Live Server o GitHub Pages.</p>';
    return;
  }

  // Categorías del formulario: salen del JSON, no están escritas a mano
  ChefFiltros.obtenerCategorias(todasLasRecetas).forEach((cat) => {
    const op = document.createElement("option");
    op.value = cat; op.textContent = cat;
    el.categoria.appendChild(op);
  });

  // Validación en tiempo real: input (texto) y change (selects); blur marca campos vacíos al salir
  Object.keys(reglasCampos()).forEach((id) => {
    const campo = document.getElementById(id);
    campo.addEventListener(campo.tagName === "SELECT" ? "change" : "input", () => validarCampo(id));
    campo.addEventListener("blur", () => validarCampo(id));
  });
  el.descripcion.addEventListener("input", actualizarContador);

  el.formulario.addEventListener("submit", manejarEnvio);
  el.btnLimpiarForm.addEventListener("click", () => { limpiarFormulario(); mostrarToast("Formulario limpiado", "aviso"); });
  el.listaFavoritos.addEventListener("click", manejarAccion);
  el.listaPropias.addEventListener("click", manejarAccion);
  el.btnVaciarFavoritos.addEventListener("click", vaciarFavoritos);
  el.btnBorrarPropias.addEventListener("click", borrarMisRecetas);

  actualizarContador();
  renderizarTodo();
}

if (typeof document !== "undefined") iniciarGestion();
if (typeof module !== "undefined") module.exports = ChefValidar;
