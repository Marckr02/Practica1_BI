# Práctica 1 – Proceso ETL con Pentaho Data Integration

**Asignatura:** Business Intelligence – Escuela Politécnica Nacional (Facultad de Ingeniería de Sistemas)
**Herramienta:** Pentaho Data Integration (PDI / Spoon) 10.2 · JDK 18
**Integrantes:** _Marco Rios, Dilan Real, Javier Guallicho,Axel Manotoa _

---

## 1. Objetivo del proceso

Diseñar y ejecutar un proceso ETL con Pentaho Data Integration que:

1. **Extraiga** datos de dos fuentes de tipos distintos (Excel y CSV).
2. **Limpie y estandarice** nombres, fechas, importes y categorías.
3. **Valide** los datos y separe las filas que no cumplen las reglas, dejando registro del motivo.
4. **Genere una salida** con los datos procesados, lista para cargarse en un Data Warehouse.

---

## 2. Fuentes de datos utilizadas

| # | Archivo | Tipo | Filas | Descripción | Paso de PDI |
|---|---|---|---|---|---|
| 1 | `data/ventas_zapatillas_TODAS_COMBINADAS.xlsx` | Excel | 800 | Ventas de zapatillas. Combina 4 lotes de 200 filas (columna `archivo_origen`) | Microsoft Excel input |
| 2 | `data/registro_mascotas_veterinaria.csv` | CSV | 117 | Formulario de registro de mascotas de una veterinaria. Datos **simulados** con errores intencionales | CSV file input |

**Columnas de ventas:** `id_venta, fecha, cliente, producto, precio_unitario, cantidad, total_venta, ciudad, genero, metodo_pago, archivo_origen`

**Columnas de veterinaria:** `id_registro, fecha_registro, nombre_dueno, email, telefono, ciudad, nombre_mascota, especie, raza, sexo, fecha_nacimiento, edad, peso, vacunado, motivo_consulta`

Los archivos originales se conservan sin modificar en `data/` como evidencia de la fuente.

---

## 3. Problemas encontrados en los datos

### 3.1 Ventas de zapatillas (Excel, 800 filas)

| Columna | Problema | Filas afectadas |
|---|---|---|
| `cliente` | Mayúsculas y minúsculas mezcladas (225 todo en mayúsculas, 198 todo en minúsculas) y tildes | 423 |
| `cliente` | Valores vacíos | 186 |
| `fecha` | 4 formatos: `yyyy/MM/dd` (215), `yyyy-MM-dd` (214), `dd/MM/yyyy` (203), `dd-MM-yyyy` (168). Todas son fechas calendario válidas, pero el rango (1970–2025) es inusual para ventas | 800 |
| `precio_unitario` | Sufijo `usd` (ej. `116.17usd`) | 242 |
| `precio_unitario` | Valores negativos | 290 |
| `total_venta` | Sufijo `usd` | 190 |
| `total_venta` | Valores negativos | 299 |
| `cantidad` | Texto en lugar de número (`uno`) | 193 |
| `cantidad` | Valores vacíos | 208 |
| `producto` | 6 variantes para 3 productos (`Air Max / air max`, `Ultra Boost / ultra boost`, `Super Star / SuperStar`) | 800 |
| `ciudad` | 6 variantes para 2 ciudades (`medellín / Medellin / MEDELLIN`, `bogota / Bogotá / BOGOTÁ`) | 800 |
| `genero` | `M / m / F / f`, un valor `X` (120) y vacíos (146) | — |
| `metodo_pago` | `efectivo / Efectivo`, `tarjeta / Tarjeta`, `Transferencia` y vacíos (118) | — |
| `total_venta` | No coincide con `precio_unitario × cantidad` (ver sección 6) | — |
| Filas | 200 filas idénticas (sin contar `archivo_origen`): los lotes `..._Uno.xlsx` y `..._Uno.csv` tienen el mismo contenido | 200 |
| `id_venta` | No es único entre lotes (cada lote reutiliza los mismos números), por eso no sirve como clave | — |

### 3.2 Registro de mascotas (CSV, 117 filas)

| Columna | Problema |
|---|---|
| `nombre_dueno`, `nombre_mascota` | Mayúsculas y minúsculas mezcladas, espacios al inicio, al final o dobles, y algunos con orden "Apellido Nombre" |
| `fecha_registro`, `fecha_nacimiento` | Formatos distintos (`yyyy-MM-dd`, `dd/MM/yyyy`, `dd-MM-yyyy`, `dd.MM.yy`, `MM/dd/yyyy`), fechas imposibles (`31/02/2023`, `00/00/0000`), texto (`ayer`, `fecha desconocida`), fechas futuras y vacíos |
| `email` | Sin `@`, dominio `.con`, todo en mayúsculas y vacíos |
| `telefono` | Con espacios, guiones, prefijo `+593`, incompletos y vacíos |
| `ciudad` | `Quito / quito / QUITO / Qito / UIO`, `Guayaquil / Guayaquill`, etc. |
| `especie` | `Perro / perro / PERRO / Canino / perrito`, `Gato / Felino / gatito`, `Ave / Pájaro`, `Hámster / hamster` |
| `raza` | Errores de tipeo (`Buldog`, `Mestiso`, `Golden Retreiver`), sin tilde, mayúsculas y vacíos |
| `sexo` | `M / m / Macho / Masculino`, `F / f / Hembra / Femenino`, `?`, `N/A` y vacíos |
| `edad` | `5 años`, `7 anios`, `82 meses`, `cinco`, números sin unidad, valores absurdos (`-2`, `150`) y vacíos |
| `peso` | `2.5Kg`, `13.2 kg`, coma decimal, gramos o libras, negativos, `n/d` y vacíos |
| `vacunado` | `Sí / Si / SI / Yes / 1 / 0 / Pendiente` y vacíos |
| Filas | 6 duplicados exactos y 3 casi duplicados (solo cambian mayúsculas y minúsculas) |

---

## 4. Transformaciones aplicadas

Toda la lógica de limpieza está en un paso **Modified Java Script Value** por cada fuente. Los scripts completos están en `scripts/`.

### 4.1 Las dos transformaciones solicitadas

**a) Corregir nombres y apellidos** (`cliente`, `nombre_dueno`, `nombre_mascota`)
- Elimina espacios al inicio y al final y colapsa los espacios dobles.
- Quita tildes y convierte a **MAYÚSCULAS** (ej. `Ángel Flórez Angulo` → `ANGEL FLOREZ ANGULO`).
- Los vacíos pasan a `ND` en ventas.

**b) Validar fechas** (`fecha`, `fecha_registro`, `fecha_nacimiento`)
- Reconoce `yyyy-MM-dd`, `yyyy/MM/dd`, `dd/MM/yyyy`, `dd-MM-yyyy` y `dd.MM.yy`.
- Rechaza días o meses inexistentes (considera años bisiestos), fechas futuras, texto y vacíos.
- En veterinaria, rechaza además una `fecha_nacimiento` posterior a la de registro.
- Las fechas válidas salen normalizadas como `yyyy-MM-dd`.
- Cuando el formato es ambiguo (`01/10/2026`) se asume **día/mes/año**. En el Excel de ventas se comprobó que ningún valor tiene el mes mayor a 12, lo que respalda ese criterio.

### 4.2 Otras transformaciones

| Dataset | Transformación | Detalle |
|---|---|---|
| Ventas | Eliminar duplicados | Paso *Unique rows (HashSet)* sobre todas las columnas excepto `archivo_origen` |
| Ventas | Importes | Quita `usd`; los negativos se interpretan como error de signo y se corrigen con valor absoluto |
| Ventas | Cantidad | `uno` → `1`; vacío o inválido → fila rechazada |
| Ventas | Total | Calcula `TOTAL_CALCULADO = precio × cantidad` y marca `TOTAL_CONSISTENTE` (`S` / `N`) |
| Ventas | Categorías | `producto`, `ciudad`, `genero` (`X` y vacío → `ND`) y `metodo_pago` unificados |
| Ventas | Trazabilidad | Columna `CORRECCIONES` con lo que se corrigió en cada fila |
| Veterinaria | Categorías | `especie`, `sexo` (`M` / `H` / `ND`), `vacunado` (`SI` / `NO` / `ND`), `ciudad`, `raza` (incluye corrección de typos) |
| Veterinaria | `peso` | Convierte a kg (quita `kg`, coma → punto, gramos y libras); inválido → nulo |
| Veterinaria | `edad` | Convierte a meses (`5 años`, `82 meses`, `cinco`); un número sin unidad se toma como años; inválido → nulo |
| Veterinaria | Motivo de consulta | Estandarizado en mayúsculas sin tildes |
| Ambos | Filas rechazadas | Se escriben en un archivo aparte con la columna `RECHAZO_MOTIVO` |

---

## 5. Flujo ETL desarrollado

Una sola transformación, `Transf_Practica_1.ktr`, con dos ramas independientes:

```
RAMA VETERINARIA
Entrada Veternaria CSV ─► Limpieza Veterinaria ─► Filtrar Fechas Validas Vet (FILA_VALIDA = S)
                                                        ├─ true  ─► Seleccionar Campos Vet ─► Salida Veterinaria Limpia  (output/veterinaria_limpia.csv)
                                                        └─ false ─► Salida Veterinaria Rechazados                         (output/veterinaria_rechazados.csv)

RAMA ZAPATILLAS
Entrada Zapatillas Excel ─► Eliminar Duplicados Zapatillas ─► Limpieza Zapatillas ─► Filtrar Filas Validas Zapatillas (FILA_VALIDA = S)
                                                        ├─ true  ─► Seleccionar Campos Zapatillas ─► Salida Zapatillas Limpia (output/ventas_limpio.csv)
                                                        └─ false ─► Salida Zapatillas Rechazados                             (output/ventas_rechazados.csv)
```

**Estructura del repositorio**

```
├── README.md
├── Transf_Practica_1.ktr
├── data/        (archivos originales)
├── output/      (resultados: limpios y rechazados)
├── scripts/     (limpieza_veterinaria.js, limpieza_zapatillas.js)
└── docs/capturas/
```

**Cómo reproducirlo**
1. Instalar JDK 18, configurar `JAVA_HOME` y abrir `spoon` como administrador.
2. Abrir `Transf_Practica_1.ktr` (las rutas son relativas a la carpeta del archivo).
3. Ejecutar con ▶. Los resultados se generan en `output/`.

---

## 6. Evidencia del resultado

### 6.1 Resumen de la ejecución (log de Spoon)

| Rama | Leídas | Duplicados eliminados | Rechazadas | Limpias |
|---|---|---|---|---|
| Ventas (Excel) | 800 | 200 | 157 | 443 |
| Veterinaria (CSV) | 117 | no aplica | 32 | 85 |

- **Ventas:** 200 + 157 + 443 = 800. Todas las filas rechazadas lo fueron por `cantidad` vacía.
- **Veterinaria:** 85 + 32 = 117. Los motivos están en la columna `RECHAZO_MOTIVO` de `veterinaria_rechazados.csv`.

### 6.2 Capturas
- ![Transformación completa](docs/capturas/transformacion.png)
- ![Ejecución exitosa](docs/capturas/ejecucion.png)
- ![Salida de ventas](docs/capturas/ventas_limpio.png)
- ![Salida de veterinaria](docs/capturas/veterinaria_limpia.png)
- ![Archivos rechazados](docs/capturas/rechazados.png)

### 6.3 Validación de resultados

| Verificación | Cómo comprobarlo | Cumple |
|---|---|---|
| Las filas cuadran (origen = duplicados + rechazadas + limpias) | Sección 6.1 | ☐ |
| Todas las fechas de las salidas están en `yyyy-MM-dd` | Revisar la columna de fecha en ambos `*_limpio.csv` / `*_limpia.csv` | ☐ |
| `especie`, `sexo`, `vacunado`, `ciudad`, `producto`, `genero` y `metodo_pago` solo tienen categorías estándar | Filtrar valores distintos en Excel | ☐ |
| Sin `usd`, sin texto en cantidades y sin importes negativos en `ventas_limpio.csv` | Filtrar la columna | ☐ |
| Sin pesos o edades fuera de rango en la salida de veterinaria | Ordenar las columnas | ☐ |
| `TOTAL_CONSISTENTE` en `ventas_limpio.csv` | Se espera `S` en ~211 filas y `N` en ~232 | ☐ |

**Hallazgo de calidad:** en más de la mitad de las ventas limpias, `total_venta` no coincide con `precio × cantidad`. Las filas se conservan, pero quedan marcadas con `N` en `TOTAL_CONSISTENTE` para que se revisen en el sistema de origen.

### 6.4 Antes y después

| Campo | Antes | Después |
|---|---|---|
| `cliente` | `Ángel Flórez Angulo` | `ANGEL FLOREZ ANGULO` |
| `fecha` | `27/01/2003` | `2003-01-27` |
| `precio_unitario` | `116.17usd` | `116.17` |
| `precio_unitario` | `-186.42` | `186.42` |
| `cantidad` | `uno` | `1` |
| `ciudad` | `bogota` / `BOGOTÁ` | `BOGOTA` |
| `nombre_dueno` | `Daniela Espinosa Villacís` | `DANIELA ESPINOSA VILLACIS` |
| `fecha_registro` | `16.09.25` | `2025-09-16` |
| `raza` | `PASTOR ALEMAN` | `Pastor Alemán` |
| `peso` | `2.5Kg` | `2.5` |
| `edad` | `82 meses` / `11 años` | `82` / `132` (meses) |

---

## 7. Relación con una arquitectura de Data Warehouse

| Elemento del proyecto | Rol en una arquitectura de DW |
|---|---|
| Excel y CSV en `data/` | **Fuentes** (sistemas operacionales) |
| Pasos de entrada y flujo de filas hasta la limpieza | **Extracción** y **staging lógico**: los datos se leen sin modificar la fuente. En esta práctica el staging no se guarda en disco; en un entorno real se persistiría como tablas o archivos intermedios para poder reprocesar |
| Pasos *Limpieza*, *Eliminar Duplicados* y *Filtrar* | La **T** de ETL: limpieza, estandarización, validación y deduplicación |
| Archivos `*_rechazados.csv` | Control de calidad: registro de lo que no pasó las reglas y por qué |
| Archivos `ventas_limpio.csv` y `veterinaria_limpia.csv` | **Destino**. Por fines didácticos es un archivo; en una solución real serían tablas del Data Warehouse o de un Data Mart |

En un DW real, los datos limpios alimentarían un modelo dimensional. Ventas podría tener `dim_cliente`, `dim_producto`, `dim_ciudad` y `dim_fecha`, con la tabla de hechos `fact_ventas` (cantidad y total). La veterinaria podría tener `dim_mascota`, `dim_dueno` y `dim_fecha`, con una tabla de hechos de consultas. Estandarizar categorías y fechas permite que esas dimensiones sean consistentes y que los reportes agrupen correctamente.

---

## Limitaciones y criterios asumidos

- **Veterinaria:** no se eliminan los 9 duplicados, y `email` y `telefono` pasan sin limpiar. Quedan como mejora pendiente.
- **Nombres:** se estandarizan en MAYÚSCULAS sin tildes. Los que vienen como "Apellido Nombre" no se reordenan.
- **Fechas ambiguas:** se interpretan como día/mes/año.
- **Importes negativos:** se asume error de signo (los valores absolutos están en un rango plausible de 80 a 200).
- **`uno` → 1:** es una traducción literal; en esas filas el total casi nunca coincide con cantidad 1, por lo que la fila queda marcada con `N` en `TOTAL_CONSISTENTE`.
- **Fechas de venta:** van de 1970 a 2025, algo inusual; no se rechazaron.
- **Datos simulados:** el dataset de veterinaria fue generado con errores intencionales.
- **Destino:** en la práctica es un archivo CSV; en una solución real sería una base de datos o un Data Warehouse.
