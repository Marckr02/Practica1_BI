# Guía Paso a Paso: ETL Ventas Zapatillas en Pentaho Data Integration (Spoon)

## Fuentes de Datos
- **Fuente 1**: `data/ventas_zapatillas_Errores.xlsx` (Excel - 200 registros)
- **Fuente 2**: `data/ventas_zapatillas_Errores_Uno.csv` (CSV - 200 registros)
- *Ambas tienen la misma estructura pero diferente distribución de errores*

---

## 1. Crear la Transformación Principal

### 1.1 Abrir Spoon y crear nueva transformación
- `File` → `New` → `Transformation`
- Guardar como `transformations/etl_ventas_zapatillas.ktr`

---

## 2. Configurar Entrada Excel (Fuente 1)

### 2.1 Arrastrar **Microsoft Excel Input** (categoría Input)
### 2.2 Configurar:
- **Step name**: `Leer Ventas Excel`
- **File or directory**: Seleccionar `data/ventas_zapatillas_Errores.xlsx`
- **Sheet name**: `Sheet1` (o el nombre de la hoja)
- **Header row present**: ✓
- **Preview**: Verificar que lee 200 filas, 10 columnas

---

## 3. Configurar Entrada CSV (Fuente 2)

### 3.1 Arrastrar **CSV File Input** (categoría Input)
### 3.2 Configurar:
- **Step name**: `Leer Ventas CSV`
- **File or directory**: Seleccionar `data/ventas_zapatillas_Errores_Uno.csv`
- **Separator**: `,` (coma)
- **Header row present**: ✓
- **Encoding**: `UTF-8`
- **Preview**: Verificar 200 filas, 10 columnas

---

## 4. Transformación 1: Estandarizar Valores Categóricos (Ambas Fuentes)

### 4.1 Arrastrar **Modified Java Script Value** (categoría Transform)
### 4.2 Conectar `Leer Ventas Excel` → `Modified Java Script Value`
### 4.3 **Step name**: `Estandarizar Categoricos`
### 4.4 Código JavaScript:

```javascript
// ============================================
// NORMALIZACIÓN DE PRODUCTO (6 variantes → 3)
// ============================================
var prod = PRODUCTO ? PRODUCTO.toString().trim().toLowerCase() : "";
var producto_std;
switch(prod) {
    case "air max": 
    case "airmax": 
        producto_std = "Air Max"; 
        break;
    case "super star": 
    case "superstar": 
        producto_std = "Super Star"; 
        break;
    case "ultra boost": 
    case "ultraboost": 
        producto_std = "Ultra Boost"; 
        break;
    default: 
        producto_std = PRODUCTO; // mantener original si no coincide
}
PRODUCTO_STD = producto_std;

// ============================================
// NORMALIZACIÓN DE CIUDAD (6 variantes → 2)
// ============================================
var ciud = CIUDAD ? CIUDAD.toString() : "";
// Quitar acentos y normalizar
ciud = ciud.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
var ciudad_std;
if (ciud.indexOf("BOGOTA") >= 0) {
    ciudad_std = "BOGOTA";
} else if (ciud.indexOf("MEDELLIN") >= 0) {
    ciudad_std = "MEDELLIN";
} else {
    ciudad_std = ciud;
}
CIUDAD_STD = ciudad_std;

// ============================================
// NORMALIZACIÓN DE GÉNERO (M/m/F/f/X → M/F/ND)
// ============================================
var gen = GENERO ? GENERO.toString().trim().toUpperCase() : "";
var genero_std;
if (gen == "M") genero_std = "M";
else if (gen == "F") genero_std = "F";
else genero_std = "ND"; // No definido (incluye X, nulos, etc.)
GENERO_STD = genero_std;

// ============================================
// NORMALIZACIÓN MÉTODO PAGO (6 variantes → 4)
// ============================================
var mp = METODO_PAGO ? METODO_PAGO.toString().trim().toLowerCase() : "";
var metodo_pago_std;
if (mp.indexOf("efectivo") >= 0) metodo_pago_std = "Efectivo";
else if (mp.indexOf("tarjeta") >= 0) metodo_pago_std = "Tarjeta";
else if (mp.indexOf("transfer") >= 0) metodo_pago_std = "Transferencia";
else metodo_pago_std = "ND";
METODO_PAGO_STD = metodo_pago_std;

// ============================================
// LIMPIEZA CLIENTE (quitar acentos, mayúsculas)
// ============================================
var cli = CLIENTE ? CLIENTE.toString() : "";
if (cli) {
    cli = cli.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}
CLIENTE_LIMPIO = cli;
```

### 4.5 **Get Fields**: Click para obtener campos del stream anterior
### 4.6 **Compatibility mode**: ✓

### 4.7 **Duplicar para Fuente 2**:
- Copiar el paso `Estandarizar Categoricos` (Ctrl+C, Ctrl+V)
- Conectar `Leer Ventas CSV` → copia
- Renombrar copia a `Estandarizar Categoricos CSV`

---

## 5. Transformación 2: Limpiar Numéricos y Fechas (Ambas Fuentes)

### 5.1 Arrastrar **Modified Java Script Value** → Conectar después de `Estandarizar Categoricos`
### 5.2 **Step name**: `Limpiar Numericos Fechas`
### 5.3 Código JavaScript:

```javascript
// ============================================
// PRECIO_UNITARIO: quitar "usd", convertir, corregir negativos
// ============================================
var precioStr = PRECIO_UNITARIO ? PRECIO_UNITARIO.toString().replace(/usd/gi, "").trim() : "0";
var precioNum = parseFloat(precioStr);
if (isNaN(precioNum)) precioNum = 0;
PRECIO_LIMPIO = Math.abs(precioNum); // Valor absoluto para corregir negativos

// ============================================
// CANTIDAD: "uno" → 1, texto → número, nulos → 0
// ============================================
var cantStr = CANTIDAD ? CANTIDAD.toString().trim().toLowerCase() : "0";
var cantNum;
switch(cantStr) {
    case "uno": case "1": cantNum = 1; break;
    case "2": cantNum = 2; break;
    case "3": cantNum = 3; break;
    case "4": cantNum = 4; break;
    default: cantNum = 0;
}
CANTIDAD_LIMPIA = cantNum;

// ============================================
// TOTAL_VENTA: RECALCULAR = precio × cantidad (más confiable)
// ============================================
TOTAL_CALCULADO = PRECIO_LIMPIO * CANTIDAD_LIMPIA;

// ============================================
// FECHA: mantener original para que Select Values la parseé
// ============================================
FECHA_ORIGINAL = FECHA;
```

### 5.4 **Get Fields** → Click
### 5.5 **Compatibility mode**: ✓

### 5.6 **Duplicar para Fuente 2** (igual que paso anterior)

---

## 6. Validación y Conversión de Fechas (Select Values)

### 6.1 Arrastrar **Select Values** (categoría Transform)
### 6.2 Conectar `Limpiar Numericos Fechas` → `Select Values`
### 6.3 **Step name**: `Convertir Fecha`
### 6.4 Pestaña **Select & Alter**: Mantener todos los campos
### 6.5 Pestaña **Metadata**:
- Buscar campo `FECHA_ORIGINAL` (o `FECHA` si no renombraste)
- **Name**: `FECHA_STD` (nuevo nombre)
- **Type**: `Date`
- **Format**: `dd/MM/yyyy`  ← **IMPORTANTE**: PDI 9+ auto-detecta: `yyyy-MM-dd`, `yyyy/MM/dd`, `dd-MM-yyyy`
- **Length**: 10
- **Precision**: -1

> **Nota**: Si PDI no parsea algún formato, agregar un paso `Replace in string` ANTES para unificar separadores (`/` → `-`)

### 6.6 **Duplicar para Fuente 2**

---

## 7. Filtrar Fechas Inválidas (Control de Calidad)

### 7.1 Arrastrar **Filter Rows** (categoría Flow)
### 7.2 Conectar `Convertir Fecha` → `Filter Rows`
### 7.3 **Step name**: `Validar Fechas`
### 7.4 **Condition**: `FECHA_STD is not null`
### 7.5 **Send true to**: Siguiente paso (datos válidos)
### 7.6 **Send false to**: Crear **Text File Output** → `output/fechas_invalidas.xlsx` (auditoría)

### 7.7 **Duplicar para Fuente 2**

---

## 8. Seleccionar Campos Finales por Fuente (Select Values)

### 8.1 Arrastrar **Select Values** después de `Validar Fechas` (rama true)
### 8.2 **Step name**: `Seleccionar Campos Finales`
### 8.3 Pestaña **Select & Alter**: Seleccionar solo:
- `ID_VENTA` (o `id_venta`)
- `FECHA_STD`
- `CLIENTE_LIMPIO`
- `PRODUCTO_STD`
- `PRECIO_LIMPIO`
- `CANTIDAD_LIMPIA`
- `TOTAL_CALCULADO`
- `CIUDAD_STD`
- `GENERO_STD`
- `METODO_PAGO_STD`

### 8.4 **Duplicar para Fuente 2** (misma selección de campos)

---

## 9. Unir (Append) las Dos Fuentes

### 9.1 Arrastrar **Append Streams** (categoría Flow)
### 9.2 Conectar:
- `Seleccionar Campos Finales` (Fuente 1) → `Append Streams` (input 1)
- `Seleccionar Campos Finales` (Fuente 2) → `Append Streams` (input 2)
### 9.3 **Step name**: `Unir Ventas Consolidado`
- No requiere ordenación ni claves (simple unión vertical)

---

## 10. Salida Principal: Dataset Consolidado Limpio

### 10.1 Arrastrar **Text File Output** (categoría Output)
### 10.2 Conectar `Unir Ventas Consolidado` → `Text File Output`
### 10.3 **Step name**: `Escribir Ventas Limpio`
### 10.4 Configurar:
- **File**: `output/ventas_consolidadas_limpias.csv`
- **Extension**: `csv`
- **Separator**: `,` (o `;` según locale)
- **Header**: ✓
- **Encoding**: `UTF-8`
- **Append**: No
- **Fast data dump**: No
- **Fields**: `Get Fields` → Seleccionar todos

---

## 11. Validación: Métricas de Calidad (Group By)

### 11.1 Arrastrar **Group By** (categoría Transform)
### 11.2 Conectar `Unir Ventas Consolidado` → `Group By`
### 11.3 **Step name**: `Metricas Validacion`
### 11.4 **Group by fields**:
- `PRODUCTO_STD`
- `CIUDAD_STD`
- `GENERO_STD`
- `METODO_PAGO_STD`

### 11.5 **Aggregates** (Agregar):
| Subject | Type | Result Field Name |
|---------|------|-------------------|
| `*` (count) | Count | `TOTAL_VENTAS` |
| `PRECIO_LIMPIO` | Average | `PRECIO_PROMEDIO` |
| `TOTAL_CALCULADO` | Sum | `VENTAS_TOTALES` |
| `CANTIDAD_LIMPIA` | Average | `CANTIDAD_PROMEDIO` |

### 11.6 Arrastrar **Text File Output** → Conectar `Metricas Validacion`
### 11.7 **File**: `output/validacion_metricas.csv`
### 11.8 Configurar igual que salida principal

---

## 12. (Opcional) Job de Orquestación

### 12.1 `File` → `New` → `Job`
### 12.2 Arrastrar **Transformation** job entry
### 12.3 Configurar para ejecutar `transformations/etl_ventas_zapatillas.ktr`
### 12.4 Agregar **Check file exists** para validar `output/ventas_consolidadas_limpias.csv`
### 12.5 Agregar **Mail** o **Write to log** para notificación
### 12.6 Guardar como `jobs/job_etl_ventas.kjb`

---

## 13. Variables de Entorno (Buena Práctica)

En lugar de rutas hardcodeadas, usar variables:

1. `Edit` → `Edit the transformation settings` → `Parameters`
2. Agregar:
   - `PARAM_DIR_DATA` = `${Internal.Transformation.Filename.Directory}/../data`
   - `PARAM_DIR_OUTPUT` = `${Internal.Transformation.Filename.Directory}/../output`
3. En pasos Input/Output usar: `${PARAM_DIR_DATA}/ventas_zapatillas_Errores.xlsx`

---

## 14. Ejecutar y Verificar

### 14.1 Ejecutar (F9)
### 14.2 Revisar **Execution Results**:
- `Leer Ventas Excel`: 200 filas leídas
- `Leer Ventas CSV`: 200 filas leídas
- `Unir Ventas Consolidado`: 400 filas escritas
- `Escribir Ventas Limpio`: 400 filas
- `Metricas Validacion`: ~20-30 filas (grupos únicos)

### 14.3 Verificar archivos generados:
```bash
# En terminal
wc -l output/ventas_consolidadas_limpias.csv  # Debe ser 401 (header + 400)
wc -l output/validacion_metricas.csv
```

### 14.4 Abrir CSV en Excel para revisión visual

---

## Estructura de Carpetas Final
```
PRACTICA_1/
├── data/
│   ├── ventas_zapatillas_Errores.xlsx
│   ├── ventas_zapatillas_Errores_Uno.csv
│   ├── ventas_zapatillas_Errores_Uno.xlsx
│   ├── ventas_zapatillas_Errores_Dos.xlsx
│   └── GenDT.py
├── output/
│   ├── ventas_consolidadas_limpias.csv
│   ├── validacion_metricas.csv
│   └── fechas_invalidas.csv
├── transformations/
│   └── etl_ventas_zapatillas.ktr
├── jobs/
│   └── job_etl_ventas.kjb
└── docs/
    └── (14 capturas de pantalla)
```

---

## Problemas Comunes y Soluciones

| Problema | Solución |
|----------|----------|
| Fechas no parsean (quedan null) | Agregar `Replace in string` ANTES de Select Values: reemplazar `/` por `-` en campo FECHA |
| "uno" no convierte a 1 | Verificar `toLowerCase()` y `trim()` en JavaScript; debug con `Write to log` |
| Acentos se ven mal (�) | Usar `normalize("NFD").replace(/[\u0300-\u036f]/g, "")` en JavaScript |
| Append Streams duplica header | Verificar que **ambos** streams tengan mismos nombres de campos y orden |
| Memoria/Java heap | En `spoon.bat`/`.sh`: aumentar `-Xmx2g` o más |
| Encoding CSV | Forzar `UTF-8` en CSV Input y Text File Output |

---

## Ejecutar desde Línea de Comandos

```bash
# Windows
cd <PENTAHO_HOME>
pan.bat /file:"D:\ruta\PRACTICA_1\transformations\etl_ventas_zapatillas.ktr" /level:Basic

# Linux/Mac
./pan.sh -file:"D:/ruta/PRACTICA_1/transformations/etl_ventas_zapatillas.ktr" -level:Basic

# Job
kitchen.bat /file:"D:\ruta\PRACTICA_1\jobs\job_etl_ventas.kjb" /level:Basic
```

---

## Checklist de Entrega

- [ ] Transformación `.ktr` funciona sin errores
- [ ] 2 fuentes: Excel + CSV
- [ ] Staging Area (pasos Input separados)
- [ ] Transformación 1: Categorísticos (JS + Replace)
- [ ] Transformación 2: Numéricos + Fechas (JS + Select Values + Filter)
- [ ] Unión: Append Streams
- [ ] Salida principal: CSV consolidado (400 regs)
- [ ] Validación: Group By + métricas
- [ ] 14 capturas en `docs/`
- [ ] README.md completo (7 secciones)
- [ ] Subido a GitHub: https://github.com/Marckr02/Practica1_BI.git