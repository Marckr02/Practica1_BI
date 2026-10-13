# Guía Paso a Paso: ETL en Pentaho Data Integration (Spoon)

## Fuentes de Datos Creadas
- **graduados.csv** → Abrir en Excel y guardar como `graduados.xlsx` (Fuente 1: Excel)
- **empleos.csv** → Fuente 2: CSV

---

## 1. Crear la Transformación Principal

### 1.1 Abrir Spoon y crear nueva transformación
- `File` → `New` → `Transformation`
- Guardar como `etl_graduados_empleos.ktr`

---

## 2. Configurar Entrada Excel (graduados.xlsx)

### 2.1 Arrastrar **Microsoft Excel Input** (categoría Input)
### 2.2 Configurar:
- **Step name**: `Leer Graduados Excel`
- **File or directory**: Seleccionar `data/graduados.xlsx`
- **Sheet name**: `Hoja1` (o el nombre de la hoja)
- **Header row present**: ✓
- **Preview**: Verificar que lee 10 filas

---

## 3. Configurar Entrada CSV (empleos.csv)

### 3.1 Arrastrar **CSV File Input** (categoría Input)
### 3.2 Configurar:
- **Step name**: `Leer Empleos CSV`
- **File or directory**: Seleccionar `data/empleos.csv`
- **Separator**: `,` (coma)
- **Header row present**: ✓
- **Encoding**: `UTF-8`
- **Preview**: Verificar 10 filas

---

## 4. Transformación 1: Limpiar y Estandarizar Nombres (Graduados)

### 4.1 Arrastrar **JavaScript** (categoría Transform)
### 4.2 Conectar `Leer Graduados Excel` → `JavaScript`
### 4.3 Configurar JavaScript:
- **Step name**: `Limpiar Nombres Graduados`
- **Código**:
```javascript
// Capitalizar correctamente: Primera letra mayúscula, resto minúscula
function capitalize(str) {
    if (!str) return "";
    return str.toLowerCase().replace(/\b\w/g, function(l) { return l.toUpperCase(); });
}

var nombresLimpio = capitalize(NOMBRES);
var apellidosLimpio = capitalize(APELLIDOS);

// Eliminar espacios extra
nombresLimpio = nombresLimpio.replace(/\s+/g, ' ').trim();
apellidosLimpio = apellidosLimpio.replace(/\s+/g, ' ').trim();

// Crear nombre completo
var nombreCompleto = nombresLimpio + " " + apellidosLimpio;

// Retornar campos originales + nuevos
NOMBRES_LIMPIO = nombresLimpio;
APELLIDOS_LIMPIO = apellidosLimpio;
NOMBRE_COMPLETO = nombreCompleto;
```
- **Get Fields**: Obtener campos del stream anterior
- **Compatibility mode**: ✓

---

## 5. Transformación 2: Validar y Estandarizar Fechas (Graduados)

### 5.1 Arrastrar **Select Values** (categoría Transform) → Renombrar a `Estandarizar Fecha Graduacion`
### 5.2 Conectar `Limpiar Nombres Graduados` → `Estandarizar Fecha Graduacion`
### 5.3 Configurar:
- En pestaña **Select & Alter**: Mantener todos los campos
- En pestaña **Metadata**: Cambiar `FECHA_GRADUACION`:
  - **Type**: `Date`
  - **Format**: `dd/MM/yyyy` (PDI intentará parsear múltiples formatos)
  - **Length**: 10
  - **Precision**: -1

### 5.4 Agregar **Filter Rows** después para validar fechas nulas:
- **Step name**: `Filtrar Fechas Válidas`
- **Condition**: `FECHA_GRADUACION is not null`
- **Send true to**: Siguiente paso
- **Send false to**: `Log Invalidos` (crear un **Dummy** o **Text File Output** para errores)

---

## 6. Limpiar Datos de Empleos (CSV)

### 6.1 Arrastrar **JavaScript** → Conectar `Leer Empleos CSV`
### 6.2 **Step name**: `Limpiar Datos Empleos`
### 6.3 Código:
```javascript
// Estandarizar ciudad y sector
CIUDAD_LIMPIA = CIUDAD ? CIUDAD.trim().toUpperCase() : "";
SECTOR_LIMPIO = SECTOR ? SECTOR.trim() : "";

// Validar salario numérico
SALARIO_NUM = parseFloat(SALARIO);
if (isNaN(SALARIO_NUM)) SALARIO_NUM = 0;

// Estandarizar fecha inicio
// PDI la parseará en Select Values después
FECHA_INICIO_RAW = FECHA_INICIO;
```

### 6.4 Agregar **Select Values** → `Estandarizar Fecha Empleo`
- Cambiar `FECHA_INICIO_RAW` a **Date**, formato `dd/MM/yyyy` (o probar `yyyy-MM-dd`)

---

## 7. Unir (Join) las Dos Fuentes

### 7.1 Arrastrar **Merge Join** (categoría Join)
### 7.2 Conectar:
- `Estandarizar Fecha Graduacion` → Merge Join (lado **Left**)
- `Estandarizar Fecha Empleo` → Merge Join (lado **Right**)
### 7.3 Configurar Merge Join:
- **Step name**: `Unir Graduados Empleos`
- **Join type**: `Inner Join` (o Left Join si quieres todos los graduados)
- **Keys**:
  - Left: `ID` (de graduados)
  - Right: `ID_GRADUADO` (de empleos)
- **Importante**: Ambos streams deben estar **ordenados** por la clave

### 7.4 Agregar **Sort Rows** antes del Merge Join en AMBOS streams:
- **Graduados**: Sort by `ID` (Ascending)
- **Empleos**: Sort by `ID_GRADUADO` (Ascending)

---

## 8. Salida: Guardar Resultado Procesado

### 8.1 Arrastrar **Text File Output** (categoría Output) o **Microsoft Excel Writer**
### 8.2 Conectar `Unir Graduados Empleos` → Output
### 8.3 Configurar (Text File Output):
- **Step name**: `Escribir Resultado Final`
- **File**: `output/graduados_empleos_procesados.csv`
- **Separator**: `,`
- **Header**: ✓
- **Encoding**: `UTF-8`
- **Append**: No
- **Fields**: `Get Fields` → Seleccionar campos deseados

### 8.4 Campos sugeridos para salida:
- ID, NOMBRE_COMPLETO, ESTADO_ESTANDAR, FECHA_GRADUACION, CARRERA, PROMEDIO
- EMPRESA, CARGO, FECHA_INICIO, SALARIO_NUM, CIUDAD_LIMPIA, SECTOR_LIMPIO

---

## 9. Validación de Resultados

### 9.1 Agregar **Group By** después del Join para estadísticas:
- **Step name**: `Estadisticas Validacion`
- **Group by**: `ESTADO_ESTANDAR`, `SECTOR_LIMPIO`
- **Aggregates**: Count(*), Average(PROMEDIO), Average(SALARIO_NUM)

### 9.2 Agregar **Text File Output** para reporte de validación:
- **File**: `output/validacion_reporte.csv`

### 9.3 Verificar en Spoon:
- Ejecutar transformación (F9)
- Revisar **Execution Results** → **Logging**
- Verificar: Filas leídas, escritas, errores

---

## 10. Crear Job (Opcional - para orquestar)

### 10.1 `File` → `New` → `Job`
### 10.2 Arrastrar **Transformation** job entry
### 10.3 Configurar para ejecutar `etl_graduados_empleos.ktr`
### 10.4 Agregar **Check if file exists** para validar salida
### 10.5 Guardar como `job_etl_principal.kjb`

---

## Estructura de Carpetas Sugerida
```
PRACTICA_1/
├── data/
│   ├── graduados.xlsx      (convertir desde CSV)
│   └── empleos.csv
├── output/
│   ├── graduados_empleos_procesados.csv
│   └── validacion_reporte.csv
├── transformations/
│   └── etl_graduados_empleos.ktr
├── jobs/
│   └── job_etl_principal.kjb
└── README.md               (documentación GitHub)
```

---

## Problemas Comunes y Soluciones

| Problema | Solución |
|----------|----------|
| Fechas no parsean | Usar **Replace in string** antes para unificar separadores (`/` → `-`) |
| Join devuelve 0 filas | Verificar que IDs coincidan exactamente y streams estén ordenados |
| Caracteres extraños | Verificar **Encoding: UTF-8** en ambos inputs |
| Nombres con espacios múltiples | Usar `replace(/\s+/g, ' ')` en JavaScript |

---

## Ejecutar desde Línea de Comandos (Pan)
```bash
pan.bat /file:transformations/etl_graduados_empleos.ktr /level:Basic
```

---

## Notas para la Documentación GitHub

Captura pantallazos de:
1. Transformación completa en Spoon (vista general)
2. Configuración de cada paso clave
3. Execution Results (filas procesadas)
4. Archivo de salida abierto en Excel
5. Reporte de validación