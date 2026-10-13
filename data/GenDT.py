import pandas as pd
import numpy as np
import random
from faker import Faker

fake = Faker('es_CO')
num_records = 200

def introducir_errores(valor, tipo):
    if tipo == 'fecha':
        formatos = ['%Y/%m/%d', '%d-%m-%Y', '%Y-%m-%d', '%d/%m/%Y']
        return fake.date(pattern=random.choice(formatos))
    elif tipo == 'precio':
        return random.choice([valor, f"{valor}usd", -valor])
    elif tipo == 'cantidad':
        return random.choice([valor, 'uno', '', valor + 1])
    elif tipo == 'genero':
        return random.choice(['M', 'F', 'm', 'f', 'X', ''])
    elif tipo == 'ciudad':
        ciudades = ['Bogotá', 'bogota', 'BOGOTÁ', 'Medellin', 'medellín', 'MEDELLIN']
        return random.choice(ciudades)
    elif tipo == 'metodo_pago':
        return random.choice(['Tarjeta', 'Efectivo', 'tarjeta', 'efectivo', '', 'Transferencia'])
    elif tipo == 'producto':
        productos = ['Air Max', 'air max', 'Ultra Boost', 'ultra boost', 'SuperStar', 'Super Star']
        return random.choice(productos)
    elif tipo == 'cliente':
        nombre = fake.name()
        return random.choice([nombre, nombre.upper(), nombre.lower(), ''])
    else:
        return valor

data = []
for i in range(1, num_records + 1):
    id_venta = random.randint(1, 150)  # Duplicados intencionales
    fecha = introducir_errores(None, 'fecha')
    cliente = introducir_errores(None, 'cliente')
    producto = introducir_errores(None, 'producto')
    precio_unitario = introducir_errores(round(random.uniform(80, 200), 2), 'precio')
    cantidad = introducir_errores(random.randint(1, 3), 'cantidad')

    try:
        total_venta = float(precio_unitario) * int(cantidad)
    except:
        total_venta = introducir_errores(round(random.uniform(80, 600), 2), 'precio')

    ciudad = introducir_errores(None, 'ciudad')
    genero = introducir_errores(None, 'genero')
    metodo_pago = introducir_errores(None, 'metodo_pago')

    data.append([id_venta, fecha, cliente, producto, precio_unitario, cantidad, total_venta, ciudad, genero, metodo_pago])

df = pd.DataFrame(data, columns=[
    'id_venta', 'fecha', 'cliente', 'producto',
    'precio_unitario', 'cantidad', 'total_venta',
    'ciudad', 'genero', 'metodo_pago'
])

df.to_excel("ventas_zapatillas_sucias.xlsx", index=False)
