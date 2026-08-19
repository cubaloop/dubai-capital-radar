# 🏰 Dubai Capital Radar

> **Sistema Autónomo de Captación Predictiva de Capital & Arbitraje Patrimonial para Dubai Real Estate**
> Integrando Ingesta de Liquidez Cripto/Tech, Modelos de Arbitraje Fiscal (0% IRPF/Plusvalías vs Europa/América), Generador de Dossiers Institucionales con IA y Asignación de Unidades para Golden Visa (2M+ AED).

---

## 🌟 Arquitectura del Sistema

- **Backend:** FastAPI (Python 3.11) con motor de cálculo fiscal multijurisdicción, recolector de señales en vivo, agente LLM (Google Gemini) y despachador de campañas con triage de respuestas.
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons (diseño oscuro ultra-luxury).
- **Despliegue Cloud:** Manifiesto `render.yaml` (Infrastructure as Code) para despliegue simultáneo del servicio web y el sitio estático en Render.

---

## 🚀 Despliegue en Render (1 Clic)

1. **Subir a GitHub:**
   ```bash
   cd C:\Users\Yo\.gemini\antigravity\scratch\dubai-capital-radar
   git init
   git add .
   git commit -m "feat: Dubai Capital Radar initial release"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/dubai-capital-radar.git
   git push -u origin main
   ```

2. **Conectar a Render:**
   - Entra a [dashboard.render.com](https://dashboard.render.com).
   - Haz clic en **New +** y selecciona **Blueprint**.
   - Conecta tu repositorio `dubai-capital-radar`.
   - Render detectará automáticamente el archivo `render.yaml` y creará ambos servicios (Backend FastAPI + Frontend React).
   - En las variables de entorno del Backend, agrega tu `GEMINI_API_KEY`.

---

## 💻 Ejecución Local

### 1. Iniciar el Backend (FastAPI):
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
*Documentación interactiva Swagger en:* `http://localhost:8000/docs`

### 2. Iniciar el Frontend (React + Vite):
```bash
cd frontend
npm install
npm run dev
```
*Panel disponible en:* `http://localhost:3000`

---

## 🔑 Módulos Principales

1. **Liquidity Radar:** Monitor en tiempo real de transacciones de ballenas cripto, adquisiciones de startups y reformas fiscales en Europa/América.
2. **Private Investor Dossier:** Micro-portal confidencial para el prospecto con simulador fiscal interactivo, portafolio asignado bajo cuenta de custodia DLD y hoja de ruta de Golden Visa (10 años).
3. **Outreach & AI Triage:** Gestor de secuencias de email institucional y clasificador semántico de objeciones/solicitudes de reunión con auto-respuesta.
4. **Dubai Off-Plan Matcher:** Inventario curado de promotores de primer nivel (Emaar, Nakheel, Sobha, Omniyat) con métricas de rentabilidad neta (*yield* 7.8% - 8.9%).
