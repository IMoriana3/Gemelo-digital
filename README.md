# Gemelo Digital — Seguidor + TCU

### Visor 3D en navegador de un seguidor solar de 1 eje (campo) y su unidad de control TCU, con estado en vivo (SCADA) o simulado, para operación, demos y validación visual.

## 1. Qué hace / objetivo

Representa en tiempo real un **seguidor solar de un eje N-S** y su **TCU** (Tracker
Control Unit) en una vista partida:

- **Izquierda — CAMPO:** el seguidor (bifilas desalineadas) sobre terreno con
  hierba, con sol/cielo dinámicos, sombras reales entre filas, viento y
  meteorología (lluvia/nieve).
- **Derecha — TCU:** el CAD real de la unidad de control (glTF/GLB) con conectores
  etiquetados (PV+/PV-, motor A/B, RS485, antena, portafusibles, seta de
  desconexión, válvula), placa interna y LEDs/cables que se iluminan con la
  corriente.

Sirve como **HMI/gemelo digital**: si hay un endpoint SCADA disponible, pinta el
ángulo, consigna, SoC y estado **medidos**; si no, corre un **modelo solar local**
(backtracking, viento, batería) como respaldo. Es una herramienta de
**visualización**, no un motor de cálculo bancable.

## 2. Cómo funciona (arquitectura)

Un único HTML autocontenido con dos escenas Three.js (WebGL) independientes que
comparten un estado común `s`/`cur`. Ese estado se alimenta de SCADA `/live` si
hay conexión, o del simulador local en cada tick.

```
            ┌───────────────────────── navegador (1 HTML) ─────────────────────────┐
  SCADA?    │   GET {SCADA_URL}/live ──┐                                            │
  (opcional)│                          ▼                                            │
            │                   estado s / cur  ◄── simulador local (fallback)      │
            │        ┌────────────┘         └─────────────┐                         │
            │        ▼                                     ▼                         │
            │  Escena IZQUIERDA (campo)            Escena DERECHA (TCU)              │
            │  · seguidor bifila N-S              · CAD glTF/GLB (tcu.glb)           │
            │  · sol/cielo, sombras PCF           · fallback CDN (jsDelivr)          │
            │  · viento + brújula                 · etiquetas de conectores         │
            │  · lluvia / nieve                   · LEDs + cables con corriente      │
            │  · marcador Norte                   · modelo a mano si falla el GLB    │
            └───────────────────────────────────────────────────────────────────────┘
  Geometría: tubo de torsión a lo largo de X (= eje N-S); los módulos basculan sobre
  X y miran a ±Z (= plano E-O). Mundo: +X=Sur, -X=Norte, +Z=Oeste, -Z=Este.
```

**Modelo solar local (fallback):** posición solar para Gorraiz (Navarra, lat
42,81°N, lon −1,58°), conversión de **hora civil → hora solar** (longitud + horario
de verano CET/CEST + ecuación del tiempo), **true-tracking + backtracking**
(Anderson-Mikofski), tope mecánico ±55° y velocidad 0,17°/s. Modelo de batería/carga
y lógica de viento.

**TCU:** carga `tcu.glb` por ruta relativa; si el origen no sirve el binario, hace
**fallback automático al mismo GLB del repo vía jsDelivr** (CORS abierto). Si no hay
GLB ni GLTFLoader, degrada a un modelo aproximado hecho a mano.

## 3. Contenido del paquete

| Archivo | Qué es |
|---|---|
| `index.html` | **Visor completo** (HTML + CSS + JS en un solo fichero). Único imprescindible. |
| `tcu.glb` | CAD real de la TCU (glTF binario, ~4,3 MB). Escena derecha. |
| `pcb.jpg` | Foto recortada de la PCB; textura de la placa interna de la TCU. |
| `docs/panel-integration.md` | Entrada `PROJECTS` + bloque `doc-src` para el Panel de Proyectos. |

Dependencias externas (CDN, no incluidas): Three.js r128 (cdnjs) y GLTFLoader
(jsDelivr), referenciadas con etiquetas script en la cabecera del HTML.

## 4. Requisitos

- Navegador moderno con **WebGL** (Chrome/Edge/Firefox/Safari recientes).
- **Conexión a internet** para Three.js + GLTFLoader (CDN) y, en su defecto, para el
  GLB vía jsDelivr.
- (Opcional) un **endpoint SCADA REST** que exponga `GET /live` con CORS abierto.

## 5. Instalación / configuración

Todo se configura por **variables al inicio del JS** (en `index.html`) o por
**parámetros de URL**:

| Qué | Dónde | Valor por defecto | Override por URL |
|---|---|---|---|
| Base SCADA | `SCADA_URL` | `http://localhost:8000` | `?scada=http://host:puerto` |
| Seguidor a seguir | `SCADA_NCU` / `SCADA_TCU` | `null` (el 1º de `/live`) | `?ncu=<n>&tcu=<n>` |
| Ruta del CAD | `TCU_GLB` | `tcu.glb` (relativa) | `?tcu=<ruta>` |
| Fallback CAD por CDN | `CDN_GLB` | jsDelivr de este repo `@main` | — |
| Sitio (sol) | `LAT` / `LON` | 42,81 / −1,58 (Gorraiz) | editar en el fichero |

> **Importante:** `CDN_GLB` apunta a `IMoriana3/gemelo-digital@main/tcu.glb`. Si
> nombras el repo distinto, edita esa línea de `index.html`.

## 6. Puesta en marcha (paso a paso)

**Local:**
1. Sirve la carpeta por **HTTP** (no `file://`):
   `python3 -m http.server 8080` en la raíz del repo.
2. Abre `http://localhost:8080/`.
3. **Con SCADA:** `http://localhost:8080/?scada=http://tu-host:puerto` (+ `?ncu=&tcu=`).

**GitHub Pages** (recomendado para URL fija): `Settings → Pages → Deploy from a
branch → main / (root)`. Como el visor se llama `index.html`, la URL será
`https://imoriana3.github.io/gemelo-digital/`.

## 7. Uso (controles)

Barra inferior de la vista de campo:

| Control | Función |
|---|---|
| **Día** (1–365) | Día del año (declinación/recorrido solar). |
| **Hora local** (0–24) | Hora civil local; se convierte a solar (muestra CET/CEST). |
| **Nubes** (0–100 %) | Nubosidad: agrisa el cielo y atenúa el sol. |
| **Viento** (0–120 km/h) + **brújula** | Velocidad y dirección; mueve la flecha de viento 3D. |
| **Modo Auto/Manual** | Auto sigue al sol; Manual habilita Este/Oeste. |
| **Este / Oeste** | En manual, mueve el seguidor a −55° / +55°. |
| **BT on/off** | Activa/desactiva el **backtracking**. Off = true-tracking. |
| **Tiempo** | Cicla **despejado → lluvia → nieve**. |
| **Etiquetas** | Muestra/oculta las etiquetas flotantes. |
| **Quitar envolvente** | Oculta la carcasa de la TCU para ver el interior. |

Ambas escenas se orbitan/zoom con ratón/touch.

## 8. Cómo interpretar los resultados

- **Ángulo / consigna:** el seguidor gira a 0,17°/s hacia la consigna; en auto la
  fija el algoritmo solar (con o sin backtracking).
- **Sombras entre filas:** con **BT off** y sol bajo, la fila delantera sombrea la
  cara de la trasera; con **BT on** se aplana para evitarlo. A mediodía solar apenas
  hay sombreado (correcto).
- **Marcador Norte** (letra «N» + flecha hacia −X): confirma alineación **N-S**. La
  flecha de viento usa el mismo rumbo que la brújula.
- **Nieve sobre módulos:** se acumula según inclinación — plano = se posa; muy
  inclinado (≥42°) = resbala. Es **visual**, no penaliza producción.
- **TCU:** LEDs/cables se iluminan con la corriente (PV = carga, motor = al mover).
  SoC y tensión vienen de SCADA si hay conexión.

## 9. Formato de datos / API (SCADA)

El visor consume `GET {SCADA_URL}/live`, que debe devolver un **array** de registros
(uno por seguidor) con CORS abierto. Campos usados (unidades de ingeniería):

| Campo | Tipo | Uso |
|---|---|---|
| `ncu`, `tcu` | id | Identifican el seguidor (filtro cliente). |
| `tilt_angle` | ° | Ángulo medido → `s.angle`. |
| `target_angle` | ° | Consigna → `s.target`. |
| `soc` | % | Estado de carga. |
| `battery_voltage` | V | Tensión de batería. |
| `bt_active` | bool | Backtracking activo. |
| `main_state` | str | Estado del controlador. |
| `alarms` | array | Alarmas activas. |

Sin `/live` accesible se usa el simulador local; las corrientes por pata se derivan
del modelo para animar los raíles.

## 10. Solución de problemas

| Síntoma | Causa | Arreglo |
|---|---|---|
| TCU «modelo aprox.», aviso fetch falló / CORS u origen distinto | El HTML se sirve desde un origen que no aloja `tcu.glb` | Hay **fallback automático a jsDelivr**; repo público y `CDN_GLB` con el OWNER/REPO correctos. Recarga con caché vaciada. |
| TCU «GLTFLoader no cargó» | No cargó el script del CDN | Revisa conexión / presencia de la etiqueta de GLTFLoader. |
| No hay sombras sobre los módulos | Estás con **BT on** o sol alto | Pon **BT off** y lleva la hora a primera/última del día. |
| Badge SCADA en rojo / datos quietos | `/live` no accesible o sin CORS | Comprueba `?scada=`, respuesta de la API y CORS. |
| Todo negro / no renderiza | WebGL off o sin internet (CDN) | Activa WebGL; verifica acceso a cdnjs/jsDelivr. |

## 11. Notas técnicas

- **Three.js r128** (global `THREE` por CDN). Sombras `PCFSoftShadowMap`, mapa 4096²,
  frustum ortográfico ±75 m.
- **Geometría:** tubo de torsión en X (N-S); basculación sobre X → caras a ±Z (E-O).
  Bifilas desalineadas (3 pares: central + derecha/izquierda 6 m al norte).
- **Sol:** declinación, conversión civil→solar (longitud + DST + ecuación del
  tiempo); backtracking Anderson-Mikofski; tope ±55°, slew 0,17°/s.
- **Batería/carga (sim):** pico FV 60 W, batería 6 Ah, carga máx. 54 W a 27 V,
  consumo lógico ~24 mA.
- **Viento:** >60 km/h → bandera ±55°; 40–60 km/h → limitado 30–55°; mismo criterio a
  la mañana (−) y a la tarde (+).
- **Texturas procedurales:** hierba (briznas con alpha en `InstancedMesh`), células
  FV, logo FACTIUN, flujo de corriente.

## 12. Limitaciones y posibles mejoras

- El campo es **modelado a mano**: techo de realismo (la vía «GLB del seguidor
  completo» se descartó por decisión de seguir a mano).
- La **meteorología es visual**: la nieve acumulada **no** reduce la producción FV.
  Mejora: que nieve/suciedad penalice corriente/SoC.
- Umbral de «resbala la nieve» fijo en **42°**; ajustable.
- **Un solo seguidor** por instancia (multi-seguidor: filtrar `/live` por `ncu/tcu`).
- > TODO: sin versionado formal. Asignar `v1.0` al publicar el repo.
- Pendiente el afinado de la **alineación E-O de las dos filas del bifila** en
  parcelas reales muy irregulares.

## Procedencia

Extraído de `IMoriana3/SolarGPTfull` (carpeta `viewers/`). Este repo standalone
contiene solo el gemelo digital; el motor de layout/simulación FV vive en SolarGPT.
