// ===== Limpieza Zapatillas (Modified Java Script Value) =====
// Salidas a declarar en la tabla Fields (todas String salvo las indicadas):
//  FECHA_VENTA, CLIENTE_LIMPIO, PRODUCTO_STD, CIUDAD_STD, GENERO_STD, METODO_PAGO_STD,
//  PRECIO_UNIT (Number, 16, 2), CANTIDAD_NUM (Integer, 16, 0), TOTAL_VENTA_NUM (Number, 16, 2),
//  TOTAL_CALCULADO (Number, 16, 2), TOTAL_CONSISTENTE, CORRECCIONES, FILA_VALIDA, RECHAZO_MOTIVO
// Solo ES3 (compatible con Rhino): sin normalize(), sin let/const.

function txt(v) { return (v == null) ? "" : ("" + v).replace(/^\s+|\s+$/g, "").replace(/\s+/g, " "); }
function sinTildes(s) {
  return s.replace(/[áàäâ]/g, "a").replace(/[éèëê]/g, "e")
          .replace(/[íìïî]/g, "i").replace(/[óòöô]/g, "o")
          .replace(/[úùüû]/g, "u").replace(/[ñ]/g, "n");
}
function clave(v) { return sinTildes(txt(v).toLowerCase()); }
function mayus(v)  { return sinTildes(txt(v)).toUpperCase(); }

// ---- Fechas: devuelve "yyyy-MM-dd" o null (se asume dd/MM/yyyy cuando es ambiguo) ----
var HOY = new Date();
function validarFecha(v) {
  var f = txt(v), a, d = 0, m = 0, y = 0;
  var r1 = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/;          // yyyy-MM-dd o yyyy/MM/dd
  var r2 = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/;    // dd/MM/yyyy, dd-MM-yyyy
  if ((a = r1.exec(f)) != null) { y = parseInt(a[1], 10); m = parseInt(a[2], 10); d = parseInt(a[3], 10); }
  else if ((a = r2.exec(f)) != null) {
    d = parseInt(a[1], 10); m = parseInt(a[2], 10); y = parseInt(a[3], 10);
    if (y < 100) y += 2000;
    if (m > 12 && d <= 12) { var t = d; d = m; m = t; }
  } else return null;
  var dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)) dim[1] = 29;
  if (y < 1900 || m < 1 || m > 12 || d < 1 || d > dim[m - 1]) return null;
  if (new Date(y, m - 1, d) > HOY) return null;               // no se permiten fechas futuras
  return y + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
}

// ---- Importes: quita "usd", corrige el signo; devuelve null si no es un número ----
var correcciones = [];
function importe(v, campo) {
  var crudo = clave(v), s = crudo.replace("usd", "").replace(/\s+/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  var n = parseFloat(s);
  if (crudo.indexOf("usd") >= 0) correcciones.push(campo + ": usd removido");
  if (n < 0) { n = -n; correcciones.push(campo + ": signo corregido"); }
  return Math.round(n * 100) / 100;
}

var FECHA_VENTA = validarFecha(fecha);
var PRECIO_UNIT = importe(precio_unitario, "precio");
var TOTAL_VENTA_NUM = importe(total_venta, "total");

// ---- Cantidad (acepta "uno", "dos", ...) ----
var cq = clave(cantidad), CANTIDAD_NUM = null, pal = { uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
if (/^\d+(\.0+)?$/.test(cq)) CANTIDAD_NUM = parseInt(cq, 10);
else if (pal[cq] != null) { CANTIDAD_NUM = pal[cq]; correcciones.push("cantidad: texto a numero"); }
if (CANTIDAD_NUM != null && (CANTIDAD_NUM < 1 || CANTIDAD_NUM > 100)) CANTIDAD_NUM = null;

// ---- Total calculado vs total informado ----
var TOTAL_CALCULADO = null, TOTAL_CONSISTENTE = "ND";
if (PRECIO_UNIT != null && CANTIDAD_NUM != null) {
  TOTAL_CALCULADO = Math.round(PRECIO_UNIT * CANTIDAD_NUM * 100) / 100;
  if (TOTAL_VENTA_NUM != null) TOTAL_CONSISTENTE = (Math.abs(TOTAL_CALCULADO - TOTAL_VENTA_NUM) <= 0.01) ? "S" : "N";
}

// ---- Texto y categorías ----
var CLIENTE_LIMPIO = mayus(cliente); if (CLIENTE_LIMPIO == "") CLIENTE_LIMPIO = "ND";

var pk = clave(producto).replace(/\s+/g, ""), PRODUCTO_STD;
if (pk == "airmax") PRODUCTO_STD = "Air Max";
else if (pk == "ultraboost") PRODUCTO_STD = "Ultra Boost";
else if (pk == "superstar") PRODUCTO_STD = "Super Star";
else PRODUCTO_STD = (pk == "") ? "ND" : txt(producto);

var ck = clave(ciudad), CIUDAD_STD;
if (ck == "medellin") CIUDAD_STD = "MEDELLIN";
else if (ck == "bogota") CIUDAD_STD = "BOGOTA";
else CIUDAD_STD = (ck == "") ? "ND" : ck.toUpperCase();

var gk = clave(genero), GENERO_STD;
if (gk == "m") GENERO_STD = "M"; else if (gk == "f") GENERO_STD = "F"; else GENERO_STD = "ND";   // X y vacío -> ND

var mk = clave(metodo_pago), METODO_PAGO_STD;
if (mk == "efectivo") METODO_PAGO_STD = "Efectivo";
else if (mk == "tarjeta") METODO_PAGO_STD = "Tarjeta";
else if (mk == "transferencia") METODO_PAGO_STD = "Transferencia";
else METODO_PAGO_STD = "ND";

// ---- Validez de la fila ----
var motivos = [];
if (FECHA_VENTA == null) motivos.push("fecha invalida o vacia");
if (PRECIO_UNIT == null) motivos.push("precio_unitario invalido");
if (CANTIDAD_NUM == null) motivos.push("cantidad vacia o invalida");
if (TOTAL_VENTA_NUM == null) motivos.push("total_venta invalido");
var FILA_VALIDA = (motivos.length == 0) ? "S" : "N";
var RECHAZO_MOTIVO = motivos.join("; ");
var CORRECCIONES = correcciones.join("; ");