import type { Workflow } from '@/types'
import type { CreateWorkflowInput, UpdateWorkflowInput, WorkflowMemberDTO } from '@/api/types'
import { projectApi } from '../api'
import { useApiQuery, useMutation } from './shared'
import type { UseMutationOptions } from './shared'

// ==================== 工作流基础操作 ====================

export function useWorkflows(projectId: number | null) {
  return useApiQuery(() => projectId ? projectApi.workflows.getAll(projectId) : Promise.resolve({ success: true, data: { list: [] as Workflow[] } }), {
    initialData: { list: [] as Workflow[] },
    immediate: projectId !== null,
    deps: [projectId],
  })
}

export function useWorkflow(projectId: number | null, workflowId: string | null) {
  return useApiQuery(() => (projectId !== null && workflowId !== null) ? projectApi.workflows.getById(projectId, workflowId) : Promise.resolve({ success: true, data: null as Workflow | null }), {
    initialData: null as Workflow | null,
    immediate: projectId !== null && workflowId !== null,
    deps: [projectId, workflowId],
  })
}

export function useCreateWorkflow(projectId: number, options?: UseMutationOptions<CreateWorkflowInput, Workflow>) {
  return useMutation((data) => projectApi.workflows.create(projectId, data), options)
}

export function useUpdateWorkflow(
  projectId: number,
  workflowId: string,
  options?: UseMutationOptions<UpdateWorkflowInput, Workflow | null>
) {
  return useMutation((data) => projectApi.workflows.update(projectId, workflowId, data), options)
}

export function useDeleteWorkflow(projectId: number, options?: UseMutationOptions<string, boolean>) {
  return useMutation((workflowId) => projectApi.workflows.delete(projectId, workflowId), options)
}

// ==================== 工作流画布数据操作 ====================

interface CanvasData {
  nodes: unknown[]
  edges: unknown[]
  viewport?: { x: number; y: number; zoom: number }
}

/**
 * 保存工作流画布数据
 * 用于保存/更新工作流的 nodes、edges、viewport
 */
export function useSaveWorkflowCanvas(
  projectId: number,
  workflowId: string,
  options?: UseMutationOptions<CanvasData, Workflow | null>
) {
  return useMutation(
    (canvasData) => projectApi.workflows.update(projectId, workflowId, { canvasData }),
    options
  )
}

// ==================== 工作流成员管理 ====================

export function useWorkflowMembers(projectId: number | null, workflowId: string | null) {
  return useApiQuery(
    () => (projectId !== null && workflowId !== null)
      ? projectApi.workflows.listMembers(projectId, workflowId)
      : Promise.resolve({ success: true, data: [] as WorkflowMemberDTO[] }),
    {
      initialData: [] as WorkflowMemberDTO[],
      immediate: projectId !== null && workflowId !== null,
      deps: [projectId, workflowId],
    }
  )
}

export function useAddWorkflowMember(
  projectId: number,
  workflowId: string,
  options?: UseMutationOptions<{ userId: number; role: 'editor' | 'viewer' }, WorkflowMemberDTO>
) {
  return useMutation(
    (data) => projectApi.workflows.addMember(projectId, workflowId, data),
    options
  )
}

export function useUpdateWorkflowMemberRole(
  projectId: number,
  workflowId: string,
  options?: UseMutationOptions<{ userId: number; role: 'editor' | 'viewer' }, WorkflowMemberDTO>
) {
  return useMutation(
    ({ userId, role }) => projectApi.workflows.updateMemberRole(projectId, workflowId, userId, role),
    options
  )
}

export function useRemoveWorkflowMember(
  projectId: number,
  workflowId: string,
  options?: UseMutationOptions<number, boolean>
) {
  return useMutation(
    (userId) => projectApi.workflows.removeMember(projectId, workflowId, userId),
    options
  )
}
