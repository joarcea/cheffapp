/* =====================================================
   filtros.js — Lógica PURA de búsqueda, filtrado y despensa
   No toca el DOM: recibe datos y devuelve datos.
   Por eso es fácil de probar y de explicar en la defensa.
   ===================================================== */

const ChefFiltros = (() => {

  // Ingredientes que damos por hecho que todos tienen: no cuentan como "faltantes"
  const BASICOS = ["sal", "pimienta", "agua", "aceite", "hielo"];

  // Quita tildes y pasa a minúsculas: "Ensalada César" coincide con "cesar"
  function normalizar(texto) {
    return String(texto)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
  }

  // Forma "comparable" de un ingrediente: sin tildes, minúsculas y sin la "s" final.
  // Así "huevo" y "huevos" cuentan como el mismo ingrediente.
  function comparable(clave) {
    const n = normalizar(clave);
    return n.length > 3 ? n.replace(/s$/, "") : n;
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

  // Lista de valores únicos y ordenados de una propiedad (categoría, cocina…)
  function valoresUnicos(recetas, propiedad) {
    return [...new Set(recetas.map((r) => r[propiedad]))].sort((a, b) => a.localeCompare(b, "es"));
  }
  const obtenerCategorias = (recetas) => valoresUnicos(recetas, "categoria");
  const obtenerCocinas = (recetas) => valoresUnicos(recetas, "cocina");

  /* Aplica búsqueda + filtros AL MISMO TIEMPO.
     filtros = { texto, categoria, cocina, dificultad, tiempo }
     Una receta se muestra solo si cumple TODAS las condiciones (AND). */
  function filtrarRecetas(recetas, filtros) {
    const texto = normalizar(filtros.texto || "");
    return recetas.filter((r) => {
      const coincideTexto =
        texto === "" ||
        normalizar(r.nombre).includes(texto) ||
        normalizar(r.cocina).includes(texto) ||
        r.ingredientes.some((ing) => normalizar(ing).includes(texto)); // también busca por ingrediente
      const coincideCategoria = !filtros.categoria || r.categoria === filtros.categoria;
      const coincideCocina = !filtros.cocina || r.cocina === filtros.cocina;
      const coincideDificultad = !filtros.dificultad || r.dificultad === filtros.dificultad;
      return coincideTexto && coincideCategoria && coincideCocina && coincideDificultad &&
             coincideTiempo(r.tiempo, filtros.tiempo);
    });
  }

  // Resumen calculado: promedio de tiempo de una lista de recetas
  function tiempoPromedio(recetas) {
    if (recetas.length === 0) return 0;
    const total = recetas.reduce((suma, r) => suma + r.tiempo, 0);
    return Math.round(total / recetas.length);
  }

  /* ---------- DESPENSA: "recetas con lo que tengo" ---------- */

  // Lista todos los ingredientes clave de las recetas, contando en cuántas aparece cada uno.
  // Devuelve [{ clave, usos }], los más usados primero.
  function obtenerIngredientes(recetas) {
    const mapa = new Map(); // comparable -> { clave, usos }
    recetas.forEach((r) => {
      (r.ingredientesClave || []).forEach((clave) => {
        const id = comparable(clave);
        if (mapa.has(id)) mapa.get(id).usos++;
        else mapa.set(id, { clave, usos: 1 });
      });
    });
    return [...mapa.values()].sort((a, b) => b.usos - a.usos || a.clave.localeCompare(b.clave, "es"));
  }

  // Compara UNA receta con lo que el usuario tiene. despensaSet = Set de claves "comparable".
  function analizarReceta(receta, despensaSet) {
    const claves = receta.ingredientesClave || [];
    // Recetas con claves deducidas (clavesAprox) usan comparación flexible por palabras:
    // "pechuga de pollo" cuenta como "pollo". Las claves escritas a mano se comparan exactas.
    const loTiene = (clave) => {
      const c = comparable(clave);
      if (despensaSet.has(c)) return true;
      return receta.clavesAprox === true &&
        [...despensaSet].some((p) => (" " + c + " ").includes(" " + p + " "));
    };
    const faltantes = claves.filter((c) => !loTiene(c));
    return { total: claves.length, tiene: claves.length - faltantes.length, faltantes };
  }

  /* Filtra y ORDENA recetas según la despensa.
     maxFaltan = cuántos ingredientes pueden faltar (0 = puedo cocinarla ya; Infinity = cualquiera).
     Devuelve [{ receta, info:{ total, tiene, faltantes } }], las más cocinables primero. */
  function aplicarDespensa(recetas, despensa, maxFaltan) {
    const set = new Set(despensa.map(comparable));
    return recetas
      .map((receta) => ({ receta, info: analizarReceta(receta, set) }))
      .filter(({ info }) => info.total > 0 && info.tiene > 0 && info.faltantes.length <= maxFaltan)
      .sort((a, b) =>
        a.info.faltantes.length - b.info.faltantes.length ||          // menos faltantes primero
        b.info.tiene / b.info.total - a.info.tiene / a.info.total ||  // mayor % de coincidencia
        a.receta.tiempo - b.receta.tiempo ||                          // más rápidas primero
        a.receta.nombre.localeCompare(b.receta.nombre, "es"));
  }

  /* Para recetas que escribe el usuario (sin ingredientesClave): intenta deducir los ingredientes
     quitando cantidades, unidades y adjetivos. Es una aproximación, no es perfecta.
     Ej: "2 tazas de arroz cocido" -> "arroz" */
  const UNIDADES = "tazas?|cdas?|cditas?|cucharadas?|cucharaditas?|kg|g|gramos?|ml|l|litros?|lb|libras?|oz|onzas?|" +
                   "pizcas?|dientes?|rebanadas?|lonjas?|latas?|ramas?|hojas?|sobres?|paquetes?|trozos?|piezas?|" +
                   "unidades?|manojos?|bolas?|mazorcas?";
  const ADJETIVOS = "picad|rallad|cocid|cortad|derretid|batid|fresc|madur|pelad|triturad|tiern";

  function derivarClaves(lineas) {
    const claves = [];
    lineas.forEach((linea) => {
      let t = String(linea).toLowerCase();
      if (t.includes("opcional")) return;                       // lo opcional no cuenta
      t = t.replace(/\(.*?\)/g, "").replace(/\bal gusto\b/g, "");
      t = t.split(",")[0];                                      // descarta lo que va tras una coma
      t = t.replace(/^el jugo de\s+[\d/\s]*/, "");              // "el jugo de 1 limón" -> "limón"
      t = t.replace(/^[\d\s/.½¼¾-]+/, "");                      // cantidad inicial
      t = t.replace(new RegExp("^(" + UNIDADES + ")(?![a-záéíóúñ])\\s*"), ""); // unidad
      t = t.replace(/^(de|del|el|la|los|las|un|una)\s+/, "");   // artículos
      t = t.replace(new RegExp("(\\s+(" + ADJETIVOS + ")[oa]s?)+$"), "");      // adjetivos finales
      t = t.trim();
      if (t.length < 2 || BASICOS.includes(t.split(" ")[0])) return; // vacío o básico (sal, agua…)
      if (!claves.some((c) => comparable(c) === comparable(t))) claves.push(t);
    });
    return claves;
  }

  return {
    BASICOS, normalizar, comparable, obtenerCategorias, obtenerCocinas, filtrarRecetas, tiempoPromedio,
    obtenerIngredientes, analizarReceta, aplicarDespensa, derivarClaves,
  };
})();

// Permite probar con Node sin afectar al navegador
if (typeof module !== "undefined") module.exports = ChefFiltros;
