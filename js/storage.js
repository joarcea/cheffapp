/* =====================================================
   storage.js — Capa de acceso a localStorage
   Todas las páginas leen/escriben datos SOLO desde aquí.
   Así, si cambia la forma de guardar, se modifica un solo archivo.
   ===================================================== */

const ChefStorage = (() => {
  // Claves con prefijo para no chocar con otros sitios en el mismo dominio
  const CLAVE_FAVORITOS = "chefapp_favoritos";
  const CLAVE_USUARIO = "chefapp_recetas_usuario";
  const CLAVE_PROBADAS = "chefapp_probadas";

  // Lee y convierte JSON de forma segura (si está corrupto, devuelve el valor por defecto)
  function leer(clave, porDefecto) {
    try {
      const crudo = localStorage.getItem(clave);
      return crudo ? JSON.parse(crudo) : porDefecto;
    } catch (error) {
      console.error("Error leyendo localStorage:", error);
      return porDefecto;
    }
  }

  // Guarda un valor convertido a texto JSON
  function guardar(clave, valor) {
    try {
      localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch (error) {
      console.error("Error guardando en localStorage:", error);
      return false;
    }
  }

  /* ---------- FAVORITOS (arreglo de ids) ---------- */
  function obtenerFavoritos() {
    return leer(CLAVE_FAVORITOS, []);
  }

  function esFavorito(id) {
    return obtenerFavoritos().includes(id);
  }

  // Agrega o quita el favorito. Devuelve true si quedó como favorito.
  function alternarFavorito(id) {
    const favoritos = obtenerFavoritos();
    const posicion = favoritos.indexOf(id);
    if (posicion === -1) {
      favoritos.push(id);
    } else {
      favoritos.splice(posicion, 1);
    }
    guardar(CLAVE_FAVORITOS, favoritos);
    return posicion === -1;
  }

  function eliminarFavorito(id) {
    guardar(CLAVE_FAVORITOS, obtenerFavoritos().filter((favId) => favId !== id));
  }

  function limpiarFavoritos() {
    guardar(CLAVE_FAVORITOS, []);
  }

  /* ---------- RECETAS DEL USUARIO (arreglo de objetos) ---------- */
  function obtenerRecetasUsuario() {
    return leer(CLAVE_USUARIO, []);
  }

  function agregarRecetaUsuario(receta) {
    const lista = obtenerRecetasUsuario();
    lista.push(receta);
    return guardar(CLAVE_USUARIO, lista);
  }

  function eliminarRecetaUsuario(id) {
    guardar(CLAVE_USUARIO, obtenerRecetasUsuario().filter((r) => r.id !== id));
    eliminarFavorito(id); // si estaba en favoritos, también se quita
    guardar(CLAVE_PROBADAS, obtenerProbadas().filter((p) => p !== id));
  }

  function limpiarRecetasUsuario() {
    const ids = obtenerRecetasUsuario().map((r) => r.id);
    guardar(CLAVE_USUARIO, []);
    // No deben quedar favoritos ni marcas apuntando a recetas que ya no existen
    guardar(CLAVE_FAVORITOS, obtenerFavoritos().filter((f) => !ids.includes(f)));
    guardar(CLAVE_PROBADAS, obtenerProbadas().filter((p) => !ids.includes(p)));
  }

  /* ---------- ESTADO "PROBADA" (actualizar información guardada) ---------- */
  function obtenerProbadas() {
    return leer(CLAVE_PROBADAS, []);
  }

  function esProbada(id) {
    return obtenerProbadas().includes(id);
  }

  // Cambia el estado de la receta entre "pendiente" y "probada". Devuelve el nuevo estado.
  function alternarProbada(id) {
    const probadas = obtenerProbadas();
    const posicion = probadas.indexOf(id);
    if (posicion === -1) probadas.push(id); else probadas.splice(posicion, 1);
    guardar(CLAVE_PROBADAS, probadas);
    return posicion === -1;
  }

  // Genera un id único para recetas nuevas (el JSON usa 1..12; las del usuario empiezan en 1000)
  function generarId() {
    const ids = obtenerRecetasUsuario().map((r) => r.id);
    return ids.length ? Math.max(...ids) + 1 : 1000;
  }

  return {
    obtenerFavoritos, esFavorito, alternarFavorito, eliminarFavorito, limpiarFavoritos,
    obtenerRecetasUsuario, agregarRecetaUsuario, eliminarRecetaUsuario, limpiarRecetasUsuario, generarId,
    obtenerProbadas, esProbada, alternarProbada,
  };
})();
