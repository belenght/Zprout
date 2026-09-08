Funcionalidades del front a dia 8/9/26
Rutas activas (navegables)
Ruta	Qué hace	Conectado a backend

/login	Formulario de usuario/contraseña, Tailwind.	
Sí, pero /usuario/login no existe todavía en backend → siempre va a fallar

/dashboard	Tarjetas de métricas + tabla de últimos lotes + feed de actividad.	
No — todo con signal([]) vacío, es solo maqueta visual

/lotes	Listado de lotes (tabla Material) con filtros rápidos por estado y buscador de texto	
Sí — GET /lote (con params estado/q que asumí, hay que confirmar que el backend los soporte)

/lotes/nuevo	Formulario completo de ingreso: toggle Propio/Externo, campos condicionales, selects de campo/almacén/semilla/proveedor, carga de archivo PDF/JPG si es externo, banner de aviso de la regla de negocio	
Sí — POST /lote (multipart si es externo con archivo)

/calidad/nuevo	Selecciona un lote, carga humedad/PG/pureza, valida en vivo contra los rangos del TipoSemilla de ese lote, y si está fuera de rango muestra la tarjeta de alerta con "Corregir datos" / "Confirmar No Apto"	
Sí — POST /control_calidad, y si se confirma "No Apto" también POST /estado

/tipo-semilla	Listado + alta + edición completos (CRUD real)	
Sí — GET/POST/PUT/DELETE /tipo_semilla

Piezas reutilizables (no son pantallas, pero las usa todo lo de arriba)
Sidebar + header (Tailwind), con los dos grupos de menú (operación / catálogos)
Notificaciones (snackbar de éxito/error) centralizadas
Diálogo de confirmación reutilizable (lo usa el botón eliminar de tipo-semilla)
Interceptor de errores HTTP (muestra el snackbar solo, sin que cada pantalla tenga que manejarlo)
Validador de rangos de calidad (range.validator.ts), reutilizable para cualquier form futuro que compare contra TipoSemilla
Lo que existe "a medias" (modelo + service, sin pantalla todavía)

almacen, campo, campana, proveedor, insumo, rol, usuario, estimacion-venta, limpieza-clasificacion, partida, pedido, pedido-detalle, estado — tienen el model.ts y el service.ts listos, pero no tienen list/form ni ruta activa. Se navegan copiando el patrón de tipo-semilla.