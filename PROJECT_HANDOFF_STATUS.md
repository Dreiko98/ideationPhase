# WaterLens — estado de entrega

Actualizado tras la revisión de producto de julio de 2026.

## Estado actual

El MVP es ejecutable y contiene cuatro rutas de producto: `/my-water`, `/copilot`, `/community` y `/bill-explainer`. Act & Connect y Onboarding han sido retirados de navegación, rutas, componentes y pruebas.

## Cambios incorporados

- Bill Explainer permite cargar PDF o imagen, analizarlo con OpenAI y mantener documento y explicación en paralelo.
- El desglose indica significado, importe y relación con el consumo de cada cargo.
- Se añadieron histórico visual, presupuesto persistente en euros y “Where is my money going?”.
- My Community prioriza hogares similares y elimina la comparación visible por distritos.
- My Water y Community incluyen una campaña temporal con gamificación ligera.
- Aqua aparece globalmente, ofrece tips, puede ocultarse y se anima con la escritura progresiva del Copilot.
- Se actualizó `GUIA_MODULOS_ES.md` con el recorrido completo.

## Configuración

Requisitos: Node.js 20+, Python 3.11+ y una clave de OpenAI opcional en `.env.local`.

```powershell
npm ci
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
npm run dev
```

## Validación

Ejecutar antes de una entrega:

```powershell
pytest
npm test
npm run build
```

## Pendientes de producción

- Sustituir históricos sintéticos por facturas guardadas en un backend con consentimiento y política de retención.
- Añadir autenticación, base de datos y sincronización multidispositivo.
- Validar tarifas y categorías con datos oficiales de la suministradora.
- Sustituir el limitador de memoria por uno distribuido y añadir control de costes de IA.
- Realizar pruebas de accesibilidad, seguridad de documentos y revisión legal de privacidad.
