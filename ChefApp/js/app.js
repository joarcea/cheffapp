/* =====================================================
   app.js — Código compartido por TODAS las páginas
   + lógica de la página de inicio (index.html)
   Requiere cargar antes: storage.js
   ===================================================== */

/* ---------- 1. UTILIDADES COMPARTIDAS ---------- */

// Carga recetas del JSON y les suma las creadas por el usuario
async function cargarRecetas() {
  const respuesta = await fetch("data/recetas.json");
  if (!respuesta.ok) {
    throw new Error("No se pudo cargar recetas.json (código " + respuesta.status + ")");
  }
  const base = await respuesta.json();
  return base.concat(ChefStorage.obtenerRecetasUsuario());
}

// Evita que texto escrito por el usuario inyecte HTML (seguridad básica XSS)
function escaparHTML(texto) {
  const div = document.createElement("div");
  div.textContent = String(texto);
  return div.innerHTML;
}

// Mensaje flotante (toast) para retroalimentación visual. tipo: exito | error | aviso
function mostrarToast(mensaje, tipo = "exito") {
  let contenedor = document.getElementById("toast-contenedor");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "toast-contenedor";
    contenedor.setAttribute("aria-live", "polite"); // lectores de pantalla anuncian el mensaje
    document.body.appendChild(contenedor);
  }
  const toast = document.createElement("div");
  toast.className = "toast toast--" + tipo;
  toast.textContent = mensaje;
  contenedor.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Crea la tarjeta HTML de una receta (la reutilizan inicio, recetas y favoritos)
function crearTarjetaReceta(receta) {
  const articulo = document.createElement("article");
  articulo.className = "tarjeta";
  articulo.dataset.id = receta.id;
  const esFav = ChefStorage.esFavorito(receta.id);
  articulo.innerHTML = `
    <img src="${escaparHTML(receta.imagen)}" alt="Imagen de ${escaparHTML(receta.nombre)}" loading="lazy">
    <div class="tarjeta__cuerpo">
      <span class="etiqueta">${escaparHTML(receta.categoria)}</span>
      <h3>${escaparHTML(receta.nombre)}</h3>
      <p>${escaparHTML(receta.descripcion)}</p>
      <p class="tarjeta__meta">⏱ ${receta.tiempo} min · ${escaparHTML(receta.dificultad)}</p>
      <button type="button" class="btn btn--fav ${esFav ? "activo" : ""}"
              data-accion="favorito" aria-pressed="${esFav}">
        ${esFav ? "♥ En favoritos" : "♡ Guardar favorito"}
      </button>
    </div>`;
  return articulo;
}

/* ---------- 2. NAVEGACIÓN (menú móvil + página activa) ---------- */
function iniciarNavegacion() {
  const boton = document.getElementById("menu-boton");
  const menu = document.getElementById("menu-principal");
  if (boton && menu) {
    boton.addEventListener("click", () => {
      const abierto = menu.classList.toggle("abierto");
      boton.setAttribute("aria-expanded", abierto);
    });
  }
  // Marca el enlace de la página actual (también se hace en HTML con aria-current)
  const actual = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("#menu-principal a").forEach((enlace) => {
    if (enlace.getAttribute("href") === actual) {
      enlace.classList.add("activo");
      enlace.setAttribute("aria-current", "page");
    }
  });
}

// Muestra la cantidad de favoritos en el menú
function actualizarContadorFavoritos() {
  const insignia = document.getElementById("contador-favoritos");
  if (insignia) insignia.textContent = ChefStorage.obtenerFavoritos().length;
}

/* ---------- 3. PÁGINA DE INICIO ---------- */
async function iniciarInicio() {
  const contenedor = document.getElementById("destacadas");
  const botonAzar = document.getElementById("btn-azar");
  const resultadoAzar = document.getElementById("resultado-azar");
  if (!contenedor) return; // No estamos en index.html

  try {
    const recetas = await cargarRecetas();

    // Procesamiento: estadísticas calculadas con JavaScript
    document.getElementById("stat-total").textContent = recetas.length;
    document.getElementById("stat-categorias").textContent =
      new Set(recetas.map((r) => r.categoria)).size;
    const rapidas = recetas.filter((r) => r.tiempo <= 20).length;
    document.getElementById("stat-rapidas").textContent = rapidas;

    // Destacadas: las recetas con estado "Popular"
    const destacadas = recetas.filter((r) => r.estado === "Popular").slice(0, 4);
    contenedor.innerHTML = "";
    destacadas.forEach((r) => contenedor.appendChild(crearTarjetaReceta(r)));

    // Evento delegado: un solo listener para todos los botones de favorito
    contenedor.addEventListener("click", (e) => {
      const boton = e.target.closest('[data-accion="favorito"]');
      if (!boton) return;
      const id = Number(boton.closest(".tarjeta").dataset.id);
      const ahoraEsFav = ChefStorage.alternarFavorito(id);
      boton.classList.toggle("activo", ahoraEsFav);
      boton.setAttribute("aria-pressed", ahoraEsFav);
      boton.textContent = ahoraEsFav ? "♥ En favoritos" : "♡ Guardar favorito";
      mostrarToast(ahoraEsFav ? "Receta guardada en favoritos" : "Receta quitada de favoritos",
                   ahoraEsFav ? "exito" : "aviso");
      actualizarContadorFavoritos();
    });

    // Interacción inmediata: "¿Qué cocino hoy?"
    botonAzar.addEventListener("click", () => {
      const r = recetas[Math.floor(Math.random() * recetas.length)];
      resultadoAzar.innerHTML = `
        <p>Hoy te sugerimos: <strong>${escaparHTML(r.nombre)}</strong>
        (${r.tiempo} min, ${escaparHTML(r.dificultad)}).</p>
        <a class="btn btn--secundario" href="recetas.html">Ver en el catálogo</a>`;
    });
  } catch (error) {
    console.error(error);
    contenedor.innerHTML =
      '<p class="mensaje mensaje--error">No pudimos cargar las recetas. ' +
      "Si abriste el archivo con doble clic, usa un servidor local (ver instrucciones).</p>";
  }
}

/* ---------- 4. ARRANQUE ---------- */
document.addEventListener("DOMContentLoaded", () => {
  iniciarNavegacion();
  actualizarContadorFavoritos();
  iniciarInicio();
});
