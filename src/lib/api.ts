export interface ApiDocument {
  id: string
  filename: string
  pages: number
  created_at: number
}

export interface ApiUploadResponse {
  id: string
  filename: string
  pages: number
  profile?: {
    docType?: string
    userProfile?: string
    jurisdiction?: string
    language?: string
    urgency?: string
  }
  riskReport?: {
    overallRisk?: string
    summary?: string
    fraudFlags?: Array<{ title?: string; description?: string } | string>
  }
  trustReport?: unknown
  schemes?: string[]
  deadlines?: Array<{
    id?: string
    type?: string
    description: string
    alert_date?: string
    days_from_now?: number
    severity?: string
  }>
  chunkCount?: number
  ragIndexed?: boolean
  extractionMethod?: string
  duplicate?: boolean
}

export interface ApiDocumentReport {
  id: string
  filename: string
  pages: number
  created_at: number
  profile: {
    docType?: string
    userProfile?: string
    jurisdiction?: string
    language?: string
    isCrossBorder?: boolean
  } | null
  riskReport: {
    overallRisk?: "HIGH" | "MEDIUM" | "LOW"
    documentType?: string
    whatCanGoWrong?: string[]
    immediateActions?: Array<{
      priority: "URGENT" | "HIGH" | "MEDIUM"
      action: string
      reason: string
      deadline: string
    }>
    risks?: Array<{
      severity: "HIGH" | "MEDIUM" | "LOW"
      issue: string
      impact: string
      suggested_clause?: string
      evidence?: string | null
    }>
    fraudFlags?: Array<{
      type: string
      evidence?: string
      severity: "HIGH" | "MEDIUM" | "LOW"
    }>
    positives?: string[]
    negotiations?: Array<{
      clause: string
      suggestion: string
    }>
  } | null
  trustReport: {
    score?: string
    scoreNumeric?: number
    summary?: string
  } | null
  schemes: Array<string | {
    name?: string
    title?: string
    description?: string
    scheme?: {
      name?: string
      title?: string
      description?: string
    }
    reason?: string
  }>
  deadlines: Array<{
    id?: string
    type?: string
    description: string
    alert_date?: string
    days_from_now?: number
    severity?: "HIGH" | "MEDIUM" | "LOW"
  }>
}

export interface ApiAskResponse {
  question: string
  answer: string
  language: string
  model?: string
  ragUsed?: boolean
}

export interface ApiTranscribeResponse {
  text: string
  model?: string
  loading?: boolean
}

export interface ApiTranslateResponse {
  original: string
  translated: string
  targetLang: string
  model?: string
}

export interface ApiHealthResponse {
  status: string
  qvacAvailable: boolean
  modelsReady: boolean
  modelsLoading: boolean
  models: {
    llm: boolean
    embed: boolean
    ocr: boolean
    whisper: boolean
  }
  documentsStored: number
  nodeVersion: string
}

async function readError(response: Response) {
  try {
    const data = await response.json()
    if (typeof data?.error === "string") {
      return data.error
    }
  } catch {
    // Ignore JSON parsing errors and fall back to status text.
  }

  return response.statusText || "Request failed"
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(await readError(response))
  }

  return response.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  return response.json() as Promise<T>
}

export async function apiUpload(file: File): Promise<ApiUploadResponse> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  return response.json() as Promise<ApiUploadResponse>
}

export async function apiTranscribe(audioBlob: Blob, filename = "recording.wav", language = "English"): Promise<ApiTranscribeResponse> {
  const formData = new FormData()
  formData.append("audio", audioBlob, filename)
  formData.append("language", language)

  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    throw new Error(await readError(response))
  }

  return response.json() as Promise<ApiTranscribeResponse>
}

export async function apiTranslate(text: string, targetLang: string): Promise<ApiTranslateResponse> {
  return apiPost<ApiTranslateResponse>("/api/translate", { text, targetLang })
}

export async function apiHealth(): Promise<ApiHealthResponse> {
  return apiGet<ApiHealthResponse>("/api/health")
}
