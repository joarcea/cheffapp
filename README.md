# ChefApp

Plataforma web para consultar, filtrar y guardar recetas de cocina.
Proyecto del curso **ISW-521 Programación en Ambiente Web I**, Universidad Técnica Nacional (UTN).

**Autor:** Eduardo Arce · **Docente:** José Alberto Herrera Alfaro

## Problema
Buscar recetas en muchos sitios con publicidad excesiva y sin filtros simples hace perder tiempo,
sobre todo a estudiantes y personas con poco tiempo disponible.

## Solución
ChefApp reúne 40 recetas de 17 cocinas del mundo en un catálogo con búsqueda instantánea y filtros
(categoría, cocina, dificultad y tiempo). Además, el usuario marca los ingredientes que tiene en casa y
la app muestra qué puede cocinar y qué le falta. Permite guardar favoritos y registrar recetas propias.
Todo se conserva en el navegador (localStorage).

## Páginas
| Página | Función |
|---|---|
| `index.html` | Inicio: problema, público, solución, estadísticas, explorar por cocina, populares (desde JSON) y "Sorpréndeme" |
| `recetas.html` | Solución interactiva: búsqueda en tiempo real, filtros combinados, "¿Qué tienes en casa?", detalle y favoritos |
| `favoritos.html` | Registro o gestión: formulario validado, favoritos, estado "probada", eliminar y limpiar |

## Tecnologías
HTML5 semántico, CSS3 (Flexbox y Grid), JavaScript vanilla, JSON y localStorage. Sin frameworks.

## Estructura
```
ChefApp/
├── index.html · recetas.html · favoritos.html
├── css/styles.css
├── js/  app.js · recetas.js · favoritos.js · storage.js · filtros.js
├── data/recetas.json
└── assets/imagenes/
```

## Ejecutar localmente
`fetch` no funciona abriendo el HTML con doble clic. Usa un servidor local:
- VS Code: extensión **Live Server** → clic derecho en `index.html` → *Open with Live Server*
- o, dentro de la carpeta: `python -m http.server 8000` y abre http://localhost:8000
