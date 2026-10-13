// ===== Limpieza Veterinaria (Modified Java Script Value) =====
// Salidas a declarar en la tabla Fields (todas String salvo las indicadas):
//  NOMBRE_DUENO_LIMPIO, NOMBRE_MASCOTA_LIMPIO, CIUDAD_STD, ESPECIE_STD, RAZA_STD,
//  SEXO_STD, VACUNADO_STD, MOTIVO_CONSULTA_STD,
//  PESO_KG (Number, 16, 2), EDAD_MESES (Integer, 16, 0),
//  FECHA_REGISTRO_ISO, FECHA_NACIMIENTO_ISO, FILA_VALIDA, RECHAZO_MOTIVO
// Solo usa JavaScript ES3 (compatible con el motor Rhino de PDI): sin normalize(), sin let/const.

function txt(v) { return (v == null) ? "" : ("" + v).replace(/^\s+|\s+$/g, "").replace(/\s+/g, " "); }

function sinTildes(s) {
  return s.replace(/[áàäâ]/g, "a").replace(/[éèëê]/g, "e")
          .replace(/[íìïî]/g, "i").replace(/[óòöô]/g, "o")
          .replace(/[úùüû]/g, "u").replace(/[ñ]/g, "n");
}
function clave(v) { return sinTildes(txt(v).toLowerCase()); }          // minúsculas, sin tildes
function mayus(v)  { return sinTildes(txt(v)).toUpperCase(); }         // MAYÚSCULAS, sin tildes
function titulo(s) {
  var p = s.split(" "), i;
  for (i = 0; i < p.length; i++) if (p[i].length > 0) p[i] = p[i].charAt(0).toUpperCase() + p[i].substring(1).toLowerCase();
  return p.join(" ");
}

// ---- Fechas: devuelve "yyyy-MM-dd" o null ----
var HOY = new Date();
function validarFecha(v) {
  var f = txt(v), a, d = 0, m = 0, y = 0;
  var r1 = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/;          // yyyy-MM-dd o yyyy/MM/dd
  var r2 = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/;    // dd/MM/yyyy, dd-MM-yyyy, dd.MM.yy
  if ((a = r1.exec(f)) != null) { y = parseInt(a[1], 10); m = parseInt(a[2], 10); d = parseInt(a[3], 10); }
  else if ((a = r2.exec(f)) != null) {
    d = parseInt(a[1], 10); m = parseInt(a[2], 10); y = parseInt(a[3], 10);
    if (y < 100) y += 2000;
    if (m > 12 && d <= 12) { var t = d; d = m; m = t; }       // 01/31/2018 se interpreta como MM/dd/yyyy
  } else return null;
  var dim = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (y % 4 == 0 && (y % 100 != 0 || y % 400 == 0)) dim[1] = 29;
  if (y < 1990 || m < 1 || m > 12 || d < 1 || d > dim[m - 1]) return null;
  if (new Date(y, m - 1, d) > HOY) return null;               // no se permiten fechas futuras
  return y + "-" + (m < 10 ? "0" : "") + m + "-" + (d < 10 ? "0" : "") + d;
}
var FECHA_REGISTRO_ISO = validarFecha(fecha_registro);
var FECHA_NACIMIENTO_ISO = validarFecha(fecha_nacimiento);
var motivos = [];
if (FECHA_REGISTRO_ISO == null) motivos.push("fecha_registro invalida o vacia");
if (FECHA_NACIMIENTO_ISO == null) motivos.push("fecha_nacimiento invalida o vacia");
else if (FECHA_REGISTRO_ISO != null && FECHA_NACIMIENTO_ISO > FECHA_REGISTRO_ISO) {
  FECHA_NACIMIENTO_ISO = null; motivos.push("fecha_nacimiento posterior al registro");
}
var FILA_VALIDA = (motivos.length == 0) ? "S" : "N";
var RECHAZO_MOTIVO = motivos.join("; ");

// ---- Nombres ----
var NOMBRE_DUENO_LIMPIO = mayus(nombre_dueno);
var NOMBRE_MASCOTA_LIMPIO = mayus(nombre_mascota);

// ---- Ciudad ----
var c = clave(ciudad), CIUDAD_STD;
if (c == "quito" || c == "qito" || c == "uio") CIUDAD_STD = "QUITO";
else if (c == "guayaquil" || c == "guayaquill") CIUDAD_STD = "GUAYAQUIL";
else if (c == "") CIUDAD_STD = "ND";
else CIUDAD_STD = c.toUpperCase();

// ---- Especie ----
var e = clave(especie), ESPECIE_STD;
if (/perr|canino/.test(e)) ESPECIE_STD = "Perro";
else if (/gat|felino/.test(e)) ESPECIE_STD = "Gato";
else if (/conejo/.test(e)) ESPECIE_STD = "Conejo";
else if (/hamster/.test(e)) ESPECIE_STD = "Hamster";
else if (e == "ave" || /pajaro/.test(e)) ESPECIE_STD = "Ave";
else ESPECIE_STD = (e == "") ? "ND" : titulo(e);

// ---- Raza ----
var r = clave(raza), RAZA_STD;
if (r == "") RAZA_STD = "ND";
else if (/^labrador/.test(r)) RAZA_STD = "Labrador";
else if (/^golden/.test(r)) RAZA_STD = "Golden Retriever";
else if (/^mesti/.test(r)) RAZA_STD = "Mestizo";
else if (/^pastor/.test(r)) RAZA_STD = "Pastor Alemán";
else if (/^bu?l+dog/.test(r)) RAZA_STD = "Bulldog";
else if (/^(poodle|pudel)/.test(r)) RAZA_STD = "Poodle";
else if (/^siame/.test(r)) RAZA_STD = "Siamés";
else RAZA_STD = titulo(r);

// ---- Sexo (M / H / ND) ----
var sx = clave(sexo), SEXO_STD;
if (sx == "m" || sx == "macho" || sx == "masculino") SEXO_STD = "M";
else if (sx == "f" || sx == "h" || sx == "hembra" || sx == "femenino") SEXO_STD = "H";
else SEXO_STD = "ND";

// ---- Vacunado (SI / NO / ND) ----
var vc = clave(vacunado), VACUNADO_STD;
if (vc == "si" || vc == "yes" || vc == "1" || vc == "true") VACUNADO_STD = "SI";
else if (vc == "no" || vc == "0" || vc == "false") VACUNADO_STD = "NO";
else VACUNADO_STD = "ND";

// ---- Motivo ----
var MOTIVO_CONSULTA_STD = mayus(motivo_consulta);
if (MOTIVO_CONSULTA_STD == "") MOTIVO_CONSULTA_STD = "ND";

// ---- Peso en kg (null si no es válido) ----
var ps = clave(peso).replace(",", "."), PESO_KG = null, num = parseFloat(ps);
if (!isNaN(num)) {
  if (/lb/.test(ps)) num = num * 0.453592;
  else if (!/kg/.test(ps) && /\dg$|\d\s*g$/.test(ps)) num = num / 1000;
  num = Math.round(num * 100) / 100;
  if (num > 0 && num <= 100) PESO_KG = num;
}

// ---- Edad en meses (null si no es válida). Un número sin unidad se toma como años ----
var ed = clave(edad), EDAD_MESES = null, palabras = { uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
var me = /^(\d+(?:[.,]\d+)?)\s*(mes|meses)$/.exec(ed), an = /^(\d+(?:[.,]\d+)?)\s*(ano|anos|anio|anios)?$/.exec(ed), meses = null;
if (me != null) meses = Math.round(parseFloat(me[1].replace(",", ".")));
else if (an != null) meses = Math.round(parseFloat(an[1].replace(",", ".")) * 12);
else if (palabras[ed] != null) meses = palabras[ed] * 12;
if (meses != null && meses >= 0 && meses <= 360) EDAD_MESES = meses;