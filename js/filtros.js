/* =====================================================
   filtros.js — Lógica PURA de búsqueda y filtrado
   No toca el DOM: recibe datos y devuelve datos.
   Por eso es fácil de probar y de explicar en la defensa.
   ===================================================== */

const ChefFiltros = (() => {

  // Quita tildes y pasa a minúsculas: "Ensalada César" coincide con "cesar"
  function normalizar(texto) {
    return String(texto)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
  }

  // ¿El tiempo de la receta cae en el rango elegido?
  function coincideTiempo(minutos, rango) {
    switch (rango) {
      case "rapido": return minutos <= 15;
      case "medio":  return minutos > 15 && minutos <= 30;
      case "largo":  return minutos > 30;
      default:       return true; // "todos"
    }
  }

  // Devuelve la lista de categorías únicas, ordenadas alfabéticamente
  function obtenerCategorias(recetas) {
    return [...new Set(recetas.map((r) => r.categoria))].sort((a, b) => a.localeCompare(b, "es"));
  }

  /* Aplica búsqueda + los 3 filtros AL MISMO TIEMPO.
     filtros = { texto, categoria, dificultad, tiempo }
     Una receta se muestra solo si cumple TODAS las condiciones (AND). */
  function filtrarRecetas(recetas, filtros) {
    const texto = normalizar(filtros.texto || "");
    return recetas.filter((r) => {
      const coincideTexto =
        texto === "" ||
        normalizar(r.nombre).includes(texto) ||
        r.ingredientes.some((ing) => normalizar(ing).includes(texto)); // también busca por ingrediente
      const coincideCategoria = !filtros.categoria || r.categoria === filtros.categoria;
      const coincideDificultad = !filtros.dificultad || r.dificultad === filtros.dificultad;
      return coincideTexto && coincideCategoria && coincideDificultad &&
             coincideTiempo(r.tiempo, filtros.tiempo);
    });
  }

  // Resumen calculado: promedio de tiempo de una lista de recetas
  function tiempoPromedio(recetas) {
    if (recetas.length === 0) return 0;
    const total = recetas.reduce((suma, r) => suma + r.tiempo, 0);
    return Math.round(total / recetas.length);
  }

  return { normalizar, obtenerCategorias, filtrarRecetas, tiempoPromedio };
})();

// Permite probar con Node sin afectar al navegador
if (typeof module !== "undefined") module.exports = ChefFiltros;
