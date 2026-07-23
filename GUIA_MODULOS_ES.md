# Guía de módulos de WaterLens

## Visión general

WaterLens convierte datos de consumo de agua en explicaciones comprensibles y acciones de bajo riesgo. La demostración utiliza hogares y facturas sintéticos. OpenAI redacta resúmenes, interpreta comparaciones, analiza facturas subidas y responde en el copiloto; las métricas originales siguen procediendo del pipeline analítico y nunca son modificadas por la IA.

La navegación se concentra en cuatro módulos: **My Water**, **Water Copilot**, **My Community** y **Bill Explainer**. Las antiguas secciones Act & Connect y Onboarding se han eliminado.

## Elementos comunes

### Selector de hogar

Permite cambiar entre cinco perfiles de demostración. El hogar elegido determina las métricas, predicciones, anomalías, recomendaciones, factura y cohorte comparable que se muestran.

### Aqua, la mascota digital

Aqua es una gota de agua persistente que aparece en todas las pantallas. Muestra consejos breves relacionados con el módulo actual. El usuario puede ocultarla y volver a activarla; la preferencia se guarda en el navegador. En Water Copilot, Aqua mueve la boca mientras el texto se escribe progresivamente.

### IA y fallback local

El indicador de cada módulo muestra si el contenido procede de OpenAI o de una respuesta local. Si falta `OPENAI_API_KEY`, hay un error de red o la respuesta estructurada no es válida, la aplicación conserva una explicación de demostración para que la presentación pueda continuar.

## 1. My Water

Es el panel principal del hogar.

### Personalización simulada en el MVP

En el producto final, cada usuario podrá elegir qué widgets y métricas quiere ver y ordenarlos. Para evitar construir un editor completo dentro del MVP, los cinco hogares de demostración representan cinco configuraciones ya guardadas:

- **Valencia Family Focus:** prioriza presupuesto, previsión, consumo y rutinas familiares.
- **Garden Weekend Home:** abre primero la distribución por días y se centra en previsión y cambios de rutina.
- **Efficient Senior Couple:** prioriza seguridad, señales, estado del agua y una interfaz más reducida.
- **Dynamic Shared Flat:** destaca consumo por persona, ritmos diarios y señales relevantes para una vivienda compartida.
- **Tourist Apartment:** prioriza monitorización remota, anomalías y previsión; oculta campañas y explicaciones semanales.

Al cambiar de hogar, no solo cambian los datos: también cambian la selección de KPIs, los widgets visibles y su orden. Durante la presentación debe explicarse como el resultado de las preferencias guardadas por cada usuario, no como una personalización automática decidida por la IA.

- Resume el cambio semanal y la franja horaria donde aparece la variación más clara.
- Presenta consumo del mes, litros por persona y día, progreso frente al presupuesto, previsión de cierre y estado de posibles anomalías.
- Incluye dos gráficos de previsión: banda de incertidumbre diaria y barras para detectar los días de mayor consumo.
- Genera con IA un resumen semanal y tres recomendaciones personalizadas basadas en métricas y candidatos del pipeline.
- Muestra una campaña temporal de Global Omnium. El usuario puede unirse y ver un progreso ligero, guardado localmente.

Los avisos de fuga son señales orientativas, no diagnósticos. La previsión es una estimación y su intervalo no garantiza un mínimo o un máximo.

## 2. Water Copilot

Es el asistente conversacional de la aplicación. Recibe el perfil seleccionado, métricas calculadas, predicciones, anomalías, recomendaciones, comparación con hogares similares y datos sintéticos de factura.

Puede:

- Explicar por qué ha cambiado el consumo.
- Interpretar una previsión o una probabilidad de superar el objetivo.
- Proponer comprobaciones seguras ante una anomalía.
- Recomendar rutinas adaptadas al hogar.
- Ayudar a plantear un objetivo realista.

Las respuestas aparecen progresivamente. Mientras se escriben, Aqua se anima como si estuviera hablando. El desplegable “Metrics used” permite ver qué hechos han sustentado una respuesta.

## 3. My Community

La comparación ya no se organiza por distritos. Se centra en una cohorte anónima de hogares con características comparables, porque resulta más útil comparar viviendas con necesidades parecidas que ubicaciones geográficas amplias.

La pantalla muestra:

- Consumo reciente del hogar en litros por persona y día.
- Mediana de hogares similares.
- Rango considerado eficiente dentro de la cohorte.
- Percentil del hogar, explicado sin convertirlo en una puntuación moral.
- Variables usadas para construir la similitud: residentes, tipo y tamaño de vivienda, baños, jardín y patrón de ocupación.
- Interpretación de la comparación redactada por IA.
- Campañas voluntarias y contenidos educativos sobre tratamiento, energía y estrés hídrico.

Solo se enseñan estadísticas agregadas. No se muestran identidades, direcciones, coordenadas ni lecturas individuales de otros hogares.

## 4. Bill Explainer

Es el módulo más orientado a transparencia tarifaria y comprensión de la factura.

### Subida y análisis

El usuario puede subir una factura en PDF, PNG, JPG o WEBP, hasta 10 MB. Al pulsar “Analyse bill with AI”, el servidor envía el documento a OpenAI para extraer el periodo, total, consumo y componentes visibles. Si no hay API disponible, se mantiene la factura sintética claramente marcada como demostración.

La interfaz se divide en dos columnas:

1. La factura original permanece visible a la izquierda.
2. El desglose asistido por IA aparece a la derecha.

Cada componente se puede desplegar para conocer qué significa y si normalmente cambia con el consumo. La extracción automática debe contrastarse siempre con el documento original.

### Comparador histórico

Un gráfico de barras comienza con totales de demostración y añade el periodo y total de cada factura analizada correctamente. Debajo se indica el aumento o descenso frente a la factura anterior. El histórico resumido queda en el navegador, pero los documentos no se almacenan.

### Presupuesto de gasto

El usuario fija un objetivo en euros por factura. La aplicación muestra si el total actual queda por encima o por debajo y guarda la preferencia en `localStorage`. Junto al objetivo se enseña la mediana de consumo de hogares similares como contexto, aclarando que no equivale a un presupuesto recomendado porque las tarifas y periodos pueden variar.

### “Where is my money going?”

Un gráfico circular agrupa los cargos por categorías: agua consumida, disponibilidad del servicio, contador, tratamiento de aguas residuales, impuestos y otros. El objetivo es explicar que la factura no paga únicamente el agua del grifo, sino también infraestructura compartida, control de calidad y tratamiento.

## Persistencia y privacidad

La visibilidad de Aqua, la adhesión a campañas y el presupuesto de factura se guardan únicamente en el navegador. No existe todavía autenticación ni sincronización entre dispositivos.

La API key de OpenAI permanece en `.env.local` y solo la leen rutas de servidor. Nunca debe incluirse en Git. Las facturas subidas se procesan bajo petición y no se guardan en el repositorio ni en el almacenamiento local de la aplicación.

## Recorrido recomendado para una presentación

1. Abrir My Water y explicar el resumen, las métricas y ambos gráficos.
2. Unirse a la campaña y enseñar que Aqua puede ocultarse.
3. Abrir Water Copilot, hacer una pregunta y mostrar la animación y las métricas utilizadas.
4. Entrar en My Community y explicar por qué la comparación se hace con hogares similares.
5. Abrir Bill Explainer, subir una factura de prueba y comparar el documento con el desglose.
6. Enseñar el histórico, guardar un presupuesto y cerrar con “Where is my money going?”.

## Limitaciones actuales

- Todos los hogares, lecturas, facturas e históricos incluidos son sintéticos.
- La extracción de una factura puede contener errores y debe verificarse visualmente.
- El histórico no es todavía una colección de facturas reales subidas por el usuario.
- Campañas, presupuesto y preferencias son locales al navegador.
- Las recomendaciones no garantizan ahorro ni diagnostican fugas.
