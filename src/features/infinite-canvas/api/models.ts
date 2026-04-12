import type { ModelDTO, ModelModality } from '@/api/types'
import { errorResponse, successResponse, toApiResponse } from '@/features/project/api/shared'
import type { ApiResponse } from '@/features/project/api/shared'
import { isMockMode } from '@/api/mock'
import { IMAGE_MODELS, VIDEO_MODELS } from '../config/models'

// 本地静态模型配置作为 fallback
const STATIC_MODELS: Record<ModelModality, ModelDTO[]> = {
  text: [],
  image: IMAGE_MODELS.map(m => ({
    id: m.key,
    name: m.label,
    provider: 'dashscope',
    modality: 'image' as const,
    isEnabled: true,
    description: m.tips,
    defaultParams: m.defaultParams,
  })),
  video: VIDEO_MODELS.map(m => ({
    id: m.key,
    name: m.label,
    provider: 'dashscope',
    modality: 'video' as const,
    isEnabled: true,
    description: m.tips,
    defaultParams: m.defaultParams,
  })),
  audio: [],
  embedding: [],
  rerank: [],
  multimodal: [],
}

export const modelsApi = {
  /**
   * 获取模型列表
   * @param modality 模型类型: 'text' | 'image' | 'video' | 'audio' | 'multimodal'
   * @returns 模型列表
   */
  async getModels(modality?: ModelModality): Promise<ApiResponse<ModelDTO[]>> {
    // 开发模式使用静态配置
    if (isMockMode) {
      const models = modality ? STATIC_MODELS[modality] : Object.values(STATIC_MODELS).flat()
      return successResponse(models)
    }

    return toApiResponse<{ models: ModelDTO[] } | { list: ModelDTO[] } | ModelDTO[], never>(
      {
        url: '/ai/models',
        method: 'GET',
        params: modality ? { modality } : undefined,
      },
      { models: [] },
      '获取模型列表失败',
      (data) => data
    ).then((response) => {
      if (!response.success) {
        return errorResponse(response.message || '获取模型列表失败', [])
      }
      // 兼容多种格式: { models: [...] } 或 { list: [...] } 或直接 [...]
      let rawModels: unknown[] = []
      if (Array.isArray(response.data)) {
        rawModels = response.data
      } else if ('models' in response.data && Array.isArray(response.data.models)) {
        rawModels = response.data.models
      } else if ('list' in response.data && Array.isArray(response.data.list)) {
        rawModels = response.data.list
      }
      
      // 映射 API 字段到 ModelDTO
      const models = rawModels.map((m: unknown): ModelDTO => {
        const model = m as Record<string, unknown>
        return {
          id: String(model.model_id || model.id || ''),  // API 使用 model_id
          model_id: String(model.model_id || ''),
          name: String(model.name || ''),
          provider: String(model.provider || 'unknown'),
          modality: String(model.modality || '') as ModelModality,
          description: String(model.modality_label || model.description || ''),
          isEnabled: model.status === 'active' || model.isEnabled !== false,
          status: String(model.status || ''),
        }
      })
      
      return successResponse(models)
    })
  },

  /**
   * 获取单个模型详情
   * @param modelId 模型ID
   */
  async getModelById(modelId: string): Promise<ApiResponse<ModelDTO | null>> {
    if (isMockMode) {
      const allModels = Object.values(STATIC_MODELS).flat()
      const model = allModels.find(m => m.id === modelId) || null
      return successResponse(model)
    }

    return toApiResponse<ModelDTO | null>(
      {
        url: `/ai/models/${modelId}`,
        method: 'GET',
      },
      null,
      '获取模型详情失败'
    ).then((response) =>
      response.success
        ? successResponse(response.data)
        : errorResponse(response.message || '获取模型详情失败', null)
    )
  },

  /**
   * 获取支持的模型类型
   */
  getSupportedModalities(): ModelModality[] {
    return ['text', 'image', 'video', 'audio', 'embedding', 'rerank', 'multimodal']
  },
}
