import pandas as pd

files = [
    "ventas_zapatillas_Errores.xlsx",
    "ventas_zapatillas_Errores_Uno.xlsx", 
    "ventas_zapatillas_Errores_Dos.xlsx"
]

for f in files:
    path = f"D:/OneDrive - Escuela Politécnica Nacional/2026-B/BUSINESS_INTEL/PRACTICAS/PRACTICA_1/data/{f}"
    try:
        df = pd.read_excel(path)
        print(f"\n{'='*60}")
        print(f"FILE: {f}")
        print(f"{'='*60}")
        print(f"Rows: {len(df)}, Columns: {len(df.columns)}")
        print(f"Columns: {list(df.columns)}")
        print(f"\nFirst 5 rows:")
        print(df.head().to_string())
        print(f"\nData types:")
        print(df.dtypes)
        print(f"\nNull values:")
        print(df.isnull().sum())
        for col in df.select_dtypes(include='object').columns:
            unique = df[col].nunique()
            if unique < 30:
                print(f"\n{col} (unique values: {unique}):")
                print(df[col].value_counts().head(15))
    except Exception as e:
        print(f"Error reading {f}: {e}")