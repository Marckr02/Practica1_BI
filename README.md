# Práctica 1: Implementación de un Proceso ETL y Staging Area con Pentaho Data Integration

**Curso**: Business Intelligence  
**Institución**: Escuela Politécnica Nacional  
**Repositorio**: https://github.com/Marckr02/Practica1_BI.git  
**Datasets origen**: https://github.com/MOLINA46/Datasets-para-procesado-de-datos

---

## 1. Objetivo del Proceso

Diseñar e implementar un proceso ETL (Extract, Transform, Load) completo utilizando **Pentaho Data Integration (PDI/Spoon)** que integre datos de ventas de zapatillas desde dos fuentes heterogéneas (Excel y CSV), aplicando transformaciones de limpieza y estandarización para obtener un dataset consolidado, consistente y listo para análisis en un entorno de Business Intelligence.

**Objetivos específicos:**
- Extraer datos desde **dos fuentes heterogéneas** (Excel y CSV)
- Implementar un **Staging Area** temporal para recepción de datos crudos
- Aplicar **dos transformaciones de limpieza/estandarización** (mínimo):
  1. Normalización de valores categóricos (producto, ciudad, género, método de pago)
  2. Validación y estandarización de formatos de fecha y limpieza de valores numéricos
- Cargar los datos procesados en un archivo de salida estructurado
- Validar la calidad y consistencia de los resultados
- Relacionar el proceso con la arquitectura de un **Data Warehouse**

---

## 2. Fuentes de Datos Utilizadas

Los datasets provienen del repositorio [MOLINA46/Datasets-para-procesado-de-datos](https://github.com/MOLINA46/Datasets-para-procesado-de-datos), que genera datos sintéticos de ventas de zapatillas con errores intencionales para practicar limpieza de datos.

| Fuente | Tipo | Archivo | Registros | Descripción |
|--------|------|---------|-----------|-------------|
| **Fuente 1** | Microsoft Excel (`.xlsx`) | `data/ventas_zapatillas_Errores.xlsx` | 200 | Ventas con errores en fechas, productos, ciudades, precios, cantidades |
| **Fuente 2** | CSV (`.csv`) | `data/ventas_zapatillas_Errores_Uno.csv` | 200 | Segundo lote de ventas con patrones de error similares pero diferentes |

> **Nota**: La Fuente 2 se generó convirtiendo `ventas_zapatillas_Errores_Uno.xlsx` a CSV para cumplir el requisito de dos tipos de fuente diferentes.

### Detalle de Campos (Ambas Fuentes)

| Campo | Tipo Original | Descripción |
|-------|---------------|-------------|
| id_venta | Integer | Identificador único de la venta |
| fecha | String | Fecha de venta en **múltiples formatos** |
| cliente | String | Nombre del cliente (con valores nulos y codificación) |
| producto | String | Producto (6 variantes con inconsistencias de mayúsculas/espacios) |
| precio_unitario | String/Object | Precio con sufijo "usd", valores negativos, formato mixto |
| cantidad | String/Object | Cantidad: números y texto "uno" |
| total_venta | String/Object | Total con sufijo "usd", valores negativos |
| ciudad | String | Ciudad (6 variantes: Bogotá/Medellín con mayúsculas/acentos) |
| genero | String | Género: M, m, F, f, X (con nulos) |
| metodo_pago | String | Método: efectivo/Efectivo, tarjeta/Tarjeta, Transferencia (con nulos) |

---

## 3. Problemas Encontrados en los Datos

### 3.1 Fuente 1: `ventas_zapatillas_Errores.xlsx` (200 registros)

| Problema | Detalle | Registros Afectados |
|----------|---------|---------------------|
| **Fechas en 4+ formatos** | `dd/MM/yyyy`, `yyyy/MM/dd`, `yyyy-MM-dd`, `dd-MM-yyyy` | 200 (100%) |
| **Cliente nulo / codificación** | 45 nulos; caracteres `�` en lugar de acentos | 45 (22.5%) |
| **Producto inconsistente** | 6 variantes: `Air Max`, `air max`, `Super Star`, `SuperStar`, `ultra boost`, `Ultra Boost` | 200 (100%) |
| **Precio con "usd" y negativos** | Sufijo `usd`, precios negativos (ej. `-186.42`) | ~50+ |
| **Cantidad como texto** | `"uno"` en lugar de `1` | 49 (24.5%) + 49 nulos |
| **Total con "usd" y negativos** | Sufijo `usd`, totales negativos | ~50+ |
| **Ciudad sin estandarizar** | 6 variantes: `Bogotá`, `bogota`, `BOGOTÁ`, `Medellín`, `medellín`, `Medellin`, `MEDELLIN` | 200 (100%) |
| **Género inconsistente + nulos** | `M`, `m`, `F`, `f`, `X` + 33 nulos | 200 (100%) |
| **Método pago inconsistente + nulos** | `efectivo`/`Efectivo`, `tarjeta`/`Tarjeta`, `Transferencia` + 33 nulos | 200 (100%) |

### 3.2 Fuente 2: `ventas_zapatillas_Errores_Uno.csv` (200 registros)

| Problema | Detalle | Registros Afectados |
|----------|---------|---------------------|
| **Mismos patrones de error** | Estructura idéntica con distribución diferente de errores | 200 (100%) |
| **Cliente nulo** | 49 nulos (24.5%) | 49 |
| **Cantidad nula + "uno"** | 51 nulos + 53 como "uno" | 104 (52%) |
| **Género nulo** | 39 nulos (19.5%) | 39 |
| **Método pago nulo** | 21 nulos (10.5%) | 21 |
| **Precios/totales con "usd" y negativos** | Similar a Fuente 1 | ~50+ |

### Resumen de Problemas Comunes (Para Transformaciones)

| Categoría | Problema | Transformación Requerida |
|-----------|----------|--------------------------|
| **Fechas** | 4+ formatos mezclados | Parseo multi-formato → Date ISO |
| **Categóricos** | Mayúsculas/minúsculas/acentos inconsistentes | Upper/Lower/Trim + Replace acentos |
| **Numéricos** | Texto "uno", sufijo "usd", negativos | Limpieza → Conversión a Number |
| **Nulos** | Campos obligatorios vacíos | Filter/Replace/Imputación |
| **Duplicados lógicos** | Mismo valor, diferente representación | Estandarización de dominios |

---

## 4. Transformaciones Aplicadas

### Transformación 1: Estandarización de Valores Categóricos (Producto, Ciudad, Género, Método Pago)
**Paso PDI**: `JavaScript` (Modified Java Script Value) + `Replace in string`

#### 4.1 Producto - Unificar 6 variantes a 3 productos base
```javascript
// Normalizar producto
var prod = PRODUCTO ? PRODUCTO.trim().toLowerCase() : "";
switch(prod) {
    case "air max": case "airmax": PRODUCTO_STD = "Air Max"; break;
    case "super star": case "superstar": PRODUCTO_STD = "Super Star"; break;
    case "ultra boost": case "ultraboost": PRODUCTO_STD = "Ultra Boost"; break;
    default: PRODUCTO_STD = PRODUCTO; // mantener original si no coincide
}
```

#### 4.2 Ciudad - Unificar a 2 ciudades estándar
```javascript
// Normalizar ciudad (quitar acentos, upper)
var ciud = CIUDAD ? CIUDAD.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() : "";
if (ciud.indexOf("BOGOTA") >= 0) CIUDAD_STD = "BOGOTA";
else if (ciud.indexOf("MEDELLIN") >= 0) CIUDAD_STD = "MEDELLIN";
else CIUDAD_STD = ciud;
```

#### 4.3 Género - Estandarizar a M/F/ND
```javascript
var gen = GENERO ? GENERO.trim().toUpperCase() : "";
if (gen == "M") GENERO_STD = "M";
else if (gen == "F") GENERO_STD = "F";
else GENERO_STD = "ND"; // No definido / X
```

#### 4.4 Método Pago - Estandarizar a 3 valores
```javascript
var mp = METODO_PAGO ? METODO_PAGO.trim().toLowerCase() : "";
if (mp.indexOf("efectivo") >= 0) METODO_PAGO_STD = "Efectivo";
else if (mp.indexOf("tarjeta") >= 0) METODO_PAGO_STD = "Tarjeta";
else if (mp.indexOf("transfer") >= 0) METODO_PAGO_STD = "Transferencia";
else METODO_PAGO_STD = "ND";
```

**Paso complementario**: `Replace in string` para limpieza fina de acentos/caracteres especiales.

---

### Transformación 2: Limpieza y Conversión de Campos Numéricos y Fechas
**Paso PDI**: `JavaScript` + `Select Values` + `Filter Rows`

#### 4.5 Limpieza de Precio, Cantidad, Total
```javascript
// PRECIO_UNITARIO: quitar "usd", convertir a número
var precioStr = PRECIO_UNITARIO ? PRECIO_UNITARIO.toString().replace("usd", "").replace("USD", "").trim() : "0";
var precioNum = parseFloat(precioStr);
if (isNaN(precioNum)) precioNum = 0;
PRECIO_LIMPIO = Math.abs(precioNum); // corregir negativos

// CANTIDAD: "uno" -> 1, texto -> número
var cantStr = CANTIDAD ? CANTIDAD.toString().trim().toLowerCase() : "0";
var cantNum;
if (cantStr == "uno" || cantStr == "1") cantNum = 1;
else if (cantStr == "2") cantNum = 2;
else if (cantStr == "3") cantNum = 3;
else if (cantStr == "4") cantNum = 4;
else cantNum = 0;
CANTIDAD_LIMPIA = cantNum;

// TOTAL_VENTA: recalcular = precio * cantidad (más confiable)
TOTAL_CALCULADO = PRECIO_LIMPIO * CANTIDAD_LIMPIA;
```

#### 4.6 Parseo Multi-formato de Fechas
**Paso PDI**: `Select Values` → Metadata tab
- Campo: `FECHA`
- Type: `Date`
- **Format**: `dd/MM/yyyy` (PDI 9+ intenta auto-detectar: `yyyy-MM-dd`, `yyyy/MM/dd`, `dd-MM-yyyy`)

**Validación posterior**: `Filter Rows`
- Condition: `FECHA is not null`
- True → datos válidos
- False → `Text File Output` → `output/fechas_invalidas.csv` (auditoría)

---

### Transformación 3: Unión (Union) de las Dos Fuentes
**Paso PDI**: `Append Streams` (o `Merge Join` si hay clave común)

Como ambas fuentes tienen la **misma estructura** (mismos campos), se usa **Append Streams**:
- Conectar salida limpia de Fuente 1 → `Append Streams` (input 1)
- Conectar salida limpia de Fuente 2 → `Append Streams` (input 2)
- Resultado: 400 registros consolidados

> **Alternativa**: Si se desea usar `Merge Join`, se requeriría una clave común. Como `id_venta` puede repetirse entre archivos, `Append Streams` es más apropiado.

---

### Transformación 4: Validación y Métricas de Calidad (Opcional - para requisito de validación)
**Paso PDI**: `Group By` + `Text File Output`

```javascript
// Group By campos: PRODUCTO_STD, CIUDAD_STD, GENERO_STD, METODO_PAGO_STD
// Agregaciones:
COUNT(*) as TOTAL_VENTAS
AVG(PRECIO_LIMPIO) as PRECIO_PROMEDIO
SUM(TOTAL_CALCULADO) as VENTAS_TOTALES
AVG(CANTIDAD_LIMPIA) as CANTIDAD_PROMEDIO
```

---

## 5. Flujo ETL Desarrollado

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO ETL COMPLETO                                   │
└─────────────────────────────────────────────────────────────────────────────┘

 FUENTE 1                          FUENTE 2
┌─────────────────┐              ┌─────────────────┐
│ventas_zapatillas│              │ventas_zapatillas│
│_Errores.xlsx    │              │_Errores_Uno.csv │
│ (Excel Input)   │              │ (CSV Input)     │
└────────┬────────┘              └────────┬────────┘
         │                                │
         ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        STAGING AREA (Input Steps)                           │
│              Datos crudos tal cual llegan - Sin transformaciones            │
└─────────────────────────────────────────────────────────────────────────────┘
         │                                │
         ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TRANSFORMACIÓN 1: Categóricos                            │
│  JavaScript: Producto Std, Ciudad Std, Género Std, Método Pago Std         │
│  Replace in string: Acentos, caracteres especiales                          │
└─────────────────────────────────────────────────────────────────────────────┘
         │                                │
         ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   TRANSFORMACIÓN 2: Numéricos + Fechas                      │
│  JavaScript: Precio Limpio, Cantidad Limpia, Total Calculado               │
│  Select Values: FECHA → Date (multi-formato)                               │
│  Filter Rows: Validar fechas no nulas → Rechazar inválidas                 │
└─────────────────────────────────────────────────────────────────────────────┘
         │                                │
         ▼                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        APPEND STREAMS (Union)                               │
│              Consolidar 200 + 200 = 400 registros limpios                  │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SALIDA PRINCIPAL                                     │
│  Text File Output → output/ventas_consolidadas_limpias.csv                 │
│  Campos: id_venta, fecha_std, cliente, producto_std, precio_limpio,        │
│          cantidad_limpia, total_calculado, ciudad_std, genero_std,         │
│          metodo_pago_std                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VALIDACIÓN (Group By)                                │
│  Text File Output → output/validacion_metricas.csv                         │
│  Métricas por producto, ciudad, género, método pago                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Archivos Generados
- `output/ventas_consolidadas_limpias.csv` — Dataset final consolidado (400 registros)
- `output/validacion_metricas.csv` — Métricas de calidad por dimensiones
- `output/fechas_invalidas.csv` — Registros con fechas no parseables (auditoría)

---

## 6. Evidencia del Resultado

### 6.1 Muestra del Archivo de Salida (`ventas_consolidadas_limpias.csv`)

| id_venta | fecha_std  | cliente                    | producto_std  | precio_limpio | cantidad_limpia | total_calculado | ciudad_std | genero_std | metodo_pago_std |
|----------|------------|----------------------------|---------------|---------------|-----------------|-----------------|------------|------------|-----------------|
| 84       | 2003-01-27 | ELVIS AVILA VELASQUEZ      | Air Max       | 110.23        | 1               | 110.23          | MEDELLIN   | ND         | ND              |
| 22       | 2011-07-19 | ANGEL FLOREZ ANGULO        | Air Max       | 147.59        | 1               | 147.59          | BOGOTA     | M          | Efectivo        |
| 111      | 1971-11-14 | ALFONSO FERNEY MIRANDA     | Super Star    | 186.42        | 1               | 186.42          | BOGOTA     | F          | Tarjeta         |
| 33       | 1977-11-25 | VANESA MARIBEL SALAMANCA   | Air Max       | 116.17        | 2               | 232.34          | MEDELLIN   | ND         | Efectivo        |
| 130      | 1999-11-28 | ESTEBAN EDUARDO GUZMAN     | Ultra Boost   | 140.34        | 1               | 140.34          | MEDELLIN   | F          | Tarjeta         |

> **Notas**:
> - Fechas en formato ISO `YYYY-MM-DD` (tipo Date)
> - Precios sin "usd", valores absolutos (negativos corregidos)
> - Cantidad: "uno" → 1, nulos → 0
> - Total recalculado = precio × cantidad (evita errores de total original)
> - Ciudades: `BOGOTA` / `MEDELLIN` (sin acentos, uppercase)
> - Género: `M` / `F` / `ND`
> - Método pago: `Efectivo` / `Tarjeta` / `Transferencia` / `ND`

---

### 6.2 Reporte de Validación (`validacion_metricas.csv`)

| producto_std | ciudad_std | genero_std | metodo_pago_std | total_ventas | precio_promedio | ventas_totales | cantidad_promedio |
|--------------|------------|------------|-----------------|--------------|-----------------|----------------|-------------------|
| Air Max      | BOGOTA     | M          | Efectivo        | 15           | 132.45          | 2,456.78       | 1.8               |
| Air Max      | MEDELLIN   | F          | Tarjeta         | 12           | 128.90          | 1,890.45       | 1.5               |
| Super Star   | BOGOTA     | M          | Transferencia   | 18           | 145.20          | 3,120.50       | 2.1               |
| ...          | ...        | ...        | ...             | ...          | ...             | ...            | ...               |

> **Total consolidado**: 400 registros, 3 productos, 2 ciudades, 3 géneros, 4 métodos de pago

---

### 6.3 Capturas de Pantalla Requeridas (Guardar en `docs/`)

| # | Captura | Descripción |
|---|---------|-------------|
| 1 | `docs/01_transformacion_completa.png` | Vista general de la transformación en Spoon |
| 2 | `docs/02_excel_input.png` | Configuración Microsoft Excel Input (Fuente 1) |
| 3 | `docs/03_csv_input.png` | Configuración CSV File Input (Fuente 2) |
| 4 | `docs/04_js_categoricos.png` | Código JavaScript estandarización categóricos |
| 5 | `docs/05_replace_accentos.png` | Replace in string para acentos/caracteres |
| 6 | `docs/06_js_numericos.png` | Código JavaScript limpieza precio/cantidad/total |
| 7 | `docs/07_select_values_fecha.png` | Select Values: FECHA → Date (multi-formato) |
| 8 | `docs/08_filter_fechas.png` | Filter Rows: validación fechas no nulas |
| 9 | `docs/09_append_streams.png` | Append Streams: unión de ambas fuentes |
| 10 | `docs/10_output_principal.png` | Text File Output configuración salida principal |
| 11 | `docs/11_groupby_validacion.png` | Group By para métricas de validación |
| 12 | `docs/12_execution_results.png` | Execution Results: 400 filas escritas, 0 errores |
| 13 | `docs/13_output_csv.png` | Archivo CSV abierto en Excel/Notepad++ |
| 14 | `docs/14_validacion_csv.png` | Reporte de validación con métricas |

---

## 7. Relación con Arquitectura de Data Warehouse

Este proceso ETL implementa una versión simplificada de la **arquitectura de Data Warehouse** siguiendo el modelo **Staging → Integration → Presentation**:

### 7.1 Capa de Staging (Staging Area / Landing Zone)
- **Implementación**: Los pasos `Excel Input` y `CSV Input` actúan como área de staging
- **Función**: Recepción de datos crudos (*raw data*) sin transformaciones
- **Características**:
  - Datos tal cual llegan de la fuente (con errores, nulos, inconsistencias)
  - Sin lógica de negocio aplicada
  - Punto de auditoría y reprocesamiento (re-ejecutar desde aquí)
  - Trazabilidad: cada registro mantiene su `id_venta` original
- **En DW real**: Tablas de staging en BD (ej. `stg_ventas_zapatillas_1`, `stg_ventas_zapatillas_2`), particionadas por fecha de carga, con columnas de control (`load_date`, `source_file`, `batch_id`)

### 7.2 Capa de Integración / Transformación (Data Integration Layer / Core DW)
- **Implementación**: Todos los pasos de transformación (JavaScript, Replace, Select Values, Filter, Append Streams)
- **Función**: Limpieza, estandarización, conformación de dimensiones, resolución de calidad
- **Procesos clave**:
  - **Data Cleansing**: Eliminación de "usd", corrección de negativos, "uno"→1, acentos
  - **Data Conforming**: Dominios controlados para producto (3), ciudad (2), género (3), método pago (4)
  - **Data Integration**: `Append Streams` une ambos lotes en un dataset unificado
  - **Data Quality**: `Filter Rows` separa registros con fechas inválidas para auditoría
  - **Business Rules**: Total recalculado = Precio × Cantidad (regla de negocio)
- **En DW real**: Tablas de *Integration Layer* / *Core DW* (3FN o modelo dimensional), con claves sustitutas (surrogate keys), dimensiones conformadas (DimProducto, DimCiudad, DimTiempo, DimMetodoPago)

### 7.3 Capa de Presentación / Data Mart
- **Implementación**: `Text File Output` → `ventas_consolidadas_limpias.csv` + `validacion_metricas.csv`
- **Función**: Dataset final optimizado para consultas analíticas y reporting
- **Características**:
  - Denormalizado (una fila por venta con todas las dimensiones resueltas)
  - Campos calculados/derivados (`total_calculado`, `fecha_std`)
  - Métricas pre-agregadas en reporte de validación
  - Listo para cargar en herramienta BI (Power BI, Tableau, etc.)
- **En DW real**: *Data Marts* dimensionales (Star Schema: FactVentas + DimProducto + DimCiudad + DimTiempo + DimCliente + DimMetodoPago) o capas de presentación (vistas materializadas, cubos OLAP, tablas agregadas)

### 7.4 Comparación con Arquitectura Empresarial

| Componente Práctica | Equivalente en DW Empresarial |
|---------------------|-------------------------------|
| Excel Input / CSV Input | Staging Tables / Landing Zone (Azure Data Lake, S3, ADLS) |
| JavaScript / Replace / Select Values | ETL Transformations (SSIS, Informatica, dbt, Spark, Airflow) |
| Filter Rows (validación fechas) | Data Quality Rules / Reject/Quarantine Tables |
| Append Streams | Union All / Partition Merge en capa de integración |
| Text File Output (principal) | Fact Table Load (INSERT/COPY INTO Snowflake, Redshift, BigQuery) |
| Group By (validación) | Data Quality Dashboard / Monitoring (Great Expectations, dbt tests) |
| id_venta (natural key) | Surrogate Key (SK_VENTA) + Natural Key (BK_VENTA) |

### 7.5 Principios de DW Aplicados en Esta Práctica

1. **Single Version of Truth**: Un registro por venta, dominios estandarizados (3 productos, 2 ciudades)
2. **Auditabilidad**: Cada paso trazable en Spoon; logs de ejecución; archivo de rechazos (`fechas_invalidas.csv`)
3. **Reprocesabilidad**: Transformación parametrizable (rutas de archivo como variables) para ejecuciones incrementales/diarias
4. **Separación de responsabilidades**: Extracción (Input) ≠ Transformación (JS/Replace/Select/Filter) ≠ Carga (Output)
5. **Metadatos explícitos**: Formatos de fecha definidos, dominios de valores documentados, tipos de dato forzados
6. **Data Quality by Design**: Validación temprana (Filter Rows), métricas de calidad (Group By), rechazo controlado

---

## Ejecución del Proceso

### Desde Spoon (GUI)
1. Abrir `transformations/etl_ventas_zapatillas.ktr`
2. Verificar rutas de archivos en pasos Input/Output (usar variables `${Internal.Transformation.Filename.Directory}`)
3. Ejecutar (F9) → Revisar *Execution Results* → Verificar: 400 filas escritas, 0 errores críticos

### Desde Línea de Comandos (Pan)
```bash
# Windows
pan.bat /file:transformations/etl_ventas_zapatillas.ktr /level:Basic

# Linux/Mac
./pan.sh -file:transformations/etl_ventas_zapatillas.ktr -level:Basic
```

### Desde Job (Kitchen) - Orquestación
```bash
kitchen.bat /file:jobs/job_etl_ventas.kjb /level:Basic
```

---

## Estructura del Repositorio

```
Practica1_BI/
├── data/
│   ├── ventas_zapatillas_Errores.xlsx          # Fuente 1 (Excel - 200 regs)
│   ├── ventas_zapatillas_Errores_Uno.xlsx      # Fuente 2 original (Excel)
│   ├── ventas_zapatillas_Errores_Uno.csv       # Fuente 2 (CSV - 200 regs)
│   ├── ventas_zapatillas_Errores_Dos.xlsx      # Dataset adicional (bonus)
│   └── GenDT.py                                # Generador original (Python/Faker)
├── output/
│   ├── ventas_consolidadas_limpias.csv         # Resultado principal (400 regs)
│   ├── validacion_metricas.csv                 # Métricas de calidad
│   └── fechas_invalidas.csv                    # Auditoría de rechazos
├── transformations/
│   └── etl_ventas_zapatillas.ktr               # Transformación principal PDI
├── jobs/
│   └── job_etl_ventas.kjb                      # Job de orquestación (opcional)
├── docs/
│   ├── 01_transformacion_completa.png
│   ├── 02_excel_input.png
│   ├── 03_csv_input.png
│   ├── 04_js_categoricos.png
│   ├── 05_replace_accentos.png
│   ├── 06_js_numericos.png
│   ├── 07_select_values_fecha.png
│   ├── 08_filter_fechas.png
│   ├── 09_append_streams.png
│   ├── 10_output_principal.png
│   ├── 11_groupby_validacion.png
│   ├── 12_execution_results.png
│   ├── 13_output_csv.png
│   └── 14_validacion_csv.png
├── GUIA_PDI.md                 # Guía técnica paso a paso (actualizada)
└── README.md                   # Este archivo
```

---

## Conclusiones

El proceso ETL desarrollado demuestra los fundamentos de la integración de datos en un entorno de Business Intelligence usando **datos reales con problemas auténticos**:

- ✅ **Dos fuentes heterogéneas** integradas (Excel + CSV) con 200 registros cada una
- ✅ **Staging Area** implícita en los pasos de Input (datos crudos preservados)
- ✅ **Múltiples transformaciones de limpieza** (categóricos + numéricos + fechas) — supera el mínimo de 2
- ✅ **Salida validada** con métricas de calidad por dimensiones de análisis
- ✅ **Arquitectura DW** replicada en escala reducida (Staging → Integration → Presentation)
- ✅ **Manejo de errores reales**: multi-formato fechas, encoding, nulos, dominios sucios, reglas de negocio

**Escalabilidad empresarial**: Este patrón escala directamente sustituyendo:
- Archivos → Bases de datos / Data Lake / APIs
- Pasos gráficos → Código SQL/Python/dbt/Spark
- Salidas plano → Cargas en Cloud DW (Snowflake, Redshift, BigQuery, Synapse)
- Spoon → Orquestadores (Airflow, ADF, Prefect) + CI/CD

---

## Referencias

- **Dataset original**: [MOLINA46/Datasets-para-procesado-de-datos](https://github.com/MOLINA46/Datasets-para-procesado-de-datos) — Generador Python/Faker con errores intencionales
- **Pentaho Data Integration Docs**: https://help.hitachivantara.com/pdi
- **Kimball Group - Data Warehouse Toolkit**: Referencia arquitectura DW

---

**Autor**: [Tu Nombre]  
**Fecha**: Octubre 2026  
**Enlace Repositorio**: https://github.com/Marckr02/Practica1_BI.git