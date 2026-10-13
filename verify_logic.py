#!/usr/bin/env python3
"""
Script de verificación: Simula la lógica de transformación PDI en Python
para validar que los resultados son correctos antes de construir en Spoon.
"""

import pandas as pd
import numpy as np
import unicodedata
import re

def normalizar_texto(texto):
    """Quita acentos y normaliza"""
    if pd.isna(texto) or texto == "":
        return ""
    return re.sub(r'[\u0300-\u036f]', '', unicodedata.normalize("NFD", str(texto))).strip()

def estandarizar_producto(prod):
    """6 variantes → 3 productos estándar"""
    if pd.isna(prod):
        return "ND"
    prod = str(prod).strip().lower()
    if prod in ["air max", "airmax"]:
        return "Air Max"
    elif prod in ["super star", "superstar"]:
        return "Super Star"
    elif prod in ["ultra boost", "ultraboost"]:
        return "Ultra Boost"
    return str(prod)

def estandarizar_ciudad(ciud):
    """6 variantes → 2 ciudades estándar"""
    if pd.isna(ciud):
        return "ND"
    ciud = normalizar_texto(ciud).upper()
    if "BOGOTA" in ciud:
        return "BOGOTA"
    elif "MEDELLIN" in ciud:
        return "MEDELLIN"
    return ciud

def estandarizar_genero(gen):
    """M/m/F/f/X → M/F/ND"""
    if pd.isna(gen):
        return "ND"
    gen = str(gen).strip().upper()
    if gen == "M":
        return "M"
    elif gen == "F":
        return "F"
    return "ND"

def estandarizar_metodo_pago(mp):
    """6 variantes → 4 estándar"""
    if pd.isna(mp):
        return "ND"
    mp = str(mp).strip().lower()
    if "efectivo" in mp:
        return "Efectivo"
    elif "tarjeta" in mp:
        return "Tarjeta"
    elif "transfer" in mp:
        return "Transferencia"
    return "ND"

def limpiar_precio(valor):
    """Quita 'usd', convierte a float, corrige negativos"""
    if pd.isna(valor):
        return 0.0
    s = str(valor).replace("usd", "").replace("USD", "").strip()
    try:
        return abs(float(s))
    except:
        return 0.0

def limpiar_cantidad(valor):
    """'uno' → 1, texto → número, nulos → 0"""
    if pd.isna(valor):
        return 0
    s = str(valor).strip().lower()
    if s in ["uno", "1"]:
        return 1
    elif s in ["2", "3", "4"]:
        return int(s)
    return 0

def parsear_fecha(fecha_str):
    """Intenta parsear múltiples formatos de fecha"""
    if pd.isna(fecha_str):
        return pd.NaT
    
    formatos = [
        "%d/%m/%Y",      # 27/01/2003
        "%Y/%m/%d",      # 2011/07/19
        "%Y-%m-%d",      # 1971-11-14
        "%d-%m-%Y",      # 12-11-1994
        "%d.%m.%Y",      # por si acaso
    ]
    
    for fmt in formatos:
        try:
            return pd.to_datetime(fecha_str, format=fmt)
        except:
            continue
    # Fallback: dejar que pandas intente
    try:
        return pd.to_datetime(fecha_str, dayfirst=True)
    except:
        return pd.NaT

def procesar_archivo(ruta, nombre_fuente):
    """Procesa un archivo completo"""
    print(f"\n{'='*60}")
    print(f"Procesando: {nombre_fuente} ({ruta})")
    print(f"{'='*60}")
    
    if ruta.endswith('.xlsx'):
        df = pd.read_excel(ruta)
    else:
        df = pd.read_csv(ruta, encoding='utf-8')
    
    print(f"Registros originales: {len(df)}")
    print(f"Columnas: {list(df.columns)}")
    
    # Aplicar transformaciones
    df['PRODUCTO_STD'] = df['producto'].apply(estandarizar_producto)
    df['CIUDAD_STD'] = df['ciudad'].apply(estandarizar_ciudad)
    df['GENERO_STD'] = df['genero'].apply(estandarizar_genero)
    df['METODO_PAGO_STD'] = df['metodo_pago'].apply(estandarizar_metodo_pago)
    df['CLIENTE_LIMPIO'] = df['cliente'].apply(lambda x: normalizar_texto(x).upper() if pd.notna(x) else "ND")
    
    df['PRECIO_LIMPIO'] = df['precio_unitario'].apply(limpiar_precio)
    df['CANTIDAD_LIMPIA'] = df['cantidad'].apply(limpiar_cantidad)
    df['TOTAL_CALCULADO'] = df['PRECIO_LIMPIO'] * df['CANTIDAD_LIMPIA']
    
    df['FECHA_STD'] = df['fecha'].apply(parsear_fecha)
    
    # Estadísticas
    fechas_validas = df['FECHA_STD'].notna().sum()
    print(f"Fechas válidas: {fechas_validas}/{len(df)} ({fechas_validas/len(df)*100:.1f}%)")
    print(f"Fechas inválidas: {df['FECHA_STD'].isna().sum()}")
    
    # Mostrar distribución de estandarizados
    for col in ['PRODUCTO_STD', 'CIUDAD_STD', 'GENERO_STD', 'METODO_PAGO_STD']:
        print(f"\n{col}:")
        print(df[col].value_counts().to_string())
    
    # Seleccionar campos finales
    cols_finales = ['id_venta', 'FECHA_STD', 'CLIENTE_LIMPIO', 'PRODUCTO_STD', 
                    'PRECIO_LIMPIO', 'CANTIDAD_LIMPIA', 'TOTAL_CALCULADO',
                    'CIUDAD_STD', 'GENERO_STD', 'METODO_PAGO_STD']
    
    df_final = df[cols_finales].copy()
    df_final.columns = ['id_venta', 'fecha_std', 'cliente', 'producto_std',
                        'precio_limpio', 'cantidad_limpia', 'total_calculado',
                        'ciudad_std', 'genero_std', 'metodo_pago_std']
    
    return df_final

# Procesar ambos archivos
data_dir = r"D:\OneDrive - Escuela Politécnica Nacional\2026-B\BUSINESS_INTEL\PRACTICAS\PRACTICA_1\data"

df1 = procesar_archivo(f"{data_dir}/ventas_zapatillas_Errores.xlsx", "Fuente 1 - Excel")
df2 = procesar_archivo(f"{data_dir}/ventas_zapatillas_Errores_Uno.csv", "Fuente 2 - CSV")

# Consolidar
df_consolidado = pd.concat([df1, df2], ignore_index=True)
print(f"\n{'='*60}")
print(f"CONSOLIDADO TOTAL: {len(df_consolidado)} registros")
print(f"{'='*60}")

# Validar: ningún nulo en campos clave
print(f"\nValidación de calidad:")
print(f"- Fechas válidas: {df_consolidado['fecha_std'].notna().sum()}/{len(df_consolidado)}")
print(f"- Precios > 0: {(df_consolidado['precio_limpio'] > 0).sum()}/{len(df_consolidado)}")
print(f"- Cantidades > 0: {(df_consolidado['cantidad_limpia'] > 0).sum()}/{len(df_consolidado)}")
print(f"- Productos estándar: {df_consolidado['producto_std'].nunique()} únicos")
print(f"- Ciudades estándar: {df_consolidado['ciudad_std'].nunique()} únicos")

# Métricas de validación (Group By)
metricas = df_consolidado.groupby(['producto_std', 'ciudad_std', 'genero_std', 'metodo_pago_std']).agg(
    TOTAL_VENTAS=('id_venta', 'count'),
    PRECIO_PROMEDIO=('precio_limpio', 'mean'),
    VENTAS_TOTALES=('total_calculado', 'sum'),
    CANTIDAD_PROMEDIO=('cantidad_limpia', 'mean')
).reset_index()

print(f"\nGrupos únicos en métricas: {len(metricas)}")
print(f"Ventas totales consolidadas: ${metricas['VENTAS_TOTALES'].sum():,.2f}")

# Guardar resultados de verificación
output_dir = r"D:\OneDrive - Escuela Politécnica Nacional\2026-B\BUSINESS_INTEL\PRACTICAS\PRACTICA_1\output"
df_consolidado.to_csv(f"{output_dir}/ventas_consolidadas_limpias.csv", index=False, encoding='utf-8')
metricas.to_csv(f"{output_dir}/validacion_metricas.csv", index=False, encoding='utf-8')

print(f"\n[OK] Archivos de verificación guardados en {output_dir}/")
print("   - ventas_consolidadas_limpias.csv")
print("   - validacion_metricas.csv")

# Muestra
print("\n--- Muestra consolidado (primeras 5) ---")
print(df_consolidado.head().to_string())

print("\n--- Muestra métricas (primeras 10) ---")
print(metricas.head(10).to_string())