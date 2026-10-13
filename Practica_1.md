## ESCUELA POLITÉCNICA NACIONAL

## Facultad de Ingeniería de Sistemas

Business Intelligence

## Práctica 1. Implementación de un proceso ETL y Staging Area con Pentaho Data Integration

Al final de esta práctica usted será capaz de:

- Reconocer los principales componentes de Pentaho Data Integration para implementar procesos ETL.

- Extraer datos desde una fuente externa utilizando Pentaho Data Integration.

- Implementar una Staging Area para preparar los datos antes de su carga.

- Aplicar transformaciones básicas para limpiar y estandarizar los datos.

- Ejecutar un flujo ETL completo siguiendo las etapas Extract  Transform  Load.

- Verificar la calidad y consistencia de los datos obtenidos después del proceso de transformación.

- Relacionar el proceso desarrollado con la arquitectura básica de un Data Warehouse.


Es una herramienta de la suite de Pentaho.

Escrito en Java.

Spoon es el diseñador gráfico de transformaciones y trabajos del sistema de ETLs de Pentaho Data Integration (PDI), también conocido como Kettle (acrónimo recursivo: "Kettle Extraction,

Transformation, Transportation, and Load Environment").

Está diseñado para ayudar en los procesos ETLs, que incluyen la Extracción, Transformación, Transporte y Carga de datos.

Spoon es una Interfaz Gráfica de Usuario (GUI), que permite diseñar transformaciones y trabajos que se pueden ejecutar con las herramientas de Kettle (Pan y Kitchen).

PDI facilita la construcción, actualización, y mantenimiento de Data Warehouses.

## INSTALACIÓN

## 1. Decargar las versiones:

## Pentaho Commnity Edition

pdi-ce-10.2.0.0-222

Java

jdk-18.0.2.1_windows-x64_bin

[software](https://epnecuador-my.sharepoint.com/:f:/g/personal/diana_martinez_epn_edu_ec/Eq0qFi-fYwFFlXkYtcRpyPIBskAxmLkFXyIyUItKoEK-Ww?e=tV7zj8)

- 2. Instalar el JDK

- 3. Configurar la variable de entorno JAVA_HOME

Pentaho necesita que JAVA_HOME apunte correctamente al JDK.

- a) Ir a Panel de control > Sistema > Configuración avanzada del sistema.

- b) Clic en "Variables de entorno".

- c) En "Variables del sistema", clic en "Nueva" y crear:

Nombre de la variable: JAVA_HOME

Valor de la variable: la ruta completa al JDK, por ejemplo:

C:\Program Files\Java\jdk18.0.2.1

- d) Editar la variable Path y añadir al final:

%JAVA_HOME%\bin


## 4. Dentro de la carpeta de Pentaho, ejecutar como Administrador el archivo Spoon:

## 5. Se deberá abrir la interfaz gráfica:

Durante esta práctica se implementará una versión simplificada del proceso de integración de datos:

Fuente de datos → Staging Area → Transformación → Destino

Donde:

- 1. Fuente de datos: archivo Excel que contiene información original.

- 2. Staging Area: área temporal donde se reciben y preparan los datos.

- 3. Transformación: proceso de limpieza y estandarización de la información.

- 4. Destino: repositorio donde se almacenan los datos procesados.

En una arquitectura empresarial, el destino final podría corresponder a un Data Warehouse o Data Mart.


## 6. Herramientas más utilizadas, Input, Output, Transform:

## 7. Crear una Transformación


- 8. Carga de un archivo excel como Input:


## 9. Añadir el paso Transformación-Replace in string

|   | Valor original Valor estandarizado |
| --- | --- |
| Egresado | EGRESADO |
| egresado | EGRESADO |
| EGR | EGRESADO |
| Graduado | GRADUADO |
| graduado | GRADUADO |
| GRD | GRADUADO |

Estamos homogeneizando diferentes representaciones del mismo dato antes de cargarlo.


## 10. Añadir el paso Output-Microsoft Excel writer

Para fines didácticos, en esta primera práctica el resultado se almacenará en un archivo Excel. En una solución de Business Intelligence real, los datos transformados normalmente serían cargados a una base de datos, Data Warehouse o Data Mart.


## 11. Crear las conexiones y ejecutar

## 12. Verificar el archivo de salida


## Trabajo grupal

Presentar en clase:

1.Al dataset provisto añadir dos transformaciones:

- Corregir los nombres y apellidos;

- validar fechas.

2.Diseñar y ejecutar un proceso ETL utilizando Pentaho Data Integration que incluya:

- dos tipos diferentes de fuentes de datos;

- una etapa de extracción;

- dos transformaciones de limpieza o estandarización;

- una salida con los datos procesados;

- validación de los resultados obtenidos.

Documentar en GitHub mediante Markdown:

- 1. objetivo del proceso;

- 2. fuentes de datos utilizadas;

- 3. problemas encontrados en los datos;

- 4. transformaciones aplicadas;

- 5. flujo ETL desarrollado;

- 6. evidencia del resultado;

- 7. explicación de cómo el proceso se relaciona con una arquitectura de Data Warehouse.

Subir el enlace del repositorio de GitHub.

Ejemplo de código en Markdown:

in

foc the da werk
