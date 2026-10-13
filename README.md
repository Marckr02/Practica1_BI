# Práctica 1: Implementación de un Proceso ETL y Staging Area con Pentaho Data Integration

**Curso**: Business Intelligence  
**Institución**: Escuela Politécnica Nacional  
**Repositorio**: https://github.com/Marckr02/Practica1_BI.git

---

## 1. Objetivo del Proceso

Diseñar e implementar un proceso ETL (Extract, Transform, Load) completo utilizando **Pentaho Data Integration (PDI/Spoon)** que integre datos de egresados/graduados con su información laboral, aplicando transformaciones de limpieza y estandarización para obtener un dataset consolidado, consistente y listo para análisis en un entorno de Business Intelligence.

**Objetivos específicos:**
- Extraer datos desde **dos fuentes heterogéneas** (Excel y CSV)
- Implementar un **Staging Area** temporal para recepción de datos crudos
- Aplicar **dos transformaciones de limpieza/estandarización**:
  1. Normalización de nombres y apellidos
  2. Validación y estandarización de formatos de fecha
- Cargar los datos procesados en un archivo de salida estructurado
- Validar la calidad y consistencia de los resultados
- Relacionar el proceso con la arquitectura de un **Data Warehouse**

---

## 2. Fuentes de Datos Utilizadas

| Fuente | Tipo | Archivo | Registros | Descripción |
|--------|------|---------|-----------|-------------|
| **Fuente 1** | Microsoft Excel (`.xlsx`) | `data/graduados.xlsx` | 10 | Información de egresados: nombres, estado de graduación, fecha, carrera, promedio |
| **Fuente 2** | CSV (`.csv`) | `data/empleos.csv` | 10 | Información laboral: empresa, cargo, fecha inicio, salario, ciudad, sector |

### Detalle de Campos

**graduados.xlsx**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| ID | Integer | Identificador único |
| NOMBRES | String | Nombres (formato inconsistente) |
| APELLIDOS | String | Apellidos (formato inconsistente) |
| ESTADO | String | Estado de graduación (valores variados) |
| FECHA_GRADUACION | String | Fecha en múltiples formatos |
| CARRERA | String | Carrera profesional |
| PROMEDIO | Number | Promedio académico |

**empleos.csv**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| ID_GRADUADO | Integer | FK hacia graduados |
| EMPRESA | String | Nombre de la empresa |
| CARGO | String | Cargo desempeñado |
| FECHA_INICIO | String | Fecha de inicio (formato dd/MM/yyyy) |
| SALARIO | String/Number | Salario mensual |
| CIUDAD | String | Ciudad de trabajo |
| SECTOR | String | Sector económico |

---

## 3. Problemas Encontrados en los Datos

### 3.1 Fuente: Graduados (Excel)

| Problema | Ejemplos | Impacto |
|----------|----------|---------|
| **Inconsistencia en mayúsculas/minúsculas (nombres)** | `juan carlos`, `MARIA FERNANDA`, `pedro jose`, `ANA LUCIA` | Dificulta agrupaciones, búsquedas y presentación |
| **Espacios extra/múltiples** | `perez gomez` vs `LOPEZ MARTINEZ` | Duplicados lógicos, errores en join |
| **Valores no estandarizados en ESTADO** | `Egresado`, `EGR`, `EGRESADO`, `egresado`, `Graduado`, `graduado`, `GRD` | Imposible filtrar/agrupar correctamente |
| **Formatos de fecha mixtos** | `15/03/2023`, `22-06-2022`, `2023/11/10`, `2023-01-15` | Errores de parsing, ordenamiento incorrecto |
| **Nombres incompletos** | `ramirez`, `herrera`, `morales` (solo un apellido) | Inconsistencia en estructura |

### 3.2 Fuente: Empleos (CSV)

| Problema | Ejemplos | Impacto |
|----------|----------|---------|
| **Ciudades con formato inconsistente** | `Quito`, `GUAYAQUIL`, `cuenca` | Agrupaciones geográficas erróneas |
| **Salario como string** | `"2500"` en lugar de numérico | Imposible calcular promedios/sumas |
| **Fechas en formato único pero como string** | `01/04/2023` | Requiere conversión a Date para operaciones temporales |

---

## 4. Transformaciones Aplicadas

### Transformación 1: Limpieza y Estandarización de Nombres (Graduados)
**Paso PDI**: `JavaScript` (o `Modified Java Script Value`)

```javascript
function capitalize(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/\b\w/g, function(l) { return l.toUpperCase(); });
}

var nombresLimpio = capitalize(NOMBRES).replace(/\s+/g, ' ').trim();
var apellidosLimpio = capitalize(APELLIDOS).replace(/\s+/g, ' ').trim();
var nombreCompleto = nombresLimpio + " " + apellidosLimpio;

NOMBRES_LIMPIO = nombresLimpio;
APELLIDOS_LIMPIO = apellidosLimpio;
NOMBRE_COMPLETO = nombreCompleto;
```

**Resultado**: `Juan Carlos Perez Gomez`, `Maria Fernanda Lopez Martinez`, etc.

---

### Transformación 2: Estandarización del Campo ESTADO
**Paso PDI**: `Replace in string` (Value Mapper)

| Valor Original | Valor Estandarizado |
|----------------|---------------------|
| Egresado | EGRESADO |
| egressado | EGRESADO |
| EGR | EGRESADO |
| EGRESADO | EGRESADO |
| egresado | EGRESADO |
| Graduado | GRADUADO |
| graduado | GRADUADO |
| GRD | GRADUADO |

**Resultado**: Solo dos valores válidos: `EGRESADO` y `GRADUADO`

---

### Transformación 3: Validación y Conversión de Fechas (Graduados)
**Paso PDI**: `Select Values` → Metadata

- Campo: `FECHA_GRADUACION`
- Type: `Date`
- Format: `dd/MM/yyyy` (PDI intenta parsear múltiples formatos automáticamente)
- **Validación posterior**: `Filter Rows` → `FECHA_GRADUACION is not null`

**Formatos manejados**:
- `dd/MM/yyyy` → `15/03/2023`
- `dd-MM-yyyy` → `22-06-2022`
- `yyyy/MM/dd` → `2023/11/10`
- `yyyy-MM-dd` → `2023-01-15`

---

### Transformación 4: Limpieza de Datos de Empleos
**Paso PDI**: `JavaScript` + `Select Values`

```javascript
CIUDAD_LIMPIA = CIUDAD ? CIUDAD.trim().toUpperCase() : "";
SECTOR_LIMPIO = SECTOR ? SECTOR.trim() : "";
SALARIO_NUM = parseFloat(SALARIO);
if (isNaN(SALARIO_NUM)) SALARIO_NUM = 0;
FECHA_INICIO_RAW = FECHA_INICIO;
```

**Select Values**: `FECHA_INICIO_RAW` → Type `Date`, Format `dd/MM/yyyy`

---

### Transformación 5: Unión (Join) de Fuentes
**Paso PDI**: `Merge Join` (Inner Join)

- **Clave izquierda**: `ID` (graduados) — *previa ordenación con Sort Rows*
- **Clave derecha**: `ID_GRADUADO` (empleos) — *previa ordenación con Sort Rows*
- **Tipo**: Inner Join (solo graduados con empleo registrado)

---

## 5. Flujo ETL Desarrollado

```
┌─────────────────┐     ┌─────────────────┐
│  graduados.xlsx │     │   empleos.csv   │
│   (Excel Input) │     │   (CSV Input)   │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐
│ Limpiar Nombres     │ │ Limpiar Empleos     │
│ (JavaScript)        │ │ (JavaScript)        │
└────────┬────────────┘ └────────┬────────────┘
         │                       │
         ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐
│ Estandarizar ESTADO │ │ Estandarizar        │
│ (Replace in String) │ │ Ciudad/Sector/Salario│
└────────┬────────────┘ └────────┬────────────┘
         │                       │
         ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐
│ Validar Fechas      │ │ Convertir Fecha     │
│ (Select Values +    │ │ Inicio (Select      │
│  Filter Rows)       │ │  Values)            │
└────────┬────────────┘ └────────┬────────────┘
         │                       │
         ▼                       ▼
┌─────────────────────┐ ┌─────────────────────┐
│ Sort Rows (ID)      │ │ Sort Rows (ID_GRAD) │
└────────┬────────────┘ └────────┬────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
          ┌─────────────────────┐
          │   MERGE JOIN        │
          │   (Inner Join)      │
          └────────┬────────────┘
                   │
                   ▼
          ┌─────────────────────┐
          │  Text File Output   │
          │  (CSV resultado)    │
          └────────┬────────────┘
                   │
                   ▼
          ┌─────────────────────┐
          │  Validación         │
          │  (Group By + Output)│
          └─────────────────────┘
```

### Archivos Generados
- `output/graduados_empleos_procesados.csv` — Dataset consolidado final (10 registros)
- `output/validacion_reporte.csv` — Métricas de calidad por estado y sector

---

## 6. Evidencia del Resultado

### 6.1 Muestra del Archivo de Salida (`graduados_empleos_procesados.csv`)

| ID | NOMBRE_COMPLETO | ESTADO_ESTANDAR | FECHA_GRADUACION | CARRERA | PROMEDIO | EMPRESA | CARGO | FECHA_INICIO | SALARIO | CIUDAD | SECTOR |
|----|-----------------|-----------------|------------------|---------|----------|---------|-------|--------------|---------|--------|--------|
| 1 | Juan Carlos Perez Gomez | EGRESADO | 2023-03-15 | Ing. Sistemas | 8.75 | TechSolutions SA | Desarrollador Junior | 2023-04-01 | 2500 | QUITO | Tecnología |
| 2 | Maria Fernanda Lopez Martinez | EGRESADO | 2022-06-22 | Ing. Civil | 9.20 | Constructora Andina | Ingeniero de Obra | 2022-07-15 | 3200 | GUAYAQUIL | Construcción |
| 3 | Pedro Jose Ramirez | GRADUADO | 2023-11-10 | Admin. Empresas | 7.85 | Banco Nacional | Analista Financiero | 2023-12-01 | 2800 | QUITO | Finanzas |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |

> **Nota**: Las fechas aparecen en formato ISO `YYYY-MM-DD` tras la conversión a tipo Date.

---

### 6.2 Reporte de Validación (`validacion_reporte.csv`)

| ESTADO_ESTANDAR | SECTOR_LIMPIO | COUNT | AVG_PROMEDIO | AVG_SALARIO |
|-----------------|---------------|-------|--------------|-------------|
| EGRESADO | Tecnología | 2 | 8.52 | 2750 |
| EGRESADO | Construcción | 1 | 9.20 | 3200 |
| EGRESADO | Manufactura | 1 | 8.10 | 2200 |
| EGRESADO | Sector Público | 1 | 8.65 | 3100 |
| GRADUADO | Finanzas | 1 | 7.85 | 2800 |
| GRADUADO | Servicios Profesionales | 2 | 9.00 | 2550 |
| GRADUADO | Comercio | 1 | 7.95 | 2600 |
| GRADUADO | Manufactura | 1 | 9.50 | 3500 |

---

### 6.3 Capturas de Pantalla Requeridas

| # | Captura | Descripción |
|---|---------|-------------|
| 1 | `docs/transformacion_completa.png` | Vista general de la transformación en Spoon |
| 2 | `docs/config_excel_input.png` | Configuración Microsoft Excel Input |
| 3 | `docs/config_csv_input.png` | Configuración CSV File Input |
| 4 | `docs/javascript_nombres.png` | Código JavaScript para limpieza de nombres |
| 5 | `docs/replace_estado.png` | Configuración Replace in String (ESTADO) |
| 6 | `docs/select_values_fecha.png` | Metadata Select Values para fechas |
| 7 | `docs/merge_join.png` | Configuración Merge Join con claves |
| 8 | `docs/execution_results.png` | Execution Results: 10 filas leídas/escritas, 0 errores |
| 9 | `docs/output_excel.png` | Archivo CSV abierto en Excel |
| 10 | `docs/validacion_groupby.png` | Paso Group By con agregaciones |

---

## 7. Relación con Arquitectura de Data Warehouse

Este proceso ETL implementa una versión simplificada de la **arquitectura de Data Warehouse** siguiendo el modelo **Staging → Integration → Presentation**:

### 7.1 Capa de Staging (Staging Area)
- **Implementación**: Los pasos `Excel Input` y `CSV Input` actúan como área de staging
- **Función**: Recepción de datos crudos (*raw data*) sin transformaciones
- **Características**:
  - Datos tal cual llegan de la fuente
  - Sin lógica de negocio aplicada
  - Punto de auditoría y reprocesamiento
  - En DW real: tablas de staging en BD (ej. `stg_graduados`, `stg_empleos`)

### 7.2 Capa de Integración / Transformación (Data Integration Layer)
- **Implementación**: Todos los pasos de transformación (JavaScript, Replace, Select Values, Filter, Sort, Merge Join)
- **Función**: Limpieza, estandarización, conformación de dimensiones, resolución de claves
- **Procesos clave**:
  - **Data Cleansing**: Nombres, estados, fechas
  - **Data Conforming**: Estandarizar `ESTADO` a dominio controlado (`EGRESADO`/`GRADUADO`)
  - **Data Integration**: Join por clave sustituta (`ID` ↔ `ID_GRADUADO`)
  - **Data Quality**: Filter Rows para rechazar registros con fechas inválidas
- **En DW real**: Tablas de *Data Integration Layer* / *Core DW* (3FN o modelo dimensional)

### 7.3 Capa de Presentación / Data Mart
- **Implementación**: `Text File Output` → `graduados_empleos_procesados.csv`
- **Función**: Dataset final optimizado para consultas analíticas
- **Características**:
  - Denormalizado (una fila por graduado con info de empleo)
  - Campos calculados (`NOMBRE_COMPLETO`)
  - Métricas pre-agregadas en reporte de validación
- **En DW real**: *Data Marts* dimensionales (Star Schema) o capas de presentación (vistas, cubos OLAP)

### 7.4 Comparación con Arquitectura Empresarial

| Componente Práctica | Equivalente en DW Empresarial |
|---------------------|-------------------------------|
| Excel Input / CSV Input | Staging Tables / Landing Zone |
| JavaScript / Replace / Select Values | ETL Transformations (SSIS, Informatica, dbt) |
| Filter Rows (validación) | Data Quality Rules / Reject Tables |
| Merge Join | Dimension Lookup / Fact-Fact Join |
| Text File Output | Fact Table / Data Mart Load |
| Group By (validación) | Data Quality Dashboard / Monitoring |

### 7.5 Principios de DW Aplicados

1. **Single Version of Truth**: Un registro por graduado (PK: ID), estado estandarizado
2. **Auditabilidad**: Cada paso trazable en Spoon; logs de ejecución
3. **Reprocesabilidad**: Job/Transformación parametrizable para ejecuciones incrementales
4. **Separación de responsabilidades**: Extracción ≠ Transformación ≠ Carga
5. **Metadatos**: Formatos de fecha, dominios de valores, tipos de dato definidos explícitamente

---

## Ejecución del Proceso

### Desde Spoon (GUI)
1. Abrir `transformations/etl_graduados_empleos.ktr`
2. Verificar rutas de archivos en pasos Input/Output
3. Ejecutar (F9) → Revisar *Execution Results*

### Desde Línea de Comandos (Pan)
```bash
# Windows
pan.bat /file:transformations/etl_graduados_empleos.ktr /level:Basic

# Linux/Mac
./pan.sh -file:transformations/etl_graduados_empleos.ktr -level:Basic
```

### Desde Job (Kitchen)
```bash
kitchen.bat /file:jobs/job_etl_principal.kjb /level:Basic
```

---

## Estructura del Repositorio

```
Practica1_BI/
├── data/
│   ├── graduados.xlsx          # Fuente 1 (convertir desde CSV)
│   └── empleos.csv             # Fuente 2
├── output/
│   ├── graduados_empleos_procesados.csv
│   └── validacion_reporte.csv
├── transformations/
│   └── etl_graduados_empleos.ktr
├── jobs/
│   └── job_etl_principal.kjb
├── docs/
│   ├── transformacion_completa.png
│   ├── config_excel_input.png
│   ├── config_csv_input.png
│   ├── javascript_nombres.png
│   ├── replace_estado.png
│   ├── select_values_fecha.png
│   ├── merge_join.png
│   ├── execution_results.png
│   ├── output_excel.png
│   └── validacion_groupby.png
├── GUIA_PDI.md                 # Guía técnica paso a paso
└── README.md                   # Este archivo
```

---

## Conclusiones

El proceso ETL desarrollado demuestra los fundamentos de la integración de datos en un entorno de Business Intelligence:

- ✅ **Dos fuentes heterogéneas** integradas (Excel + CSV)
- ✅ **Staging Area** implícita en los pasos de Input
- ✅ **Dos transformaciones de limpieza** (nombres + fechas/estados)
- ✅ **Salida validada** con métricas de calidad
- ✅ **Arquitectura DW** replicada en escala reducida

Este patrón escala directamente a entornos empresariales sustituyendo archivos por bases de datos, pasos gráficos por código SQL/Python, y salidas plano por cargas en Data Warehouse (Redshift, Snowflake, BigQuery, etc.).

---

**Autor**: [Tu Nombre]  
**Fecha**: 2026  
**Enlace Repositorio**: https://github.com/Marckr02/Practica1_BI.git