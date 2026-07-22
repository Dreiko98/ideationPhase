# Guía de WaterLens para la presentación

## 1. ¿Qué es WaterLens?

WaterLens es un prototipo de inteligencia doméstica para el consumo de agua. Su objetivo es transformar lecturas de contador, datos del hogar y comparaciones agregadas en información comprensible y acciones concretas.

La aplicación intenta responder cinco preguntas principales:

1. ¿Cuánta agua está consumiendo mi hogar?
2. ¿El consumo está cambiando respecto a lo habitual?
3. ¿Voy a superar mi presupuesto mensual?
4. ¿Existe algún patrón que convenga revisar, como un consumo nocturno continuo?
5. ¿Qué acciones tienen más sentido para mi situación?

Todos los datos utilizados en la demostración son sintéticos. No corresponden a hogares ni personas reales.

## 2. Cómo funciona el sistema

El flujo general es el siguiente:

```text
Datos sintéticos de 500 hogares
             ↓
Pipeline analítico en Python
             ↓
Métricas, forecast, anomalías, cohortes y recomendaciones base
             ↓
Aplicación web WaterLens
             ↓
OpenAI interpreta los datos y redacta explicaciones y consejos
```

El pipeline calcula las cifras. La IA no decide cuánto se ha consumido ni modifica las métricas: recibe los resultados calculados y los interpreta en lenguaje natural.

La aplicación incluye cinco hogares de demostración que se pueden seleccionar desde la parte superior. Cambiar de hogar actualiza todas las métricas y mantiene la selección al navegar entre módulos.

## 3. My Water

My Water es el panel principal. Resume el estado actual del hogar y destaca lo que requiere atención.

### 3.1 Resumen inicial

La cabecera explica en una frase el cambio más importante detectado. Por ejemplo, puede indicar que el consumo de la última semana fue superior al de la semana anterior y que el cambio se concentra entre las 06:00 y las 08:00.

Debajo aparecen tres interpretaciones rápidas:

- **What needs attention?** Indica si el forecast apunta a superar el objetivo mensual.
- **Is it likely to be a leak?** Explica si el consumo nocturno presenta una señal compatible con flujo continuo. Es una señal preventiva, no un diagnóstico.
- **Best next step.** Muestra la acción que el sistema considera más relevante para el hogar.

### 3.2 Indicadores principales

#### Consumption this month

Muestra los metros cúbicos consumidos desde el primer día del mes.

La aplicación suma las lecturas diarias y convierte litros a metros cúbicos:

```text
1 m³ = 1.000 litros
```

También indica el cambio respecto a la semana comparable anterior.

#### Litres per person per day

Muestra el consumo medio diario dividido entre el número de residentes.

Esta métrica permite comparar hogares de diferente tamaño con mayor justicia. Un hogar de cinco personas normalmente consumirá más agua total que uno de una persona, aunque individualmente sea más eficiente.

#### Personal budget used

Indica qué porcentaje del objetivo mensual ya se ha consumido.

No basta con comprobar si el porcentaje es inferior al 100 %. También se utiliza el forecast para determinar si el ritmo actual podría superar el objetivo al final del mes.

#### Month-end forecast

Es la estimación de consumo total al terminar el mes.

El modelo utiliza:

- Consumo de días anteriores.
- Patrones semanales.
- Día de la semana.
- Tendencias recientes.
- Características generales del hogar.

El forecast es una estimación y siempre contiene incertidumbre.

#### Water health

Resume si existe alguna señal que convenga revisar.

El sistema analiza, entre otros elementos:

- Flujo durante la noche.
- Incrementos repentinos.
- Volúmenes inusuales.
- Persistencia del patrón.
- Resultado del modelo de anomalías.

Una alerta no confirma una fuga. Su función es indicar que merece la pena comprobar grifos, cisternas, riego u otros posibles motivos.

### 3.3 Gráfica de forecast diario

La primera gráfica muestra el consumo esperado para los próximos 14 días.

- La línea azul representa la estimación principal.
- La zona azul clara representa el rango de incertidumbre.
- El eje vertical muestra litros por día.
- El eje horizontal muestra las fechas.

La banda no representa un mínimo y un máximo garantizados. Es el intervalo razonable que obtiene el modelo según su error histórico.

### 3.4 Gráfica por días

La segunda gráfica presenta el forecast mediante barras.

- Las barras azules representan días laborables.
- Las barras verdes representan fines de semana.

Esto ayuda a identificar si el consumo esperado cambia con las rutinas del fin de semana. Debajo se muestran el promedio diario previsto y el día de mayor consumo del periodo.

### 3.5 AI weekly explanation

OpenAI recibe las métricas del hogar y redacta un resumen dividido en cuatro partes:

1. **What changed:** qué ha cambiado.
2. **What may explain it:** qué patrones podrían explicarlo.
3. **What to do next:** qué acción tendría más sentido.
4. **Confidence:** nivel de confianza y advertencias.

La etiqueta situada junto al título indica el origen:

- **OpenAI:** se está utilizando el modelo configurado.
- **Local fallback:** la API no está disponible y se utiliza una explicación determinista más limitada.

El botón **Regenerate explanation** solicita una nueva redacción utilizando las mismas métricas.

### 3.6 Signals to review

Muestra las anomalías recientes. Cada señal incluye:

- Causa posible.
- Severidad.
- Confianza.
- Estado: abierta, resuelta o rebajada.
- Comprobación recomendada.
- Estimación del exceso de agua, si está disponible.

### 3.7 AI-personalised actions

El pipeline selecciona primero tres recomendaciones compatibles con los datos. Después, OpenAI las explica y personaliza según el tipo de vivienda, residentes, presupuesto, forecast y anomalías.

Cada recomendación incluye:

- Título de la acción.
- Por qué es relevante.
- Impacto esperado.
- Pasos prácticos.

La IA puede proponer periodos de observación, pasos o formas de comprobar un patrón. No debe presentar el ahorro como garantizado.

## 4. Water Copilot

Water Copilot es el asistente conversacional de la aplicación.

### 4.1 Información disponible para el chatbot

Para el hogar seleccionado, el chatbot recibe:

- Perfil general de vivienda y residentes.
- Consumo actual.
- Métricas por persona.
- Presupuesto.
- Forecast.
- Incertidumbre del modelo.
- Anomalías.
- Recomendaciones analíticas.
- Comparación con hogares similares.
- Datos agregados del distrito.
- Factura sintética.

No recibe coordenadas, área postal ni datos individuales de otros hogares.

### 4.2 Qué se le puede preguntar

Ejemplos:

- ¿Por qué ha aumentado mi consumo?
- ¿Voy a superar mi presupuesto?
- ¿Qué significa el forecast?
- ¿Tengo una posible señal de fuga?
- ¿Cómo estoy respecto a hogares similares?
- ¿Qué acción debería priorizar?
- ¿Cómo puedo definir un objetivo realista?
- ¿Por qué ha cambiado mi factura?

El chatbot conserva los últimos mensajes de la conversación para poder responder preguntas de seguimiento.

### 4.3 Metrics used

En cada respuesta se puede abrir la sección **Metrics used**. Esta sección muestra las métricas que la IA utilizó para elaborar la respuesta.

Sirve para aportar transparencia: el usuario puede distinguir entre un consejo general y una explicación apoyada en una cifra concreta.

### 4.4 Acciones del chatbot

El panel lateral permite simular acciones:

- Crear una solicitud de soporte.
- Registrar un cambio de contexto, como la presencia de invitados.
- Hablar sobre un nuevo objetivo mensual.

Estas acciones son de prototipo. Se guardan en el navegador y se comparten con Act & Connect, pero no se envían a una empresa suministradora real.

## 5. My Community

My Community permite interpretar el consumo dentro de un contexto más amplio sin mostrar datos privados de otros hogares.

### 5.1 Dos tipos de comparación

La página utiliza dos comparaciones diferentes:

#### Matched cohort

Compara el hogar con otros hogares sintéticos de características similares, teniendo en cuenta elementos como residentes, vivienda, tamaño, jardín, piscina y patrón de ocupación.

Esta comparación es más justa que comparar directamente todos los hogares.

#### District aggregate

Muestra promedios generales del distrito. Es útil para observar tendencias locales, pero no está ajustado por tamaño o composición del hogar.

### 5.2 AI interpretation

OpenAI interpreta el percentil, el tamaño de la cohorte, la mediana y los agregados del distrito.

La explicación separa:

- Resumen principal.
- Significado de la comparación.
- Contexto de privacidad.

### 5.3 Percentil

El percentil indica qué proporción de los hogares comparables consume menos agua por persona.

Por ejemplo, estar en el percentil 40 significa que aproximadamente el 40 % de la cohorte consume menos y el 60 % consume más.

En esta métrica, un percentil de consumo más bajo suele significar menor consumo relativo.

### 5.4 Mediana y rango eficiente

- **Cohort median:** valor central de litros por persona y día dentro de la cohorte.
- **Efficient range:** intervalo aproximado de los hogares con menor consumo dentro de la cohorte.

No se utiliza para juzgar al usuario, sino para proporcionar una referencia realista.

### 5.5 Agregados del distrito

Se muestran:

- Consumo medio por hogar y día.
- Tendencia de los últimos 30 días.
- Porcentaje de hogares dentro de su presupuesto.
- Proporción de señales de anomalía.

La tasa de anomalías representa señales automáticas, no fugas confirmadas.

### 5.6 Distritos equivalentes

Muestra los distritos cuyo consumo medio está más cerca del distrito seleccionado.

Esto no significa que tengan la misma demografía, clima o tipo de vivienda. Solo indica proximidad en la métrica de consumo medio.

### 5.7 Gráficas y tabla

La primera gráfica compara el consumo medio diario de cada distrito.

La segunda compara el porcentaje de hogares que se mantiene dentro de su presupuesto.

El distrito del usuario aparece resaltado. La tabla inferior muestra los valores exactos y evita depender únicamente de la longitud de las barras.

### 5.8 Privacidad

Community no muestra:

- Identidad de hogares.
- Coordenadas.
- Direcciones.
- Lecturas individuales.
- Eventos de un hogar concreto.

Solo utiliza estadísticas de cohortes y agregados de distrito.

## 6. Act & Connect

Act & Connect convierte las observaciones en acciones.

### 6.1 Notification centre

Permite gestionar señales de anomalía:

- **Confirm or downgrade:** rebaja la prioridad de una señal.
- **Report repaired:** marca el problema como resuelto después de una reparación o comprobación.

### 6.2 Recommendations workflow

Presenta las recomendaciones asociadas al hogar y permite:

- Aceptarlas.
- Descartarlas.
- Consultar su estado.

### 6.3 Support ticket

Simula la creación de una solicitud de soporte para la compañía de agua.

En una versión real, esta sección se conectaría con el CRM o sistema de atención de la empresa suministradora.

### 6.4 Personal goals

Permite guardar un nuevo objetivo mensual en metros cúbicos.

El objetivo se almacena en el navegador. En el prototipo no vuelve a ejecutar automáticamente el pipeline ni modifica los archivos analíticos.

### 6.5 Persistencia

Los cambios se guardan en `localStorage`, por lo que sobreviven al refrescar la página en el mismo navegador.

No existe todavía una base de datos, autenticación ni sincronización entre dispositivos.

## 7. Bill Explainer

Bill Explainer ayuda a comprender una factura sintética.

### 7.1 Resumen de la factura

Muestra:

- Periodo de facturación.
- Total actual.
- Factura anterior.
- Rango previsto para la próxima factura.

### 7.2 Componentes

#### Fixed service charge

Cuota fija por disponibilidad del servicio. No depende del consumo mensual.

#### Variable consumption charge

Parte que cambia según el volumen consumido y los bloques tarifarios.

#### Meter fee

Coste sintético de operación y mantenimiento del contador.

#### Sewerage and treatment

Componente sintético relacionado con alcantarillado y tratamiento de aguas.

#### Taxes

Impuestos sintéticos aplicados al subtotal.

### 7.3 AI bill explanation

OpenAI relaciona la factura con las métricas y el forecast del hogar. La respuesta explica:

- Resultado principal.
- Elementos que influyen en el importe.
- Siguiente acción recomendable.

La IA debe dejar claro que los precios y la factura son sintéticos.

## 8. Onboarding

Onboarding simula el proceso de configuración inicial.

### Paso 1: Home

Recoge tipo de vivienda, superficie aproximada y baños.

### Paso 2: Household

Recoge número de residentes y patrón de ocupación.

### Paso 3: Goals

Permite definir un objetivo mensual de consumo.

### Paso 4: Privacy

Permite seleccionar consentimiento para personalización y agregación comunitaria anónima.

Los datos se guardan localmente en el navegador. Todavía no actualizan el perfil sintético utilizado por el pipeline.

## 9. Qué hace la IA y qué no hace

### La IA sí hace

- Interpretar métricas.
- Redactar resúmenes.
- Personalizar recomendaciones seleccionadas por el pipeline.
- Responder preguntas sobre el hogar.
- Relacionar consumo, forecast, presupuesto, comunidad y factura.
- Proponer comprobaciones y periodos razonables de observación.

### La IA no hace

- Crear las lecturas del contador.
- Cambiar el consumo medido.
- Entrenar el modelo de forecast.
- Confirmar físicamente una fuga.
- Acceder a datos reales de una empresa de agua.
- Ejecutar reparaciones.
- Enviar tickets reales.
- Garantizar ahorros.

## 10. Significado de OpenAI y Local fallback

### OpenAI

La petición se ha procesado utilizando el modelo configurado en `OPENAI_MODEL`.

### Local fallback

La aplicación utiliza las plantillas deterministas cuando:

- No existe `OPENAI_API_KEY`.
- La API no está disponible.
- El modelo devuelve una respuesta inválida.
- Se supera un límite de peticiones.

El fallback permite seguir mostrando la demo, pero sus respuestas son más limitadas y menos conversacionales.

## 11. Recorrido recomendado para presentar la demo

### 1. Empezar en My Water

Seleccionar `HH-0001 — Valencia Family Focus` y explicar:

- Incremento semanal del 12,1 %.
- Cambio concentrado por la mañana.
- Forecast de 12,2 m³.
- Objetivo de 11 m³.
- Señal nocturna baja, por lo que una fuga continua fuerte no es la explicación principal.

### 2. Mostrar las gráficas

Explicar la diferencia entre:

- Estimación central.
- Banda de incertidumbre.
- Variación por día y fin de semana.

### 3. Mostrar el resumen y las recomendaciones de IA

Abrir la explicación y destacar que la IA interpreta datos ya calculados.

### 4. Ir a Water Copilot

Preguntar:

```text
Why did my consumption increase this week?
```

Después abrir **Metrics used** para demostrar la trazabilidad.

### 5. Ir a My Community

Explicar:

- Cohorte similar.
- Percentil.
- Diferencia entre cohorte y distrito.
- Privacidad.
- Gráficas agregadas.

### 6. Ir a Act & Connect

Marcar una señal como reparada, aceptar una recomendación y crear un ticket de demostración.

### 7. Terminar con Bill Explainer

Mostrar cómo WaterLens conecta comportamiento, forecast y coste en una explicación comprensible.

## 12. Limitaciones actuales del prototipo

- Todos los datos son sintéticos.
- No hay conexión con contadores reales.
- No hay base de datos ni autenticación.
- Las acciones se guardan únicamente en el navegador.
- Los tickets no se envían a una empresa real.
- El onboarding no reentrena ni recalcula el pipeline.
- Las recomendaciones no sustituyen una inspección profesional.
- La factura y las tarifas son ficticias.
- La IA necesita una API key válida para funcionar; en caso contrario se utiliza el fallback local.

Estas limitaciones permiten demostrar la experiencia de producto sin utilizar información personal ni infraestructura externa de una empresa de agua.
