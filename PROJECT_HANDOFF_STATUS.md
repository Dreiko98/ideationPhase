# WaterLens MVP — Estado del proyecto y handoff técnico (para otra IA)

> **Actualización de cierre (2026-07-21):** este handoff describe el estado anterior a la finalización. El pipeline fue estabilizado, se generó `public/data`, se añadieron pruebas y documentación, se completaron los flujos locales y se validaron build y rutas de producción. Consulta `README.md` para el estado y los comandos vigentes.

> Fecha de corte: 2026-07-21  
> Estado general: **MVP parcialmente implementado** (frontend base + pipeline analítico inicial), **no runnable end-to-end todavía**.

---

## 1) Resumen ejecutivo

Se construyó desde cero una primera base funcional de WaterLens con:

- Monorepo inicial (Next.js App Router + TypeScript + Tailwind + Recharts).
- Capa analítica Python (generación sintética + modelado + export JSON) en borrador avanzado.
- Páginas principales del producto (My Water, Water Copilot, My Community, Act & Connect, Onboarding, Bill Explainer).
- Capa local determinista de resumen IA y chat Copilot sin API keys.

Pero aún faltan piezas críticas para considerarlo “MVP completo”:

1. **No existe README**.
2. **No existen tests**.
3. **No se han ejecutado ni validado comandos end-to-end**.
4. **No existe `public/data/` generado en el repo actual** (la app fallará al leer JSON).
5. **`analytics/pipeline.py` contiene riesgos de runtime/consistencia** que deben corregirse antes de exportar datos confiables.

---

## 2) Estado por capas

## 2.1 Frontend (Next.js) — estado real

### Estructura creada

- `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- `app/my-water/page.tsx`
- `app/copilot/page.tsx`
- `app/community/page.tsx`
- `app/act-connect/page.tsx`
- `app/onboarding/page.tsx`
- `app/bill-explainer/page.tsx`
- `components/*` (navegación, selector de hogar, KPI card, vistas de módulos)
- `lib/types.ts`, `lib/data.ts`, `lib/aiSummary.ts`, `lib/copilot.ts`

### Lo que sí está implementado

- **Navegación principal** con 6 módulos.
- **Selector de 5 hogares demo** por query param `?household=...`.
- **My Water**:
  - 5 KPI cards con interacción “Explain”.
  - 2 charts (banda y tendencia forecast).
  - resumen IA estructurado (4 secciones).
  - anomalías recientes + top acciones.
- **Water Copilot**:
  - chat local rule-based con intents.
  - preguntas sugeridas clicables.
  - “facts used” + follow-up en respuestas.
- **My Community**:
  - comparativa cohorte.
  - agregados de distrito.
  - visual de barras como heatmap proxy.
- **Act & Connect**:
  - flujo local para confirmar/downgradear/resolver anomalía.
  - creación simulada de ticket.
  - guardado local de meta.
- **Bill Explainer**:
  - desglose sintético de factura + tooltips explicativos.
- **Onboarding**:
  - flujo multi-step visual (4 pasos).

### Brechas frontend

1. **Dependencia dura de JSON inexistentes** en `public/data/*.json` vía `lib/data.ts`.
2. No hay manejo robusto de errores de lectura JSON (si falta archivo, rompe SSR).
3. Componentes “accionables” son local state en cliente; no persistencia ni contrato de actualización contra datos analíticos.
4. Algunas piezas están presentadas como texto/placeholder funcional:
   - onboarding no persiste inputs reales por campo.
   - paneles sin integración real con “interactions” sintéticos.
5. No se validó accesibilidad (teclado/contraste/ARIA) ni responsive QA.
6. No hay pruebas de frontend (`vitest` está en `package.json`, pero no hay tests ni config de test runner para React/Next).

---

## 2.2 Datos sintéticos (Python) — estado real

Archivo principal: `analytics/synthetic.py`

### Lo implementado

- Seed fija (`SEED=20260721`) y `N_HOUSEHOLDS=500` en `analytics/config.py`.
- Generación de:
  - hogares (`households`)
  - metadata de medidor (`meters`)
  - contexto clima/calendario diario (`weather_daily`)
  - consumo diario 12 meses (`daily_readings`)
  - consumo horario 60 días (`hourly_readings`)
  - eventos de hogar (`events`)
  - interacciones de app (`interactions`)
  - agregados de distrito (`district_aggregates`)
- Se inyectan patrones:
  - picos mañana/tarde
  - diferencia fin de semana
  - sensibilidad clima
  - irrigación verano (si jardín)
  - leaks de bajo flujo en subset
  - picos bruscos en subset
- Story forcing para `HH-0001`:
  - ajuste +12% últimos 7 días en diario
  - refuerzo de consumo 06:00–08:00 en perfil horario
  - eventos históricos `known_leak` + `repair`.

### Brechas / riesgos en sintético

1. `last_sync` en `meters` usa `pd.Timestamp.now()` → reduce reproducibilidad estricta temporal.
2. Faltan algunos campos exactos pedidos en la especificación final de hourly/events con semántica completamente trazable (hay la mayoría, pero no todos los matices de calidad/causalidad explicativa).
3. No existe documentación formal de fórmulas ni diccionario de datos.
4. No hay validación automática de que los 5 usuarios demo cumplan su historia de negocio completa.

---

## 2.3 Pipeline analítico (Python ML) — estado real

Archivo principal: `analytics/pipeline.py`

### Lo implementado (borrador)

- Cálculo de features (muchas de la lista requerida): rolling stats, budget progress, shares horarias, ratios, sensitivities, CV, trend, anomaly score, leak probability, engagement/response.
- Forecast:
  - modelo principal `HistGradientBoostingRegressor`
  - baseline estacional con `lag_7`
  - métricas MAE/MAPE vs baseline
  - forecast 7/14 días + banda simple de incertidumbre
- Clustering:
  - `KMeans` con barrido K=3..7
  - criterio silhouette
  - etiquetas neutrales por centroides
- Anomalías:
  - reglas (night flow, cambio súbito, high volume, long flow)
  - `IsolationForest` combinado
  - salida con severidad, score, causa, confianza, exceso estimado, estado
- Peer matching:
  - cohortes por composición hogar + vivienda + contexto.
- Recomendaciones:
  - scoring híbrido por impacto/relevancia/confianza/esfuerzo/contexto.
- Export JSON objetivo a `public/data/`:
  - households, metrics, forecast, anomalies, recommendations, bill, community, clusters.

### Problemas técnicos detectados (prioridad alta)

1. **`public/data/` aún no existe** porque no se ha corrido pipeline.
2. En `pipeline.py` hay señales de código no consolidado:
   - función `_load_raw` usa `pd.Path` (inválido) aunque no se usa.
   - mezcla de caminos con strings y `/` no homogeneizada para Windows.
3. Riesgo de **alineaciones erróneas de índices** en `engineer_features`:
   - varios `.map(...)` y combinaciones `groupby().tail().values` pueden desalinear household_id ↔ valor.
4. `anomaly_score` se calcula con expresión compleja potencialmente frágil por mezcla de series de distinto índice.
5. Riesgo de serialización JSON para tipos no normalizados en algunos bloques (aunque `_safe_float` cubre números numpy, no cubre todos los tipos posibles).
6. Ajustes “forzados” del demo (`HH-0001`) están hardcodeados y pueden quedar inconsistentes con métricas derivadas si cambia el pipeline.
7. No hay tests de calidad de outputs ni consistencia cross-page.

### Conclusión de esta capa

La arquitectura está encaminada, pero **la capa analítica necesita estabilización + validación** antes de poder declarar “genuinamente ejecutada” con confianza.

---

## 2.4 Copilot/IA local — estado real

### Implementado

- `lib/aiSummary.ts`: resumen determinista por plantilla (4 bloques).
- `lib/copilot.ts`: detección de intents por regex + tool functions locales:
  - consumo reciente, forecast, budget, peer, anomaly/leak, bill, recomendaciones, support request, update context, save goal.
- Sin API key ni dependencia externa.

### Brechas

1. Intent classifier simple; falta robustez lingüística.
2. No existe capa formal de “tool registry + schema validation”.
3. No se verifica automáticamente que **ninguna respuesta invente métricas** (requisito explícito).

---

## 3) Estado de cumplimiento frente a requisitos de negocio

## Cumplido parcialmente

- Arquitectura base monorepo sin DB.
- Frontend con módulos solicitados.
- Pipeline ML presente (forecast/clustering/anomaly/reco).
- Story principal HH-0001 parcialmente inyectada.
- UI en inglés.
- Sin API key obligatoria.

## No cumplido aún / no validado

1. **Criterio de runnable local completo** (hoy no, faltan datos generados y fixing pipeline).
2. **Reproducibilidad validada por tests**.
3. **Consistencia total de story en todas las páginas**.
4. **Comparaciones “genuinamente similares” validadas**.
5. **Privacidad validada con tests de no filtrado household-level**.
6. **README completo** con fórmulas y guía.
7. **Testing suite completa** (Python + frontend + schemas + consistency).
8. **Botones críticos** con flujo funcional/persistente o marcado explícito “prototype-only”.

---

## 4) Inventario de archivos actuales

### Config/infra
- `package.json`
- `tsconfig.json`
- `tailwind.config.ts`
- `postcss.config.js`
- `next.config.mjs`
- `next-env.d.ts`
- `requirements.txt`

### Python
- `analytics/config.py`
- `analytics/synthetic.py`
- `analytics/pipeline.py`
- `analytics/__init__.py`
- `scripts/generate_synthetic_data.py`
- `scripts/run_analytics.py`

### Frontend
- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `app/my-water/page.tsx`
- `app/copilot/page.tsx`
- `app/community/page.tsx`
- `app/act-connect/page.tsx`
- `app/onboarding/page.tsx`
- `app/bill-explainer/page.tsx`
- `components/navigation.tsx`
- `components/household-selector.tsx`
- `components/kpi-card.tsx`
- `components/my-water-view.tsx`
- `components/copilot-chat.tsx`
- `components/community-view.tsx`
- `components/act-connect-panel.tsx`
- `components/onboarding-flow.tsx`
- `lib/types.ts`
- `lib/data.ts`
- `lib/aiSummary.ts`
- `lib/copilot.ts`

### Faltantes importantes
- `public/data/*` (no generado)
- `tests/*` (no existen)
- `README.md` (no existe)
- Config de test frontend (`vitest.config.*`, setup files) no existe.

---

## 5) Qué debe hacer la siguiente IA (plan de cierre ejecutable)

## Fase A — estabilizar analytics (bloqueante)

1. Corregir `pipeline.py`:
   - eliminar `_load_raw` inválido o arreglarlo.
   - normalizar paths con `pathlib.Path`.
   - rehacer cálculos de features para asegurar alineación por `household_id`.
   - simplificar y validar `anomaly_score`.
2. Ejecutar:
   - `python scripts/generate_synthetic_data.py`
   - `python scripts/run_analytics.py`
3. Verificar que se creen JSON en `public/data/`.
4. Validar constraints story HH-0001:
   - +~12% semana
   - forecast mes > budget
   - pico 06:00–08:00
   - leak night flow bajo
   - percentile ~64
   - 1 recomendación abierta + leak histórico resuelto.

## Fase B — robustez frontend

1. Agregar manejo de error en `lib/data.ts` / páginas si faltan JSON.
2. Corregir inconsistencias UI:
   - Community page usa `snapshot.household_id` en texto “Your district”.
3. Conectar mejor acciones Act & Connect / Copilot con estado compartido (aunque sea prototipo local coherente).
4. Marcar explícitamente acciones no persistentes como “prototype-only” si aplica.

## Fase C — tests obligatorios

Implementar suite en `tests/`:

- Reproducibilidad sintética (seed fija).
- Fórmulas de features clave.
- Forecast outputs (shape, horizontes, métricas y baseline comparison).
- Reglas de anomalía.
- Peer matching fairness.
- Scoring de recomendaciones.
- Validación de schemas JSON.
- Privacidad: no household-level leakage en community.
- Consistencia numérica cross-page.
- Copilot: no inventa métricas.
- Frontend smoke tests de componentes críticos.

## Fase D — documentación final

1. Crear `README.md` completo con:
   - arquitectura
   - comandos
   - proceso de datos
   - fórmulas exactas (todas las métricas requeridas)
   - limitaciones
   - privacidad
   - roadmap LLM adapter.
2. Incluir demo flow paso a paso (story principal).

## Fase E — validación final de acceptance criteria

Checklist exhaustivo contra 21 secciones del prompt original y cerrar brechas restantes.

---

## 6) Comandos previstos (objetivo final)

```bash
python -m venv .venv
pip install -r requirements.txt
python scripts/generate_synthetic_data.py
python scripts/run_analytics.py
npm install
npm run dev
```

Luego:

```bash
pytest
npm test
npm run build
```

---

## 7) Riesgos abiertos

1. Riesgo de pipeline no determinista por timestamps “now”.
2. Riesgo de inconsistencias por hardcoding de story sobre outputs modelados.
3. Riesgo de rotura SSR en Next si no hay JSON.
4. Riesgo de desalineación entre narrativa UX y señal analítica real.

---

## 8) Definición de “hecho” para cerrar el MVP

Se puede considerar terminado solo cuando:

1. `generate_synthetic_data` + `run_analytics` corren sin error.
2. Se generan JSON consistentes y validados por tests.
3. Frontend carga los 5 hogares demo sin fallos.
4. Story HH-0001 se mantiene coherente en todos los módulos.
5. Copilot cubre intents requeridos con facts rastreables.
6. README permite a un tercero levantar la demo sin asistencia.

---

## 9) Estado final de esta iteración

- **Base construida**: sí.
- **MVP completo según criterios del encargo**: **no todavía**.
- **Siguiente paso crítico**: estabilizar pipeline, generar datos reales, y activar batería de tests.

